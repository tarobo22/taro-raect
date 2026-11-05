import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {enterGuest} from './onboarding.mjs';
const {chromium}=await import(process.env.YEOUN_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.YEOUN_WEB_URL||'http://127.0.0.1:8826';
const artifacts=process.env.YEOUN_TEST_ARTIFACTS||'.local/p1-e2e';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const at='2026-11-06T00:00:00Z';

async function setup(t,options={}){
 await mkdir(artifacts,{recursive:true});const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(7000);
 await context.addInitScript(()=>{const OriginalDate=Date;globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-11-06T03:00:00Z']));}static now(){return OriginalDate.parse('2026-11-06T03:00:00Z');}};localStorage.setItem('yeoun.reduced','true');localStorage.setItem('yeoun.draft','내가 쓰던 초안');});
 const calls=[],consents=[{id:id(10),kind:'ai_processing',policy_version:'2026-11-05',granted:true,occurred_at:at},{id:id(11),kind:'journal_context',policy_version:'2026-11-05',granted:true,occurred_at:at}],favorites=new Map();let releaseSummary,sourceVersion=1,insightState='ready',jobState='queued',readingDeleted=false,insightInput=null;
 const journals=Array.from({length:12},(_,n)=>({id:id(300+n),local_day:n%2?'2026-11-06':'2026-11-01',mood:n%2?'happy':'calm',body:'내 원본 기록 '+(n+1),version:1,source_reading_id:null,source_turn_id:null,created_at:at,updated_at:at}));
 const card={id:0,code:'major_0',name_ko:'광대',name_en:'The Fool',arcana:'major',suit:null,basic_meaning:'가볍게 시작해요.',image_asset:null};
 const selected={card_id:0,position:1,position_label:'오늘',orientation:'upright',card};
 const reading={id:id(20),kind:'daily',topic:'daily',question:'',deck_version_id:id(2),local_day:'2026-11-06',captured_timezone:'Asia/Seoul',state:'selected',version:1,slots:[],selected_cards:[selected],result:null,created_at:at};
 const result={kind:'insight',empathy:'함께 기록을 살펴봤어요.',summary:'선택한 기록에서 찾은 관찰',card_insights:[],advice:'내 속도로 살펴봐요.',actions:['잠깐 창밖 바라보기'],expression:'listen',follow_up_questions:[],safety_mode:'standard'};
 const accepted=(job=40)=>({job_id:id(job),resource_id:id(30),state:'queued',status_url:'/v2/ai/jobs/'+id(job),events_url:'/v2/ai/jobs/'+id(job)+'/events'});
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname.replace('/api',''),method=request.method();let body=null;try{body=request.postDataJSON();}catch{}
  calls.push({path,method,query:Object.fromEntries(url.searchParams),body,headers:request.headers()});
  const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  const missing=()=>json({error:{code:'NOT_FOUND',message:'본인 기록을 찾지 못했어요.',retryable:false}},404);
  if(path==='/v2/sessions')return json({user_id:id(100),session_id:id(101),access_token:'a'.repeat(64),expires_at:'2027-05-05T00:00:00Z'},201);
  if(path==='/v2/sessions/refresh')return json({session_id:id(101),expires_at:'2027-05-05T00:00:00Z'});
  if(path==='/v2/bootstrap')return json({api_version:'2.0',policy_version:'2026-11-05',server_time:at,user:{id:id(100),kind:'guest',locale:'ko-KR',timezone:'Asia/Seoul',preferences:{tone:'warm',reduced_motion:true,voice_mode:'device'}},consents,ota_policy:{channel:'test',min_native_version:'1.0.0',updates_enabled:false},limits:{daily_ai_requests:20,question_max_chars:500,journal_max_chars:4000,audio_max_seconds:60,audio_max_bytes:10485760}});
  if(path==='/v1/experience-config')return json({topics:['관계','일과 진로','나 자신','오늘 하루','마음 돌봄','새로운 시작'],questions:['지금 바꿀 수 있나요?','도움을 구할 수 있나요?','작게 움직일까요?'],spreads:{one:{name:'한 장',positions:['지금']},three:{name:'세 장',positions:['현재','마음','행동']},five:{name:'다섯 장',positions:['현재','배경','마음','조언','행동']}},cards:Array.from({length:12},(_,n)=>({id:n,name:'카드 '+n,keyword:'마음',message:'기본 의미',action:'작은 행동',art:'sun'})),aiAvailable:options.aiAvailable!==false,maxTarotQuestion:500,maxCounselQuestion:2000,deckPreviewSize:12});
  if(path==='/v1/journal-policy')return json({moods:['편안해요','기뻐요','생각이 많아요','차분해요','이야기하고 싶어요'],maxBodyLength:4000});
  if(['/v1/entries','/v1/readings','/v1/counsel'].includes(path))return json([]);
  if(path==='/v2/journal-summary'){
   const from=url.searchParams.get('from'),to=url.searchParams.get('to');if(options.delaySummary&&from==='2026-10-31')await new Promise(resolve=>{releaseSummary=resolve;});
   const count=from==='2026-10-08'?3:2;return json({range_start:from,range_end:to,entry_count:count,days_with_entries:['2026-11-01','2026-11-06'],mood_counts:{calm:count-1,happy:1,thinking:0,settled:0,talk:0}});
  }
  if(path==='/v2/journal-entries')return json({items:journals.filter(e=>(!url.searchParams.get('from')||e.local_day>=url.searchParams.get('from'))&&(!url.searchParams.get('to')||e.local_day<=url.searchParams.get('to'))).map(e=>({...e,version:sourceVersion})),next_cursor:null});
  if(path.startsWith('/v2/journal-entries/')){const entry=journals.find(e=>path.endsWith(e.id));return entry?json({...entry,version:sourceVersion}):missing();}
  if(path==='/v2/favorites'){
   if(method==='POST'){if(body.reading_id!==reading.id||readingDeleted)return missing();const item={reading_id:reading.id,created_at:at};favorites.set(reading.id,item);return json(item,201);}
   return json({items:[...favorites.values()],next_cursor:null});
  }
  if(path.startsWith('/v2/favorites/')){const key=path.split('/').at(-1);if(!favorites.has(key))return missing();favorites.delete(key);return route.fulfill({status:204});}
  if(path==='/v2/readings')return json({items:readingDeleted?[]:[reading],next_cursor:null});
  if(path==='/v2/readings/'+reading.id){if(method==='DELETE'){readingDeleted=true;favorites.clear();return route.fulfill({status:204});}return readingDeleted?missing():json(reading);}
  if(path==='/v2/readings/'+reading.id+'/basic')return json({reading_id:reading.id,source:'basic',summary:'원본의 기본 카드 이야기',cards:[selected],advice:'천천히 살펴봐요.',action:'작게 시작해요.'});
  if(path==='/v2/conversations')return json({items:[],next_cursor:null});
  if(path==='/v2/me/consents')return json({items:consents,next_cursor:null});
  if(path==='/v2/journal-insights'){
   if(Object.values(body.entry_versions).some(v=>v!==sourceVersion))return json({error:{code:'RESOURCE_CHANGED',message:'선택한 기록이 수정됐어요. 내용을 다시 확인해 주세요.',retryable:false}},409);
   insightInput=body;return json(accepted(),202);
  }
  if(path==='/v2/journal-insights/'+id(30))return insightInput?json({id:id(30),range_start:insightInput.range_start,range_end:insightInput.range_end,state:insightState,based_on_count:insightInput.entry_ids.length,entry_ids:insightInput.entry_ids,entry_versions:insightInput.entry_versions,result:insightState==='ready'?result:null}):missing();
  if(path==='/v2/ai/jobs/'+id(40)+'/retry'){jobState='succeeded';return json(accepted(41),202);}
  if(path.startsWith('/v2/ai/jobs/'))return json({id:path.endsWith(id(41))?id(41):id(40),kind:'insight',state:jobState,version:1,resource_id:id(30),result_url:jobState==='succeeded'?'/v2/journal-insights/'+id(30):null,error:jobState==='failed'?{code:'PROVIDER_UNAVAILABLE',message:'연결을 마치지 못했어요.',retryable:true}:null,created_at:at,finished_at:['succeeded','failed'].includes(jobState)?at:null});
  return json({error:{code:'FIXTURE_NOT_DEFINED',message:'미정의 테스트 경로 '+path,retryable:false}},404);
 });
 return {page,context,calls,releaseSummary:()=>releaseSummary?.(),setJob:state=>{jobState=state;},invalidate:()=>{insightState='invalidated';},bumpSource:()=>{sourceVersion++;},revoke:()=>{consents.unshift({id:id(12),kind:'journal_context',policy_version:'2026-11-05',granted:false,occurred_at:'2026-11-06T01:00:00Z'});}};
}
async function records(page){await page.getByRole('tab',{name:'마음기록',exact:true}).click();}
async function summary(page){await records(page);await page.getByRole('button',{name:'마음의 흐름 · 통계와 달력',exact:true}).click();}

test('inclusive calendar GETs stay current after a range race, open the local day, and work without AI',{timeout:30000},async t=>{
 const {page,calls,releaseSummary}=await setup(t,{delaySummary:true,aiAvailable:false});await page.goto(base);await enterGuest(page);await summary(page);
 await page.getByRole('button',{name:'30일',exact:true}).click();await page.getByText('3번 마음을 남겼어요.',{exact:true}).waitFor();releaseSummary();
 await page.getByText('2026-10-08 ~ 2026-11-06 · 양끝 날짜 포함',{exact:true}).waitFor();assert.equal(await page.getByText('2번 마음을 남겼어요.',{exact:true}).count(),0);
 const target=await page.getByRole('button',{name:'2026-11-06 기록 있음',exact:true}).boundingBox();assert.ok(target.width>=48&&target.height>=48);
 await page.screenshot({path:artifacts+'/p1-summary-calendar.png',fullPage:true});
 await page.getByRole('button',{name:'2026-11-06 기록 있음',exact:true}).click();await page.getByLabel('기록 날짜 필터').waitFor();assert.equal(await page.getByLabel('기록 날짜 필터').inputValue(),'2026-11-06');
 await page.getByRole('button',{name:'마음의 흐름 · 통계와 달력',exact:true}).click();await page.getByRole('button',{name:'기록을 골라 AI 요약하기',exact:true}).click();await page.getByText('현재 AI 연결이 준비되지 않았어요.',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'선택한 기록으로 GPT 요약 요청',exact:true}).isDisabled(),true);
 assert.equal(calls.some(c=>c.method==='POST'&&(c.path.includes('insights')||c.path.includes('jobs'))),false);
});

