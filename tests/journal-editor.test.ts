import test from 'node:test';
import assert from 'node:assert/strict';
import {JournalApi} from '../src/features/journal/JournalApi';
import {JournalDraftSession} from '../src/features/journal/JournalDraftSession';
import type {JournalDraft} from '../src/features/journal/model';

const initial:JournalDraft={day:'2026-11-06',mood:'calm',body:'original'};
function drafts(){
  let saved:JournalDraft|null=null;
  return {read:async()=>saved,write:async(value:JournalDraft)=>{saved={...value};},clear:async()=>{saved=null;}};
}

test('reading and updating an entry carries its optimistic concurrency version',async()=>{
  let sent:Record<string,unknown>={};
  const wire={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',...initial,version:3,
    created_at:'2026-11-06T00:00:00Z',updated_at:'2026-11-06T00:00:00Z'};
  const api=new JournalApi({request:async(_path,options)=>{
    if(options?.method==='PUT')sent=JSON.parse(String(options.body));
    return options?.method==='PUT'?{...wire,version:4}: [wire];
  }},{entries:'/entries',policy:'/policy'});
  const entry=(await api.list())[0];
  assert.equal(entry.version,3);
  const edited=await api.update(entry.id,{...entry,body:'changed'});
  assert.equal(sent.expectedVersion,3);assert.equal(edited.version,4);
});

test('a slow draft restore cannot overwrite text entered while it was loading',async()=>{
  let restore!:(value:JournalDraft)=>void;
  const stored=new Promise<JournalDraft>(resolve=>{restore=resolve;});
  const storage={...drafts(),read:()=>stored};
  const session=new JournalDraftSession(initial,storage);
  const loading=session.restore();
  await session.change({body:'typed now'});
  restore({...initial,body:'old saved draft'});
  await loading;
  assert.equal(session.snapshot.body,'typed now');
});

test('an acknowledgement for older text leaves a newer draft intact',async()=>{
  const storage=drafts();const session=new JournalDraftSession(initial,storage);
  await session.change({body:'being saved'});
  const revision=session.revision;
  await session.change({body:'new words'});
  assert.equal(await session.acknowledge(revision),false);
  assert.equal((await storage.read())?.body,'new words');
  assert.equal(await session.acknowledge(session.revision),true);
  assert.equal(await storage.read(),null);
});

test('an unsaved edit restores its original version instead of silently adopting a newer server version',async()=>{
  const storage=drafts();
  await storage.write({...initial,id:'entry',body:'unsaved words',version:1});
  const session=new JournalDraftSession({...initial,id:'entry',version:2},storage);
  await session.restore();
  assert.equal(session.snapshot.body,'unsaved words');
  assert.equal(session.snapshot.version,1);
});
