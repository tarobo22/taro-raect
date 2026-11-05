import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {enterGuest} from './onboarding.mjs';
const {chromium}=await import(process.env.YEOUN_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.YEOUN_WEB_URL||'http://127.0.0.1:8819';
const artifacts=process.env.YEOUN_TEST_ARTIFACTS||'.local/p0-e2e';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const at='2026-11-06T00:00:00Z';

async function setup(t){
 await mkdir(artifacts,{recursive:true});
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(7000);
 await context.addInitScript(()=>localStorage.setItem('yeoun.reduced','true'));
 const calls=[],consents=[],jobs=new Map();let erased=false,receipt=null,event=0;
 const asset={id:id(1),url:'/api/mock-card',sha256:'a'.repeat(64),width:825,height:1429,source_page:'https://commons.wikimedia.org/wiki/File:RWS1909_-_00_Fool.jpeg',license_name:'Public domain',license_url:'https://creativecommons.org/publicdomain/mark/1.0/'};
 const deck={id:id(2),code:'fixture-rws',version:'test-20261105',name:'기존 그림 후보 덱',card_count:78,status:'candidate',back_asset:asset};
 const card=n=>({id:n,code:'major_'+n,name_ko:'카드 '+n,name_en:'Card '+n,arcana:'major',suit:null,basic_meaning:'현재 마음을 다른 시선으로 살펴봐요.',image_asset:asset});
 const reading={id:id(20),kind:'three_card',topic:'self',question:'',deck_version_id:deck.id,local_day:null,captured_timezone:'Asia/Seoul',state:'draft',version:1,slots:Array.from({length:12},(_,i)=>({id:id(i+3),index:i+1})),selected_cards:[],result:null,created_at:at};
 const result={kind:'tarot',empathy:'함께 마음을 살펴봐요.',summary:'검증하고 저장한 결과',card_insights:[],advice:'한 번 쉬어 가요.',actions:['작은 행동 하나'],expression:'listen',follow_up_questions:[],safety_mode:'standard'};
 const accepted=(jobId,resourceId)=>({job_id:jobId,resource_id:resourceId,state:'queued',status_url:'/v2/ai/jobs/'+jobId,events_url:'/v2/ai/jobs/'+jobId+'/events'});
 const makeJob=(jobId,kind,resourceId,state)=>({id:jobId,kind,state,version:1,resource_id:resourceId,result_url:state==='succeeded'?'/v2/readings/'+resourceId:null,error:state==='failed'?{code:'UNKNOWN_PROVIDER_OUTCOME',message:'이전 처리 결과를 확인할 수 없어요.',retryable:true}:null,created_at:at,finished_at:state==='succeeded'||state==='failed'?at:null});
 const image=await readFile(new URL('../../assets/cards/major_00.jpg',import.meta.url));
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname.replace('/api','');let body=null;
  if(request.headers()['content-type']?.includes('application/json'))try{body=request.postDataJSON();}catch{}
  calls.push({path,method:request.method(),body,headers:request.headers()});
  const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(path==='/mock-card')return route.fulfill({status:200,contentType:'image/jpeg',body:image});
  if(path==='/v2/sessions')return json({user_id:id(100),session_id:id(101),access_token:'a'.repeat(64),expires_at:'2027-05-05T00:00:00Z'},201);
  if(path==='/v2/bootstrap')return erased?json({error:{code:'SESSION_EXPIRED',message:'기존 연결이 해제됐어요.',retryable:false}},401):json({api_version:'2.0',policy_version:'2026-11-05',server_time:at,user:{id:id(100)},consents,ota_policy:{channel:'test',min_native_version:'1.0.0',updates_enabled:false},limits:{daily_ai_requests:20,question_max_chars:500,journal_max_chars:4000,audio_max_seconds:60,audio_max_bytes:10485760}});
  if(path==='/v2/sessions/refresh')return json({session_id:id(101),expires_at:'2027-05-05T00:00:00Z'});
  if(path==='/v1/experience-config')return json({topics:['관계','일과 진로','나 자신','오늘 하루','마음 돌봄','새로운 시작'],questions:['지금 바꿀 수 있나요?','도움을 구할 수 있나요?','작게 움직일까요?'],spreads:{one:{name:'한 장',positions:['지금']},three:{name:'세 장',positions:['현재','마음','행동']},five:{name:'다섯 장',positions:['현재','배경','마음','조언','행동']}},cards:Array.from({length:12},(_,n)=>({id:n,name:'카드 '+n,keyword:'마음',message:'기본 의미',action:'작은 행동',art:'sun'})),aiAvailable:true,maxTarotQuestion:500,maxCounselQuestion:2000,deckPreviewSize:12});
  if(path==='/v1/journal-policy')return json({moods:['편안해요','기뻐요','생각이 많아요','차분해요','이야기하고 싶어요'],maxBodyLength:4000});
  if(['/v1/entries','/v1/readings','/v1/counsel'].includes(path))return json([]);
  if(path==='/v2/me/consents'){
   if(request.method()==='GET')return json({items:consents,next_cursor:null});
   const consent={...body,id:id(200+event),occurred_at:new Date(Date.parse(at)+event++*1000).toISOString()};consents.unshift(consent);return json(consent,201);
  }
  if(path==='/v2/decks')return json({items:[deck],next_cursor:null});
  if(path==='/v2/decks/'+deck.id)return json(deck);
  if(path==='/v2/cards')return json({items:[0,1,2].map(card),next_cursor:null});
  if(path.startsWith('/v2/cards/'))return json(card(Number(path.split('/').at(-1))));
  if(path==='/v2/journal-entries')return json({items:[0,1,2,3].map(n=>({id:id(300+n),local_day:'2026-11-0'+(n+1),mood:'calm',body:'owned journal '+n,version:1,source_reading_id:null,source_turn_id:null,created_at:at,updated_at:at})),next_cursor:null});
  if(path==='/v2/readings')return request.method()==='POST'?json(reading,201):json({items:reading.state==='draft'?[]:[reading],next_cursor:null});
  if(path==='/v2/readings/'+reading.id+'/selection'){
   reading.selected_cards=body.slot_ids.map((slot,i)=>({card_id:i,position:i+1,position_label:['현재','살펴볼 마음','작은 행동'][i],orientation:'upright',card:card(i)}));reading.state='selected';reading.version++;return json(reading);
  }
  if(path==='/v2/readings/'+reading.id)return json(reading);
  if(path==='/v2/readings/'+reading.id+'/basic')return json({reading_id:reading.id,source:'basic',summary:'기본 카드 이야기',cards:reading.selected_cards,advice:'천천히 살펴봐요.',action:'작게 시작해요.'});
  if(path==='/v2/readings/'+reading.id+'/interpretations'){jobs.set(id(40),makeJob(id(40),'tarot',reading.id,'failed'));return json(accepted(id(40),reading.id),202);}
  if(path.endsWith('/retry')){jobs.set(id(41),makeJob(id(41),'tarot',reading.id,'succeeded'));reading.state='ready';reading.result=result;return json(accepted(id(41),reading.id),202);}
  if(path.startsWith('/v2/ai/jobs/'))return json(jobs.get(path.split('/')[4])||makeJob(id(60),'transcription',id(61),'succeeded'));
  if(path==='/v2/conversations')return request.method()==='POST'?json({id:id(50),topic:body.topic,tone:body.tone,state:'active',created_at:at,updated_at:at},201):json({items:[],next_cursor:null});
  if(path==='/v2/conversations/'+id(50)+'/turns'&&request.method()==='POST')return json(accepted(id(51),id(52)),202);
  if(path==='/v2/me/data-requests'){receipt={id:id(70),kind:body.kind,state:'queued',receipt:'status-only-receipt',expires_at:'2026-11-07T00:00:00Z'};return json(receipt,202);}
  if(path==='/v2/data-requests/'+id(70)){if(receipt.kind==='erase')erased=true;return json({id:id(70),kind:receipt.kind,state:'completed',download_available:receipt.kind==='export'&&!!request.headers().authorization&&!request.headers()['x-data-receipt'],expires_at:receipt.expires_at});}
  if(path==='/v2/data-requests/'+id(70)+'/download'){if(!request.headers().authorization||request.headers()['x-data-receipt'])return json({error:{code:'UNAUTHORIZED',message:'파일 다운로드는 유효한 기기 연결이 필요해요.',retryable:false}},401);return route.fulfill({status:200,contentType:'application/zip',body:Buffer.from('504b0506000000000000000000000000000000000000','hex')});}
  if(path==='/v2/feedback')return json({id:id(80),created_at:at},201);
  if(path==='/v2/transcriptions')return json(accepted(id(60),id(61)),202);
  if(path==='/v2/transcriptions/'+id(61))return request.method()==='DELETE'?route.fulfill({status:204}):json({id:id(61),state:'ready',transcript:'server transcript',expires_at:'2026-11-06T01:00:00Z'});
  return json({error:{code:'FIXTURE_NOT_DEFINED',message:'미정의 테스트 경로 '+path,retryable:false}},404);
 });
 return {page,context,calls,consents,reading};
}

