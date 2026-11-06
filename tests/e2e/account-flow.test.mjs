import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {enterGuest} from './onboarding.mjs';
const {chromium}=await import(process.env.YEOUN_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.YEOUN_WEB_URL||'http://127.0.0.1:8838';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const at='2026-11-06T00:00:00Z',guestToken='a'.repeat(64),memberToken='b'.repeat(64);
async function fixture(t,available){
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));t.after(()=>assert.deepEqual(errors,[]));
 let cancelNext=false,started=null,exchanges=0;const requests=[];
 const user=member=>({id:id(member?2:1),kind:member?'member':'guest',locale:'ko-KR',timezone:'Asia/Seoul',preferences:{tone:'warm',reduced_motion:true,voice_mode:'device'}});
 await page.route('https://accounts.google.com/**',route=>route.fulfill({status:302,headers:{location:base+'/auth/complete#'+(cancelNext?'auth_error=cancelled':'auth_ticket='+('t'.repeat(43))+'&auth_provider=google')}}));
 await page.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace('/api',''),member=request.headers().authorization==='Bearer '+memberToken;let body=null;try{body=request.postDataJSON();}catch{}
  requests.push({path,method:request.method()});const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(path==='/v2/sessions')return json({user_id:id(1),session_id:id(11),access_token:guestToken,expires_at:'2027-01-01T00:00:00Z'},201);
  if(path==='/v2/bootstrap')return json({api_version:'2.0',policy_version:'2026-11-05',server_time:at,user:user(member),consents:[],ota_policy:{channel:'test',min_native_version:'1.0.0',updates_enabled:false},limits:{daily_ai_requests:20,question_max_chars:500,journal_max_chars:4000,audio_max_seconds:60,audio_max_bytes:10485760}});
  if(path==='/v2/sessions/refresh')return json({session_id:id(member?12:11),expires_at:'2027-01-01T00:00:00Z'});
  if(path==='/v2/auth/providers')return json({providers:[{provider:'google',available,reason:available?null:'provider_not_configured'},{provider:'apple',available:false,reason:'provider_not_configured'}]});
  if(path==='/v2/auth/account')return json({user_id:id(member?2:1),kind:member?'member':'guest',providers:member?['google']:[]});
  if(path==='/v2/auth/sessions')return json({items:[{id:id(member?12:11),platform:'web',created_at:at,expires_at:'2027-01-01T00:00:00Z',current:true}]});
  if(path==='/v2/auth/social/google/start'){assert.equal(available,true);assert.equal(body.return_uri,base+'/auth/complete');assert.equal(body.platform,'web');assert.match(body.code_challenge,/^[\w-]{43}$/);assert.equal(new URL(body.return_uri).hash,'');started=body;return json({authorization_url:'https://accounts.google.com/o/oauth2/v2/auth?state=mock-state',expires_at:'2099-01-01T00:00:00Z'},201);}
  if(path==='/v2/auth/social/exchange'){exchanges++;assert.equal(request.headers().authorization,'Bearer '+guestToken);assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url'),started.code_challenge);return json({user_id:id(2),previous_user_id:id(1),session_id:id(12),access_token:memberToken,expires_at:'2027-01-01T00:00:00Z',guest_records_preserved:true},201);}
  if(path==='/v1/experience-config')return json({topics:['관계','일과 진로','나 자신','오늘 하루','마음 돌봄','새로운 시작'],questions:['지금 바꿀 수 있나요?','도움을 구할 수 있나요?','작게 움직일까요?'],spreads:{one:{name:'한 장',positions:['지금']},three:{name:'세 장',positions:['현재','마음','행동']}},cards:[],aiAvailable:false,maxTarotQuestion:500,maxCounselQuestion:2000,deckPreviewSize:12});
  if(path==='/v1/journal-policy')return json({moods:['편안해요','기뻐요','생각이 많아요','차분해요','이야기하고 싶어요'],maxBodyLength:4000});
  if(['/v1/entries','/v1/readings','/v1/counsel'].includes(path))return json([]);
  return json({error:{code:'FIXTURE_MISSING',message:'새 검증에 정의하지 않은 경로예요.',retryable:false}},404);
 });
 await page.goto(base);await enterGuest(page);return{page,requests,cancel:()=>{cancelNext=true;},exchanges:()=>exchanges};
}
async function openAccount(page){await page.getByRole('tab',{name:'내 공간',exact:true}).click();await page.getByRole('button',{name:'계정 연결과 로그인 관리',exact:true}).click();await page.getByRole('button',{name:'Google로 연결하기',exact:true}).waitFor();}
async function journal(page){try{await page.getByRole('button',{name:'지금의 마음 남기기',exact:false}).click({timeout:5000});}catch(error){throw new Error(String(error)+'\nVisible page: '+await page.locator('body').innerText());}await page.getByLabel('마음기록 내용 입력').waitFor();}
async function persisted(page,text){await page.waitForFunction(text=>{const raw=localStorage.getItem('yeoun.journal.draft.new');return raw&&JSON.parse(raw).body===text;},text);}

