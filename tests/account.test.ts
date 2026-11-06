import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {createPkce,parseCallback,decodeGrant} from '../src/features/account/contracts';
import {AccountCache} from '../src/features/account/AccountCache';
import {AccountTransport} from '../src/features/account/AccountTransport';
import {GuestSession} from '../src/infrastructure/http/GuestSession';
import {AccountFlow} from '../src/features/account/AccountFlow';
import {P0Api} from '../src/features/p0/P0Api';
import {AccountApi} from '../src/features/account/AccountApi';
import {AccountRuntime} from '../src/features/account/AccountRuntime';

const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const token='a'.repeat(64),nextToken='b'.repeat(64),ticket='t'.repeat(43);
function memory(){const data=new Map<string,string>();return{data,async getItem(k:string){return data.get(k)??null;},async setItem(k:string,v:string){data.set(k,v);},async removeItem(k:string){data.delete(k);},async getAllKeys(){return [...data.keys()];},async multiGet(keys:readonly string[]){return keys.map(k=>[k,data.get(k)??null] as [string,string|null]);},async multiSet(pairs:readonly [string,string][]){pairs.forEach(([k,v])=>data.set(k,v));},async multiRemove(keys:readonly string[]){keys.forEach(k=>data.delete(k));}};}

test('PKCE uses secure random bytes and SHA256 base64url with no weak fallback',async()=>{
 const pair=await createPkce(webcrypto as any);assert.match(pair.verifier,/^[\w-]{43}$/);assert.match(pair.challenge,/^[\w-]{43}$/);
 assert.equal(pair.challenge,createHash('sha256').update(pair.verifier).digest('base64url'));
 await assert.rejects(()=>createPkce({} as any));
});

test('callback and exchange contracts reject bearer URLs, mismatched providers and malformed identities',async()=>{
 const uri='https://example.test/auth/complete';
 assert.deepEqual(parseCallback(uri+'#auth_ticket='+ticket+'&auth_provider=google',uri,'google'),{ticket,provider:'google'});
 for(const value of [uri+'?access_token='+token+'#auth_ticket='+ticket+'&auth_provider=google','https://other.test/auth/complete#auth_ticket='+ticket+'&auth_provider=google',uri+'#auth_ticket='+ticket+'&auth_provider=apple',uri+'#auth_ticket='+ticket+'&auth_ticket='+ticket+'&auth_provider=google'])assert.throws(()=>parseCallback(value,uri,'google'));
 const grant={user_id:other,previous_user_id:owner,session_id:other,access_token:nextToken,expires_at:'2027-01-01T00:00:00Z',guest_records_preserved:true};
 assert.deepEqual(decodeGrant(grant),grant);assert.throws(()=>decodeGrant({...grant,access_token:'invalid'}));assert.throws(()=>decodeGrant({...grant,guest_records_preserved:false}));
 const bootstrap={api_version:'2.0',policy_version:'2026-11-05',server_time:'2026-11-06T00:00:00Z',user:{id:other,kind:'member',locale:'ko-KR',timezone:'Asia/Seoul',preferences:{tone:'warm',reduced_motion:false,voice_mode:'device'}},consents:[],ota_policy:{channel:'test',min_native_version:'1.0.0',updates_enabled:false},limits:{daily_ai_requests:20,question_max_chars:500,journal_max_chars:4000,audio_max_seconds:60,audio_max_bytes:10485760}};
 assert.equal((await new P0Api({request:async()=>bootstrap}).bootstrap()).user.kind,'member');
 const paths:string[]=[];const api=new AccountApi({request:async(path,options)=>{paths.push(String(options?.method)+' '+path);return null;}});
 await api.logout();await api.logoutAll();await api.revokeSession(other);assert.deepEqual(paths,['POST /v2/auth/logout','POST /v2/auth/logout-all','DELETE /v2/auth/sessions/'+other]);
});

test('owner cache preserves drafts and pending receipts, isolates other owners and leaves same-owner conversion intact',async()=>{
 const base=memory(),cache=new AccountCache(base);await cache.attach(owner);
 await cache.setItem('yeoun.draft','guest draft');await cache.setItem('yeoun.p0.attempt.turn','opaque pending');
 await cache.activate(owner);assert.equal(await cache.getItem('yeoun.draft'),'guest draft');
 await cache.activate(other);assert.equal(await cache.getItem('yeoun.draft'),null);await cache.setItem('yeoun.draft','member draft');
 await cache.activate(owner);assert.equal(await cache.getItem('yeoun.draft'),'guest draft');assert.equal(await cache.getItem('yeoun.p0.attempt.turn'),'opaque pending');
 await cache.activate(other);assert.equal(await cache.getItem('yeoun.draft'),'member draft');
 await cache.eraseCurrent();await cache.activate(owner);assert.equal(await cache.getItem('yeoun.draft'),'guest draft');
 const original=base.setItem.bind(base);let release!:()=>void;
 base.setItem=(key,value)=>key==='yeoun.draft'?new Promise<void>(resolve=>{release=()=>{base.data.set(key,value);resolve();};}):original(key,value);
 const writing=cache.setItem('yeoun.draft','last pending input'),switching=cache.activate(other);
 await Promise.resolve();assert.equal(await cache.owner(),owner);release();await writing;await switching;
 base.setItem=original;await cache.activate(owner);assert.equal(await cache.getItem('yeoun.draft'),'last pending input');
 let credential=token,releaseVault!:()=>void,vaultReads=0;const vaultReady=new Promise<void>(resolve=>{releaseVault=resolve;});
 const identity=new GuestSession({read:async()=>credential,write:async value=>{credential=value;}},async()=>({token}),true);
 const api={account:async()=>({user_id:owner,kind:'guest',providers:[]})};
 const runtime=new AccountRuntime(api as any,identity,cache,new AccountTransport({request:async()=>null}),{read:async()=>{vaultReads++;await vaultReady;return[{owner,token,saved_at:'2026-11-06T00:00:00Z'},{owner:other,token:nextToken,saved_at:'2026-11-06T00:00:00Z'}];},write:async()=>{}});
 runtime.subscribe(()=>{if(runtime.snapshot.switching)queueMicrotask(()=>runtime.viewUnmounted());});
 const first=runtime.restoreGuest(owner),duplicate=runtime.restoreGuest(owner),different=runtime.restoreGuest(other);
 try{assert.equal(vaultReads,1);}finally{releaseVault();}await assert.rejects(different);await Promise.all([first,duplicate]);assert.equal(await cache.owner(),owner);
});

