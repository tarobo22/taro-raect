import test from 'node:test';
import assert from 'node:assert/strict';
import {ReminderController} from '../src/features/reminders/ReminderController';
import type {ReminderPort,ReminderState,ReminderTime,NotificationPermission} from '../src/features/reminders/types';
import {eraseCurrentDeviceData} from '../src/features/p0/eraseCurrentDeviceData';

function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
function fixture(){
 let state:ReminderState={supported:true,permission:'granted',enabled:false,hour:20,minute:0,nextAt:null};
 const calls:string[]=[];
 let permission:Promise<NotificationPermission>|undefined;
 let scheduled:Promise<void>|undefined;
 const port:ReminderPort={
  async read(){calls.push('read');return {...state};},
  async requestPermission(){calls.push('permission');const value=await(permission??Promise.resolve(state.permission));state={...state,permission:value};return value;},
  async schedule(time:ReminderTime){calls.push(`schedule:${time.hour}:${time.minute}`);await scheduled;state={...state,...time,enabled:true,nextAt:'2026-11-07T11:00:00Z'};return {...state};},
  async disable(){calls.push('disable');state={...state,enabled:false,nextAt:null};return {...state};},
  async clear(){calls.push('clear');state={...state,enabled:false,hour:20,minute:0,nextAt:null};return {...state};},
  async openSettings(){calls.push('settings');},async preview(){calls.push('preview');},
 };
 return {calls,controller:new ReminderController(port),setPermission:(value:Promise<NotificationPermission>)=>{permission=value;},setSchedule:(value:Promise<void>)=>{scheduled=value;}};
}

test('opening reminders never requests permission or schedules an alarm',async()=>{
 const f=fixture();assert.equal((await f.controller.read()).enabled,false);assert.deepEqual(f.calls,['read']);
});
test('denied permission and invalid time never schedule',async()=>{
 const f=fixture();f.setPermission(Promise.resolve('denied'));
 assert.equal((await f.controller.enable({hour:20,minute:0})).enabled,false);
 await assert.rejects(()=>f.controller.enable({hour:24,minute:0}),/시간/);
 await assert.rejects(()=>f.controller.enable({hour:20,minute:0.5}),/시간/);
 assert.equal(f.calls.filter(c=>c.startsWith('schedule')).length,0);
 assert.equal(f.calls.filter(c=>c==='permission').length,1);
});
test('turning off while permission is pending prevents a late grant from enabling',async()=>{
 const f=fixture(),permission=deferred<NotificationPermission>();f.setPermission(permission.promise);
 const enabling=f.controller.enable({hour:20,minute:0});await Promise.resolve();
 await f.controller.disable();permission.resolve('granted');await enabling;
 assert.equal((await f.controller.read()).enabled,false);assert.ok(!f.calls.some(c=>c.startsWith('schedule')));
});
test('the latest selected time wins and a shared permission prompt is requested once',async()=>{
 const f=fixture(),permission=deferred<NotificationPermission>();f.setPermission(permission.promise);
 const first=f.controller.enable({hour:19,minute:0}),last=f.controller.enable({hour:21,minute:30});
 permission.resolve('granted');await Promise.all([first,last]);
 const state=await f.controller.read();assert.equal(state.hour,21);assert.equal(state.minute,30);
 assert.equal(f.calls.filter(c=>c==='permission').length,1);assert.deepEqual(f.calls.filter(c=>c.startsWith('schedule')),['schedule:21:30']);
});
test('full device reset during an in-flight native save cancels the saved alarm and chosen time',async()=>{
 const f=fixture(),saving=deferred<void>(),entered=deferred<void>();f.setSchedule(saving.promise);
 const enabling=f.controller.enable({hour:22,minute:15});
 for(let i=0;i<20;i++){await Promise.resolve();if(f.calls.includes('schedule:22:15')){entered.resolve();break;}}
 await entered.promise;
 const resetting=f.controller.reset();saving.resolve();await Promise.all([enabling,resetting]);
 const state=await f.controller.read();assert.equal(state.enabled,false);assert.equal(state.hour,20);assert.equal(state.minute,0);
 assert.ok(f.calls.indexOf('clear')>f.calls.indexOf('schedule:22:15'));
});
test('an unavailable platform never prompts or schedules',async()=>{
 let writes=0;const state:ReminderState={supported:false,permission:'unavailable',enabled:false,hour:20,minute:0,nextAt:null};
 const port:ReminderPort={read:async()=>state,requestPermission:async()=>{writes++;return 'unavailable';},schedule:async()=>{writes++;return state;},disable:async()=>state,clear:async()=>state,openSettings:async()=>{},preview:async()=>{}};
 assert.equal((await new ReminderController(port).enable({hour:20,minute:0})).enabled,false);assert.equal(writes,0);
});
test('completed erasure clears device reminders once, and a retained completed receipt cannot clear a new session',async()=>{
 const calls:string[]=[];const storage={getAllKeys:async()=>['yeoun.old','unrelated'],multiRemove:async(keys:readonly string[])=>{calls.push(`remove:${keys.join(',')}`);},setItem:async()=>{}};
 const receipt={id:'a',kind:'erase',state:'completed',created_at:'2026-11-06T00:00:00Z'} as Parameters<typeof eraseCurrentDeviceData>[2];
 await eraseCurrentDeviceData(storage,{forget:async()=>{calls.push('identity');}},receipt,async()=>{calls.push('reminders');});
 assert.ok(calls.includes('reminders'));assert.ok(calls.indexOf('reminders')<calls.indexOf('identity'));
 calls.length=0;await eraseCurrentDeviceData(storage,{forget:async()=>{calls.push('identity');}},{...receipt,device_cleanup_complete:true},async()=>{calls.push('reminders');});
 assert.deepEqual(calls,[]);
});
