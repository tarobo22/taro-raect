import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveJournal} from '../src/features/journal/saveJournal';
import {JournalApi} from '../src/features/journal/JournalApi';

const draft={day:'2026-11-06',mood:'calm',body:'my words'};
const response={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',...draft,
  created_at:'2026-11-06T00:00:00Z',updated_at:'2026-11-06T00:00:00Z'};

function retryStore(){
  let value:{fingerprint:string;id:string}|null=null;
  return {read:async()=>value,write:async(next:{fingerprint:string;id:string})=>{value=next;},clear:async()=>{value=null;}};
}

test('a lost acknowledgement reuses the persisted identity after reopening the form',async()=>{
  const attempts:string[]=[];const receipts=retryStore();let first=true;
  const api=new JournalApi({request:async(_path,options)=>{
    const input=JSON.parse(String(options?.body));attempts.push(input.requestId);
    assert.match(input.requestId,/^[0-9a-f-]{36}$/);
    if(first){first=false;throw new Error('response lost after server commit');}
    return response;
  }},{entries:'/entries',policy:'/policy'});
  let generated=0;const newId=()=>`00000000-0000-4000-8000-${String(++generated).padStart(12,'0')}`;
  await assert.rejects(new SaveJournal(api,newId,receipts).save(draft),/response lost/);
  const reopened=new SaveJournal(api,newId,receipts);
  assert.equal((await reopened.save(draft)).id,response.id);
  assert.deepEqual(attempts,[attempts[0],attempts[0]]);
  assert.equal(await receipts.read(),null);
});

test('editing a failed draft creates a new identity while retries keep the original one',async()=>{
  const seen:string[]=[];let generated=0;
  const api=new JournalApi({request:async(_path,options)=>{
    seen.push(JSON.parse(String(options?.body)).requestId);throw new Error('offline');
  }},{entries:'/entries',policy:'/policy'});
  const save=new SaveJournal(api,()=>String(++generated));
  await assert.rejects(save.save(draft));
  await assert.rejects(save.save(draft));
  await assert.rejects(save.save({...draft,body:'changed'}));
  assert.deepEqual(seen,['1','1','2']);
});
