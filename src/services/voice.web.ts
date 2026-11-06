import {beginAudioCapture} from './feedback';
import {VoiceCaptureSession} from '../features/audio/VoiceCapture';
declare const window:any;
export async function voiceAvailable(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
export function startVoice(onText:(v:string)=>void,onState:(v:string)=>void,onEnd:()=>void=()=>{}){
 const session=new VoiceCaptureSession(beginAudioCapture,onText,onState,onEnd);
 queueMicrotask(()=>{
  if(!session.active)return;
  const C=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!C){session.finish('이 브라우저에서는 음성 입력을 사용할 수 없어요. 글로 이어갈 수 있어요.');return;}
  try{
   const recognition=new C();recognition.lang='ko-KR';recognition.interimResults=true;recognition.continuous=false;
   session.attachStop(()=>{recognition.onstart=null;recognition.onresult=null;recognition.onerror=null;recognition.onend=null;recognition.abort();});
   recognition.onstart=()=>session.state('듣고 있어요. 편하게 이야기해 주세요.');
   recognition.onresult=(event:any)=>{let value='';for(let i=0;i<event.results.length;i++)value+=event.results[i][0].transcript;session.text(value);};
   recognition.onerror=()=>session.finish('음성을 옮기지 못했어요. 다시 누르거나 글로 입력해 주세요.');
   recognition.onend=()=>session.finish('입력한 내용을 확인한 뒤 보내 주세요.');
   recognition.start();
  }catch{session.finish('음성 입력을 시작하지 못했어요. 글로 이어갈 수 있어요.');}
 });
 return ()=>session.cancel();
}
