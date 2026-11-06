import {HttpError} from '../../infrastructure/http/FetchClient';
import type {JsonTransport} from '../../infrastructure/http/FetchClient';
import {decodeAsset} from '../p0/P0Api';
import {AdminSession} from './AdminSession';
import type {AdminRole} from './AdminSession';
import type {AdminEligibility,AdminMe,AdminDeck,Publication,CatalogState,AdminFeedback,AuditEvent,AuditValue,OtaPolicy,OtaUpdate,TriageStatus,RightsStatus} from './model';
const invalid=()=>new Error('운영 응답을 확인하지 못했어요. 다시 조회해 주세요.');
const closed=()=>new Error('운영 세션을 다시 시작해 주세요.');
function object(v:unknown):Record<string,unknown>{if(typeof v!=='object'||v===null||Array.isArray(v))throw invalid();return v as Record<string,unknown>;}
function str(v:unknown){if(typeof v!=='string')throw invalid();return v;}
function bool(v:unknown){if(typeof v!=='boolean')throw invalid();return v;}
function num(v:unknown,min=0){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min)throw invalid();return v;}
function uuid(v:unknown){const s=str(v);if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(s))throw invalid();return s;}
function date(v:unknown){const s=str(v);if(!Number.isFinite(Date.parse(s)))throw invalid();return s;}
function one<T extends string>(v:unknown,values:readonly T[]):T{if(!values.includes(v as T))throw invalid();return v as T;}
function nullable<T>(v:unknown,decode:(value:unknown)=>T):T|null{return v===null?null:decode(v);}
function array<T>(v:unknown,decode:(value:unknown)=>T):T[]{if(!Array.isArray(v))throw invalid();return v.map(decode);}
const role=(v:unknown):AdminRole=>one(v,['viewer','publisher']);
const triage=(v:unknown):TriageStatus=>one(v,['new','reviewing','resolved','dismissed']);
function deck(value:unknown):AdminDeck{const v=object(value);return {version_id:uuid(v.version_id),code:str(v.code),name:str(v.name),version:str(v.version),rights_status:one(v.rights_status,['unreviewed','approved','rejected']),review_version:num(v.review_version),review_note:str(v.review_note),published:bool(v.published),publication_version:num(v.publication_version),current_publication_id:nullable(v.current_publication_id,uuid),assets:array(v.assets,decodeAsset)};}
function publication(value:unknown):Publication{const v=object(value);return {id:uuid(v.id),version_id:uuid(v.version_id),code:str(v.code),action:one(v.action,['publish','rollback']),previous_id:nullable(v.previous_id,uuid),created_at:date(v.created_at)};}
function catalog(value:unknown):CatalogState{const v=object(value);return {items:array(v.items,deck),publications:array(v.publications,publication)};}
function feedback(value:unknown):AdminFeedback{const v=object(value);return {id:uuid(v.id),rating:one(v.rating,['helpful','unhelpful']),reason:str(v.reason),comment:str(v.comment),reading_id:nullable(v.reading_id,uuid),turn_id:nullable(v.turn_id,uuid),created_at:date(v.created_at),triage_status:triage(v.triage_status),triage_version:num(v.triage_version)};}
function metadata(value:unknown,depth=0):AuditValue{if(depth>8)throw invalid();if(value===null||typeof value==='string'||typeof value==='boolean')return value;if(typeof value==='number'&&Number.isFinite(value))return value;if(Array.isArray(value))return value.map(item=>metadata(item,depth+1));const v=object(value);return Object.fromEntries(Object.entries(v).map(([key,item])=>[key,metadata(item,depth+1)]));}
function audit(value:unknown):AuditEvent{const v=object(value);object(v.details);return {id:uuid(v.id),action:str(v.action),target_type:str(v.target_type),target_id:str(v.target_id),actor_owner_id:nullable(v.actor_owner_id,uuid),details:metadata(v.details) as AuditEvent['details'],created_at:date(v.created_at)};}
function ota(value:unknown):OtaPolicy{const v=object(value);return {channel:str(v.channel),min_native_version:str(v.min_native_version),updates_enabled:bool(v.updates_enabled),version:num(v.version)};}
function page<T>(value:unknown,decode:(value:unknown)=>T){const v=object(value);return {items:array(v.items,decode),next_cursor:nullable(v.next_cursor,str)};}
const path=(id:string)=>encodeURIComponent(id);
const json=(method:string,body:unknown):RequestInit=>({method,body:JSON.stringify(body)});
export class AdminApi{
 constructor(private readonly http:JsonTransport,readonly session:AdminSession){}
 async eligibility():Promise<AdminEligibility>{const v=object(await this.http.request('/v2/admin/eligibility')),eligible=bool(v.eligible),r=nullable(v.role,role);if(eligible!==(r!==null))throw invalid();return {eligible,role:r,session_seconds:num(v.session_seconds,1)};}
 async open(owner:string){const generation=this.session.begin(owner);try{const v=object(await this.http.request('/v2/admin/sessions',{method:'POST'})),token=str(v.access_token),ownerId=uuid(v.owner_id);uuid(v.session_id);if(!/^admin_[\da-f]{64}$/i.test(token)||owner!==ownerId)throw closed();if(!this.session.activate(owner,{token,expiresAt:date(v.expires_at),roles:[role(v.role)]},generation))throw closed();return this.session.snapshot;}catch(error){if(this.session.generation===generation)this.session.clear();throw error;}}
 async close(owner:string){let token:string|null=null;try{token=this.session.token(owner);}catch{}this.session.clear();if(token)await this.http.request('/v2/admin/sessions/current',{method:'DELETE',headers:{Authorization:'Bearer '+token}},false);}
 private async request(owner:string,url:string,options:RequestInit={}){const token=this.session.token(owner),generation=this.session.generation;try{const result=await this.http.request('/v2/admin'+url,{...options,headers:{...options.headers,Authorization:'Bearer '+token}},false);if(this.session.generation!==generation)throw closed();this.session.token(owner);return result;}catch(error){if(error instanceof HttpError&&[401,403].includes(error.status)&&this.session.generation===generation)this.session.clear();throw error;}}
 async me(owner:string):Promise<AdminMe>{const v=object(await this.request(owner,'/me')),ownerId=uuid(v.owner_id);if(ownerId!==owner){this.session.clear();throw closed();}return {owner_id:ownerId,role:role(v.role),expires_at:date(v.expires_at),audit_retention_days:nullable(v.audit_retention_days,x=>num(x,1))};}
 async catalog(owner:string){return catalog(await this.request(owner,'/catalog'));}
 async review(owner:string,id:string,version:number,status:Exclude<RightsStatus,'unreviewed'>,notes:string){return catalog(await this.request(owner,'/catalog/'+path(id)+'/review',json('POST',{expected_review_version:version,rights_status:status,notes})));}
 async publish(owner:string,id:string,reviewVersion:number,publicationVersion:number){return catalog(await this.request(owner,'/catalog/'+path(id)+'/publish',json('POST',{expected_review_version:reviewVersion,expected_publication_version:publicationVersion})));}
 async rollback(owner:string,id:string,publicationId:string,version:number){return catalog(await this.request(owner,'/catalog/'+path(id)+'/rollback',json('POST',{publication_id:publicationId,expected_publication_version:version})));}
 async feedback(owner:string,cursor?:string,status?:TriageStatus){const q=new URLSearchParams({limit:'20',...(cursor?{cursor}:{}),...(status?{status}:{})});return page(await this.request(owner,'/feedback?'+q),feedback);}
 async triage(owner:string,id:string,version:number,status:TriageStatus){return feedback(await this.request(owner,'/feedback/'+path(id)+'/triage',json('PATCH',{expected_version:version,status})));}
 async audit(owner:string,cursor?:string){return page(await this.request(owner,'/audit?limit=20'+(cursor?'&cursor='+path(cursor):'')),audit);}
 async ota(owner:string){return ota(await this.request(owner,'/ota-policy'));}
 async setOta(owner:string,input:OtaUpdate){return ota(await this.request(owner,'/ota-policy',json('PUT',input)));}
}
