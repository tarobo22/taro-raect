import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {enterGuest} from './onboarding.mjs';
const {chromium}=await import(process.env.YEOUN_PLAYWRIGHT_MODULE||'playwright');
async function paintedCardError(page,frame){
 const png=(await frame.screenshot()).toString('base64');
 return page.evaluate(async data=>{
  const visible=new Image();visible.src='data:image/png;base64,'+data;await visible.decode();
  const original=document.querySelector('[data-testid="card-reveal"] img');
  const width=visible.naturalWidth,height=visible.naturalHeight;
  const pixels=image=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');context.drawImage(image,0,0,width,height);return context.getImageData(0,0,width,height).data;};
  const actual=pixels(visible),expected=pixels(original);let error=0,count=0;
  for(let y=Math.ceil(height*.2);y<height*.8;y++)for(let x=Math.ceil(width*.2);x<width*.8;x++)for(let c=0;c<3;c++){const i=(y*width+x)*4+c;error+=Math.abs(actual[i]-expected[i]);count++;}
  return error/count;
 },png);
}
test('confirmed daily card decodes a hash-matched bundled image without external assets; reentry stays revealed',{timeout:30000},async t=>{
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});page.setDefaultTimeout(7000);
 const external=[];await page.route('https://**/*',route=>{external.push(route.request().url());return route.abort();});
 await page.goto(process.env.YEOUN_WEB_URL||'http://127.0.0.1:8827');await enterGuest(page);
 await page.getByRole('button',{name:/오늘의 한 장/}).click();await page.getByRole('button',{name:'오늘의 카드 열기',exact:true}).click();
 const frame=page.getByTestId('card-reveal').first();await frame.waitFor();
 await frame.locator('img').evaluate(image=>image.decode());
 await page.waitForTimeout(650);
 assert.ok(await paintedCardError(page,frame)<20,'the painted face must match the decoded card, rather than a mirrored back');
 const imageURL=await frame.locator('img').getAttribute('src');assert.ok(imageURL.includes('/assets/'),imageURL);
 assert.equal(external.length,0);
 const stored=await page.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.includes('revealed-cards')));
 assert.ok(stored.length>0);
 const card=page.getByRole('button',{name:/카드 상세$/}).first();await card.click();
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();await frame.waitFor();
 await frame.locator('img').evaluate(image=>image.decode());
 await page.waitForTimeout(250);
 assert.ok(await paintedCardError(page,frame)<20,'reentry must already paint the front without replaying the flip');
 assert.deepEqual(await page.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.includes('revealed-cards'))),stored);
 const out=process.env.YEOUN_TEST_ARTIFACTS||'.local/card-reveal';await mkdir(out,{recursive:true});await page.waitForTimeout(250);await page.screenshot({path:out+'/card-reveal-bundled.png',fullPage:true});
});
