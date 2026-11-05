import test from 'node:test';
import assert from 'node:assert/strict';
import {P0Api,decodeReading,decodeJob} from '../src/features/p0/P0Api';
import {JobObserver} from '../src/features/p0/JobObserver';
import {GuestSession} from '../src/infrastructure/http/GuestSession';
import {FetchClient,HttpError} from '../src/infrastructure/http/FetchClient';

const id='00000000-0000-4000-8000-000000000001';
const at='2026-11-06T00:00:00Z';
const job=(state='running')=>({id,kind:'tarot',state,version:1,resource_id:id,result_url:null,error:null,created_at:at,finished_at:null});
const accepted={job_id:id,resource_id:id,state:'queued',status_url:'/v2/ai/jobs/'+id,events_url:'/v2/ai/jobs/'+id+'/events'};

test('onboarding requires an explicit start and preserves a corrupt existing identity',async()=>{
 let creates=0,writes=0;const storage={read:async()=>null,write:async()=>{writes++;}};
 const session=new GuestSession(storage,async()=>{creates++;return {access_token:'a'.repeat(64)};},true);
 assert.equal(await session.hasStoredSession(),false);
 await assert.rejects(session.token(),/게스트로 시작/);assert.equal(creates,0);
 assert.deepEqual(await Promise.all([session.start(),session.start()]),['a'.repeat(64),'a'.repeat(64)]);
 assert.equal(creates,1);assert.equal(writes,1);
 const broken=new GuestSession({...storage,read:async()=>'damaged'},async()=>{creates++;return {token:'b'.repeat(64)};},true);
 await assert.rejects(broken.token(),/기존.*연결/);
 await assert.rejects(broken.start(),/기존.*연결/);assert.equal(creates,1);
});

test('v2 transport surfaces typed errors and keeps multipart boundaries intact',async()=>{
 let headers:Headers|undefined;
 const client=new FetchClient('http://api',100,async()=>'opaque',async(_url,options)=>{
  headers=new Headers(options?.headers);return new Response(JSON.stringify({error:{code:'SESSION_EXPIRED',message:'기기 연결 만료',retryable:false}}),{status:401});
 });
 const audio=new FormData();audio.append('duration_ms','1000');
 await assert.rejects(client.request('/v2/transcriptions',{method:'POST',body:audio}),error=>error instanceof HttpError&&error.status===401&&error.code==='SESSION_EXPIRED');
 assert.equal(headers?.has('Content-Type'),false);
});

test('hidden slots are opaque and selection sends ordered slot IDs with one stable identity',async()=>{
 const calls:{path:string;options:RequestInit}[]=[];
 const reading={id,kind:'three_card',topic:'self',question:'question',deck_version_id:id,local_day:null,captured_timezone:'Asia/Seoul',state:'draft',version:1,slots:[{id,index:1}],selected_cards:[],result:null,created_at:at};
 const api=new P0Api({request:async(path,options={})=>{calls.push({path,options});return reading;}});
 const result=await api.createReading({kind:'three_card',topic:'self',question:'question',deck_version_id:id},id);
 assert.deepEqual(result.slots,[{id,index:1}]);assert.equal('card_id' in result.slots[0],false);
 await api.selectReading(id,1,[id],id);
 assert.equal(calls[1].path,'/v2/readings/'+id+'/selection');
 assert.deepEqual(JSON.parse(String(calls[1].options.body)),{expected_version:1,slot_ids:[id]});
 assert.equal(new Headers(calls[1].options.headers).get('X-Idempotency-Key'),id);
 assert.throws(()=>decodeReading({...reading,slots:[{id,index:1,card_id:0}]}),/슬롯/);
});

test('AI requests use only explicitly chosen entry IDs and current consent',async()=>{
 const calls:{path:string;options:RequestInit}[]=[];
 const api=new P0Api({request:async(path,options={})=>{calls.push({path,options});return accepted;}});
 await api.interpret(id,{expected_version:2,consent_event_id:id,context_entry_ids:[]},id);
 assert.equal(calls[0].path,'/v2/readings/'+id+'/interpretations');
 assert.deepEqual(JSON.parse(String(calls[0].options.body)).context_entry_ids,[]);
 await api.createTurn(id,{client_message_id:id,input_source:'text',text:'my words',answers:[],context_entry_ids:[id],context_entry_versions:{[id]:1},consent_event_id:id},id);
 assert.deepEqual(JSON.parse(String(calls[1].options.body)).context_entry_ids,[id]);
 assert.equal(calls[1].path,'/v2/conversations/'+id+'/turns');
});

test('job observation never retries provider work or publishes a stale response',async()=>{
 let resolve!:(value:unknown)=>void,requests=0;const seen:unknown[]=[];
 const observer=new JobObserver({job:async()=>{requests++;return new Promise(r=>{resolve=r;});}});
 const pending=observer.refresh(id,value=>seen.push(value));observer.dispose();resolve(job('succeeded'));await pending;
 assert.equal(requests,1);assert.deepEqual(seen,[]);
 assert.throws(()=>decodeJob({...job(),state:'pretend-finished'}));
});

test('failed export or receipt decoding cannot display completion',async()=>{
 let sent:RequestInit|undefined;
 const api=new P0Api({request:async(_path,options)=>{sent=options;return {id,kind:'erase',state:'queued',receipt:'receipt',expires_at:at};}});
 const result=await api.createDataRequest({kind:'erase',confirmation:'내 기록 모두 삭제'},id);
 assert.equal(result.state,'queued');assert.equal(result.kind,'erase');
 assert.deepEqual(JSON.parse(String(sent?.body)),{kind:'erase',confirmation:'내 기록 모두 삭제'});
 await assert.rejects(new P0Api({request:async()=>({id,kind:'export',state:'success'})}).dataRequest(id),/응답/);
});