test('explicit onboarding, owned context, hidden slots and an explicit AI retry form one reviewable flow',{timeout:45000},async t=>{
 const {page,calls}=await setup(t);await page.goto(base);
 await page.getByRole('button',{name:'게스트로 시작',exact:true}).waitFor();
 assert.equal(calls.filter(c=>c.path==='/v2/sessions').length,0);
 await enterGuest(page);assert.equal(calls.filter(c=>c.path==='/v2/sessions').length,1);
 await page.getByRole('button',{name:/고민 타로/}).click();
 await page.getByLabel('타로 질문 입력').fill('explicit question');
 await page.getByRole('button',{name:'3장의 카드 만나기',exact:true}).click();
 for(let n=1;n<=3;n++)await page.getByRole('button',{name:n+'번째 카드',exact:true}).click();
 assert.equal(calls.some(c=>c.path.endsWith('/interpretations')),false);
 await page.getByRole('button',{name:'선택한 카드의 이야기 듣기',exact:true}).click();
 await page.getByRole('button',{name:'AI 이용 동의 설정',exact:true}).click();
 await page.getByRole('button',{name:'이 목적만 허용',exact:true}).nth(0).click();
 await page.getByText('허용됨 · 2026-11-06',{exact:true}).waitFor();
 await page.getByRole('button',{name:'이 목적만 허용',exact:true}).nth(0).click();
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();
 await page.getByRole('button',{name:'참고할 마음기록 선택 · 0개',exact:true}).click();
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'이 기록 선택',exact:true}).nth(0).click();
 assert.equal(await page.getByRole('button',{name:'이 기록 선택',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'선택한 기록 확정',exact:true}).click();
 await page.getByRole('button',{name:'확인한 카드로 GPT 해석 요청',exact:true}).click();
 await page.getByText('이전 처리 결과를 확인할 수 없어요.',{exact:false}).waitFor();
 const sent=calls.find(c=>c.path.endsWith('/interpretations'));assert.deepEqual(sent.body.context_entry_ids,[id(300),id(301),id(302)]);assert.equal('body' in sent.body,false);assert.ok(sent.headers['x-idempotency-key']);
 assert.equal(calls.filter(c=>c.path.endsWith('/retry')).length,0);
 await page.getByRole('button',{name:'확인하고 새 작업으로 재시도',exact:true}).click();
 await page.getByRole('button',{name:'완료된 결과 보기',exact:true}).click();
 await page.getByText('검증하고 저장한 결과',{exact:true}).waitFor();
 assert.equal(calls.filter(c=>c.path.endsWith('/retry')).length,1);
 await page.getByRole('button',{name:'카드 0 카드 상세',exact:true}).click();
 await page.getByRole('button',{name:'카드 원본 출처',exact:true}).click();
 await page.getByText('Public domain',{exact:true}).waitFor();
 await page.screenshot({path:artifacts+'/p0-source.png',fullPage:true});
});

