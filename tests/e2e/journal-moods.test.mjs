import test from 'node:test';
import assert from 'node:assert/strict';
import {enterGuest} from './onboarding.mjs';
const {chromium}=await import(process.env.YEOUN_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.YEOUN_WEB_URL||'http://127.0.0.1:8837';
const labels={calm:'편안해요',happy:'기뻐요',thinking:'생각이 많아요',settled:'차분해요',talk:'이야기하고 싶어요'};
const codes=Object.keys(labels),id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const at='2026-11-06T00:00:00Z';

for(const explicit of [true,false]){
 test(`all five history labels survive reopen and edit with ${explicit?'explicit':'legacy'} sorted mood policy`,{timeout:45000},async t=>{
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(7000);
  const rows=codes.map((mood,n)=>({id:id(300+n),local_day:'2026-11-06',mood,body:'body-'+mood,
   source_reading_id:id(20),source_turn_id:null,version:1,created_at:at,updated_at:at}));
  const calls=[];
  await page.route('**/api/**',async route=>{
   const request=route.request(),path=new URL(request.url()).pathname.replace('/api',''),method=request.method();let body=null;try{body=request.postDataJSON();}catch{}
   calls.push({path,method,body});
   const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
   if(path==='/v2/sessions')return json({user_id:id(100),session_id:id(101),access_token:'a'.repeat(64),expires_at:'2027-05-05T00:00:00Z'},201);
   if(path==='/v2/sessions/refresh')return json({session_id:id(101),expires_at:'2027-05-05T00:00:00Z'});
   if(path==='/v2/bootstrap')return json({api_version:'2.0',policy_version:'2026-11-05',server_time:at,
    user:{id:id(100),kind:'guest',locale:'ko-KR',timezone:'Asia/Seoul',preferences:{tone:'warm',reduced_motion:true,voice_mode:'device'}},
    consents:[],ota_policy:{channel:'test',min_native_version:'1.3.0',updates_enabled:false},
    limits:{daily_ai_requests:20,question_max_chars:500,journal_max_chars:4000,audio_max_seconds:60,audio_max_bytes:10485760}});
   if(path==='/v1/experience-config')return json({topics:['관계','일과 진로','나 자신','오늘 하루','마음 돌봄','새로운 시작'],questions:['지금 바꿀 수 있나요?','도움을 구할 수 있나요?','작게 움직일까요?'],
    spreads:{one:{name:'한 장',positions:['지금']},three:{name:'세 장',positions:['현재','마음','행동']},five:{name:'다섯 장',positions:['현재','배경','마음','조언','행동']}},
    cards:Array.from({length:12},(_,n)=>({id:n,name:'카드 '+n,keyword:'마음',message:'기본 의미',action:'작은 행동',art:'sun'})),aiAvailable:false,maxTarotQuestion:500,maxCounselQuestion:2000,deckPreviewSize:12});
   if(path==='/v1/journal-policy')return json({moods:Object.values(labels).sort(),maxBodyLength:4000,...(explicit?{moodCodes:labels}:{})});
   if(['/v1/entries','/v1/readings','/v1/counsel'].includes(path))return json([]);
   if(['/v2/readings','/v2/conversations'].includes(path))return json({items:[],next_cursor:null});
   if(path==='/v2/journal-entries')return json({items:rows,next_cursor:null});
   if(path.startsWith('/v2/journal-entries/')){
    const row=rows.find(entry=>path.endsWith(entry.id));if(row){if(method==='PATCH')Object.assign(row,{mood:body.mood,body:body.body,version:row.version+1});return json(row);}
   }
   return json({error:{code:'FIXTURE_NOT_DEFINED',message:'정의하지 않은 테스트 경로 '+path,retryable:false}},404);
  });
  await page.goto(base);await enterGuest(page);await page.getByRole('tab',{name:'마음기록',exact:true}).click();
  for(const code of codes)await page.getByText(labels[code],{exact:true}).waitFor();
  for(const code of codes){
   await page.getByRole('button').filter({hasText:'body-'+code}).click();
   await page.getByRole('button',{name:'기록 수정하기',exact:true}).waitFor();
   assert.equal(await page.getByText(labels[code],{exact:true}).count(),1);
   await page.getByRole('button',{name:'기록 수정하기',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:labels[code],exact:true}).getAttribute('aria-pressed'),'true');
   await page.getByLabel('마음기록 내용 입력').fill('edited-'+code);
   await page.getByRole('button',{name:'수정한 마음 저장하기',exact:true}).click();
   await page.getByRole('button',{name:'기록 수정하기',exact:true}).waitFor();
   assert.equal(await page.getByText(labels[code],{exact:true}).count(),1);
   const sent=calls.filter(call=>call.method==='PATCH').at(-1);assert.equal(sent.body.mood,code);
   await page.getByRole('button',{name:'뒤로가기',exact:true}).click();
   await page.getByRole('button').filter({hasText:'edited-'+code}).waitFor();
  }
  assert.equal(calls.filter(call=>call.method==='PATCH').length,5);
  assert.equal(calls.some(call=>call.method==='POST'&&/interpretations|insights|turns|jobs/.test(call.path)),false);
 });
}
