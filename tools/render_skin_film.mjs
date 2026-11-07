import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';
const mode=process.argv[2]||'landscape',posters=process.argv.includes('--posters');
const portrait=mode==='portrait',guide=mode==='guide',width=portrait?1080:1920,height=portrait?1920:1080,duration=guide?30:60,fps=60;
const folder=resolve('media/three-spaces-20261107');await mkdir(resolve(folder,'posters'),{recursive:true});await mkdir(resolve(folder,'videos'),{recursive:true});
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(resolve(folder,'film.html')).href+'?mode='+mode);await page.waitForFunction(()=>window.filmReady);await page.evaluate(()=>document.fonts.ready);
await page.evaluate(async()=>{
 const files=['home-cafe','home-clinic','home-playroom','input-panel','empathy-panel','confirmation-panel','confirm-button','card-1','card-2','card-3','advice-panel','record-button','journal-input','journal-button','space-selector-cafe','audio-switch','motion-switch'];
 const srcs=files.map(x=>'../../docs/quality/three-skins-20261107/screens/'+x+'.png');
 for(const id of ['cafe','clinic','playroom'])for(const pose of ['rest','greeting','explain'])srcs.push('../../assets/skins/'+id+'/'+pose+'.png');
 await Promise.all(srcs.map(src=>new Promise((done,reject)=>{const i=new Image;i.onload=done;i.onerror=()=>reject(Error('Missing asset '+src));i.src=src;})));
});
const samples=guide?[2,8,16,24]:[3,10,25,34,47,56];
for(const time of samples){await page.evaluate(t=>window.renderFrame(t),time);await page.waitForTimeout(70);await page.screenshot({path:resolve(folder,'posters',mode+'-'+time+'.png')});}
if(!posters){
 const ffmpeg=process.env.YEOUN_FFMPEG||'C:/Users/chang/.cache/yb26/python-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe',target=resolve(folder,'videos',guide?'yeoun-three-spaces-guide-30s.mp4':'yeoun-three-spaces-'+mode+'-60s.mp4');
 const encoder=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','mjpeg','-r',String(fps),'-i','pipe:0','-i',resolve(folder,guide?'guide.wav':'introduction.wav'),'-c:v','libx264','-preset','fast','-crf','18','-threads','4','-pix_fmt','yuv420p','-r',String(fps),'-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',target],{stdio:['pipe','ignore','pipe']});
 let stderr='';encoder.stderr.on('data',x=>stderr+=x);encoder.stdin.on('error',()=>{});
 const started=Date.now();
 for(let frame=0;frame<fps*duration;frame++){
  await page.evaluate(t=>window.renderFrame(t),frame/fps);
  const jpg=await page.screenshot({type:'jpeg',quality:96});
  if(!encoder.stdin.write(jpg))await once(encoder.stdin,'drain');
  if(frame%600===0)console.log(mode,frame+'/'+(fps*duration),Math.round((Date.now()-started)/1000)+'s');
 }
 encoder.stdin.end();const [code]=await once(encoder,'close');if(code!==0)throw Error(stderr);
 const report={at:new Date().toISOString(),mode,width,height,duration,fps,frames:fps*duration,encoder:'H264 CRF18 / AAC192k / faststart',pageErrors:errors,renderSeconds:Math.round((Date.now()-started)/1000),source:'Real React app captures plus editorial SVG/DOM motion; example dialogue uses a synthetic local QA provider. Encoded 60fps is not a measured app performance result.'};
 await writeFile(resolve(folder,'videos',mode+'-render.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
await browser.close();if(errors.length)throw Error(errors.join('\n'));
