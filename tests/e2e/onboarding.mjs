export async function enterGuest(page){
 const start=page.getByRole('button',{name:'게스트로 시작',exact:true});
 await start.waitFor({state:'visible'});
 await start.click();
 await page.getByRole('tab',{name:'오늘',exact:true}).waitFor();
}
