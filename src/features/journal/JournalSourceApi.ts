import type {JsonTransport} from '../../infrastructure/http/FetchClient';
import {decodeReading,decodeCounsel} from '../experience/ExperienceApi';
import type {Reading,Counsel} from '../experience/model';
export type JournalSource={kind:'reading_v2';reading_id:string}|{kind:'turn_v2';conversation_id:string;turn_id:string}|{kind:'legacy_reading';reading:Reading}|{kind:'legacy_counsel';counsel:Counsel};
function id(value:unknown):string{if(typeof value!=='string'||!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value))throw new Error('연결된 원본 응답을 확인하지 못했어요.');return value;}
function source(value:unknown):JournalSource{
 if(typeof value!=='object'||value===null||Array.isArray(value))throw new Error('연결된 원본 응답을 확인하지 못했어요.');
 const v=value as Record<string,unknown>;
 switch(v.kind){
  case'reading_v2':return {kind:v.kind,reading_id:id(v.reading_id)};
  case'turn_v2':return {kind:v.kind,conversation_id:id(v.conversation_id),turn_id:id(v.turn_id)};
  case'legacy_reading':{const reading=decodeReading(v.reading);id(reading.id);return {kind:v.kind,reading};}
  case'legacy_counsel':{const counsel=decodeCounsel(v.counsel);id(counsel.id);return {kind:v.kind,counsel};}
  default:throw new Error('연결된 원본 종류를 확인하지 못했어요.');
 }
}
export class JournalSourceApi{
 constructor(private readonly http:JsonTransport){}
 async get(entryId:string):Promise<JournalSource>{id(entryId);return source(await this.http.request('/v2/journal-entries/'+encodeURIComponent(entryId)+'/source'));}
}
