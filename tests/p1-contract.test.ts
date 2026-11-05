import test from 'node:test';
import assert from 'node:assert/strict';
import {P1Api,decodeSummary,decodeInsight} from '../src/features/p1/P1Api';
import {journalWindow,daysInRange} from '../src/features/p1/dates';
import {insightSelection,insightRequest} from '../src/features/p1/selection';
import {SummaryLoader} from '../src/features/p1/SummaryLoader';
import type {Bootstrap} from '../src/features/p0/model';

const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const at='2026-11-06T00:00:00Z';
const summary=(from='2026-10-31',to='2026-11-06')=>({range_start:from,range_end:to,entry_count:2,days_with_entries:['2026-11-01','2026-11-06'],mood_counts:{calm:1,happy:1,thinking:0,settled:0,talk:0}});
const selection=()=>insightSelection('2026-11-01','2026-11-06',[{id:id(1),version:2,local_day:'2026-11-02'}]);
const consent=(kind:string,granted=true,n=10)=>({id:id(n),kind,policy_version:'2026-11-05',granted,occurred_at:at});
const boot=(consents:unknown[])=>({policy_version:'2026-11-05',consents}) as Bootstrap;
const accepted={job_id:id(2),resource_id:id(3),state:'queued',status_url:'/v2/ai/jobs/'+id(2),events_url:'/v2/ai/jobs/'+id(2)+'/events'};

test('journal windows use the user timezone and include leap day and both ends across month/year changes',()=>{
 assert.deepEqual(journalWindow(7,'Asia/Seoul',new Date('2026-11-05T15:01:00Z')),{range_start:'2026-10-31',range_end:'2026-11-06'});
 assert.deepEqual(journalWindow(7,'America/Los_Angeles',new Date('2026-11-06T00:00:00Z')),{range_start:'2026-10-30',range_end:'2026-11-05'});
 assert.equal(journalWindow(30,'UTC',new Date('2024-03-01T00:00:00Z')).range_start,'2024-02-01');
 assert.deepEqual(daysInRange('2024-02-28','2024-03-01'),['2024-02-28','2024-02-29','2024-03-01']);
 assert.equal(journalWindow(7,'UTC',new Date('2027-01-02T00:00:00Z')).range_start,'2026-12-27');
 assert.throws(()=>daysInRange('2026-02-29','2026-03-01'));
 assert.throws(()=>daysInRange('2026-11-06','2026-11-01'));
});

test('summary decoding rejects fabricated scores, inconsistent counts and out-of-range calendar days',()=>{
 assert.equal(decodeSummary(summary()).entry_count,2);
 assert.throws(()=>decodeSummary({...summary(),mood_counts:{...summary().mood_counts,calm:1.5}}));
 assert.throws(()=>decodeSummary({...summary(),entry_count:3}));
 assert.throws(()=>decodeSummary({...summary(),days_with_entries:['2026-10-30']}));
 assert.throws(()=>decodeSummary({...summary(),days_with_entries:['2026-11-06','2026-11-06']}));
});

test('summary is a GET with the inclusive dates and never starts an AI job',async()=>{
 const calls:string[]=[];const api=new P1Api({request:async(path,options)=>{assert.equal(options?.method,undefined);calls.push(path);return summary();}});
 await api.summary('2026-10-31','2026-11-06');assert.deepEqual(calls,['/v2/journal-summary?from=2026-10-31&to=2026-11-06']);
 await assert.rejects(api.summary('2026-11-06','2026-10-31'));assert.equal(calls.length,1);
});

test('changing a date range prevents a slower old summary from replacing current data',async()=>{
 let release!:(v:ReturnType<typeof summary>)=>void;
 const loader=new SummaryLoader({summary:async(from,to)=>from==='2026-10-31'?new Promise(r=>{release=r;}):summary(from,to)});
 const old=loader.load('2026-10-31','2026-11-06');await loader.load('2026-10-08','2026-11-06');release(summary());await old;
 assert.equal(loader.snapshot.value?.range_start,'2026-10-08');assert.equal(loader.snapshot.busy,false);
 const pending=loader.load('2026-10-31','2026-11-06');loader.dispose();release(summary());await pending;assert.equal(loader.snapshot.value,null);
});