test('owned reading favorites add, reopen, remove and disappear with deletion of the original',{timeout:30000},async t=>{
 const {page,calls}=await setup(t);await page.goto(base);await enterGuest(page);await records(page);
 await page.getByRole('button',{name:'2026-11-06 · 광대',exact:true}).click();await page.getByRole('button',{name:'소중한 리딩에 저장',exact:true}).click();await page.getByRole('button',{name:'즐겨찾기 해제',exact:true}).waitFor();
 const add=calls.find(c=>c.path==='/v2/favorites'&&c.method==='POST');assert.deepEqual(add.body,{reading_id:id(20)});assert.ok(add.headers['x-idempotency-key']);
 await page.getByRole('button',{name:'내 기록 보러 가기',exact:true}).click();await page.getByRole('button',{name:'소중한 리딩 모아보기',exact:true}).click();await page.getByRole('button',{name:'저장한 리딩 열기',exact:true}).click();await page.getByText('원본의 기본 카드 이야기',{exact:true}).waitFor();
 await page.getByRole('button',{name:'즐겨찾기 해제',exact:true}).click();await page.getByRole('button',{name:'소중한 리딩에 저장',exact:true}).click();await page.getByRole('button',{name:'즐겨찾기 해제',exact:true}).waitFor();
 await page.getByRole('button',{name:'이 리딩 삭제',exact:true}).click();await page.getByRole('button',{name:'확인하고 리딩 삭제',exact:true}).click();await page.getByRole('button',{name:'소중한 리딩 모아보기',exact:true}).click();await page.getByText('아직 저장한 리딩이 없어요.',{exact:false}).waitFor();
 assert.equal(calls.filter(c=>c.path==='/v2/favorites/'+id(20)&&c.method==='DELETE').length,1);await page.screenshot({path:artifacts+'/p1-favorites-empty.png',fullPage:true});
});

