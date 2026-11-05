import {enterGuest} from './onboarding.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const {chromium}=await import(process.env.YEOUN_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.YEOUN_WEB_URL||'http://127.0.0.1:8807';
const artifacts=process.env.YEOUN_TEST_ARTIFACTS||'.local/e2e';

test('lost save response, page reload, retry and edit-conflict resolution preserve the user draft',
  {timeout:45000},async t=>{
  await mkdir(artifacts,{recursive:true});
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();page.setDefaultTimeout(7000);
  let authorization='',committed;
  const operations=[];
  page.on('request',request=>{
    const header=request.headers().authorization;if(header)authorization=header;
    if(request.method()==='POST'&&request.url().endsWith('/api/v1/entries')){
      operations.push(request.postDataJSON().requestId);
    }
  });
  t.after(async()=>{
    if(committed&&authorization)await context.request.delete(base+'/api/v1/entries/'+committed.id,
      {headers:{Authorization:authorization}}).catch(()=>{});
    await browser.close();
  });
  await page.goto(base);await enterGuest(page);
  await page.getByRole('button',{name:/지금의 마음 남기기/}).click();
  const policy=await (await context.request.get(base+'/api/v1/journal-policy')).json();
  await page.getByRole('button',{name:policy.moods[0],exact:true}).click();
  const text='e2e preserved draft '+Date.now();
  const input=page.getByLabel('마음기록 내용 입력');await input.fill(text);
  let lostOnce=false,acknowledged;
  const lost=new Promise(resolve=>{acknowledged=resolve;});
  await page.route('**/api/v1/entries',async route=>{
    if(route.request().method()==='POST'&&!lostOnce){
      lostOnce=true;
      committed=await (await route.fetch()).json();
      await route.abort('failed');acknowledged();
    }else await route.continue();
  });
  await page.getByRole('button',{name:'이 마음 저장하기',exact:true}).click();
  await lost;
  await page.getByText('Failed to fetch',{exact:true}).waitFor();
  assert.equal(await input.inputValue(),text);
  await page.reload();
  await page.getByRole('button',{name:/지금의 마음 남기기/}).click();
  await page.waitForFunction(value=>document.querySelector('textarea')?.value===value,text);
  await page.getByRole('button',{name:'이 마음 저장하기',exact:true}).click();
  await page.getByRole('button',{name:'기록 수정하기',exact:true}).waitFor();
  const headers={Authorization:authorization};
  let entries=await (await context.request.get(base+'/api/v1/entries',{headers})).json();
  assert.equal(entries.filter(entry=>entry.body===text).length,1);
  assert.ok(operations[0]);assert.equal(operations[0],operations[1]);
  assert.equal(entries[0].id,committed.id);

  await page.getByRole('button',{name:'기록 수정하기',exact:true}).click();
  const mine=text+' edited';await page.getByLabel('마음기록 내용 입력').fill(mine);
  const other=await context.request.put(base+'/api/v1/entries/'+committed.id,{headers,
    data:{mood:policy.moods[0],body:'another editor',expectedVersion:entries[0].version}});
  assert.equal(other.status(),200);
  await page.getByRole('button',{name:'수정한 마음 저장하기',exact:true}).click();
  await page.getByText(/다른 곳에서 수정된 기록/).waitFor();
  assert.equal(await page.getByLabel('마음기록 내용 입력').inputValue(),mine);
  await page.screenshot({path:path.join(artifacts,'journal-conflict.png'),fullPage:true});
  await page.getByRole('button',{name:'최신 기록 확인',exact:true}).click();
  await page.getByText('another editor',{exact:true}).waitFor();
  await page.getByRole('button',{name:'내 글 유지하고 다시 편집',exact:true}).click();
  assert.equal(await page.getByLabel('마음기록 내용 입력').inputValue(),mine);
  await page.getByRole('button',{name:'수정한 마음 저장하기',exact:true}).click();
  await page.getByRole('button',{name:'기록 수정하기',exact:true}).waitFor();
  entries=await (await context.request.get(base+'/api/v1/entries',{headers})).json();
  assert.equal(entries[0].body,mine);assert.equal(entries[0].version,3);
  await page.screenshot({path:path.join(artifacts,'journal-saved.png'),fullPage:true});
});
