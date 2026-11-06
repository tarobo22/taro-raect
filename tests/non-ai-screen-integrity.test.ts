import test from 'node:test';
import assert from 'node:assert/strict';
import {ScreenDraftSession} from '../src/features/screenDraft/ScreenDraftSession';
import {RecordViewState} from '../src/features/navigation/RecordViewState';
import {JournalSourceApi} from '../src/features/journal/JournalSourceApi';
import {sourceRoute} from '../src/features/navigation/sourceRoute';
import {HttpError} from '../src/infrastructure/http/FetchClient';

const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
test('a slow saved question cannot replace input or choices edited while restoration was pending',async()=>{
 const session=new ScreenDraftSession();let release!:(value:string)=>void;const seen:string[]=[];
 const restore=session.restore(()=>new Promise<string>(resolve=>{release=resolve;}),value=>seen.push(value));session.changed();release('older saved question');await restore;assert.deepEqual(seen,[]);
 await session.restore(async()=>'reviewed saved question',value=>seen.push(value));assert.deepEqual(seen,['reviewed saved question']);
 const later=session.restore(()=>new Promise<string>(resolve=>{release=resolve;}),value=>seen.push(value));session.dispose();release('left screen');await later;assert.deepEqual(seen,['reviewed saved question']);
});
test('draft writes stay ordered and a failed older write never drops the latest text',async()=>{
 const session=new ScreenDraftSession(),writes:string[]=[];let release!:()=>void;
 const first=session.write(async()=>{writes.push('first started');await new Promise<void>(r=>{release=r;});throw new Error('storage full');});await Promise.resolve();const second=session.write(async()=>{writes.push('latest saved');});assert.deepEqual(writes,['first started']);release();await assert.rejects(first,/storage full/);await second;assert.deepEqual(writes,['first started','latest saved']);
});
test('record detail round trips retain loaded-view identity and offset, while an explicit invalidation resets both',()=>{
 const view=new RecordViewState();assert.equal(view.visited,false);view.visit();view.remember(820);const epoch=view.epoch;
 view.visit();assert.equal(view.offset,820);assert.equal(view.epoch,epoch);view.remember(Number.NaN);assert.equal(view.offset,820);view.reset();assert.equal(view.offset,0);assert.equal(view.epoch,epoch+1);assert.equal(view.visited,false);
});
test('journal source resolves only an owned entry endpoint and maps exact decoded resource kinds',async()=>{
 const calls:string[]=[];let response:unknown={kind:'reading_v2',reading_id:id(2)};const api=new JournalSourceApi({request:async path=>{calls.push(path);return response;}});
 assert.deepEqual(sourceRoute(await api.get(id(1))),{name:'reading-v2',readingId:id(2)});assert.deepEqual(calls,['/v2/journal-entries/'+id(1)+'/source']);
 response={kind:'turn_v2',conversation_id:id(3),turn_id:id(4)};assert.deepEqual(sourceRoute(await api.get(id(1))),{name:'turn',conversationId:id(3),turnId:id(4)});
 response={kind:'legacy_reading',reading:{id:id(5),topic:'기본',question:'내 질문',spreadId:'one',summary:'기본 의미',advice:'조언',action:'행동',cards:[{id:0,name:'시작',keyword:'시작',message:'메시지',action:'행동',art:'sun',position:'지금'}]}};
 const reading=await api.get(id(1));assert.equal(sourceRoute(reading).name,'reading');assert.equal(sourceRoute(reading).reading?.id,id(5));
 response={kind:'legacy_counsel',counsel:{id:id(6),topic:'기본',question:'내 이야기',tone:'warm',expression:'listen',source:'local',empathy:'공감',advice:'조언',action:'행동',created_at:'2026-11-06T00:00:00Z'}};assert.equal(sourceRoute(await api.get(id(1))).counsel?.id,id(6));
});
test('a deleted or foreign source stays a 404; unexpected kinds and malformed IDs cannot open another route',async()=>{
 const missing=new HttpError('연결된 원본을 찾지 못했어요.',404);let calls=0;const api=new JournalSourceApi({request:async()=>{calls++;throw missing;}});await assert.rejects(api.get(id(1)),error=>error===missing);assert.equal(calls,1);
 await assert.rejects(new JournalSourceApi({request:async()=>({kind:'reading_v2',reading_id:'guess'})}).get(id(1)));
 await assert.rejects(new JournalSourceApi({request:async()=>({kind:'legacy_reading',reading:{id:id(2)}})}).get(id(1)));
 await assert.rejects(new JournalSourceApi({request:async()=>({kind:'some_other_owner',reading_id:id(2)})}).get(id(1)));
 await assert.rejects(api.get('invalid'));assert.equal(calls,1);
});
