import test from 'node:test';
import assert from 'node:assert/strict';
import {P0Api} from '../src/features/p0/P0Api';
import {ExperienceApi} from '../src/features/experience/ExperienceApi';
const id='00000000-0000-4000-8000-000000000001';
const conversation={id,topic:'self',tone:'warm',state:'closed',created_at:'2026-11-06T00:00:00Z',updated_at:'2026-11-06T00:00:00Z'};
test('conversation lifecycle reads closed state, explicitly closes, and deletes owned resources',async()=>{
 const seen:{path:string;options:RequestInit}[]=[];
 const api=new P0Api({request:async(path,options={})=>{seen.push({path,options});return options.method==='DELETE'?null:conversation;}});
 assert.equal((await api.conversation(id)).state,'closed');await api.closeConversation(id,id);await api.deleteConversation(id);await api.deleteReading(id);
 assert.deepEqual(seen.map(s=>[s.path,s.options.method||'GET']),[['/v2/conversations/'+id,'GET'],['/v2/conversations/'+id+'/close','POST'],['/v2/conversations/'+id,'DELETE'],['/v2/readings/'+id,'DELETE']]);
 assert.equal(new Headers(seen[1].options.headers).get('X-Idempotency-Key'),id);
});
test('a rejected deletion remains a failure and never becomes a success notice',async()=>{
 const api=new P0Api({request:async()=>{throw new Error('not owned');}});
 await assert.rejects(api.deleteReading(id),/not owned/);await assert.rejects(api.deleteConversation(id),/not owned/);
});
test('legacy one/five-card and local counsel deletion uses its compatible owned routes',async()=>{
 const seen:string[]=[];const api=new ExperienceApi({request:async(path,options)=>{assert.equal(options?.method,'DELETE');seen.push(path);return null;}},{config:'/config',readings:'/v1/readings',daily:'/daily',counsel:'/v1/counsel'});
 await api.deleteReading(id);await api.deleteCounsel(id);assert.deepEqual(seen,['/v1/readings/'+id,'/v1/counsel/'+id]);
});
