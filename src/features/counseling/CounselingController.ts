import {OwnerFence,type CounselingApi,type CounselingSession,type Capabilities,type Definition,type SessionSummary,type MessageInput,type ConfirmInput} from './CounselingApi';
import type {Topic} from '../p0/model';
import {DraftMemory} from './DraftMemory';
import {HttpError} from '../../infrastructure/http/FetchClient';

export type CounselingPort=Pick<CounselingApi,'capabilities'|'create'|'get'|'message'|'confirm'|'sessions'|'delete'|'glossary'|'define'|'forget'>;
export interface CounselingOptions{owner:string;topic?:Topic;sessionId?:string;initialText?:string;sourceReadingId?:string;draftKey?:string;}
export interface ConversationState{value:CounselingSession|null;text:string;busy:boolean;pending:boolean;error:string;caps:Capabilities|null;definitions:Definition[];sessions:SessionSummary[];}
const empty=():ConversationState=>({value:null,text:'',busy:false,pending:false,error:'',caps:null,definitions:[],sessions:[]});
type Attempt={kind:'message';id:string;key:string;payload:MessageInput}|{kind:'confirm';id:string;key:string;payload:ConfirmInput};
const message=(error:unknown)=>error instanceof HttpError?error.message:'연결이 늦어지거나 중단됐어요. 입력한 내용은 그대로예요.';

