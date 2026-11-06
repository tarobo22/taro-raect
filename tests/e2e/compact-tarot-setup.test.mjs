import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {enterGuest} from './onboarding.mjs';

const {chromium}=await import(process.env.YEOUN_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.YEOUN_WEB_URL||'http://127.0.0.1:8827';
const artifacts=process.env.YEOUN_TEST_ARTIFACTS||'.local/compact-tarot-setup';

test('tarot settings and start fit one phone viewport, animate the chosen spread and start once with the preserved choices', {timeout:45000},async t=>{
  await mkdir(artifacts,{recursive:true});
  const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  const page=await context.newPage();page.setDefaultTimeout(6000);
  const requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{
    const path=new URL(request.url()).pathname;
    if(path.startsWith('/api/')&&request.method()==='POST'){
      let body;try{body=request.postDataJSON();}catch{}
      requests.push({path,body});
    }
  });
  await page.goto(base);await enterGuest(page);
  await page.getByRole('button',{name:/고민 타로/}).click();
  const start=page.getByRole('button',{name:'3장의 카드 만나기',exact:true});
  await start.waitFor();
  const geometry=[];
  for(const viewport of [{width:390,height:844},{width:360,height:740},{width:430,height:932}]){
    await page.setViewportSize(viewport);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.screenshot({path:`${artifacts}/setup-${viewport.width}x${viewport.height}.png`});
    for(const [name,control] of [
      ['topic',page.getByRole('button',{name:'나 자신',exact:true})],
      ['spread',page.getByRole('button',{name:/^5장 ·/})],
      ['question',page.getByLabel('타로 질문 입력',{exact:true})],
      ['deck',page.getByRole('button',{name:'덱 그림과 출처 고르기',exact:true})],
      ['start',start],
    ]){
      const box=await control.boundingBox();
      assert.ok(box&&box.width>0&&box.height>0,name+' is rendered');
      geometry.push({viewport,name,...box});
      assert.ok(box.y>=0&&box.y+box.height<=viewport.height-4,`${name} needs no scroll at ${viewport.width}x${viewport.height}: bottom=${box.y+box.height}`);
      assert.ok(box.x>=0&&box.x+box.width<=viewport.width+.5,name+' horizontally fits');
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'나 자신',exact:true}).click();
  await page.getByLabel('타로 질문 입력',{exact:true}).fill('지금 내게 필요한 작은 선택은?');
  await page.evaluate(()=>{
    window.__setupFrames=[];const begin=performance.now();
    function sample(){const card=document.querySelector('[data-testid="tarot-setup-card"]');if(card)window.__setupFrames.push({at:performance.now()-begin,transform:getComputedStyle(card).transform,opacity:getComputedStyle(card).opacity});if(performance.now()-begin<900)requestAnimationFrame(sample);}
    requestAnimationFrame(sample);
  });
  await page.getByRole('button',{name:/^5장 ·/}).click();
  await page.waitForTimeout(650);
  assert.equal(await page.getByTestId('tarot-setup-card').count(),5);
  const frames=await page.evaluate(()=>window.__setupFrames);
  assert.ok(new Set(frames.map(frame=>frame.transform+'|'+frame.opacity)).size>3,'card spread has visible intermediate motion');
  await page.getByRole('button',{name:/^3장 ·/}).click();
  await page.getByRole('button',{name:'덱 그림과 출처 고르기',exact:true}).click();
  await page.getByRole('button',{name:'선택한 덱으로 완료',exact:true}).click();
  assert.equal(await page.getByLabel('타로 질문 입력',{exact:true}).inputValue(),'지금 내게 필요한 작은 선택은?');
  assert.equal(await page.getByRole('button',{name:'나 자신',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByRole('button',{name:/^3장 ·/}).getAttribute('aria-pressed'),'true');
  assert.equal(requests.filter(r=>r.path==='/api/v2/readings').length,0,'choosing settings never starts a reading');
  await start.click();
  await page.getByRole('button',{name:'1번째 카드',exact:true}).waitFor();
  const creates=requests.filter(r=>r.path==='/api/v2/readings');
  assert.equal(creates.length,1);
  assert.equal(creates[0].body.kind,'three_card');
  assert.equal(creates[0].body.topic,'self');
  assert.equal(creates[0].body.question,'지금 내게 필요한 작은 선택은?');
  assert.equal(await page.getByRole('dialog').count(),0,'no extra confirmation step');
  assert.equal(requests.some(r=>/interpretations|journal-insights|transcriptions/.test(r.path)),false);
  assert.deepEqual(errors,[]);
  await writeFile(artifacts+'/evidence.json',JSON.stringify({geometry,frames,requests,errors},null,2));
});
