import {enterGuest} from './onboarding.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.YEOUN_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.YEOUN_WEB_URL||'http://127.0.0.1:8817';

test('editing an empty saved entry never imports an unrelated new-entry draft',async t=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>localStorage.setItem('yeoun.draft','unrelated new draft'));
  const page=await context.newPage();page.setDefaultTimeout(7000);
  let authorization='',id;
  page.on('request',request=>{const value=request.headers().authorization;if(value)authorization=value;});
  t.after(async()=>{
    if(id)await context.request.delete(base+'/api/v1/entries/'+id,{headers:{Authorization:authorization}}).catch(()=>{});
    await browser.close();
  });
  const loaded=page.waitForResponse(response=>response.url().endsWith('/api/v1/entries')&&response.request().method()==='GET');
  await page.goto(base);await enterGuest(page);await loaded;
  const policy=await (await context.request.get(base+'/api/v1/journal-policy')).json();
  const saved=await context.request.post(base+'/api/v1/entries',{headers:{Authorization:authorization},
    data:{day:'2026-11-06',mood:policy.moods[0],body:''}});
  assert.equal(saved.status(),201);id=(await saved.json()).id;
  await page.reload();
  await page.getByRole('tab',{name:'마음기록',exact:true}).click();
  await page.getByRole('button',{name:/마음만 남겨도 괜찮아요/}).click();
  await page.getByRole('button',{name:'기록 수정하기',exact:true}).click();
  assert.equal(await page.getByLabel('마음기록 내용 입력').inputValue(),'');
});
