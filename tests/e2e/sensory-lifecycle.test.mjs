import test from 'node:test';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.YEOUN_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.YEOUN_WEB_URL||'http://127.0.0.1:8836';

async function pageFor(t){
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('pageerror',error=>assert.fail(error.message));
 await page.goto(base);await page.waitForFunction(()=>globalThis.sensoryHarness);
 return page;
}

test('real web feedback and voice callbacks stop owned audio and retain the newest recording mute',{timeout:30000},async t=>{
 const page=await pageFor(t);
 const result=await page.evaluate(async()=>{
  const players=[];globalThis.Audio=class{constructor(source){this.source=source;this.paused=true;this.loop=false;this.plays=0;players.push(this);}play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}};
  const recognizers=[];globalThis.SpeechRecognition=class{constructor(){recognizers.push(this);}start(){this.onstart?.();}abort(){this.aborted=true;}};
  const {feedback,voice}=globalThis.sensoryHarness;
  feedback.feedback('tap');const freshPlayers=players.length;
  await new Promise(resolve=>setTimeout(resolve,60));
  feedback.configureFeedback({sound:true,music:true,haptics:false});feedback.feedback('tap');
  const activeBefore=players.filter(p=>!p.paused).length;
  const first=voice.startVoice(()=>{},()=>{});await Promise.resolve();
  const oldEnd=recognizers[0].onend;
  const second=voice.startVoice(()=>{},()=>{});await Promise.resolve();
  const stoppedAtCapture=players.every(p=>p.paused);
  const plays=players.reduce((sum,p)=>sum+p.plays,0);
  oldEnd();first();feedback.feedback('flip');
  const blockedAfterOldCallback=players.every(p=>p.paused)&&players.reduce((sum,p)=>sum+p.plays,0)===plays;
  second();const musicResumed=players.find(p=>p.loop)?.paused===false;
  return{freshPlayers,activeBefore,stoppedAtCapture,blockedAfterOldCallback,musicResumed};
 });
 assert.deepEqual(result,{freshPlayers:0,activeBefore:2,stoppedAtCapture:true,blockedAfterOldCallback:true,musicResumed:true});
});

test('Character blink and BreathingDial countdown stop on hide, resume once and release on unmount',{timeout:30000},async t=>{
 const page=await pageFor(t);
 await page.evaluate(async()=>{
  const nativeInterval=globalThis.setInterval,nativeClear=globalThis.clearInterval;
  globalThis.sensoryIntervals=new Map();globalThis.sensoryHidden=false;
  globalThis.setInterval=(callback,ms,...args)=>{const id=nativeInterval(callback,ms,...args);globalThis.sensoryIntervals.set(id,ms);return id;};
  globalThis.clearInterval=id=>{globalThis.sensoryIntervals.delete(id);nativeClear(id);};
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>globalThis.sensoryHidden});
  Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>globalThis.sensoryHidden?'hidden':'visible'});
  globalThis.sensoryHarness.mount();
 });
 const host=page.locator('#sensory-harness');await host.getByRole('button',{name:'호흡 시작하기',exact:true}).click();
 const count=()=>page.evaluate(()=>globalThis.sensoryIntervals.size);
 await page.waitForFunction(()=>globalThis.sensoryIntervals.size===2);
 await page.waitForTimeout(1100);
 const before=await host.innerText();
 await page.evaluate(()=>{globalThis.sensoryHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await count(),0);await page.waitForTimeout(1150);assert.equal(await host.innerText(),before);
 await page.evaluate(()=>{globalThis.sensoryHidden=false;document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await count(),2);
 await page.evaluate(()=>globalThis.sensoryHarness.unmount());assert.equal(await count(),0);
});
