// Functional walkthrough against an isolated DB and the explicit synthetic provider.
// No layout assertions, real GPT calls, load generation, or production users.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const folder='docs/quality/counseling-tdd-20261107/screens';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(process.env.YEOUN_TDD_WEB_URL||'http://127.0.0.1:8857/');
 await page.getByRole('button',{name:'게스트로 시작',exact:true}).click();
 await page.getByRole('button',{name:'타로 AI와 이야기하기',exact:true}).click();
 await page.getByRole('button',{name:'AI 이용 설정',exact:true}).click();
 await page.getByRole('button',{name:'이 목적만 허용',exact:true}).first().click();
 await page.getByRole('button',{name:'이 목적의 동의 철회',exact:true}).waitFor();
 await page.getByRole('button',{name:'뒤로가기',exact:true}).click();
 const input=page.getByRole('textbox',{name:'여운 상담 이야기 입력',exact:true});
 await input.fill('학생인데 수업과 알바를 함께 챙기느라 쉬는 시간이 부족해요.');
 await page.getByRole('button',{name:'이야기 보내기',exact:true}).click();
 await page.getByRole('button',{name:'맞아요, 함께 살펴봐요',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:/카드 설명 보기$/}).count(),0);
 await page.screenshot({path:folder+'/confirmation.png'});
 await page.getByRole('button',{name:'맞아요, 함께 살펴봐요',exact:true}).click();
 await page.getByText('지금 감당할 수 있는 만큼을 정해도 괜찮아요.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:/카드 설명 보기$/}).count(),3);
 // Let the existing staggered flip finish before capturing the documentation image.
 await page.waitForTimeout(1300);
 await page.screenshot({path:folder+'/cards-and-advice.png'});
 await page.getByRole('button',{name:'사전·대화기록',exact:true}).click();
 await page.getByRole('button',{name:'새 이야기 시작하기',exact:true}).click();
 assert.equal(await input.inputValue(),'');
 assert.equal(await page.getByRole('button',{name:/카드 설명 보기$/}).count(),0);
 assert.deepEqual(errors,[]);
 await writeFile('docs/quality/counseling-tdd-20261107/browser-flow.json',JSON.stringify({
  date:new Date().toISOString(),provider:'explicit synthetic fixture, not GPT',
  environment:'React production build -> FastAPI worker -> isolated PostgreSQL',
  checks:['guest and explicit test consent','message queued then understanding confirmation',
   'zero drawn cards before confirmation','three server-drawn cards with advice','new story clears old state'],
  page_errors:errors,real_gpt_calls:0,layout_tests:0},null,2)+'\n');
 console.log('PASS: production React -> FastAPI -> PostgreSQL counseling flow (synthetic provider; 0 GPT calls).');
}finally{await browser.close();}