test('ten explicit insight sources persist independently, resume one job, retry explicitly and hide invalidated results',{timeout:45000},async t=>{
 const {page,calls,setJob,invalidate}=await setup(t);await page.goto(base);await enterGuest(page);await summary(page);await page.getByRole('button',{name:'기록을 골라 AI 요약하기',exact:true}).click();
 for(let n=0;n<10;n++)await page.getByRole('button',{name:'이 기록을 요약에 선택',exact:true}).first().click();assert.equal(await page.getByRole('button',{name:'이 기록을 요약에 선택',exact:true}).first().isDisabled(),true);
 assert.equal(calls.some(c=>c.path==='/v2/journal-insights'&&c.method==='POST'),false);await page.getByRole('button',{name:'선택한 기록으로 GPT 요약 요청',exact:true}).click();await page.getByText('대기 중',{exact:true}).waitFor();
 const sent=calls.find(c=>c.path==='/v2/journal-insights'&&c.method==='POST');assert.equal(sent.body.entry_ids.length,10);assert.deepEqual(sent.body.entry_versions,Object.fromEntries(Array.from({length:10},(_,n)=>[id(300+n),1])));assert.equal('body' in sent.body,false);
 await page.getByRole('button',{name:'입력과 카드 유지하고 돌아가기',exact:true}).click();await page.getByText('10 / 10개 선택',{exact:true}).waitFor();await page.reload();await page.getByRole('button',{name:'진행 중인 작업 확인',exact:true}).click();setJob('failed');await page.getByRole('button',{name:'작업 상태 다시 조회',exact:true}).click();await page.getByRole('button',{name:'확인하고 새 작업으로 재시도',exact:true}).click();await page.getByRole('button',{name:'완료된 결과 보기',exact:true}).click();await page.getByText('선택한 기록에서 찾은 관찰',{exact:true}).waitFor();await page.screenshot({path:artifacts+'/p1-insight-ready.png',fullPage:true});
 await page.getByRole('button',{name:'원본 기록 1 열기',exact:true}).click();await page.getByText('내 원본 기록 1',{exact:true}).waitFor();await page.getByRole('button',{name:'뒤로가기',exact:true}).click();invalidate();await page.getByRole('button',{name:'요약 상태 다시 확인',exact:true}).click();await page.getByText('원본 기록이 수정·삭제됐거나 동의가 바뀌어 이 요약을 표시하지 않아요.',{exact:false}).waitFor();assert.equal(await page.getByText('선택한 기록에서 찾은 관찰',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'원본 기록 1 열기',exact:true}).count(),0);
 assert.equal(calls.filter(c=>c.path==='/v2/journal-insights'&&c.method==='POST').length,1);assert.equal(calls.filter(c=>c.path.endsWith('/retry')).length,1);
 const stored=await page.evaluate(()=>({selection:localStorage.getItem('yeoun.p1.insight-selection'),context:localStorage.getItem('yeoun.context-selection'),draft:localStorage.getItem('yeoun.draft')}));assert.equal(stored.selection.includes('내 원본'),false);assert.equal(stored.context,null);assert.equal(stored.draft,'내가 쓰던 초안');await page.screenshot({path:artifacts+'/p1-insight-invalidated.png',fullPage:true});
});

test('edited selected versions fail honestly and a fresh revoked context consent prevents another insight POST',{timeout:30000},async t=>{
 const {page,calls,bumpSource,revoke}=await setup(t);await page.goto(base);await enterGuest(page);await summary(page);await page.getByRole('button',{name:'기록을 골라 AI 요약하기',exact:true}).click();await page.getByRole('button',{name:'이 기록을 요약에 선택',exact:true}).first().click();bumpSource();await page.getByRole('button',{name:'선택한 기록으로 GPT 요약 요청',exact:true}).click();await page.getByText('선택한 기록이 수정됐어요. 내용을 다시 확인해 주세요.',{exact:true}).waitFor();assert.equal(calls.filter(c=>c.path==='/v2/journal-insights'&&c.method==='POST').length,1);
 revoke();await page.getByRole('button',{name:'선택한 기록으로 GPT 요약 요청',exact:true}).click();await page.getByText('AI 처리와 마음기록 참조를 각각 허용한 뒤 다시 요청해 주세요.',{exact:true}).waitFor();assert.equal(calls.filter(c=>c.path==='/v2/journal-insights'&&c.method==='POST').length,1);assert.equal(await page.getByText('선택한 기록에서 찾은 관찰',{exact:true}).count(),0);
});
