import {enterGuest} from './onboarding.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const {chromium}=await import(process.env.YEOUN_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.YEOUN_WEB_URL||'http://127.0.0.1:8817';
const artifacts=process.env.YEOUN_TEST_ARTIFACTS||'.local/e2e';

test('three-card reading and manually submitted conversation retain a follow-up draft across reload',
  {timeout:45000},async t=>{
  await mkdir(artifacts,{recursive:true});
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();page.setDefaultTimeout(7000);
  let authorization='';
  page.on('request',request=>{const value=request.headers().authorization;if(value)authorization=value;});
  await page.goto(base);await enterGuest(page);
  await page.getByRole('button',{name:/고민 타로/}).click();
  await page.getByRole('button',{name:'3장의 카드 만나기',exact:true}).click();
  for(let number=1;number<=3;number++)await page.getByRole('button',{name:number+'번째 카드',exact:true}).click();
  await page.getByRole('button',{name:'선택한 카드의 이야기 듣기',exact:true}).click();
  await page.getByRole('button',{name:'내 기록 보러 가기',exact:true}).waitFor();
  await page.screenshot({path:path.join(artifacts,'tarot-result.png'),fullPage:true});
  await page.getByRole('button',{name:'내 기록 보러 가기',exact:true}).click();
  await page.getByRole('tab',{name:'오늘',exact:true}).click();
  await page.getByRole('button',{name:'마음 이야기 시작하기',exact:true}).click();
  const config=await (await context.request.get(base+'/api/v1/experience-config')).json();
  for(let number=0;number<config.questions.length;number++)await page.getByRole('button',{name:'예 선택',exact:true}).click();
  const headers={Authorization:authorization};
  assert.equal((await (await context.request.get(base+'/api/v1/counsel',{headers})).json()).length,0);
  await page.getByLabel('상담 내용 입력').fill('e2e one small step');
  await page.getByRole('button',{name:'내 이야기 보내기',exact:true}).click();
  await page.getByRole('button',{name:'이 이야기 이어가기',exact:true}).waitFor();
  const first=(await (await context.request.get(base+'/api/v1/counsel',{headers})).json())[0];
  assert.equal(first.source,'local');
  await page.getByRole('button',{name:'이 이야기 이어가기',exact:true}).click();
  const followup='e2e follow-up draft';await page.getByLabel('상담 내용 입력').fill(followup);
  await page.waitForFunction(value=>JSON.parse(localStorage.getItem('yeoun.talk.draft')||'{}').question===value,followup);
  await page.reload();
  await page.getByRole('button',{name:'마음 이야기 시작하기',exact:true}).click();
  await page.waitForFunction(value=>document.querySelector('textarea')?.value===value,followup);
  await page.getByRole('button',{name:'내 이야기 보내기',exact:true}).click();
  await page.getByRole('button',{name:'이 이야기 이어가기',exact:true}).waitFor();
  const history=await (await context.request.get(base+'/api/v1/counsel',{headers})).json();
  assert.equal(history.length,2);assert.equal(history[0].parentId,first.id);
  await page.screenshot({path:path.join(artifacts,'counsel-result.png'),fullPage:true});
});

test('a failed tarot-history request does not disable the journal form',async t=>{
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();page.setDefaultTimeout(7000);
  await page.route('**/api/v1/readings',route=>route.abort('failed'));
  await page.goto(base);await enterGuest(page);
  await page.getByRole('button',{name:/지금의 마음 남기기/}).click();
  const policy=await (await context.request.get(base+'/api/v1/journal-policy')).json();
  await page.getByRole('button',{name:policy.moods[0],exact:true}).waitFor();
  assert.equal(await page.getByLabel('마음기록 내용 입력').isEditable(),true);
});
