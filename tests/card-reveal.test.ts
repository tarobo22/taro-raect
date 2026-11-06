import test from 'node:test';
import assert from 'node:assert/strict';
import {RevealLedger} from '../src/features/motion/RevealLedger';
test('concurrent and later reentries claim the same card reveal once',async()=>{
 let saved:string[]=[];const ledger=new RevealLedger({read:async()=>saved,write:async value=>{saved=value;}});
 assert.deepEqual(await Promise.all([ledger.claim('reading:one:0'),ledger.claim('reading:one:0')]),[true,false]);
 const reopened=new RevealLedger({read:async()=>saved,write:async value=>{saved=value;}});
 assert.equal(await reopened.claim('reading:one:0'),false);assert.equal(await reopened.claim('reading:one:1'),true);
});
test('a failed persistence never emits a reveal cue and can be retried without false completion',async()=>{
 let failing=true;const ledger=new RevealLedger({read:async()=>[],write:async()=>{if(failing)throw new Error('storage unavailable');}});
 await assert.rejects(ledger.claim('reading:two:0'),/storage/);failing=false;
 assert.equal(await ledger.claim('reading:two:0'),true);
});
test('only a bounded set of opaque event IDs is stored',async()=>{
 let saved:string[]=[];const ledger=new RevealLedger({read:async()=>saved,write:async value=>{saved=value;}},3);
 for(const key of ['a','b','c','d'])await ledger.claim(key);
 assert.deepEqual(saved,['b','c','d']);assert.equal(await ledger.claim('d'),false);
});
