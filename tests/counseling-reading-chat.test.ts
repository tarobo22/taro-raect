import assert from 'node:assert/strict';
import test from 'node:test';
import {CounselingApi} from '../src/features/counseling/CounselingApi';
import {CounselingController} from '../src/features/counseling/CounselingController';
import {DraftMemory} from '../src/features/counseling/DraftMemory';

const view=()=>({id:'session',topic:'work',version:1,phase:'confirmation',acknowledgement:'',understanding:'확인한 고민',clarification_question:null,perspective:null,response_mode:'advice',search_queries:[],search_status:'not_requested',cards:[],draw:null,result:null,sources:[],glossary_used:[],history:[],job:null});
test('reading continuation attaches only the source id, then keeps the user followup separate',async()=>{
 const sent:{path:string;body:any;key:string|null}[]=[];
 const api=new CounselingApi({request:async(path,options)=>{
  if(path.endsWith('/capabilities'))return {available:true,policy_version:'2026-11-05',card_counts:[1,3,5],glossary_limit:200,max_message_chars:2000};
  sent.push({path,body:options?.body?JSON.parse(options.body as string):null,key:new Headers(options?.headers).get('X-Idempotency-Key')});return view();
 }});
 const controller=new CounselingController(api,()=> 'request-key',new DraftMemory(),{owner:'owner',topic:'work',sourceReadingId:'reading-id'});
 await controller.initialize();
 assert.deepEqual(sent[0].body,{topic:'work',source_reading_id:'reading-id'});
 assert.equal(sent[0].key,'reading-id');assert.equal(controller.state.text,'');
 controller.setText('지원서를 쓰기가 막막해요.');
 assert.equal(await controller.send('consent'),true);
 assert.equal(sent[1].body.text,'지원서를 쓰기가 막막해요.');
 assert.equal(sent.filter(call=>call.path==='/v2/counseling/sessions').length,1);
});
test('five-card choice reaches the confirmation API without being replaced by three',async()=>{
 let body:any;
 const api=new CounselingApi({request:async(path,options)=>{
  if(path.endsWith('/capabilities'))return {available:true,policy_version:'2026-11-05',card_counts:[1,3,5],glossary_limit:200,max_message_chars:2000};
  if(options?.body)body=JSON.parse(options.body as string);return view();
 }});
 const controller=new CounselingController(api,()=> 'request-key',new DraftMemory(),{owner:'owner',sessionId:'session'});
 await controller.initialize();assert.equal(await controller.confirm('consent',5,false),true);
 assert.equal(body.card_count,5);
});

test('returning from card details keeps the cleared draft and never borrows another chat',()=>{
 const memory=new DraftMemory();memory.attach('owner');
 memory.write('new',{text:'unrelated draft',sessionId:'unrelated-session'});
 memory.write('new-five-chat',{text:'',sessionId:'five-session'});
 const api=new CounselingApi({request:async()=>view()});
 const controller=new CounselingController(api,()=> 'request-key',memory,{owner:'owner',draftKey:'new-five-chat',initialText:'original question'});
 assert.equal(controller.state.text,'');
 const fresh=new CounselingController(api,()=> 'another-request',memory,{owner:'owner',draftKey:'new-three-chat',initialText:'new question'});
 assert.equal(fresh.state.text,'new question');
});
