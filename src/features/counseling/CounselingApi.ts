import type {JsonTransport} from '../../infrastructure/http/FetchClient';
import type {SelectedCard,Topic} from '../p0/model';

export interface Definition{id:string;term:string;definition:string;version:number;}
export interface Source{id:string;kind:'web'|'user_definition'|'tarot_reference';title:string;url:string|null;retrieved_at?:string|null;}
export interface CounselResult{empathy:string;facts:{text:string;source_ids:string[]}[];tarot:{card_id:number;reflection:string}[];advice:string;actions:string[];follow_up_question:string|null;safety_mode:'standard'|'support';}
export interface CounselingSession{id:string;topic:Topic;version:number;phase:'listening'|'clarifying'|'confirmation'|'advice'|'support';acknowledgement:string;understanding:string|null;clarification_question:string|null;perspective:string|null;response_mode:'advice'|'listen';search_queries:string[];search_status:string;cards:SelectedCard[];draw:{id:string;method:string;at:string;without_replacement:boolean}|null;result:CounselResult|null;sources:Source[];glossary_used:Definition[];history:{role:'user'|'assistant';text:string}[];job:{id:string;state:'queued'|'running'|'succeeded'|'failed';error_code:string|null}|null;}
export interface SessionSummary{id:string;topic:Topic;phase:string;summary:string;updated_at:string;}
export interface Capabilities{available:boolean;policy_version:string;card_counts:number[];glossary_limit:number;max_message_chars:number;}
export interface MessageInput{text:string;expected_version:number;consent_event_id:string;remember_definitions:boolean;}
export interface ConfirmInput{confirmed:true;expected_version:number;consent_event_id:string;web_search:boolean;card_count:1|3;}

const invalid=()=>new Error('대화 응답을 확인하지 못했어요. 다시 연결해 주세요.');
function record(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw invalid();
 return value as Record<string,unknown>;
}
function text(value:unknown):string{if(typeof value!=='string')throw invalid();return value;}
function array(value:unknown):unknown[]{if(!Array.isArray(value))throw invalid();return value;}
function positive(value:unknown):number{if(typeof value!=='number'||!Number.isInteger(value)||value<1)throw invalid();return value;}
function boolean(value:unknown):boolean{if(typeof value!=='boolean')throw invalid();return value;}
function oneOf(value:unknown,choices:readonly string[]):string{const result=text(value);if(!choices.includes(result))throw invalid();return result;}
function nullableText(value:unknown){if(value!==null)text(value);}
const topics=['relationship','work','self','daily','care','start'] as const;

