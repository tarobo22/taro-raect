import type {AudioFile} from './fileTypes';
export function filesAvailable(){return typeof document!=='undefined';}
export async function chooseAudio(maxBytes:number,maxDurationMs:number):Promise<AudioFile|null>{
 return new Promise((resolve,reject)=>{
  const picker=document.createElement('input');picker.type='file';picker.accept='.mp3,.mp4,.m4a,.wav,.webm,audio/*';
  picker.oncancel=()=>resolve(null);
  picker.onchange=async()=>{
   const file=picker.files?.[0];if(!file){resolve(null);return;}
   if(file.size>maxBytes){reject(new Error('음성 파일은 10MiB 이내로 선택해 주세요.'));return;}
   const url=URL.createObjectURL(file),audio=new Audio();
   audio.onloadedmetadata=()=>{const durationMs=Math.ceil(audio.duration*1000);URL.revokeObjectURL(url);if(!Number.isFinite(durationMs)||durationMs<=0||durationMs>maxDurationMs){reject(new Error('음성 파일은 60초 이내로 선택해 주세요.'));return;}resolve({payload:file,name:file.name,mimeType:file.type,sizeBytes:file.size,durationMs});};
   audio.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('음성 파일을 읽지 못했어요. 다른 파일을 선택하거나 글로 입력해 주세요.'));};
   audio.src=url;
  };picker.click();
 });
}
export async function downloadPrivate(url:string,bearer:string,filename:string,maxBytes:number):Promise<boolean>{
 const response=await fetch(url,{headers:{Authorization:'Bearer '+bearer},cache:'no-store'});
 if(!response.ok)throw new Error(response.status===410?'파일이 만료됐어요. 새로 내보내기를 요청해 주세요.':'파일을 내려받지 못했어요. 연결을 확인해 주세요.');
 if(!response.headers.get('Content-Type')?.includes('application/zip'))throw new Error('내보내기 파일 형식을 확인하지 못했어요.');
 const blob=await response.blob();if(blob.size>maxBytes)throw new Error('파일이 너무 커서 내려받지 못했어요.');
 const objectUrl=URL.createObjectURL(blob),link=document.createElement('a');link.href=objectUrl;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);return true;
}
