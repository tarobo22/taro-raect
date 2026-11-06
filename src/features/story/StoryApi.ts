import type {JsonTransport} from '../../infrastructure/http/FetchClient';
import type {StoryChoice,StoryEpisode,StoryExpression,StoryRun,StoryStart} from './model';
const invalid=()=>new Error('이야기 응답을 확인하지 못했어요. 진행을 다시 확인해 주세요.');
function object(v:unknown){if(typeof v!=='object'||v===null||Array.isArray(v))throw invalid();return v as Record<string,unknown>;}
function string(v:unknown):string{if(typeof v!=='string'||!v.trim())throw invalid();return v;}
function id(v:unknown){const value=string(v);if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value))throw invalid();return value;}
function integer(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)throw invalid();return v;}
function date(v:unknown){const value=string(v);if(!Number.isFinite(Date.parse(value)))throw invalid();return value;}
function episodeId(v:unknown){const value=string(v);if(!/^[a-z][a-z0-9-]{0,47}$/.test(value))throw invalid();return value;}
function episodeVersion(v:unknown){const value=string(v);if(!/^\d+\.\d+\.\d+$/.test(value)||value.length>32)throw invalid();return value;}
function episode(raw:unknown):StoryEpisode{const v=object(raw),minimum=integer(v.min_choices,3,5),maximum=integer(v.max_choices,3,5);if(minimum>maximum)throw invalid();return {id:episodeId(v.id),version:episodeVersion(v.version),title:string(v.title),summary:string(v.summary),min_choices:minimum,max_choices:maximum};}
export function decodeStoryRun(raw:unknown):StoryRun{
 const v=object(raw),state=string(v.state),count=integer(v.choice_count,0,5);if(!['active','completed','restarted'].includes(state))throw invalid();
 const current=v.current_node===null?null:object(v.current_node),end=v.ending===null?null:object(v.ending),completed=v.completed_at===null?null:date(v.completed_at);
 if(state==='active'&&(!current||end!==null||completed!==null||count>=5)||state==='completed'&&(current!==null||!end||!completed||count<3)||state==='restarted'&&(current!==null||end!==null||!completed))throw invalid();
 const expression=current?string(current.expression):null;if(expression&&!['calm','welcome','listen','encourage','joy','concern','serious'].includes(expression))throw invalid();
 return {id:id(v.id),episode_id:episodeId(v.episode_id),episode_version:episodeVersion(v.episode_version),title:string(v.title),state:state as StoryRun['state'],version:integer(v.version,1),choice_count:count,current_node:current?{id:string(current.id),prompt:string(current.prompt),expression:expression as StoryExpression}:null,ending:end?{id:string(end.id),title:string(end.title),body:string(end.body),action:string(end.action)}:null,created_at:date(v.created_at),updated_at:date(v.updated_at),completed_at:completed};
}
const post=(body:unknown,key:string)=>{id(key);return {method:'POST',headers:{'X-Idempotency-Key':key},body:JSON.stringify(body)};};
export class StoryApi{
 constructor(private readonly http:JsonTransport){}
 async episodes(){const v=object(await this.http.request('/v2/story-episodes'));if(!Array.isArray(v.items))throw invalid();return {items:v.items.map(episode)};}
 async progress(episode:string){episodeId(episode);const v=object(await this.http.request('/v2/story-progress?'+new URLSearchParams({episode_id:episode})));return {run:v.run===null?null:decodeStoryRun(v.run)};}
 async run(runId:string){id(runId);const run=decodeStoryRun(await this.http.request('/v2/story-runs/'+encodeURIComponent(runId)));if(run.id!==runId)throw invalid();return run;}
 async start(input:StoryStart,key:string){episodeId(input.episode_id);episodeVersion(input.episode_version);return decodeStoryRun(await this.http.request('/v2/story-runs',post(input,key)));}
 async choose(runId:string,input:StoryChoice,key:string){id(runId);integer(input.expected_version,1);string(input.node_id);if(typeof input.answer!=='boolean')throw invalid();const result=decodeStoryRun(await this.http.request('/v2/story-runs/'+encodeURIComponent(runId)+'/choices',post(input,key)));if(result.id!==runId||result.version<input.expected_version)throw invalid();return result;}
 async restart(runId:string,version:number,key:string){id(runId);integer(version,1);return decodeStoryRun(await this.http.request('/v2/story-runs/'+encodeURIComponent(runId)+'/restart',post({expected_version:version},key)));}
}
