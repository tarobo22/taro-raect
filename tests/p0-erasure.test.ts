import test from 'node:test';
import assert from 'node:assert/strict';
import {eraseCurrentDeviceData} from '../src/features/p0/eraseCurrentDeviceData';
import {GuestSession} from '../src/infrastructure/http/GuestSession';
import {DashboardLoader} from '../src/features/dashboard/DashboardLoader';

test('completed erase clears only app-owned local data and retains its minimal current receipt',async()=>{
 const receipt={id:'receipt-id',kind:'erase',state:'completed',receipt:'status-only',expires_at:'2026-11-07T00:00:00Z'};
 const values=new Map([['yeoun.draft','private'],['yeoun.journal.draft.new','journal'],['yeoun.tone','giga'],['yeoun.p0.pending-job','job'],['yeoun.p0.data-receipt','old receipt'],['other-app.key','keep']]);let forgotten=0;
 const storage={getAllKeys:async()=>[...values.keys()],multiRemove:async(keys:readonly string[])=>{for(const k of keys)values.delete(k);},setItem:async(k:string,v:string)=>{values.set(k,v);}};
 await eraseCurrentDeviceData(storage,{forget:async()=>{forgotten++;}},receipt);
 assert.deepEqual([...values.keys()].sort(),['other-app.key','yeoun.p0.data-receipt']);assert.equal(values.get('other-app.key'),'keep');assert.deepEqual(JSON.parse(values.get('yeoun.p0.data-receipt')!),{...receipt,device_cleanup_complete:true});assert.equal(forgotten,1);
 values.set('yeoun.draft','new guest draft');
 await eraseCurrentDeviceData(storage,{forget:async()=>{forgotten++;}},{...receipt,device_cleanup_complete:true});
 assert.equal(values.get('yeoun.draft'),'new guest draft');assert.equal(forgotten,1);
});
test('erasure invalidates an older dashboard read and clears fallback history before another identity connects',async()=>{
 let resolve!:(value:never[])=>void,reads=0;
 const loader=new DashboardLoader({list:async()=>{reads++;if(reads===1)return new Promise<never[]>(r=>{resolve=r;});throw new Error('new identity offline');},policy:async()=>({moods:['calm'],maxBodyLength:4000})},{readings:async()=>[],counsels:async()=>[],config:async()=>{throw new Error('offline');}});
 const old=loader.load();loader.clear();
 const fresh=await loader.load();assert.deepEqual(fresh?.entries,[]);
 resolve([]);assert.equal(await old,null);assert.deepEqual(loader.snapshot.entries,[]);
});
test('forgetting a revoked identity does not create a guest and an explicit fresh start adopts a new token',async()=>{
 let persisted:string|null='a'.repeat(64),creates=0;
 const session=new GuestSession({read:async()=>persisted,write:async(v:string)=>{persisted=v;},clear:async()=>{persisted=null;}},async()=>{creates++;return {access_token:'b'.repeat(64)};},true);
 assert.equal(await session.token(),'a'.repeat(64));await session.forget();
 assert.equal(creates,0);await assert.rejects(session.token(),/게스트로 시작/);
 assert.equal(await session.start(),'b'.repeat(64));assert.equal(await session.token(),'b'.repeat(64));assert.equal(creates,1);
});
