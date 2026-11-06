import test from 'node:test';
import assert from 'node:assert/strict';
import {StoryApi,decodeStoryRun} from '../src/features/story/StoryApi';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),at='2026-11-06T00:00:00Z';
const run={id:id(1),episode_id:'window-pause',episode_version:'1.0.0',title:'창가의 작은 쉼표',state:'active',version:1,current_node:{id:'arrive',prompt:'잠깐 쉬어 볼까요?',expression:'welcome'},ending:null,choice_count:0,created_at:at,updated_at:at,completed_at:null};
test('story resumes by owner-scoped GET and sends explicit choice/version with a durable UUID identity',async()=>{
 const calls:{path:string;options:RequestInit}[]=[];const api=new StoryApi({request:async(path,options={})=>{calls.push({path,options});return path.includes('story-progress')?{run}:run;}});
 assert.equal((await api.progress('window-pause')).run?.id,id(1));await api.start({episode_id:'window-pause',episode_version:'1.0.0'},id(2));await api.choose(id(1),{expected_version:1,node_id:'arrive',answer:false},id(3));await api.restart(id(1),1,id(4));
 assert.equal(calls[0].path,'/v2/story-progress?episode_id=window-pause');assert.equal(calls[0].options.method,undefined);assert.deepEqual(JSON.parse(String(calls[2].options.body)),{expected_version:1,node_id:'arrive',answer:false});assert.equal(new Headers(calls[2].options.headers).get('X-Idempotency-Key'),id(3));assert.equal(calls[3].path,'/v2/story-runs/'+id(1)+'/restart');
});
test('only complete valid endings are displayed and no score, currency or invented progress is decoded',()=>{
 assert.equal(decodeStoryRun(run).ending,null);const completed={...run,state:'completed',version:4,current_node:null,ending:{id:'space',title:'여백',body:'잠깐 쉬어요.',action:'편안히 앉아 보세요.'},choice_count:3,completed_at:at};assert.equal(decodeStoryRun(completed).ending?.title,'여백');
 assert.throws(()=>decodeStoryRun({...completed,ending:null}));assert.throws(()=>decodeStoryRun({...run,ending:completed.ending}));assert.throws(()=>decodeStoryRun({...completed,choice_count:1}));assert.throws(()=>decodeStoryRun({...run,state:'paid'}));assert.equal('score' in decodeStoryRun({...run,score:90}),false);
});
test('invalid local choices are rejected before transport and ownership failures remain failures',async()=>{
 let calls=0;const failure=Object.assign(new Error('본인 이야기를 찾지 못했어요.'),{status:404});const api=new StoryApi({request:async()=>{calls++;throw failure;}});
 await assert.rejects(api.choose(id(1),{expected_version:0,node_id:'arrive',answer:true},id(2)));assert.equal(calls,0);await assert.rejects(api.run(id(1)),error=>error===failure);assert.equal(calls,1);
});