test('cloud audio is explicitly submitted and its editable review appends to an existing draft without a chat send',{timeout:30000},async t=>{
 const {page,context,calls}=await setup(t);
 await context.addInitScript(()=>localStorage.setItem('yeoun.talk.draft',JSON.stringify({question:'my earlier words',answers:[true]})));
 await page.goto(base);await enterGuest(page);
 await page.getByRole('button',{name:'마음 이야기 시작하기',exact:true}).click();
 await page.getByRole('button',{name:'클라우드 음성 파일로 이야기 쓰기',exact:true}).click();
 await page.getByRole('button',{name:'클라우드 음성 동의 설정',exact:true}).click();
 await page.getByRole('button',{name:'이 목적만 허용',exact:true}).nth(2).click();
 await page.getByText('허용됨 · 2026-11-06',{exact:true}).waitFor();
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();
 const wav=Buffer.alloc(44+16000);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'전사할 음성 파일 선택',exact:true}).click();
 await (await chooser).setFiles({name:'test-audio.wav',mimeType:'audio/wav',buffer:wav});
 await page.getByText('test-audio.wav',{exact:true}).waitFor();
 assert.equal(calls.filter(c=>c.path==='/v2/transcriptions').length,0);
 await page.getByRole('button',{name:'이 파일을 전사 요청',exact:true}).click();
 await page.getByRole('button',{name:'전사문 검토하기',exact:true}).click();
 await page.getByLabel('전사문 검토').fill('edited reviewed words');
 assert.equal(calls.filter(c=>c.path.includes('/turns')&&c.method==='POST').length,0);
 await page.getByRole('button',{name:'확인한 전사문을 입력에 넣기',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('textarea')?.value==='my earlier words\nedited reviewed words');
 assert.equal(calls.filter(c=>c.path.includes('/turns')&&c.method==='POST').length,0);
 const transcript=calls.find(c=>c.path==='/v2/transcriptions');assert.ok(transcript.headers['content-type'].startsWith('multipart/form-data; boundary='));
 await page.screenshot({path:artifacts+'/p0-voice-reviewed.png',fullPage:true});
});

