import test from 'node:test';
import assert from 'node:assert/strict';
import {IdempotentSubmit} from '../src/features/experience/submit';

test('a network retry reuses the same operation identity',async()=>{
  let created=0;const seen:string[]=[];
  const submit=new IdempotentSubmit(async(input:string,id:string)=>{
    seen.push(id);if(seen.length===1)throw new Error('timeout');return input;
  },()=>String(++created));
  await assert.rejects(submit.submit('same question'),/timeout/);
  assert.equal(await submit.submit('same question'),'same question');
  assert.deepEqual(seen,['1','1']);
});

test('repeated presses share one pending write',async()=>{
  let calls=0;let done!:(v:string)=>void;
  const pending=new Promise<string>(resolve=>{done=resolve;});
  const submit=new IdempotentSubmit(()=>{calls++;return pending;},()=> 'one');
  const a=submit.submit('same');const b=submit.submit('same');
  assert.equal(calls,1);done('saved');assert.equal(await a,await b);
});

test('edited input receives a fresh operation identity',async()=>{
  let id=0;const seen:string[]=[];
  const submit=new IdempotentSubmit(async(value:string,key:string)=>{seen.push(key);throw new Error(value);},()=>String(++id));
  await assert.rejects(submit.submit('first'));
  await assert.rejects(submit.submit('changed'));
  assert.deepEqual(seen,['1','2']);
});
