import test from 'node:test';
import assert from 'node:assert/strict';
import {contextSnapshot,recordDay,validRecordDate} from '../src/features/p0/selection';
import {PageLoader} from '../src/features/p0/PageLoader';
import {P0Api} from '../src/features/p0/P0Api';
const id='00000000-0000-4000-8000-000000000001';
test('chosen journal versions exactly match chosen IDs and remain immutable when a journal changes',()=>{
 const selected=contextSnapshot([{id,version:3}]);assert.deepEqual(selected,{ids:[id],versions:{[id]:3}});
 const updated={id,version:4};assert.equal(selected.versions[updated.id],3);assert.notEqual(selected.versions[id],updated.version);
 assert.throws(()=>contextSnapshot([{id,version:3},{id,version:4}]),/기록/);
 assert.throws(()=>contextSnapshot([{id,version:0}]),/기록/);
});
test('AI context carries the exact reviewed versions and refuses missing or extra versions',async()=>{
 const seen:unknown[]=[];const api=new P0Api({request:async(_path,options)=>{seen.push(JSON.parse(String(options?.body)));return {job_id:id,resource_id:id,state:'queued',status_url:'/v2/ai/jobs/'+id,events_url:'/v2/ai/jobs/'+id+'/events'};}});
 await api.interpret(id,{expected_version:1,context_entry_ids:[id],context_entry_versions:{[id]:3},consent_event_id:id},id);
 assert.deepEqual((seen[0] as {context_entry_versions:unknown}).context_entry_versions,{[id]:3});
 await assert.rejects(api.interpret(id,{expected_version:1,context_entry_ids:[id],context_entry_versions:{},consent_event_id:id},id),/다시 확인/);
 await assert.rejects(api.createTurn(id,{client_message_id:id,input_source:'text',text:'my words',answers:[],context_entry_ids:[],context_entry_versions:{[id]:3},consent_event_id:id},id),/다시 확인/);assert.equal(seen.length,1);
});
test('paged history follows its cursor, ignores late pages after a reset, and keeps entries on a page failure',async()=>{
 let resolve!:(value:{items:{id:string}[];next_cursor:null})=>void;const cursors:(string|undefined)[]=[];
 const loader=new PageLoader(async cursor=>{cursors.push(cursor);if(cursor==='next')return new Promise(r=>{resolve=r;});return {items:[{id:'first'}],next_cursor:'next'};});
 await loader.reload();const old=loader.more();await loader.reload();resolve({items:[{id:'stale'}],next_cursor:null});await old;
 assert.deepEqual(loader.snapshot.items,[{id:'first'}]);assert.deepEqual(cursors,[undefined,'next',undefined]);
 const failure=new PageLoader(async cursor=>{if(cursor)throw new Error('offline');return {items:[{id:'kept'}],next_cursor:'next'};});await failure.reload();await failure.more();assert.deepEqual(failure.snapshot.items,[{id:'kept'}]);assert.match(failure.snapshot.error,/offline/);
});
test('journal date queries and history cursors are sent with timezone-correct date matching',async()=>{
 const paths:string[]=[];const api=new P0Api({request:async path=>{paths.push(path);return {items:[],next_cursor:null};}});
 await api.journals('next',{from:'2026-11-06',to:'2026-11-06'});await api.conversations('older');await api.turns(id,'previous');
 assert.match(paths[0],/from=2026-11-06/);assert.match(paths[0],/to=2026-11-06/);assert.match(paths[1],/cursor=older/);assert.match(paths[2],/cursor=previous/);
 assert.equal(recordDay('2026-11-05T16:00:00Z','Asia/Seoul'),'2026-11-06');assert.equal(validRecordDate('2026-02-30'),false);assert.equal(validRecordDate('2026-11-06'),true);
});