export class CounselingController{
 state=empty();
 private listeners=new Set<()=>void>();private fence=new OwnerFence();private owner:string;
 private creation:string;private draftKey:string;private restore?:string;private attempt?:Attempt;
 constructor(private api:CounselingPort,private nextId:()=>string,private drafts:DraftMemory,private options:CounselingOptions){
  this.owner=options.owner;this.fence.attach(this.owner);this.drafts.attach(this.owner);
  this.creation=options.sourceReadingId||this.nextId();this.draftKey=options.sessionId||(options.sourceReadingId?'reading:'+options.sourceReadingId:options.draftKey||'new');
  const previous=this.drafts.read(this.draftKey);this.restore=options.sessionId||previous?.sessionId;
  this.state={...empty(),text:options.draftKey?(previous?.text??options.initialText??''):(options.initialText??previous?.text??'')};
 }
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 getSnapshot=()=>this.state;
 private patch(change:Partial<ConversationState>){this.state={...this.state,...change};for(const listener of this.listeners)listener();}
 private persist(){this.drafts.write(this.draftKey,{text:this.state.text,sessionId:this.state.value?.id||this.restore});}
 private publish(value:CounselingSession){
  if(this.state.value?.id===value.id&&this.state.value.version>value.version)return;
  this.patch({value});this.restore=value.id;this.persist();
 }
 get processing(){return ['queued','running'].includes(this.state.value?.job?.state||'');}
 private get ready(){return !!this.owner&&!!this.state.caps?.available&&!this.state.busy&&!this.attempt&&!this.processing;}
 async initialize():Promise<void>{
  const epoch=this.fence.capture(),restore=this.restore;
  if(this.options.sourceReadingId)this.patch({busy:true});
  await Promise.all([
   this.api.capabilities().then(caps=>{if(this.fence.valid(epoch))this.patch({caps});})
    .catch(error=>{if(this.fence.valid(epoch))this.patch({error:message(error)});}),
   restore||this.options.sourceReadingId?(restore?this.api.get(restore):this.api.create(this.options.topic||'care',this.creation,this.options.sourceReadingId)).then(value=>{if(this.fence.valid(epoch))this.publish(value);})
    .catch(error=>{if(this.fence.valid(epoch))this.patch({error:message(error)});}):Promise.resolve()
  ]);
  if(this.options.sourceReadingId&&this.fence.valid(epoch))this.patch({busy:false});
 }
 attach(owner:string){
  if(owner===this.owner)return;
  this.owner=owner;this.fence.attach(owner);this.drafts.attach(owner);
  this.attempt=undefined;this.restore=undefined;this.draftKey='new';this.creation=this.nextId();this.patch(empty());
 }
 setText(text:string){this.patch({text});this.persist();}
 async send(consent:string,remember=true):Promise<boolean>{
  if(!this.ready||!consent||!this.state.text.trim())return false;
  const epoch=this.fence.capture(),text=this.state.text.trim();this.patch({busy:true,error:''});
  try{
   let session=this.state.value;
   if(!session){session=await this.api.create(this.options.topic||'care',this.creation,this.options.sourceReadingId);
    if(!this.fence.valid(epoch))return false;this.publish(session);}
   return await this.execute({kind:'message',id:session.id,key:this.nextId(),payload:{text,
    expected_version:session.version,consent_event_id:consent,remember_definitions:remember}});
  }catch(error){if(this.fence.valid(epoch))this.patch({error:message(error)});return false;}
  finally{if(this.fence.valid(epoch))this.patch({busy:false});}
 }
 async confirm(consent:string,count:1|3|5,web:boolean):Promise<boolean>{
  const value=this.state.value;if(!this.ready||!consent||value?.phase!=='confirmation')return false;
  return this.execute({kind:'confirm',id:value.id,key:this.nextId(),payload:{confirmed:true,
   expected_version:value.version,consent_event_id:consent,card_count:count,web_search:web}});
 }
 private async execute(attempt:Attempt):Promise<boolean>{
  const epoch=this.fence.capture();this.attempt=attempt;this.patch({busy:true,pending:true,error:''});
  try{
   const value=attempt.kind==='message'?await this.api.message(attempt.id,attempt.payload,attempt.key):
    await this.api.confirm(attempt.id,attempt.payload,attempt.key);
   if(!this.fence.valid(epoch))return false;
   this.attempt=undefined;this.publish(value);
   const clear=attempt.kind==='message'&&this.state.text.trim()===attempt.payload.text;
   this.patch({pending:false,...(clear?{text:''}:{})});this.persist();return true;
  }catch(error){
   if(this.fence.valid(epoch)){
    if(error instanceof HttpError&&error.status<500)this.attempt=undefined;
    this.patch({pending:!!this.attempt,error:message(error)});
   }return false;
  }finally{if(this.fence.valid(epoch))this.patch({busy:false});}
 }
 async retry():Promise<boolean>{return this.attempt&&!this.state.busy?this.execute(this.attempt):false;}
 async refreshCapabilities():Promise<boolean>{
  if(this.state.busy||this.processing||this.attempt)return false;
  const epoch=this.fence.capture();this.patch({busy:true,error:''});
  try{
   const caps=await this.api.capabilities();if(!this.fence.valid(epoch))return false;
   this.patch({caps});return caps.available;
  }catch(error){if(this.fence.valid(epoch))this.patch({caps:null,error:message(error)});return false;}
  finally{if(this.fence.valid(epoch))this.patch({busy:false});}
 }
 async refresh():Promise<void>{
  const id=this.state.value?.id,epoch=this.fence.capture();if(!id)return;
  try{const value=await this.api.get(id);if(this.fence.valid(epoch)){this.publish(value);this.patch({error:''});}}
  catch(error){if(this.fence.valid(epoch))this.patch({error:message(error)});}
 }
 async loadManagement():Promise<void>{
  const epoch=this.fence.capture();
  try{const [definitions,sessions]=await Promise.all([this.api.glossary(),this.api.sessions()]);
   if(this.fence.valid(epoch))this.patch({definitions,sessions});}
  catch(error){if(this.fence.valid(epoch))this.patch({error:message(error)});}
 }
 async define(term:string,meaning:string):Promise<boolean>{
  const epoch=this.fence.capture();
  try{await this.api.define(term,meaning);if(!this.fence.valid(epoch))return false;
   await this.loadManagement();return this.fence.valid(epoch);}
  catch(error){if(this.fence.valid(epoch))this.patch({error:message(error)});return false;}
 }
 async forget(id:string):Promise<boolean>{
  const epoch=this.fence.capture();
  try{await this.api.forget(id);if(!this.fence.valid(epoch))return false;
   await Promise.all([this.loadManagement(),this.refresh()]);return this.fence.valid(epoch);}
  catch(error){if(this.fence.valid(epoch))this.patch({error:message(error)});return false;}
 }
 async deleteCurrent():Promise<boolean>{
  const id=this.state.value?.id,epoch=this.fence.capture();if(!id)return false;
  try{await this.api.delete(id);if(!this.fence.valid(epoch))return false;
   this.drafts.reset(this.draftKey);this.restore=undefined;this.creation=this.nextId();this.attempt=undefined;
   this.patch({value:null,text:'',pending:false,busy:false,error:''});return true;}
  catch(error){if(this.fence.valid(epoch))this.patch({error:message(error)});return false;}
 }
 startNew(){
  this.fence.dispose();this.fence.attach(this.owner);this.attempt=undefined;this.restore=undefined;
  this.drafts.reset('new');this.draftKey='new';this.creation=this.nextId();
  this.patch({...empty(),caps:this.state.caps});
 }
 dispose(){this.fence.dispose();this.attempt=undefined;this.listeners.clear();}
}