function publicUrl(value:unknown){
 if(typeof value!=='string'||/\s/.test(value))return false;
 try{const url=new URL(value),host=url.hostname.toLowerCase().replace(/\.$/,'');
  return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&host.includes('.')&&
   !/^[\d.]+$/.test(host)&&!host.startsWith('[')&&!/(?:^|\.)(?:localhost|local|internal)$/.test(host);
 }catch{return false;}
}
function definition(value:unknown):Definition{
 const row=record(value);text(row.id);text(row.term);text(row.definition);positive(row.version);
 return value as Definition;
}
function decode(value:unknown):CounselingSession{
 const view=record(value);text(view.id);oneOf(view.topic,topics);positive(view.version);
 oneOf(view.phase,['listening','clarifying','confirmation','advice','support']);
 oneOf(view.response_mode,['advice','listen']);text(view.acknowledgement);
 nullableText(view.understanding);nullableText(view.clarification_question);nullableText(view.perspective);
 array(view.search_queries).forEach(text);text(view.search_status);
 array(view.glossary_used).forEach(definition);
 for(const item of array(view.history)){const turn=record(item);oneOf(turn.role,['user','assistant']);text(turn.text);}
 const cards=array(view.cards),cardIds:number[]=[];
 for(const item of cards){const selected=record(item),card=record(selected.card),id=selected.card_id;
  if(typeof id!=='number'||!Number.isInteger(id)||id<0||id>77||card.id!==id||cardIds.includes(id))throw invalid();
  positive(selected.position);text(card.name_ko);text(card.basic_meaning);cardIds.push(id);
 }
 const sources=array(view.sources),factual=new Set<string>();
 for(const item of sources){const source=record(item),id=text(source.id);
  oneOf(source.kind,['web','user_definition','tarot_reference']);text(source.title);nullableText(source.url);
  if(source.kind==='web'&&!publicUrl(source.url))throw invalid();
  if(source.kind==='web'||source.kind==='user_definition')factual.add(id);
 }
 if(view.draw!==null){const draw=record(view.draw);text(draw.id);text(draw.method);text(draw.at);boolean(draw.without_replacement);}
 if(view.job!==null){const job=record(view.job);text(job.id);oneOf(job.state,['queued','running','succeeded','failed']);nullableText(job.error_code);}
 if(view.result!==null){const result=record(view.result);text(result.empathy);text(result.advice);
  array(result.actions).forEach(text);nullableText(result.follow_up_question);oneOf(result.safety_mode,['standard','support']);
  const reflected=array(result.tarot).map(item=>{const reflection=record(item);text(reflection.reflection);return reflection.card_id;});
  if(JSON.stringify(reflected)!==JSON.stringify(cardIds))throw invalid();
  for(const item of array(result.facts)){const claim=record(item);text(claim.text);
   const refs=array(claim.source_ids);if(!refs.length||refs.some(id=>!factual.has(text(id))))throw invalid();}
 }
 return value as CounselingSession;
}
function post(body:unknown,key:string):RequestInit{return {method:'POST',headers:{'X-Idempotency-Key':key},body:JSON.stringify(body)};}
const sessionPath=(id:string)=>'/v2/counseling/sessions/'+encodeURIComponent(id);

export class CounselingApi {
 constructor(private readonly http:JsonTransport){}
 async capabilities():Promise<Capabilities>{
  const value=await this.http.request('/v2/counseling/capabilities'),caps=record(value);
  boolean(caps.available);text(caps.policy_version);positive(caps.glossary_limit);positive(caps.max_message_chars);
  if(array(caps.card_counts).some(count=>count!==1&&count!==3))throw invalid();
  return value as Capabilities;
 }
 async create(topic:Topic,key:string){return decode(await this.http.request('/v2/counseling/sessions',post({topic},key)));}
 async get(id:string){return decode(await this.http.request(sessionPath(id)));}
 async message(id:string,input:MessageInput,key:string){
  const body={text:input.text,expected_version:input.expected_version,consent_event_id:input.consent_event_id,remember_definitions:input.remember_definitions};
  return decode(await this.http.request(sessionPath(id)+'/messages',post(body,key)));
 }
 async confirm(id:string,input:ConfirmInput,key:string){
  const body={confirmed:input.confirmed,expected_version:input.expected_version,consent_event_id:input.consent_event_id,web_search:input.web_search,card_count:input.card_count};
  return decode(await this.http.request(sessionPath(id)+'/confirmation',post(body,key)));
 }
 async sessions():Promise<SessionSummary[]>{
  const items=array(record(await this.http.request('/v2/counseling/sessions')).items);
  for(const item of items){const row=record(item);text(row.id);oneOf(row.topic,topics);text(row.phase);text(row.summary);text(row.updated_at);}
  return items as SessionSummary[];
 }
 async delete(id:string){await this.http.request(sessionPath(id),{method:'DELETE'});}
 async glossary(){return array(record(await this.http.request('/v2/counseling/glossary')).items).map(definition);}
 async define(term:string,meaning:string){return definition(await this.http.request('/v2/counseling/glossary',
  {method:'PUT',body:JSON.stringify({term,definition:meaning})}));}
 async forget(id:string){await this.http.request('/v2/counseling/glossary/'+encodeURIComponent(id),{method:'DELETE'});}
}

/** Invalidates all late asynchronous publishers on owner change or unmount. */
export class OwnerFence {
 private owner='';private generation=0;
 attach(owner:string){if(owner!==this.owner){this.owner=owner;this.generation++;}}
 capture(){return this.generation;}
 valid(generation:number){return generation===this.generation;}
 dispose(){this.owner='';this.generation++;}
}
