import test from 'node:test';
import assert from 'node:assert/strict';
import {PageLoader} from '../src/features/p0/PageLoader';
import {RecordViewState} from '../src/features/navigation/RecordViewState';

test('unmounted records restore loaded pages, cursor and expansion without another first-page fetch',async()=>{
 const view=new RecordViewState(),calls:(string|undefined)[]=[];
 const first=new PageLoader(async cursor=>{calls.push(cursor);return {items:[{id:cursor?'second':'first'}],next_cursor:cursor?'last':'next'};});
 await first.reload();await first.more();view.pages.setExpanded('conversation:one',true,view.pages.generation);first.dispose();view.pages.remember('journals',first,view.pages.generation);view.remember(820);
 const reopened=new PageLoader(async cursor=>{calls.push(cursor);return {items:[{id:'third'}],next_cursor:null};},view.pages.read('journals'));
 if(!reopened.hasLoaded)await reopened.reload();assert.deepEqual(calls,[undefined,'next']);assert.deepEqual(reopened.snapshot.items.map(v=>v.id),['first','second']);assert.equal(reopened.snapshot.next_cursor,'last');assert.equal(view.pages.isExpanded('conversation:one'),true);assert.equal(view.offset,820);
 await reopened.more();assert.deepEqual(calls,[undefined,'next','last']);assert.deepEqual(reopened.snapshot.items.map(v=>v.id),['first','second','third']);
});

test('reset or disposal invalidates in-flight pages and old cache writes; a loaded empty history still restores as loaded',async()=>{
 const view=new RecordViewState(),epoch=view.pages.generation;let release!:(page:{items:{id:string}[];next_cursor:null})=>void;
 const loader=new PageLoader(async cursor=>cursor?new Promise(resolve=>{release=resolve;}):{items:[{id:'owned'}],next_cursor:'next'});
 await loader.reload();const pending=loader.more();loader.dispose();assert.equal(loader.snapshot.busy,false);view.pages.remember('journals',loader,epoch);view.pages.setExpanded('conversation:one',true,epoch);view.reset();release({items:[{id:'late'}],next_cursor:null});await pending;view.pages.remember('journals',loader,epoch);view.pages.setExpanded('conversation:one',true,epoch);
 assert.equal(view.pages.read('journals'),undefined);assert.equal(view.pages.isExpanded('conversation:one'),false);assert.deepEqual(loader.snapshot.items,[{id:'owned'}]);assert.equal(view.offset,0);
 const empty=new PageLoader(async()=>({items:[],next_cursor:null}));await empty.reload();view.pages.remember('empty',empty,view.pages.generation);const reopened=new PageLoader(async()=>{throw new Error('unexpected refetch');},view.pages.read('empty'));assert.equal(reopened.hasLoaded,true);assert.deepEqual(reopened.snapshot.items,[]);
});

test('an explicit dataset refresh invalidates v2 pages even when the legacy entry metadata remains empty; ordinary route reentry does not',async()=>{
 const view=new RecordViewState(),signature=(revision:number)=>JSON.stringify([[],revision,'','전체']);view.update(signature(1));view.visit();view.remember(820);const loader=new PageLoader(async()=>({items:[{id:'v2-before-edit'}],next_cursor:null}));await loader.reload();view.pages.remember('journals',loader,view.pages.generation);const epoch=view.epoch;
 view.update(signature(1));assert.equal(view.offset,820);assert.equal(view.epoch,epoch);assert.ok(view.pages.read('journals'));
 view.update(signature(2));assert.equal(view.offset,0);assert.equal(view.epoch,epoch+1);assert.equal(view.pages.read('journals'),undefined);
});
