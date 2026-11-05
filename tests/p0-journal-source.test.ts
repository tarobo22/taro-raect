import test from 'node:test';
import assert from 'node:assert/strict';
import {JournalApi} from '../src/features/journal/JournalApi';
import {SaveJournal} from '../src/features/journal/saveJournal';
import {journalDraftKey} from '../src/features/journal/model';
import {JournalDraftSession} from '../src/features/journal/JournalDraftSession';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const draft={day:'2026-11-06',mood:'calm',body:'my words',sourceReadingId:id};
const wire={id:other,local_day:draft.day,mood:'calm',body:draft.body,source_reading_id:id,source_turn_id:null,version:2,created_at:'2026-11-06T00:00:00Z',updated_at:'2026-11-06T00:00:00Z'};
test('linked journal creation and edits retain an owned source and the original CAS version over v2',async()=>{
 const calls:{path:string;options:RequestInit}[]=[];
 const api=new JournalApi({request:async(path,options={})=>{calls.push({path,options});return path==='/policy'?{moods:['편안해요','기뻐요','생각이 많아요','차분해요','이야기해요'],maxBodyLength:4000}:wire;}},{entries:'/entries',policy:'/policy'},'/v2/journal-entries');
 const entry=await api.create({...draft,requestId:id});
 const created=calls.find(c=>c.options.method==='POST')!;assert.equal(created.path,'/v2/journal-entries');assert.equal(new Headers(created.options.headers).get('X-Idempotency-Key'),id);
 assert.deepEqual(JSON.parse(String(created.options.body)),{local_day:draft.day,mood:'calm',body:draft.body,source_reading_id:id});
 assert.equal(entry.sourceReadingId,id);assert.equal(entry.version,2);
 await api.update(entry.id,{...entry,body:'edited'});
 const updated=calls.find(c=>c.options.method==='PATCH')!;assert.equal(updated.path,'/v2/journal-entries/'+other);assert.deepEqual(JSON.parse(String(updated.options.body)),{expected_version:2,mood:'calm',body:'edited'});
 const reloaded=await api.get(other);assert.equal(reloaded.sourceReadingId,id);
});
test('retry identities and temporary new journals distinguish different source resources',async()=>{
 const seen:string[]=[];let count=0;
 const repo=new JournalApi({request:async(_path,options)=>{if(options?.method==='POST'){seen.push(new Headers(options.headers).get('X-Idempotency-Key')||JSON.parse(String(options.body)).requestId);throw new Error('response lost');}return {moods:['calm'],maxBodyLength:4000};}},{entries:'/entries',policy:'/policy'},'/v2/journal-entries');
 const save=new SaveJournal(repo,()=>String(++count));
 await assert.rejects(save.save(draft));await assert.rejects(save.save(draft));await assert.rejects(save.save({...draft,sourceReadingId:other}));
 assert.deepEqual(seen,['1','1','2']);
 assert.notEqual(journalDraftKey(draft),journalDraftKey({...draft,sourceReadingId:other}));
 assert.notEqual(journalDraftKey(draft),journalDraftKey({...draft,sourceReadingId:undefined,sourceTurnId:id}));
});
test('restoring an unrelated source draft cannot overwrite the new linked journal',async()=>{
 const session=new JournalDraftSession(draft,{read:async()=>({...draft,sourceReadingId:other,body:'unrelated words'}),write:async()=>{},clear:async()=>{}});
 await session.restore();assert.equal(session.snapshot.body,'my words');assert.equal(session.snapshot.sourceReadingId,id);
});
