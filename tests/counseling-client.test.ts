import assert from 'node:assert/strict';
import test from 'node:test';
import {CounselingApi,OwnerFence} from '../src/features/counseling/CounselingApi';
import {DraftMemory} from '../src/features/counseling/DraftMemory';

test('counseling sends only the explicit message contract and a stable idempotency key',async()=>{
 const calls:{path:string;options?:RequestInit}[]=[];
 const http={request:async(path:string,options?:RequestInit)=>{calls.push({path,options});return {id:'session',topic:'care',version:1,phase:'confirmation',acknowledgement:'화가 나셨겠어요.',understanding:'어떤 일이 있었는지 들려주실래요?',clarification_question:null,response_mode:'advice',perspective:null,search_queries:[],search_status:'not_requested',cards:[],draw:null,result:null,sources:[],glossary_used:[],history:[],job:null};}};
 const api=new CounselingApi(http);
 await api.message('session',{text:'그것 때문에 너무 화나.',expected_version:1,consent_event_id:'consent',remember_definitions:false},'same-attempt');
 assert.equal(calls[0].path,'/v2/counseling/sessions/session/messages');
 assert.equal(new Headers(calls[0].options?.headers).get('X-Idempotency-Key'),'same-attempt');
 const body=JSON.parse(calls[0].options!.body as string);
 assert.equal(body.text,'그것 때문에 너무 화나.');assert.equal(body.remember_definitions,false);
 assert.equal('owner_id' in body,false);
});

test('account changes invalidate already captured response publishers',()=>{
 const fence=new OwnerFence();fence.attach('A');const current=fence.capture();
 assert.equal(fence.valid(current),true);fence.attach('B');assert.equal(fence.valid(current),false);
 const next=fence.capture();fence.dispose();assert.equal(fence.valid(next),false);
});

test('temporary drafts survive screen navigation in memory and disappear on account switch',()=>{
 const memory=new DraftMemory();memory.attach('A');memory.write('new',{text:'A_PRIVATE_DRAFT',sessionId:'a-session'});
 assert.equal(memory.read()?.text,'A_PRIVATE_DRAFT');memory.attach('B');assert.equal(memory.read(),undefined);
 memory.write('new',{text:'B draft'});memory.clear();assert.equal(memory.read(),undefined);
});
