import assert from 'node:assert/strict';
import test from 'node:test';
import {CounselingController,type CounselingPort} from '../src/features/counseling/CounselingController';
import type {CounselingSession} from '../src/features/counseling/CounselingApi';
import {DraftMemory} from '../src/features/counseling/DraftMemory';

test('starting a new story invalidates an in-flight response and allocates a fresh creation key',async()=>{
 let finish!:(value:CounselingSession)=>void;
 const delayed=new Promise<CounselingSession>(resolve=>{finish=resolve;});
 const view={id:'old',topic:'care',version:1,phase:'listening',acknowledgement:'',understanding:null,
  clarification_question:null,perspective:null,response_mode:'advice',search_queries:[],search_status:'not_requested',
  cards:[],draw:null,result:null,sources:[],glossary_used:[],history:[],job:null} as CounselingSession;
 const keys:string[]=[];let messages=0,serial=0;
 const api={capabilities:async()=>({available:true,policy_version:'2026-11-05',card_counts:[1,3],glossary_limit:200,max_message_chars:2000}),
  create:async(_topic:string,key:string)=>{keys.push(key);return {...view,id:keys.length===1?'old':'new'};},
  message:async()=>messages++===0?delayed:{...view,id:'new'}} as unknown as CounselingPort;
 const memory=new DraftMemory(),c=new CounselingController(api,()=>`key-${++serial}`,memory,{owner:'A'});
 await c.initialize();c.setText('old private story');const old=c.send('consent');await Promise.resolve();
 c.startNew();assert.equal(c.state.value,null);assert.equal(c.state.text,'');assert.equal(c.state.pending,false);
 c.setText('new private story');finish(view);await old;
 assert.equal(c.state.text,'new private story');assert.equal(c.state.value,null);
 await c.send('consent');assert.equal(c.state.value?.id,'new');assert.equal(keys.length,2);assert.notEqual(keys[0],keys[1]);
});
