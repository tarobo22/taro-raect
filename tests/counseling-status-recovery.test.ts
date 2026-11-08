import assert from 'node:assert/strict';
import test from 'node:test';
import {CounselingController,type CounselingPort} from '../src/features/counseling/CounselingController';
import type {CounselingSession} from '../src/features/counseling/CounselingApi';
import {DraftMemory} from '../src/features/counseling/DraftMemory';
import {FetchClient,HttpError} from '../src/infrastructure/http/FetchClient';

const view:CounselingSession={id:'session',topic:'care',version:1,phase:'listening',acknowledgement:'',understanding:null,
 clarification_question:null,perspective:null,response_mode:'advice',search_queries:[],search_status:'not_requested',
 cards:[],draw:null,result:null,sources:[],glossary_used:[],history:[],job:null};
const queued:CounselingSession={...view,job:{id:'job',state:'queued',error_code:null}};
const completed:CounselingSession={...view,version:2,job:{id:'job',state:'succeeded',error_code:null}};

function setup(get:CounselingPort['get']){
 const messages:string[]=[];
 const api:CounselingPort={
  capabilities:async()=>({available:true,policy_version:'v1',card_counts:[1,3],glossary_limit:200,max_message_chars:12}),
  create:async()=>view,get,message:async(_id,body)=>{messages.push(body.text);return queued;},confirm:async()=>queued,
  sessions:async()=>[],delete:async()=>{},glossary:async()=>[],
  define:async(term,definition)=>({id:'definition',term,definition,version:1}),forget:async()=>{},
 };
 const drafts=new DraftMemory();let key=0;
 return {controller:new CounselingController(api,()=>String(++key),drafts,{owner:'owner'}),messages,drafts};
}

test('a terminal status error stops polling and keeps the next draft editable until a successful GET',async()=>{
 let readable=false;
 const {controller,drafts,messages}=setup(async()=>{
  if(!readable)throw new HttpError('상담 상태를 확인하지 못했어요.',404);return completed;
 });
 await controller.initialize();controller.setText('시험 고민');await controller.send('consent');
 assert.equal(controller.processing,true);
 assert.equal(await controller.refresh(),null);
 assert.equal(controller.processing,false);
 assert.equal(controller.state.statusUnavailable,true);
 controller.setText('다음 이야기');
 assert.equal(drafts.read('new')?.text,'다음 이야기');
 assert.equal(await controller.send('consent'),false);
 readable=true;assert.equal(await controller.refresh(),null);
 assert.equal(controller.state.statusUnavailable,false);
 assert.equal(await controller.send('consent'),true);
 assert.deepEqual(messages,['시험 고민','다음 이야기']);
});

test('temporary status failures back off and pause after repeated failures',async()=>{
 let errors=0;
 const {controller}=setup(async()=>{errors++;throw new HttpError('busy',errors===1?429:503);});
 await controller.initialize();controller.setText('시험 고민');await controller.send('consent');
 assert.equal(await controller.refresh(),1000);
 assert.equal(await controller.refresh(),2000);
 assert.equal(await controller.refresh(),4000);
 assert.equal(await controller.refresh(),null);
 assert.equal(controller.processing,false);
 assert.equal(controller.state.statusUnavailable,true);
});

test('the controller honors the server message limit and supported card counts',async()=>{
 const {controller,messages}=setup(async()=>completed);
 await controller.initialize();controller.setText('0123456789012');
 assert.equal(await controller.send('consent'),false);
 controller.setText('012345678901');
 assert.equal(await controller.send('consent',true,{cardCount:5,webSearch:false}),false);
 assert.equal(await controller.send('consent',true,{cardCount:3,webSearch:false}),true);
 assert.deepEqual(messages,['012345678901']);
});

test('the message limit counts emoji as server-side Unicode code points',async()=>{
 const {controller,messages}=setup(async()=>completed);
 await controller.initialize();
 const text='🌿'.repeat(12);
 controller.setText(text+'가');assert.equal(await controller.send('consent'),false);
 controller.setText(text);assert.equal(await controller.send('consent'),true);
 assert.deepEqual(messages,[text]);
});

test('an HTML gateway error and an empty authorization error retain their HTTP status',async()=>{
 for(const [status,body] of [[503,'<html>unavailable</html>'],[401,'']] as const){
  const client=new FetchClient('',1000,async()=>'',async()=>new Response(body,{status}));
  await assert.rejects(client.request('/status',{},false),error=>error instanceof HttpError&&error.status===status);
 }
});
