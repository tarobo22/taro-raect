import type {JsonTransport} from '../../infrastructure/http/FetchClient';
import {decodeResult,obj} from '../p0/P0Api';
import type {JobAccepted,Page} from '../p0/model';
import {journalRange} from './dates';
import {validId,validateInsightInput} from './selection';
import {moodLabels} from './model';
import type {Favorite,Insight,InsightInput,JournalSummary,MoodCode} from './model';

const invalid=()=>new Error('서버 응답을 확인하지 못했어요. 선택한 기록은 유지됩니다.');
function string(v:unknown):string{if(typeof v!=='string')throw invalid();return v;}
function id(v:unknown):string{if(!validId(v))throw invalid();return v;}
function integer(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):number{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)throw invalid();return v;}
function timestamp(v:unknown){const value=string(v);if(!Number.isFinite(Date.parse(value)))throw invalid();return value;}
function strings(v:unknown):string[]{if(!Array.isArray(v))throw invalid();return v.map(string);}
export function decodeSummary(raw:unknown):JournalSummary{
 const v=obj(raw),range=journalRange(string(v.range_start),string(v.range_end)),counts=obj(v.mood_counts),days=strings(v.days_with_entries),count=integer(v.entry_count),mood_counts={} as Record<MoodCode,number>;
 for(const mood of Object.keys(moodLabels) as MoodCode[])mood_counts[mood]=integer(counts[mood]);
 if(Object.keys(counts).length!==5||Object.values(mood_counts).reduce((a,b)=>a+b,0)!==count||new Set(days).size!==days.length||days.length>count||days.some((d,i)=>{try{journalRange(d,d);}catch{return true;}return d<range.range_start||d>range.range_end||(i>0&&days[i-1]>=d);})||(count===0)!==(days.length===0))throw invalid();
 return {...range,entry_count:count,days_with_entries:days,mood_counts};
}
function favorite(raw:unknown):Favorite{const v=obj(raw);return {reading_id:id(v.reading_id),created_at:timestamp(v.created_at)};}
export function decodeInsight(raw:unknown):Insight{
 const v=obj(raw),range=journalRange(string(v.range_start),string(v.range_end)),state=string(v.state),entry_ids=strings(v.entry_ids).map(id),versions=obj(v.entry_versions),entry_versions=Object.fromEntries(Object.entries(versions).map(([k,value])=>[id(k),integer(value,1)])),based_on_count=integer(v.based_on_count,1,10);
 if(!['draft','generating','ready','failed','invalidated','cancelled'].includes(state)||entry_ids.length!==based_on_count||new Set(entry_ids).size!==entry_ids.length||Object.keys(entry_versions).length!==entry_ids.length||entry_ids.some(source=>!Object.hasOwn(entry_versions,source)))throw invalid();
 const result=v.result===null?null:decodeResult(v.result);
 if((state==='ready'&&(!result||result.kind!=='insight'))||(state!=='ready'&&result!==null))throw invalid();
 return {...range,id:id(v.id),state:state as Insight['state'],based_on_count,entry_ids,entry_versions,result};
}
function accepted(raw:unknown):JobAccepted{const v=obj(raw),state=string(v.state);if(!['queued','running','cancel_requested','succeeded','failed','cancelled'].includes(state))throw invalid();return {job_id:id(v.job_id),resource_id:id(v.resource_id),state:state as JobAccepted['state'],status_url:string(v.status_url),events_url:string(v.events_url)};}
export class P1Api{
 constructor(private readonly http:JsonTransport){}
 async summary(from:string,to:string){journalRange(from,to);const result=decodeSummary(await this.http.request('/v2/journal-summary?'+new URLSearchParams({from,to}).toString()));if(result.range_start!==from||result.range_end!==to)throw invalid();return result;}
 async favorites(cursor?:string,limit=20):Promise<Page<Favorite>>{integer(limit,1,50);const query=new URLSearchParams({limit:String(limit),...(cursor?{cursor}:{})}),v=obj(await this.http.request('/v2/favorites?'+query.toString()));if(!Array.isArray(v.items))throw invalid();return {items:v.items.map(favorite),next_cursor:v.next_cursor===null?null:string(v.next_cursor)};}
 async addFavorite(readingId:string,key:string){id(readingId);id(key);const saved=favorite(await this.http.request('/v2/favorites',{method:'POST',headers:{'X-Idempotency-Key':key},body:JSON.stringify({reading_id:readingId})}));if(saved.reading_id!==readingId)throw invalid();return saved;}
 async removeFavorite(readingId:string){id(readingId);await this.http.request('/v2/favorites/'+encodeURIComponent(readingId),{method:'DELETE'});}
 async isFavorite(readingId:string){id(readingId);let cursor:string|undefined;const seen=new Set<string>();do{const page=await this.favorites(cursor,50);if(page.items.some(item=>item.reading_id===readingId))return true;if(!page.next_cursor)return false;if(seen.has(page.next_cursor))throw invalid();seen.add(page.next_cursor);cursor=page.next_cursor;}while(cursor);return false;}
 async createInsight(input:InsightInput,key:string){const checked=validateInsightInput(input);id(key);return accepted(await this.http.request('/v2/journal-insights',{method:'POST',headers:{'X-Idempotency-Key':key},body:JSON.stringify(checked)}));}
 async insight(insightId:string){id(insightId);const result=decodeInsight(await this.http.request('/v2/journal-insights/'+encodeURIComponent(insightId)));if(result.id!==insightId)throw invalid();return result;}
}
