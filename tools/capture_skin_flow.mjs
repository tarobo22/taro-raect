import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const folder=resolve('docs/quality/three-skins-20261107/screens');await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,recordVideo:{dir:resolve('.local/skins-video'),size:{width:390,height:844}}}),page=await context.newPage();
const errors=[],actions=[];page.on('pageerror',error=>errors.push(error.message));
async function tap(locator,label){const b=await locator.boundingBox();actions.push({at:new Date().toISOString(),label,box:b});await locator.click();}
async function shot(name){await page.waitForTimeout(380);await page.screenshot({path:resolve(folder,name+'.png')});}
async function exportRoom(id){
 const svg=await page.locator('svg[viewBox="0 0 600 1000"]').first().evaluate(el=>new XMLSerializer().serializeToString(el));
 await writeFile(resolve('assets/skins',id,'wallpaper.svg'),svg);
 await page.setViewportSize({width:1440,height:1000});await shot('desktop-'+id);await page.setViewportSize({width:390,height:844});
}
try{
 await page.goto('http://127.0.0.1:8857/');
 await tap(page.getByRole('button',{name:'게스트로 시작',exact:true}),'게스트로 시작');
 await page.getByRole('button',{name:'카페 공간 선택',exact:true}).waitFor();await page.waitForTimeout(1400);await shot('home-cafe');await exportRoom('cafe');await page.getByRole('button',{name:'카페 공간 선택',exact:true}).locator('..').screenshot({path:resolve(folder,'space-selector-cafe.png')});
 for(const [label,id] of [['진료실','clinic'],['놀이방','playroom']]){
  await tap(page.getByRole('button',{name:label+' 공간 선택',exact:true}),label+' 공간 선택');await page.waitForTimeout(700);await shot('home-'+id);await exportRoom(id);
 }
 await page.reload();await page.getByRole('button',{name:'놀이방 공간 선택',exact:true}).waitFor();const restored=await page.getByRole('button',{name:'놀이방 공간 선택',exact:true}).getAttribute('aria-pressed');
 await tap(page.getByRole('button',{name:'마음 이야기 시작하기',exact:true}),'마음 이야기 시작하기');await shot('talk-cat');
 await tap(page.getByRole('button',{name:'뒤로가기',exact:true}),'뒤로가기');
 await tap(page.getByRole('tab',{name:'내 공간',exact:true}),'내 공간');
 await page.getByRole('switch',{name:'효과음',exact:true}).click();
 await page.getByRole('button',{name:'놀이방 공간 선택',exact:true}).click();await shot('settings-cat');await page.getByRole('switch',{name:'효과음',exact:true}).locator('..').screenshot({path:resolve(folder,'audio-switch.png')});await page.getByRole('switch',{name:'움직임 줄이기',exact:true}).click();await page.getByRole('switch',{name:'움직임 줄이기',exact:true}).locator('..').screenshot({path:resolve(folder,'motion-switch.png')});await page.getByRole('switch',{name:'움직임 줄이기',exact:true}).click();
 await tap(page.getByRole('tab',{name:'오늘',exact:true}),'오늘');
 await tap(page.getByRole('button',{name:'카페 공간 선택',exact:true}),'카페 공간 선택');
 await tap(page.getByRole('button',{name:'타로 AI와 이야기하기',exact:true}),'타로 AI와 이야기하기');
 await page.getByRole('button',{name:'AI 이용 설정',exact:true}).click();await page.getByRole('button',{name:'이 목적만 허용',exact:true}).first().click();await page.getByRole('button',{name:'이 목적의 동의 철회',exact:true}).waitFor();await page.getByRole('button',{name:'뒤로가기',exact:true}).click();
 const input=page.getByRole('textbox',{name:'여운 상담 이야기 입력',exact:true});
 await input.fill('학생인데 수업과 알바를 함께 챙기느라 쉬는 시간이 부족해요.');await shot('counseling-input');await input.locator('..').screenshot({path:resolve(folder,'input-panel.png')});
 await tap(page.getByRole('button',{name:'이야기 보내기',exact:true}),'이야기 보내기');
 await page.getByRole('button',{name:'맞아요, 함께 살펴봐요',exact:true}).waitFor();await shot('counseling-confirmation');
 await page.getByText('수업과 알바를 함께 챙기느라 쉴 시간이 부족하다는 거죠?',{exact:true}).locator('..').screenshot({path:resolve(folder,'confirmation-panel.png')});
 await page.getByText('많이 버거우셨겠어요.',{exact:true}).locator('..').locator('..').screenshot({path:resolve(folder,'empathy-panel.png')});
 await page.getByRole('button',{name:'맞아요, 함께 살펴봐요',exact:true}).screenshot({path:resolve(folder,'confirm-button.png')});
 await tap(page.getByRole('button',{name:'맞아요, 함께 살펴봐요',exact:true}),'맞아요, 함께 살펴봐요');
 await page.getByText('지금 감당할 수 있는 만큼을 정해도 괜찮아요.',{exact:true}).waitFor();await page.waitForTimeout(1300);await shot('counseling-result');
 const cards=page.getByRole('button',{name:/카드 설명 보기$/});
 for(let i=0;i<3;i++)await cards.nth(i).screenshot({path:resolve(folder,'card-'+(i+1)+'.png')});
 await page.getByText('지금 감당할 수 있는 만큼을 정해도 괜찮아요.',{exact:true}).locator('..').screenshot({path:resolve(folder,'advice-panel.png')});
 await page.getByRole('button',{name:'마음기록으로 남기기',exact:true}).screenshot({path:resolve(folder,'record-button.png')});await page.getByRole('button',{name:'마음기록으로 남기기',exact:true}).click();await shot('journal-from-counseling');
 await page.getByRole('textbox',{name:'마음기록 내용 입력',exact:true}).fill('지금 감당할 수 있는 만큼을\n정해도 괜찮아요.\n오늘은 작은 쉼을 챙겨볼래요.');await page.getByRole('textbox',{name:'마음기록 내용 입력',exact:true}).blur();await page.getByRole('textbox',{name:'마음기록 내용 입력',exact:true}).screenshot({path:resolve(folder,'journal-input.png')});
 await page.getByRole('button',{name:'탐색한 마음 확인',exact:true}).click();await page.getByRole('button',{name:'이 마음으로 선택',exact:true}).click();await page.waitForTimeout(550);await page.getByRole('button',{name:'이 마음 저장하기',exact:true}).screenshot({path:resolve(folder,'journal-button.png')});
 await writeFile('docs/quality/three-skins-20261107/browser-capture.json',JSON.stringify({at:new Date().toISOString(),provider:'explicit synthetic QA provider; no GPT calls',errors,restoredPlayroom:restored,actions,layoutTests:0},null,2)+'\n');
 console.log(JSON.stringify({screens:9,restoredPlayroom:restored,pageErrors:errors}));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await context.close();await browser.close();}