test('unconfigured providers stay disabled and never launch a pretend login',{timeout:30000},async t=>{
 const {page,requests}=await fixture(t,false);await openAccount(page);
 assert.equal(await page.getByRole('button',{name:'Google로 연결하기',exact:true}).isDisabled(),true);
 assert.equal(await page.getByRole('button',{name:'Apple로 연결하기',exact:true}).isDisabled(),true);
 assert.ok(await page.getByText('아직 로그인 연결이 준비되지 않았어요.',{exact:false}).count());
 assert.equal(requests.some(r=>r.path.includes('/social/')),false);
 assert.equal(await page.evaluate(()=>localStorage.getItem('yeoun.session')),guestToken);
});

test('mock social return isolates owner drafts, preserves pending identity, restores guest and handles cancel',{timeout:45000},async t=>{
 const fx=await fixture(t,true),{page}=fx;await journal(page);await page.getByLabel('마음기록 내용 입력').fill('original guest draft');await persisted(page,'original guest draft');
 await page.evaluate(()=>localStorage.setItem('yeoun.p0.attempt.turn',JSON.stringify({id:'00000000-0000-4000-8000-000000000091',fingerprint:'opaque original pending'})));
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await openAccount(page);await page.getByRole('button',{name:'Google로 연결하기',exact:true}).click();
 await page.getByText('계정으로 연결되어 있어요.',{exact:true}).waitFor();assert.equal(fx.exchanges(),1);
 assert.equal(new URL(page.url()).hash,'');assert.equal(await page.evaluate(()=>localStorage.getItem('yeoun.journal.draft.new')),null);
 assert.equal(await page.evaluate(()=>localStorage.getItem('yeoun.p0.attempt.turn')),null);
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await journal(page);assert.equal(await page.getByLabel('마음기록 내용 입력').inputValue(),'');
 await page.getByLabel('마음기록 내용 입력').fill('separate member draft');await persisted(page,'separate member draft');
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await page.getByRole('tab',{name:'내 공간',exact:true}).click();await page.getByRole('button',{name:'계정 연결과 로그인 관리',exact:true}).click();
 await page.getByRole('button',{name:'이전 게스트 기록 1로 돌아가기',exact:true}).click();await page.getByText('게스트 기록을 그대로 보관하고 있어요.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('yeoun.p0.attempt.turn')).fingerprint),'opaque original pending');
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await journal(page);assert.equal(await page.getByLabel('마음기록 내용 입력').inputValue(),'original guest draft');
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await openAccount(page);fx.cancel();await page.getByRole('button',{name:'Google로 연결하기',exact:true}).click();
 await page.getByText('계정 연결을 취소했어요. 기존 기록과 초안은 그대로예요.',{exact:true}).waitFor();assert.equal(fx.exchanges(),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('yeoun.session')),guestToken);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('yeoun.journal.draft.new')).body),'original guest draft');
 assert.equal(fx.requests.some(r=>r.path.includes('/ai/')||r.path==='/v2/transcriptions'),false);
});