test('export ZIP download uses the bearer while app feedback sends only the explicit rating and comment',{timeout:30000},async t=>{
 const {page,calls}=await setup(t);await page.goto(base);await enterGuest(page);
 await page.getByRole('tab',{name:'내 공간',exact:true}).click();
 await page.getByRole('button',{name:'내 기록과 데이터',exact:true}).click();
 await page.getByRole('button',{name:'내 기록 내보내기 요청',exact:true}).click();await page.getByText('접수',{exact:true}).waitFor();
 await page.getByRole('button',{name:'처리 상태 다시 조회',exact:true}).click();
 await page.getByText('완료',{exact:true}).waitFor();
 const status=calls.find(c=>c.path==='/v2/data-requests/'+id(70));assert.ok(status.headers.authorization);assert.equal(status.headers['x-data-receipt'],undefined);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'내보내기 파일 내려받기',exact:true}).click();
 assert.equal((await download).suggestedFilename(),'yeoun-export-'+id(70)+'.zip');
 const request=calls.find(c=>c.path.endsWith('/download'));assert.ok(request.headers.authorization);assert.equal(request.headers['x-data-receipt'],undefined);
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();
 await page.getByRole('button',{name:'의견 남기기',exact:true}).click();
 await page.getByLabel('의견 이유').fill('조작이 쉬워요');await page.getByLabel('의견 내용').fill('직접 남긴 의견');
 await page.getByRole('button',{name:'의견 보내기',exact:true}).click();await page.getByText('의견이 접수됐어요. 마음을 나눠 주셔서 고마워요.',{exact:true}).waitFor();
 assert.deepEqual(calls.find(c=>c.path==='/v2/feedback').body,{rating:'helpful',reason:'조작이 쉬워요',comment:'직접 남긴 의견'});
});

test('erase completion survives reload using the saved minimal receipt without creating another guest',{timeout:30000},async t=>{
 const {page,calls}=await setup(t);await page.goto(base);await enterGuest(page);
 await page.getByRole('tab',{name:'내 공간',exact:true}).click();
 await page.getByRole('button',{name:'내 기록과 데이터',exact:true}).click();
 await page.evaluate(()=>{localStorage.setItem('yeoun.draft','private draft');localStorage.setItem('other-app.key','keep');});
 await page.getByRole('button',{name:'전체 삭제 범위 확인',exact:true}).click();
 await page.getByLabel('전체 삭제 확인문').fill('wrong');assert.equal(await page.getByRole('button',{name:'전체 삭제 요청 보내기',exact:true}).isDisabled(),true);
 await page.getByLabel('전체 삭제 확인문').fill('내 기록 모두 삭제');await page.getByRole('button',{name:'전체 삭제 요청 보내기',exact:true}).click();
 await page.getByText('접수',{exact:true}).waitFor();
 assert.equal(await page.getByText('완료',{exact:true}).count(),0);
 await page.getByRole('button',{name:'처리 상태 다시 조회',exact:true}).click();await page.getByText('완료',{exact:true}).waitFor();
 await page.waitForFunction(()=>localStorage.getItem('yeoun.session')===null);assert.equal(await page.evaluate(()=>localStorage.getItem('yeoun.draft')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('other-app.key')),'keep');
 await page.reload();await page.getByRole('button',{name:'게스트로 시작',exact:true}).waitFor();
 await page.getByRole('button',{name:'삭제 요청 상태 확인',exact:true}).click();
 await page.getByRole('button',{name:'처리 상태 다시 조회',exact:true}).click();await page.getByText('완료',{exact:true}).waitFor();
 assert.equal(calls.filter(c=>c.path==='/v2/sessions').length,1);
 const statuses=calls.filter(c=>c.path==='/v2/data-requests/'+id(70));assert.ok(statuses.every(c=>c.headers['x-data-receipt']==='status-only-receipt'));
});
