import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioGate} from '../src/features/audio/AudioGate';
import {VoiceCaptureSession} from '../src/features/audio/VoiceCapture';
import {defaultSensory,restoreSensory} from '../src/features/audio/preferences';

test('fresh and missing sensory preferences keep app audio off and preserve explicit stored choices',()=>{
 assert.deepEqual(defaultSensory,{sound:false,haptics:true,music:false});
 assert.deepEqual(restoreSensory(null),defaultSensory);
 assert.deepEqual(restoreSensory({haptics:false}),{sound:false,haptics:false,music:false});
 assert.deepEqual(restoreSensory({sound:true,music:true,haptics:false}),{sound:true,music:true,haptics:false});
 assert.deepEqual(restoreSensory({sound:false,music:false,haptics:true}),defaultSensory);
});

test('overlapping recording leases pause audio immediately and only the last release can resume',()=>{
 const gate=new AudioGate(),changes:boolean[]=[];gate.subscribe(value=>changes.push(value));
 const old=gate.acquire(),current=gate.acquire();assert.equal(gate.blocked,true);
 old();old();assert.equal(gate.blocked,true);current();assert.equal(gate.blocked,false);
 const next=gate.acquire();old();current();assert.equal(gate.blocked,true);next();
 assert.deepEqual(changes,[false,true,false,true,false]);
});

test('finishing a recording in the background never resumes audio until foreground',()=>{
 const gate=new AudioGate();const release=gate.acquire();gate.setForeground(false);release();
 assert.equal(gate.blocked,true);gate.setForeground(true);assert.equal(gate.blocked,false);
 const releaseNext=gate.acquire();gate.setForeground(false);gate.setForeground(true);
 assert.equal(gate.blocked,true);releaseNext();assert.equal(gate.blocked,false);
});

test('voice completion and cancellation release exactly their lease and reject late callbacks',()=>{
 const gate=new AudioGate(),texts:string[]=[],states:string[]=[],stopped:string[]=[];
 const old=new VoiceCaptureSession(()=>gate.acquire(),v=>texts.push(v),v=>states.push(v));
 old.attachStop(()=>stopped.push('old'));old.text('draft');old.finish('done');
 const current=new VoiceCaptureSession(()=>gate.acquire(),v=>texts.push(v),v=>states.push(v));
 old.text('late');old.state('late');old.finish('late');assert.equal(gate.blocked,true);
 current.attachStop(()=>stopped.push('current'));current.cancel();current.cancel();
 assert.equal(gate.blocked,false);assert.deepEqual(texts,['draft']);assert.deepEqual(states,['done','']);
 assert.deepEqual(stopped,['old','current']);
});

test('cancel while voice startup is pending disposes late resources without unmuting a newer recording',()=>{
 const gate=new AudioGate();let stopped=0;
 const pending=new VoiceCaptureSession(()=>gate.acquire(),()=>assert.fail('late text'),()=>{});
 pending.cancel();const current=new VoiceCaptureSession(()=>gate.acquire(),()=>{},()=>{});
 pending.attachStop(()=>{stopped++;});pending.finish('late failure');
 assert.equal(stopped,1);assert.equal(gate.blocked,true);current.finish('failure');assert.equal(gate.blocked,false);
});

test('a disposed platform recorder cannot prevent lease release or completion notification',()=>{
 const gate=new AudioGate();let completed=0;
 const capture=new VoiceCaptureSession(()=>gate.acquire(),()=>{},()=>{},()=>completed++);
 capture.attachStop(()=>{throw new Error('platform already disposed');});
 assert.doesNotThrow(()=>capture.finish('failed'));assert.equal(gate.blocked,false);assert.equal(completed,1);
});