test('account transport cancels pending requests, refuses stale responses and blocks new mutations until switched',async()=>{
 let release!:(value:unknown)=>void;const raw={request:()=>new Promise(resolve=>{release=resolve;})};
 const http=new AccountTransport(raw);const pending=http.request('/owned',{method:'POST'});
 const draining=http.pause();release({old:'result'});await assert.rejects(pending);await draining;
 await assert.rejects(http.request('/owned',{method:'POST'}));http.resume();
 const current=http.request('/owned');release({fresh:true});assert.deepEqual(await current,{fresh:true});
});

test('adopting an authenticated session invalidates an older guest load without deleting the new credential',async()=>{
 let persisted:string|null=token,read!:(v:string|null)=>void,first=true;
 const session=new GuestSession({read:()=>first?(first=false,new Promise(resolve=>{read=resolve;})):Promise.resolve(persisted),write:async v=>{persisted=v;},clear:async()=>{persisted=null;}},async()=>({token}),true);
 const stale=session.token();const adopting=session.adopt(nextToken,token);read(token);
 await assert.rejects(stale);await adopting;assert.equal(await session.token(),nextToken);assert.equal(persisted,nextToken);
 let clear!:(()=>void),clearing=false;
 const revoked=new GuestSession({read:async()=>clearing?null:token,write:async()=>{},clear:()=>new Promise<void>(resolve=>{clear=()=>{clearing=true;resolve();};})},async()=>({token}),true);
 await revoked.token();const forgetting=revoked.forget();await new Promise(resolve=>setTimeout(resolve,0));
 let returned=false;const during=revoked.token().then(()=>{returned=true;},()=>{});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(returned,false);clear();await forgetting;await during;assert.equal(clearing,true);
});

test('social flow consumes a callback once, binds the original owner and preserves identity on cancellation',async()=>{
 let pending:any=null,exchanges=0,adoptions=0;
 const api={providers:async()=>({providers:[{provider:'google',available:true,reason:null}]}),account:async()=>({user_id:owner,kind:'guest',providers:[]}),start:async()=>({authorization_url:'https://accounts.google.com/o/oauth2/v2/auth?state=opaque',expires_at:'2099-01-01T00:00:00Z'}),exchange:async()=>{exchanges++;return{user_id:other,previous_user_id:owner,session_id:other,access_token:nextToken,expires_at:'2099-01-01T00:00:00Z',guest_records_preserved:true};}};
 const flow=new AccountFlow(api as any,{read:async()=>pending,write:async v=>{pending=v;},clear:async()=>{pending=null;}},{pkce:()=>createPkce(webcrypto as any),returnUri:()=> 'https://example.test/auth/complete',platform:'web',open:async()=>{}},async()=>{adoptions++;});
 await flow.begin('google');const callback='https://example.test/auth/complete#auth_ticket='+ticket+'&auth_provider=google';
 await Promise.all([flow.receive(callback),flow.receive(callback)]);assert.equal(exchanges,1);assert.equal(adoptions,1);assert.equal(pending,null);
 await flow.begin('google');await flow.receive('https://example.test/auth/complete#auth_error=cancelled');assert.equal(exchanges,1);assert.equal(adoptions,1);assert.match(flow.snapshot.error,/취소/);
 let writeStarted!:()=>void,releaseWrite!:()=>void,cancelFinished=false,delay=true;
 const writing=new Promise<void>(resolve=>{writeStarted=resolve;}),release=new Promise<void>(resolve=>{releaseWrite=resolve;});
 const late=new AccountFlow(api as any,{read:async()=>pending,write:async value=>{if(delay){writeStarted();await release;delay=false;}pending=value;},clear:async()=>{pending=null;}},{pkce:()=>createPkce(webcrypto as any),returnUri:()=> 'https://example.test/auth/complete',platform:'web',open:async()=>{}},async()=>{adoptions++;});
 const opening=late.begin('google');await writing;const canceling=late.cancel().then(()=>{cancelFinished=true;});
 try{await new Promise(resolve=>setTimeout(resolve,0));assert.equal(cancelFinished,false);}finally{releaseWrite();await Promise.all([opening,canceling]);}
 assert.equal(pending,null);await late.begin('google');assert.ok(pending);await late.receive(callback);assert.equal(exchanges,2);assert.equal(adoptions,2);
});
