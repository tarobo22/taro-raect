import assert from 'node:assert/strict';
import test from 'node:test';
import {CounselingApi} from '../src/features/counseling/CounselingApi';
import {CounselingController} from '../src/features/counseling/CounselingController';
import {DraftMemory} from '../src/features/counseling/DraftMemory';

const view=()=>({id:'session',topic:'work',version:1,phase:'listening',acknowledgement:'',understanding:null,clarification_question:null,perspective:null,response_mode:'advice',search_queries:[],search_status:'not_requested',cards:[],draw:null,result:null,sources:[],glossary_used:[],history:[],job:null});
for(const count of [1,3,5] as const){
 test(`sending a clear topic preserves ${count} selected cards and direct-reading intent`,async()=>{
  const messages:any[]=[];
  const api=new CounselingApi({request:async(path,options)=>{
   if(path.endsWith('/capabilities'))return {available:true,policy_version:'v1',card_counts:[1,3,5],glossary_limit:200,max_message_chars:2000};
   if(path.endsWith('/messages'))messages.push(JSON.parse(options!.body as string));
   return view();
  }});
  const c=new CounselingController(api,()=> 'request-key',new DraftMemory(),{owner:'owner'});
  await c.initialize();c.setText('취업운');
  assert.equal(await c.send('consent',true,{cardCount:count,webSearch:false}),true);
  assert.deepEqual(messages,[{text:'취업운',expected_version:1,consent_event_id:'consent',remember_definitions:true,auto_read:true,card_count:count,web_search:false}]);
  await c.refresh();assert.equal(messages.length,1);
 });
}
test('retry keeps the selected direct-reading options without creating another intention',async()=>{
 const requests:any[]=[];let fail=true;
 const api=new CounselingApi({request:async(path,options)=>{
  if(path.endsWith('/capabilities'))return {available:true,policy_version:'v1',card_counts:[1,3,5],glossary_limit:200,max_message_chars:2000};
  if(path.endsWith('/messages')){
   requests.push({body:JSON.parse(options!.body as string),key:new Headers(options!.headers).get('X-Idempotency-Key')});
   if(fail){fail=false;throw Error('temporary connection failure');}
  }
  return view();
 }});
 let next=0;const c=new CounselingController(api,()=> 'request-'+(++next),new DraftMemory(),{owner:'owner'});
 await c.initialize();c.setText('요즘 시험 때문에 힘들어요.');
 assert.equal(await c.send('consent',false,{cardCount:5,webSearch:true}),false);
 assert.equal(await c.retry(),true);
 assert.deepEqual(requests[0],requests[1]);
 assert.equal(requests[1].body.auto_read,true);assert.equal(requests[1].body.card_count,5);
});

