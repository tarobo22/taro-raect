import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSendConsent} from '../src/features/consent/resolveSendConsent';
import type {Consent,ConsentKind} from '../src/features/p0/model';

const event=(kind:ConsentKind):Consent=>({id:kind,kind,policy_version:'v1',granted:true,occurred_at:'2026-11-08T00:00:00Z'});
function setup(consents:Consent[]=[]){
 let state={owner:'one',policy:'v1',consents},prompts=0;const saved:ConsentKind[]=[];
 const ports={snapshot:()=>state,confirm:async(_kinds:ConsentKind[])=>{prompts++;return true;},grant:async(kind:ConsentKind)=>{saved.push(kind);return event(kind);}};
 return {ports,saved,prompts:()=>prompts,changeOwner:()=>{state={...state,owner:'two'};}};
}
test('first send asks once and saves only the requested uses',async()=>{
 const s=setup();const result=await resolveSendConsent(['ai_processing','journal_context'],s.ports);
 assert.equal(s.prompts(),1);assert.deepEqual(s.saved,['ai_processing','journal_context']);assert.equal(result?.ai_processing?.id,'ai_processing');
});
test('cancelling first send does not save consent or allow sending',async()=>{
 const s=setup();s.ports.confirm=async()=>false;
 assert.equal(await resolveSendConsent(['ai_processing'],s.ports),null);assert.deepEqual(s.saved,[]);
});
test('a current permission is reused without another confirmation',async()=>{
 const s=setup([event('ai_processing')]);await resolveSendConsent(['ai_processing'],s.ports);
 assert.equal(s.prompts(),0);assert.deepEqual(s.saved,[]);
});
test('changing account during confirmation cancels the send',async()=>{
 const s=setup();s.ports.confirm=async()=>{s.changeOwner();return true;};
 assert.equal(await resolveSendConsent(['ai_processing'],s.ports),null);assert.deepEqual(s.saved,[]);
});
test('a revoked or older policy permission must be confirmed again',async()=>{
 const s=setup([{...event('ai_processing'),policy_version:'old'},{...event('journal_context'),granted:false}]);
 await resolveSendConsent(['ai_processing','journal_context'],s.ports);assert.equal(s.prompts(),1);assert.equal(s.saved.length,2);
});