test('favorites use the v2 reading ID, a stable mutation identity and cursor paging',async()=>{
 const calls:{path:string;options:RequestInit}[]=[];
 const api=new P1Api({request:async(path,options={})=>{calls.push({path,options});return options.method==='DELETE'?undefined:options.method==='POST'?{reading_id:id(1),created_at:at}:{items:[{reading_id:id(1),created_at:at}],next_cursor:'owned+/cursor'};}});
 assert.equal((await api.favorites()).items[0].reading_id,id(1));await api.favorites('owned+/cursor',50);await api.addFavorite(id(1),id(2));await api.removeFavorite(id(1));
 assert.equal(calls[0].path,'/v2/favorites?limit=20');assert.equal(calls[1].path,'/v2/favorites?limit=50&cursor=owned%2B%2Fcursor');
 assert.deepEqual(JSON.parse(String(calls[2].options.body)),{reading_id:id(1)});assert.equal(new Headers(calls[2].options.headers).get('X-Idempotency-Key'),id(2));assert.equal(calls[3].options.method,'DELETE');
 await assert.rejects(api.favorites(undefined,51));await assert.rejects(api.addFavorite('legacy-reading',id(2)));assert.equal(calls.length,4);
});

test('favorites preserve ownership errors and do not pretend a rejected save succeeded',async()=>{
 const failure=Object.assign(new Error('본인 리딩만 저장할 수 있어요.'),{status:404,code:'NOT_FOUND'});const api=new P1Api({request:async()=>{throw failure;}});
 await assert.rejects(api.addFavorite(id(9),id(10)),error=>error===failure);await assert.rejects(api.removeFavorite(id(9)),error=>error===failure);
});

test('insight selection is separate from the three-entry context and requires 1..10 unique current versions within the period',()=>{
 const ten=Array.from({length:10},(_,n)=>({id:id(n+1),version:n+1,local_day:'2026-11-02'}));assert.equal(insightSelection('2026-11-01','2026-11-06',ten).entries.length,10);
 assert.throws(()=>insightSelection('2026-11-01','2026-11-06',[...ten,ten[0]]));assert.throws(()=>insightSelection('2026-11-01','2026-11-06',[ten[0],ten[0]]));
 assert.throws(()=>insightSelection('2026-11-01','2026-11-06',[{...ten[0],version:0}]));assert.throws(()=>insightSelection('2026-11-01','2026-11-06',[{...ten[0],local_day:'2026-10-31'}]));
 assert.throws(()=>insightRequest(insightSelection('2026-11-01','2026-11-06',[]),boot([consent('ai_processing'),consent('journal_context',true,11)])));
});

test('both separate current consent purposes are required and journal body text never enters the insight payload',()=>{
 const input=insightRequest(selection(),boot([consent('ai_processing'),consent('journal_context',true,11)]));
 assert.deepEqual(input,{range_start:'2026-11-01',range_end:'2026-11-06',entry_ids:[id(1)],entry_versions:{[id(1)]:2},consent_event_id:id(10)});
 assert.throws(()=>insightRequest(selection(),boot([consent('ai_processing')])));
 assert.throws(()=>insightRequest(selection(),boot([consent('ai_processing',false),consent('journal_context',true,11)])));
 assert.throws(()=>insightRequest(selection(),boot([{...consent('ai_processing'),policy_version:'old'},consent('journal_context',true,11)])));
});

test('insight POST sends the selected IDs and versions only and accepts the persisted job contract',async()=>{
 let sent:RequestInit|undefined;const api=new P1Api({request:async(path,options)=>{assert.equal(path,'/v2/journal-insights');sent=options;return accepted;}});
 const input=insightRequest(selection(),boot([consent('ai_processing'),consent('journal_context',true,11)]));assert.deepEqual(await api.createInsight(input,id(4)),accepted);
 assert.deepEqual(JSON.parse(String(sent?.body)),input);assert.equal(new Headers(sent?.headers).get('X-Idempotency-Key'),id(4));
 await assert.rejects(api.createInsight({...input,entry_versions:{[id(1)]:0}},id(4)));
});

test('invalidated insight cannot expose a previous GPT result and source versions remain available for explicit source opening',()=>{
 const source={id:id(3),range_start:'2026-11-01',range_end:'2026-11-06',state:'invalidated',based_on_count:1,entry_ids:[id(1)],entry_versions:{[id(1)]:2},result:null};
 assert.equal(decodeInsight(source).result,null);assert.deepEqual(decodeInsight(source).entry_ids,[id(1)]);
 const result={kind:'insight',empathy:'e',summary:'s',card_insights:[],advice:'a',actions:['a'],expression:'listen',follow_up_questions:[],safety_mode:'standard'};
 assert.throws(()=>decodeInsight({...source,result}));assert.throws(()=>decodeInsight({...source,entry_versions:{}}));assert.throws(()=>decodeInsight({...source,state:'ready',result:{...result,kind:'tarot'}}));
 assert.equal(decodeInsight({...source,state:'ready',result}).result?.summary,'s');
});
