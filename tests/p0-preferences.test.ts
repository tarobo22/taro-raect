import test from 'node:test';
import assert from 'node:assert/strict';
import {P0Api} from '../src/features/p0/P0Api';
import {PreferencesWriter} from '../src/features/p0/PreferencesWriter';
const id='00000000-0000-4000-8000-000000000001';
const me={id,kind:'guest',locale:'ko-KR',timezone:'Asia/Seoul',preferences:{tone:'giga',reduced_motion:true,voice_mode:'cloud'}};
test('bootstrap restores server tone, motion and voice and preference PATCH validates its acknowledgement',async()=>{
 let sent:RequestInit|undefined;
 const api=new P0Api({request:async(path,options)=>{if(path==='/v2/me/preferences'){sent=options;return me;}return {api_version:'2.0',policy_version:'2026-11-05',server_time:'2026-11-06T00:00:00Z',user:me,consents:[],ota_policy:{channel:'preview',min_native_version:'1.2.0',updates_enabled:true},limits:{daily_ai_requests:20,question_max_chars:500,journal_max_chars:4000,audio_max_seconds:60,audio_max_bytes:10485760}};}});
 const bootstrap=await api.bootstrap();assert.deepEqual(bootstrap.user.preferences,me.preferences);
 const saved=await api.updatePreferences({tone:'giga',reduced_motion:true,voice_mode:'cloud'});assert.deepEqual(saved.preferences,me.preferences);assert.equal(sent?.method,'PATCH');assert.deepEqual(JSON.parse(String(sent?.body)),me.preferences);
 await assert.rejects(new P0Api({request:async()=>({id,preferences:{tone:'unknown'}})}).updatePreferences({tone:'warm'}));
});
test('preference writes stay ordered and an older response never replaces newer input',async()=>{
 let finish!:(value:typeof me)=>void;const calls:unknown[]=[];
 const writer=new PreferencesWriter({updatePreferences:async patch=>{calls.push(patch);if(calls.length===1)return new Promise(r=>{finish=r;});return me;}});
 const first=writer.change({tone:'giga'}),second=writer.change({reduced_motion:true});await Promise.resolve();await Promise.resolve();assert.equal(calls.length,1);finish(me);
 assert.equal(await first,null);assert.deepEqual(await second,me);assert.deepEqual(calls,[{tone:'giga'},{reduced_motion:true}]);
});
