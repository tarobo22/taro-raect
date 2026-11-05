import test from 'node:test';
import assert from 'node:assert/strict';
import {profilePreviewOffset} from '../src/features/experience/motion';
import {jobFailureExplanation} from '../src/features/p0/jobFailure';
test('profile previews stay within six dp, respond in both directions and stop with reduced motion',()=>{
 for(let dx=-1000;dx<=1000;dx+=37){assert.ok(Math.abs(profilePreviewOffset(dx))<=6);assert.equal(profilePreviewOffset(dx,true),0);}
 assert.ok(profilePreviewOffset(30)>0);assert.equal(profilePreviewOffset(60),6);assert.equal(profilePreviewOffset(-60),-6);assert.equal(profilePreviewOffset(0),0);
});
test('known job failures explain uncertainty and a next action without exposing internal codes',()=>{
 const unknown=jobFailureExplanation({code:'UNKNOWN_PROVIDER_OUTCOME',message:'UNKNOWN_PROVIDER_OUTCOME'});assert.match(unknown,/처리됐는지/);assert.match(unknown,/자동으로 다시 보내지/);assert.match(unknown,/추가 비용/);assert.equal(unknown.includes('UNKNOWN_PROVIDER_OUTCOME'),false);
 for(const code of ['RESOURCE_CHANGED','CONTEXT_CHANGED']){const text=jobFailureExplanation({code,message:code});assert.match(text,/기록/);assert.match(text,/다시 선택/);assert.equal(text.includes(code),false);}
 assert.equal(jobFailureExplanation({code:'OTHER_CODE',message:'OTHER_CODE'}).includes('OTHER_CODE'),false);
 assert.equal(jobFailureExplanation({code:'OTHER',message:'잠시 뒤 다시 확인해 주세요.'}),'잠시 뒤 다시 확인해 주세요.');
});
