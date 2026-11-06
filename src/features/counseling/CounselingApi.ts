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

function obj(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('대화 응답을 확인하지 못했어요.');return v as Record<string,unknown>;}
function str(v:unknown):string{if(typeof v!=='string')throw Error('대화 응답을 확인하지 못했어요.');return v;}
function list(v:unknown):unknown[]{if(!Array.isArray(v))throw Error('대화 응답을 확인하지 못했어요.');return v;}
function definition(v:unknown):Definition{const d=obj(v);return {id:str(d.id),term:str(d.term),definition:str(d.definition),version:Number(d.version)};}
function state(value:unknown):CounselingSession{
 const v=obj(value);str(v.id);str(v.topic);
 if(!['listening','clarifying','confirmation','advice','support'].includes(str(v.phase))||!Number.isInteger(v.version))throw Error('대화 상태를 확인하지 못했어요.');
 const cards=list(v.cards);for(const raw of cards){const c=obj(raw),card=obj(c.card);if(c.card_id!==card.id||!Number.isInteger(c.card_id))throw Error('카드 응답을 확인하지 못했어요.');str(card.name_ko);str(card.basic_meaning);}
 const sources=list(v.sources);for(const raw of sources){const s=obj(raw);str(s.id);str(s.title);if(!['web','user_definition','tarot_reference'].includes(str(s.kind)))throw Error('출처 응답을 확인하지 못했어요.');}
 if(v.result){const r=obj(v.result);str(r.empathy);str(r.advice);list(r.actions).forEach(str);const refs=list(r.tarot).map(x=>obj(x).card_id);if(JSON.stringify(refs)!==JSON.stringify(cards.map(c=>obj(c).card_id)))throw Error('카드와 해석이 일치하지 않아요.');const ids=new Set(sources.map(s=>obj(s).id));for(const f of list(r.facts)){str(obj(f).text);if(list(obj(f).source_ids).some(id=>!ids.has(id)))throw Error('출처를 확인하지 못했어요.');}}
 return value as CounselingSession;
}
const path=(id:string)=>'/v2/counseling/sessions/'+encodeURIComponent(id);
function post(body:unknown,key:string):RequestInit{return {method:'POST',headers:{'X-Idempotency-Key':key},body:JSON.stringify(body)};}

export class CounselingApi{
 constructor(private readonly http:JsonTransport){}
 async capabilities(){return await this.http.request('/v2/counseling/capabilities') as Capabilities;}
 async create(topic:Topic,key:string){return state(await this.http.request('/v2/counseling/sessions',post({topic},key)));}
 async get(id:string){return state(await this.http.request(path(id)));}
 async sessions(){const v=obj(await this.http.request('/v2/counseling/sessions'));return list(v.items) as unknown as SessionSummary[];}
 async delete(id:string){await this.http.request(path(id),{method:'DELETE'});}
 async message(id:string,input:MessageInput,key:string){return state(await this.http.request(path(id)+'/messages',post(input,key)));}
 async confirm(id:string,input:ConfirmInput,key:string){return state(await this.http.request(path(id)+'/confirmation',post(input,key)));}
 async glossary(){const v=obj(await this.http.request('/v2/counseling/glossary'));return list(v.items).map(definition);}
 async define(term:string,meaning:string){return definition(await this.http.request('/v2/counseling/glossary',{method:'PUT',body:JSON.stringify({term,definition:meaning})}));}
 async forget(id:string){await this.http.request('/v2/counseling/glossary/'+encodeURIComponent(id),{method:'DELETE'});}
}

/** Late responses from an unmounted/previous account must never publish. */
export class OwnerFence{
 private owner='';private epoch=0;
 attach(owner:string){if(owner!==this.owner){this.owner=owner;this.epoch++;}}
 capture(){return this.epoch;}
 valid(captured:number){return captured===this.epoch;}
 dispose(){this.epoch++;this.owner='';}
}
