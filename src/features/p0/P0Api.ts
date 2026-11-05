import {validateContext} from './selection';
import type {JsonTransport} from '../../infrastructure/http/FetchClient';
import type {AIResult,Asset,BasicReading,Bootstrap,CatalogCard,Consent,ConsentKind,ContextEntry,Conversation,DataReceipt,DataRequest,Deck,FeedbackInput,InterpretationInput,Job,JobAccepted,Me,PreferencePatch,Page,ReadingInput,SelectedCard,Topic,Transcription,Turn,TurnInput,V2Reading} from './model';

const invalid=()=>new Error('서버 응답을 확인하지 못했어요. 입력한 내용은 유지됩니다.');
export function obj(v:unknown):Record<string,unknown>{if(typeof v!=='object'||v===null||Array.isArray(v))throw invalid();return v as Record<string,unknown>;}
function str(v:unknown):string{if(typeof v!=='string')throw invalid();return v;}
function bool(v:unknown):boolean{if(typeof v!=='boolean')throw invalid();return v;}
function num(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):number{if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)throw invalid();return v;}
function uuid(v:unknown):string{const s=str(v);if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(s))throw invalid();return s;}
function date(v:unknown):string{const s=str(v);if(!Number.isFinite(Date.parse(s)))throw invalid();return s;}
function nullable<T>(v:unknown,decode:(v:unknown)=>T):T|null{return v===null?null:decode(v);}
function arr<T>(v:unknown,decode:(v:unknown)=>T):T[]{if(!Array.isArray(v))throw invalid();return v.map(decode);}
function one<T extends string>(v:unknown,values:readonly T[]):T{if(!values.includes(v as T))throw invalid();return v as T;}
const topic=(v:unknown)=>one(v,['relationship','work','self','daily','care','start'] as const);
const state=(v:unknown)=>one(v,['queued','running','cancel_requested','succeeded','failed','cancelled'] as const);
const consentKind=(v:unknown)=>one(v,['ai_processing','journal_context','cloud_transcription'] as const);
export function decodeConsent(value:unknown):Consent{const v=obj(value);return {id:uuid(v.id),kind:consentKind(v.kind),policy_version:str(v.policy_version),granted:bool(v.granted),occurred_at:date(v.occurred_at)};}
export function decodeAsset(value:unknown):Asset{const v=obj(value);return {id:uuid(v.id),url:str(v.url),sha256:str(v.sha256),width:num(v.width,1),height:num(v.height,1),source_page:nullable(v.source_page,str),license_name:str(v.license_name),license_url:nullable(v.license_url,str)};}
export function decodeDeck(value:unknown):Deck{const v=obj(value);return {id:uuid(v.id),code:str(v.code),version:str(v.version),name:str(v.name),card_count:num(v.card_count,78,78),status:one(v.status,['candidate','published','retired']),back_asset:decodeAsset(v.back_asset)};}
export function decodeCard(value:unknown):CatalogCard{const v=obj(value);return {id:num(v.id,0,77),code:str(v.code),name_ko:str(v.name_ko),name_en:str(v.name_en),arcana:one(v.arcana,['major','minor']),suit:nullable(v.suit,x=>one(x,['wands','cups','swords','pentacles'])),basic_meaning:str(v.basic_meaning),image_asset:nullable(v.image_asset,decodeAsset)};}
function selected(value:unknown):SelectedCard{const v=obj(value),card=decodeCard(v.card),card_id=num(v.card_id,0,77);if(card.id!==card_id)throw invalid();return {card_id,card,position:num(v.position,1,3),position_label:str(v.position_label),orientation:one(v.orientation,['upright','reversed'])};}
export function decodeResult(value:unknown):AIResult{const v=obj(value);const actions=arr(v.actions,str);if(!actions.length||actions.length>3)throw invalid();return {kind:one(v.kind,['tarot','chat','insight']),empathy:str(v.empathy),summary:str(v.summary),card_insights:arr(v.card_insights,raw=>{const c=obj(raw);return {card_id:num(c.card_id,0,77),position:num(c.position,1,3),meaning:str(c.meaning),reflection:str(c.reflection)};}),advice:str(v.advice),actions,expression:one(v.expression,['calm','welcome','listen','encourage','joy','concern','serious']),follow_up_questions:arr(v.follow_up_questions,str),safety_mode:one(v.safety_mode,['standard','support'])};}
export function decodeReading(value:unknown):V2Reading{const v=obj(value);return {id:uuid(v.id),kind:one(v.kind,['daily','three_card']),topic:topic(v.topic),question:str(v.question),deck_version_id:uuid(v.deck_version_id),local_day:nullable(v.local_day,str),captured_timezone:str(v.captured_timezone),state:one(v.state,['draft','selected','generating','ready','failed']),version:num(v.version,1),slots:arr(v.slots,raw=>{const s=obj(raw);if(Object.keys(s).some(k=>k!=='id'&&k!=='index'))throw new Error('비공개 슬롯 응답을 확인하지 못했어요.');return {id:uuid(s.id),index:num(s.index,1,12)};}),selected_cards:arr(v.selected_cards,selected),result:nullable(v.result,decodeResult),created_at:date(v.created_at)};}
export function decodeJob(value:unknown):Job{const v=obj(value);return {id:uuid(v.id),kind:one(v.kind,['tarot','chat','insight','transcription']),state:state(v.state),version:num(v.version,1),resource_id:uuid(v.resource_id),result_url:nullable(v.result_url,str),error:nullable(v.error,raw=>{const e=obj(raw);return {code:str(e.code),message:str(e.message),retryable:bool(e.retryable)};}),created_at:date(v.created_at),finished_at:nullable(v.finished_at,date)};}
function accepted(value:unknown):JobAccepted{const v=obj(value);return {job_id:uuid(v.job_id),resource_id:uuid(v.resource_id),state:state(v.state),status_url:str(v.status_url),events_url:str(v.events_url)};}
function page<T>(value:unknown,decode:(v:unknown)=>T):Page<T>{const v=obj(value);return {items:arr(v.items,decode),next_cursor:nullable(v.next_cursor,str)};}
function conversation(value:unknown):Conversation{const v=obj(value);return {id:uuid(v.id),topic:topic(v.topic),tone:one(v.tone,['warm','giga']),state:one(v.state,['active','closed']),created_at:date(v.created_at),updated_at:date(v.updated_at)};}
function turn(value:unknown):Turn{const v=obj(value);return {id:uuid(v.id),conversation_id:uuid(v.conversation_id),turn_index:num(v.turn_index),text:str(v.text),answers:arr(v.answers,raw=>{const a=obj(raw);return {question_id:one(a.question_id,['control','support','action']),answer:bool(a.answer)};}),input_source:str(v.input_source),state:one(v.state,['accepted','generating','ready','failed','cancelled']),assistant_result:nullable(v.assistant_result,decodeResult),version:num(v.version,1),created_at:date(v.created_at)};}
function data(value:unknown):DataRequest{const v=obj(value);return {id:uuid(v.id),kind:one(v.kind,['export','erase']),state:one(v.state,['queued','running','completed','failed']),download_available:bool(v.download_available),expires_at:date(v.expires_at)};}
function decodeContextEntry(raw:unknown):ContextEntry{const v=obj(raw);return {id:uuid(v.id),local_day:str(v.local_day),mood:str(v.mood),body:str(v.body),version:num(v.version,1),created_at:date(v.created_at),updated_at:date(v.updated_at),source_reading_id:nullable(v.source_reading_id,uuid),source_turn_id:nullable(v.source_turn_id,uuid)};}
function decodeMe(value:unknown):Me{const v=obj(value),p=obj(v.preferences);return {id:uuid(v.id),kind:one(v.kind,['guest']),locale:str(v.locale),timezone:str(v.timezone),preferences:{tone:one(p.tone,['warm','giga']),reduced_motion:bool(p.reduced_motion),voice_mode:one(p.voice_mode,['device','cloud'])}};}
const pathId=(id:string)=>encodeURIComponent(id);
function mutation(body:unknown,key:string):RequestInit{return {method:'POST',headers:{'X-Idempotency-Key':key},...(body===undefined?{}:{body:JSON.stringify(body)})};}
export class P0Api{
 constructor(private readonly http:JsonTransport){}
 async bootstrap():Promise<Bootstrap>{const v=obj(await this.http.request('/v2/bootstrap')),limits=obj(v.limits),ota=obj(v.ota_policy);return {api_version:str(v.api_version),policy_version:str(v.policy_version),server_time:date(v.server_time),user:decodeMe(v.user),consents:arr(v.consents,decodeConsent),ota_policy:{channel:str(ota.channel),min_native_version:str(ota.min_native_version),updates_enabled:bool(ota.updates_enabled)},limits:{daily_ai_requests:num(limits.daily_ai_requests),question_max_chars:num(limits.question_max_chars,1),journal_max_chars:num(limits.journal_max_chars,1),audio_max_seconds:num(limits.audio_max_seconds,1),audio_max_bytes:num(limits.audio_max_bytes,1)}};}
 async updatePreferences(input:PreferencePatch):Promise<Me>{return decodeMe(await this.http.request('/v2/me/preferences',{method:'PATCH',body:JSON.stringify(input)}));}
 async refreshSession(){const v=obj(await this.http.request('/v2/sessions/refresh',{method:'POST'}));return {session_id:uuid(v.session_id),expires_at:date(v.expires_at)};}
 async consents(cursor?:string){return page(await this.http.request('/v2/me/consents?limit=50'+(cursor?'&cursor='+encodeURIComponent(cursor):'')),decodeConsent);}
 async consent(kind:ConsentKind,policy_version:string,granted:boolean,key:string){return decodeConsent(await this.http.request('/v2/me/consents',mutation({kind,policy_version,granted},key)));}
 async decks(){return page(await this.http.request('/v2/decks?limit=50'),decodeDeck);}
 async deck(id:string){return decodeDeck(await this.http.request('/v2/decks/'+pathId(id)));}
 async cards(deck:string,cursor?:string){return page(await this.http.request('/v2/cards?limit=50&deck_version_id='+pathId(deck)+(cursor?'&cursor='+encodeURIComponent(cursor):'')),decodeCard);}
 async card(id:number,deck:string){return decodeCard(await this.http.request('/v2/cards/'+id+'?deck_version_id='+pathId(deck)));}
 async createReading(input:ReadingInput,key:string){return decodeReading(await this.http.request('/v2/readings',mutation(input,key)));}
 async reading(id:string){return decodeReading(await this.http.request('/v2/readings/'+pathId(id)));}
 async deleteReading(id:string){await this.http.request('/v2/readings/'+pathId(id),{method:'DELETE'});}
 async readings(cursor?:string){return page(await this.http.request('/v2/readings?limit=50'+(cursor?'&cursor='+encodeURIComponent(cursor):'')),decodeReading);}
 async shuffle(id:string,version:number,key:string){return decodeReading(await this.http.request('/v2/readings/'+pathId(id)+'/shuffle',mutation({expected_version:version},key)));}
 async selectReading(id:string,version:number,slots:string[],key:string){return decodeReading(await this.http.request('/v2/readings/'+pathId(id)+'/selection',mutation({expected_version:version,slot_ids:slots},key)));}
 async basic(id:string):Promise<BasicReading>{const v=obj(await this.http.request('/v2/readings/'+pathId(id)+'/basic'));if(v.source!=='basic')throw invalid();return {reading_id:uuid(v.reading_id),source:'basic',summary:str(v.summary),cards:arr(v.cards,selected),advice:str(v.advice),action:str(v.action)};}
 async interpret(id:string,input:InterpretationInput,key:string){return accepted(await this.http.request('/v2/readings/'+pathId(id)+'/interpretations',mutation({...input,context_entry_versions:validateContext(input.context_entry_ids,input.context_entry_versions)},key)));}
 async createConversation(topic:Topic,tone:'warm'|'giga',key:string){return conversation(await this.http.request('/v2/conversations',mutation({topic,tone},key)));}
 async conversation(id:string){return conversation(await this.http.request('/v2/conversations/'+pathId(id)));}
 async closeConversation(id:string,key:string){return conversation(await this.http.request('/v2/conversations/'+pathId(id)+'/close',mutation(undefined,key)));}
 async deleteConversation(id:string){await this.http.request('/v2/conversations/'+pathId(id),{method:'DELETE'});}
 async conversations(cursor?:string){return page(await this.http.request('/v2/conversations?limit=50'+(cursor?'&cursor='+encodeURIComponent(cursor):'')),conversation);}
 async createTurn(id:string,input:TurnInput,key:string){return accepted(await this.http.request('/v2/conversations/'+pathId(id)+'/turns',mutation({...input,context_entry_versions:validateContext(input.context_entry_ids,input.context_entry_versions)},key)));}
 async turns(id:string,cursor?:string){return page(await this.http.request('/v2/conversations/'+pathId(id)+'/turns?limit=50'+(cursor?'&cursor='+encodeURIComponent(cursor):'')),turn);}
 async turn(conversationId:string,id:string){return turn(await this.http.request('/v2/conversations/'+pathId(conversationId)+'/turns/'+pathId(id)));}
 async job(id:string){return decodeJob(await this.http.request('/v2/ai/jobs/'+pathId(id)));}
 async cancel(id:string,key:string){return decodeJob(await this.http.request('/v2/ai/jobs/'+pathId(id)+'/cancel',mutation(undefined,key)));}
 async retry(id:string,key:string){return accepted(await this.http.request('/v2/ai/jobs/'+pathId(id)+'/retry',mutation(undefined,key)));}
 async transcribe(audio:Blob|{uri:string;name:string;type:string},duration:number,consent:string,key:string){const body=new FormData();body.append('audio',audio as Blob);body.append('duration_ms',String(duration));body.append('consent_event_id',consent);return accepted(await this.http.request('/v2/transcriptions',{method:'POST',body,headers:{'X-Idempotency-Key':key}}));}
 async transcription(id:string):Promise<Transcription>{const v=obj(await this.http.request('/v2/transcriptions/'+pathId(id)));return {id:uuid(v.id),state:one(v.state,['queued','running','ready','failed','deleted']),transcript:nullable(v.transcript,str),expires_at:date(v.expires_at)};}
 async deleteTranscription(id:string){await this.http.request('/v2/transcriptions/'+pathId(id),{method:'DELETE'});}
 async journals(cursor?:string,filters:{from?:string;to?:string;mood?:string}={}){const query=new URLSearchParams({limit:'50',...(cursor?{cursor}:{}),...filters});return page(await this.http.request('/v2/journal-entries?'+query.toString()),decodeContextEntry);}
 async journal(id:string){return decodeContextEntry(await this.http.request('/v2/journal-entries/'+pathId(id)));}
 async createDataRequest(input:{kind:'export'|'erase';confirmation?:string},key:string):Promise<DataReceipt>{const v=obj(await this.http.request('/v2/me/data-requests',mutation(input,key)));return {id:uuid(v.id),kind:one(v.kind,['export','erase']),state:one(v.state,['queued','running','completed','failed']),receipt:str(v.receipt),expires_at:date(v.expires_at)};}
 async dataRequest(id:string,receipt?:string){return data(await this.http.request('/v2/data-requests/'+pathId(id),receipt?{headers:{'X-Data-Receipt':receipt}}:{},!receipt));}
 async feedback(input:FeedbackInput,key:string){const v=obj(await this.http.request('/v2/feedback',mutation(input,key)));return {id:uuid(v.id),created_at:date(v.created_at)};}
}
