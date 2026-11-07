import assert from 'node:assert/strict';
import test from 'node:test';
import {SkinSelectionStore} from '../src/features/skins/SkinSelection';

function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}

test('broken saved settings keep a usable default without resetting unrelated preferences',async()=>{
 const writes:string[]=[];const store=new SkinSelectionStore({getItem:async()=>'{broken',setItem:async key=>{writes.push(key);}});
 await store.load();assert.equal(store.state.id,'cafe');assert.equal(store.state.loaded,true);assert.deepEqual(writes,[]);
});

test('late hydration never replaces a choice the user has already made',async()=>{
 const stored=deferred<string|null>();const writes:string[]=[];
 const store=new SkinSelectionStore({getItem:()=>stored.promise,setItem:async(_key,value)=>{writes.push(value);}});
 const loading=store.load();await store.select('playroom');stored.resolve(JSON.stringify({version:1,id:'clinic'}));await loading;
 assert.equal(store.state.id,'playroom');assert.equal(JSON.parse(writes[0]).id,'playroom');
});

test('rapid selections persist in order and end with the latest visible skin',async()=>{
 const first=deferred<void>();const writes:string[]=[];
 const store=new SkinSelectionStore({getItem:async()=>null,setItem:async(_key,value)=>{
  writes.push(JSON.parse(value).id);if(writes.length===1)await first.promise;}});
 const a=store.select('clinic'),b=store.select('playroom');
 assert.equal(store.state.id,'playroom');await Promise.resolve();assert.deepEqual(writes,['clinic']);
 first.resolve();await Promise.all([a,b]);assert.deepEqual(writes,['clinic','playroom']);
});

test('failed persistence preserves the visible choice and can be explicitly retried',async()=>{
 let fail=true;const store=new SkinSelectionStore({getItem:async()=>null,setItem:async()=>{if(fail)throw Error('disk');}});
 assert.equal(await store.select('clinic'),false);assert.equal(store.state.id,'clinic');assert.ok(store.state.error);
 fail=false;assert.equal(await store.select('clinic'),true);assert.equal(store.state.error,'');
});

test('unknown skin IDs cannot publish an invalid asset choice or write storage',async()=>{
 const writes:string[]=[];const store=new SkinSelectionStore({getItem:async()=>null,setItem:async key=>{writes.push(key);}});
 assert.equal(await store.select('other-account-or-arbitrary-asset'),false);
 assert.equal(store.state.id,'cafe');assert.deepEqual(writes,[]);
});
