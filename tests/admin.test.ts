import test from 'node:test';
import assert from 'node:assert/strict';
import {AdminSession} from '../src/features/admin/AdminSession';
import {AdminApi} from '../src/features/admin/AdminApi';
import {HttpError} from '../src/infrastructure/http/FetchClient';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');

test('admin bearer stays private to memory, expires, and cannot be used after an owner switch',()=>{
 let now=1000;const session=new AdminSession(()=>now),generation=session.begin('owner-a');
 assert.equal(session.activate('owner-a',{token:'fixture-admin-only',expiresAt:new Date(2000).toISOString(),roles:['viewer']},generation),true);
 assert.equal(session.token('owner-a'),'fixture-admin-only');assert.equal(JSON.stringify(session).includes('fixture-admin-only'),false);assert.equal('token' in session.snapshot,false);
 now=2000;assert.throws(()=>session.token('owner-a'),/운영 세션/);assert.equal(session.snapshot.open,false);
 const next=session.begin('owner-a');session.activate('owner-a',{token:'fixture-next',expiresAt:new Date(3000).toISOString(),roles:['publisher']},next);assert.throws(()=>session.token('owner-b'),/운영 세션/);assert.equal(session.snapshot.open,false);
});
test('background exit or a newer start invalidates a late admin session response',()=>{
 const session=new AdminSession(()=>1000),generation=session.begin('owner');session.clear();
 assert.equal(session.activate('owner',{token:'fixture-late',expiresAt:new Date(2000).toISOString(),roles:['publisher']},generation),false);
 const old=session.begin('owner');session.begin('owner');assert.equal(session.activate('owner',{token:'fixture-old',expiresAt:new Date(2000).toISOString(),roles:['viewer']},old),false);assert.equal(session.snapshot.open,false);
});
test('only explicit server roles enter an admin session and metadata never confers publisher permission by default',()=>{
 const session=new AdminSession(()=>1000),generation=session.begin('owner');
 assert.throws(()=>session.activate('owner',{token:'fixture',expiresAt:new Date(2000).toISOString(),roles:[]},generation));
 assert.throws(()=>session.activate('owner',{token:'fixture',expiresAt:'invalid',roles:['viewer']},generation));
 assert.equal(session.activate('owner',{token:'fixture',expiresAt:new Date(2000).toISOString(),roles:['viewer']},generation),true);assert.equal(session.snapshot.roles.includes('publisher'),false);
});

test('admin requests use the separate bearer, preserve CAS and close on denial or an owner mismatch',async()=>{
 const calls:{path:string;options:RequestInit;authenticated?:boolean}[]=[],session=new AdminSession();let denied=false,owner=id(1);
 const api=new AdminApi({async request(path,options={},authenticated){calls.push({path,options,authenticated});if(path.endsWith('/sessions')&&options.method==='POST')return {access_token:'admin_'+'a'.repeat(64),session_id:id(2),owner_id:owner,role:'publisher',expires_at:new Date(Date.now()+60000).toISOString()};if(denied)throw new HttpError('접근 권한이 없어요.',403);return {channel:'stable',min_native_version:'1.3.0',updates_enabled:false,version:8};}},session);
 await api.open(id(1));const result=await api.setOta(id(1),{expected_version:7,channel:'stable',min_native_version:'1.3.0',updates_enabled:false});assert.equal(result.version,8);const request=calls.at(-1)!;assert.equal(request.authenticated,false);assert.equal(new Headers(request.options.headers).get('Authorization'),'Bearer admin_'+'a'.repeat(64));assert.equal(JSON.parse(request.options.body as string).expected_version,7);
 denied=true;await assert.rejects(()=>api.ota(id(1)),/접근/);assert.equal(session.snapshot.open,false);owner=id(3);await assert.rejects(()=>api.open(id(1)),/운영 세션/);assert.equal(session.snapshot.open,false);
});

test('late admin data and malformed permission or publication responses are rejected rather than shown as success',async()=>{
 const session=new AdminSession();let release!:(v:unknown)=>void;
 const api=new AdminApi({async request(path){if(path.endsWith('/eligibility'))return {eligible:true,role:null,session_seconds:900};if(path.endsWith('/sessions'))return {access_token:'admin_'+'a'.repeat(64),session_id:id(2),owner_id:id(1),role:'viewer',expires_at:new Date(Date.now()+60000).toISOString()};return new Promise(resolve=>{release=resolve;});}},session);
 await assert.rejects(()=>api.eligibility());await api.open(id(1));const pending=api.ota(id(1));session.clear();release({channel:'stable',min_native_version:'1.3.0',updates_enabled:true,version:1});await assert.rejects(()=>pending,/운영 세션/);
});
