import assert from 'node:assert/strict';
import test from 'node:test';
import {CounselingController,type CounselingPort} from '../src/features/counseling/CounselingController';
import {DraftMemory} from '../src/features/counseling/DraftMemory';
import type {CounselingSession} from '../src/features/counseling/CounselingApi';

function view(changes:Partial<CounselingSession>={}):CounselingSession{return {
 id:'session',topic:'care',version:1,phase:'listening',acknowledgement:'',understanding:null,
 clarification_question:null,perspective:null,response_mode:'advice',search_queries:[],search_status:'not_requested',
 cards:[],draw:null,result:null,sources:[],glossary_used:[],history:[],job:null,...changes};}
const queued=()=>view({job:{id:'job',state:'queued',error_code:null}});
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
function setup(overrides:Partial<CounselingPort>={},sessionId?:string,memory=new DraftMemory(),initialText?:string){
 const calls:{kind:string;key?:string;payload?:unknown}[]=[];
 const api:CounselingPort={
  capabilities:async()=>({available:true,policy_version:'2026-11-05',card_counts:[1,3],glossary_limit:200,max_message_chars:2000}),
  create:async(_topic,key)=>{calls.push({kind:'create',key});return view();},
  get:async()=>view(),
  message:async(_id,payload,key)=>{calls.push({kind:'message',payload,key});return queued();},
  confirm:async(_id,payload,key)=>{calls.push({kind:'confirm',payload,key});return queued();},
  sessions:async()=>[],delete:async()=>{},glossary:async()=>[],
  define:async(term,definition)=>({id:'definition',term,definition,version:1}),forget:async()=>{},...overrides};
 let serial=0;
 return {controller:new CounselingController(api,()=>`request-${++serial}`,memory,{owner:'A',sessionId,initialText}),calls,memory};
}

test('double tap creates one session and one message while the first request is pending',async()=>{
 const pending=deferred<CounselingSession>();let messages=0;
 const {controller:c,calls}=setup({message:async()=>{messages++;return pending.promise;}});
 await c.initialize();c.setText('PRIVATE_STORY');const first=c.send('consent');
 await Promise.resolve();assert.equal(await c.send('consent'),false);
 pending.resolve(queued());assert.equal(await first,true);
 assert.equal(messages,1);assert.equal(calls.filter(x=>x.kind==='create').length,1);
 assert.equal(c.state.text,'');assert.equal(c.state.value?.job?.state,'queued');
});

test('manual retry preserves the original request and keeps text edited after an uncertain response',async()=>{
 const requests:unknown[][]=[];let attempt=0;
 const {controller:c}=setup({get:async()=>view({version:4}),message:async(id,payload,key)=>{
  requests.push([id,payload,key]);if(attempt++===0)throw Error('network');return queued();}},'session');
 await c.initialize();c.setText('original story');assert.equal(await c.send('consent',false),false);
 assert.equal(c.state.text,'original story');assert.equal(c.state.pending,true);
 c.setText('new text while waiting');assert.equal(await c.retry(),true);
 assert.deepEqual(requests[0],requests[1]);assert.equal(c.state.text,'new text while waiting');
 assert.equal(c.state.pending,false);
});

test('switching owner discards the old response and private drafts',async()=>{
 const pending=deferred<CounselingSession>();
 const {controller:c,memory}=setup({message:async()=>pending.promise},'session');
 await c.initialize();c.setText('A_PRIVATE_STORY');const sent=c.send('consent');
 c.attach('B');pending.resolve(queued());await sent;
 assert.equal(c.state.value,null);assert.equal(c.state.text,'');assert.equal(c.state.pending,false);
 assert.equal(memory.read(),undefined);assert.equal(c.state.error,'');
});

test('card confirmation is sent only after the server enters confirmation phase',async()=>{
 let next=view();const {controller:c,calls}=setup({get:async()=>next},'session');
 await c.initialize();assert.equal(await c.confirm('consent',3,true),false);
 next=view({phase:'confirmation',version:7});await c.refresh();
 assert.equal(await c.confirm('consent',1,false),true);
 const sent=calls.find(x=>x.kind==='confirm');
 assert.deepEqual(sent?.payload,{confirmed:true,expected_version:7,consent_event_id:'consent',card_count:1,web_search:false});
});

test('refreshing a failed server job never silently submits another paid operation',async()=>{
 let polls=0;const {controller:c,calls}=setup({get:async()=>{polls++;return view({job:{id:'job',state:'failed',error_code:'UNKNOWN_PROVIDER_OUTCOME'}});}});
 await c.initialize();c.setText('my story');await c.send('consent');await c.refresh();await c.refresh();
 assert.equal(polls,2);assert.equal(calls.filter(x=>x.kind==='message').length,1);
 assert.equal(calls.filter(x=>x.kind==='confirm').length,0);
});

test('voice review text takes precedence over an older navigation draft',async()=>{
 const memory=new DraftMemory();memory.attach('A');memory.write('new',{text:'older draft'});
 const {controller:c}=setup({},undefined,memory,'reviewed voice text');await c.initialize();
 assert.equal(c.state.text,'reviewed voice text');c.setText('still editing');c.dispose();
 const next=setup({},undefined,memory).controller;await next.initialize();
 assert.equal(next.state.text,'still editing');
});

test('an uncertain session creation reuses its creation key on the next explicit send',async()=>{
 const keys:string[]=[];const {controller:c}=setup({create:async(_topic,key)=>{
  keys.push(key);if(keys.length===1)throw Error('connection');return view();}});
 await c.initialize();c.setText('story');await c.send('consent');assert.equal(c.state.text,'story');
 await c.send('consent');assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);
});

test('deleting the current conversation clears its navigation draft and displayed result',async()=>{
 let deleted='';const {controller:c,memory}=setup({delete:async id=>{deleted=id;}},'session');
 await c.initialize();c.setText('private draft');assert.equal(await c.deleteCurrent(),true);
 assert.equal(deleted,'session');assert.equal(memory.read('session'),undefined);assert.equal(c.state.value,null);
});
