import assert from 'node:assert/strict';
import test from 'node:test';
import {CounselingApi} from '../src/features/counseling/CounselingApi';

const session=()=>({id:'session',topic:'care',version:1,phase:'confirmation',
 acknowledgement:'마음이 쓰이셨겠어요.',understanding:'알바와 수업이 겹쳐 쉬기 어려우시군요.',
 clarification_question:null,perspective:'학생',response_mode:'advice',search_queries:[],
 search_status:'not_requested',cards:[],draw:null,result:null,sources:[],glossary_used:[],history:[],job:null});

test('runtime extra owner fields never enter an outgoing message',async()=>{
 let sent:Record<string,unknown>|undefined;
 const api=new CounselingApi({request:async(_path,options)=>{sent=JSON.parse(options?.body as string);return session();}});
 const input={text:'이야기',expected_version:1,consent_event_id:'consent',remember_definitions:true,owner_id:'another-user'};
 await api.message('session',input,'stable-key');
 assert.deepEqual(sent,{text:'이야기',expected_version:1,consent_event_id:'consent',remember_definitions:true});
});

for(const version of [0,-1,'1',1.5])test(`invalid version ${String(version)} is rejected before publishing`,async()=>{
 const api=new CounselingApi({request:async()=>({...session(),version})});
 await assert.rejects(()=>api.get('session'));
});

test('a card reference cannot masquerade as evidence for a factual claim',async()=>{
 const value={...session(),sources:[{id:'tarot:1',kind:'tarot_reference',title:'카드 의미',url:null}],
 result:{empathy:'함께 살펴봐요.',advice:'선택할 수 있어요.',actions:['작게 시작해보세요.'],tarot:[],
 facts:[{text:'상대의 의도는 이렇습니다.',source_ids:['tarot:1']}],follow_up_question:null,safety_mode:'standard'}};
 const api=new CounselingApi({request:async()=>value});
 await assert.rejects(()=>api.get('session'));
});

test('private reference URLs are rejected even when the JSON shape is otherwise valid',async()=>{
 const value={...session(),sources:[{id:'web:private',kind:'web',title:'reference',url:'https://127.0.0.1/private'}]};
 await assert.rejects(()=>new CounselingApi({request:async()=>value}).get('session'));
});

test('malformed capabilities cannot enable sending',async()=>{
 await assert.rejects(()=>new CounselingApi({request:async()=>({available:'yes',card_counts:[1,3]})}).capabilities());
});
