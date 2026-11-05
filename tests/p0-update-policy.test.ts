import test from 'node:test';
import assert from 'node:assert/strict';
import {GovernedUpdates} from '../src/features/updates/GovernedUpdates';
const enabled={channel:'server-preview',min_native_version:'1.2.0',updates_enabled:true};
test('unknown policy or native version, disabled updates and an older baseline prevent SDK calls',async()=>{
 let checks=0;let version:string|null='1.2.0';const updates=new GovernedUpdates({check:async()=>{checks++;return null;},reload:async()=>{}},()=>version);
 await assert.rejects(updates.checkAndDownload(),/정책/);updates.configure({...enabled,updates_enabled:false});await assert.rejects(updates.checkAndDownload(),/꺼져/);
 updates.configure({...enabled,min_native_version:'1.10.0'});await assert.rejects(updates.checkAndDownload(),/기본 앱/);
 updates.configure(enabled);version=null;await assert.rejects(updates.checkAndDownload(),/버전/);assert.equal(checks,0);
});
test('numeric versions and the server channel govern check and every prepared-bundle apply',async()=>{
 let version:string|null='1.10.0',reloads=0;const channels:string[]=[];
 const updates=new GovernedUpdates({check:async channel=>{channels.push(channel);return {download:async()=>true};},reload:async()=>{reloads++;}},()=>version);
 updates.configure(enabled);assert.equal(await updates.checkAndDownload(),true);assert.deepEqual(channels,['server-preview']);
 updates.configure({...enabled,updates_enabled:false});await assert.rejects(updates.apply(),/꺼져/);assert.equal(reloads,0);
 updates.configure(enabled);await updates.checkAndDownload();version=null;await assert.rejects(updates.apply(),/버전/);assert.equal(reloads,0);
 version='1.10.0';await updates.apply();assert.equal(reloads,1);
});
test('a policy change during a download invalidates the preparation without an automatic recheck',async()=>{
 let finish!:(value:boolean)=>void,start!:()=>void,checks=0;const started=new Promise<void>(r=>{start=r;});
 const updates=new GovernedUpdates({check:async()=>{checks++;return {download:()=>{start();return new Promise(r=>{finish=r;});}};},reload:async()=>assert.fail('must not reload')},()=> '1.2.0');
 updates.configure(enabled);const downloading=updates.checkAndDownload();await started;updates.configure({...enabled,channel:'another-channel'});finish(true);
 await assert.rejects(downloading,/정책/);assert.equal(updates.ready,false);assert.equal(checks,1);await assert.rejects(updates.apply(),/먼저/);
});
