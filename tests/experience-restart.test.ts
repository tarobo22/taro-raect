import test from 'node:test';
import assert from 'node:assert/strict';
import {IdempotentSubmit} from '../src/features/experience/submit';

function receiptStore(){
  let value:{fingerprint:string;id:string}|null=null;
  return {read:async()=>value,write:async(next:{fingerprint:string;id:string})=>{value=next;},clear:async()=>{value=null;}};
}

test('a remounted conversation retries the same persisted request after an uncertain outcome',async()=>{
  const receipts=receiptStore();const seen:string[]=[];let ids=0;
  const execute=async(input:string,id:string)=>{seen.push(id);if(seen.length===1)throw new Error('response lost');return input;};
  const newId=()=>String(++ids);
  await assert.rejects(new IdempotentSubmit(execute,newId,receipts).submit('same'),/response lost/);
  assert.equal(await new IdempotentSubmit(execute,newId,receipts).submit('same'),'same');
  assert.deepEqual(seen,['1','1']);
});

test('a request is not sent when its durable receipt cannot be stored',async()=>{
  let sent=0;
  const receipts={...receiptStore(),write:async()=>{throw new Error('storage unavailable');}};
  const operation=new IdempotentSubmit(async()=>{sent++;return 'reply';},()=> 'one',receipts);
  await assert.rejects(operation.submit('question'),/storage unavailable/);
  assert.equal(sent,0);
});

test('a successful response retains its receipt until the mounted screen acknowledges it',async()=>{
  const receipts=receiptStore();
  const operation=new IdempotentSubmit(async(input:string)=>input,()=> 'one',receipts);
  await operation.submit('question');
  assert.equal((await receipts.read())?.id,'one');
  await operation.acknowledge();
  assert.equal(await receipts.read(),null);
});
