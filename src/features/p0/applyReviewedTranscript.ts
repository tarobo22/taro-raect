interface DraftStorage{getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>;}
const append=(current:string,reviewed:string)=>current?current+'\n'+reviewed:reviewed;
/** Applying a review only updates a draft. It never submits a reading or conversation. */
export async function applyReviewedTranscript(storage:DraftStorage,target:'talk'|'tarot'|'journal',id:string,text:string):Promise<string>{
 if(target==='tarot'){
  const marker='yeoun.p0.transcription-applied.'+id;
  const previous=await storage.getItem('yeoun.tarot.question')||'';
  if(await storage.getItem(marker))return previous;
  const next=append(previous,text);await storage.setItem('yeoun.tarot.question',next);await storage.setItem(marker,'true');return next;
 }
 const key=target==='talk'?'yeoun.talk.draft':'yeoun.journal.draft.new',field=target==='talk'?'question':'body';
 const raw=await storage.getItem(key);let draft:Record<string,unknown>={};
 if(raw){try{const value:unknown=JSON.parse(raw);if(typeof value!=='object'||value===null||Array.isArray(value))throw new Error();draft=value as Record<string,unknown>;}catch{throw new Error('기존 초안을 확인하지 못했어요. 전사문을 적용하지 않고 유지합니다.');}}
 const previous=draft[field]??(target==='journal'?await storage.getItem('yeoun.draft'):null)??'';
 if(typeof previous!=='string')throw new Error('기존 초안 내용을 확인하지 못했어요.');
 const ids=Array.isArray(draft.reviewed_transcription_ids)?draft.reviewed_transcription_ids.filter((v):v is string=>typeof v==='string'):[];
 if(ids.includes(id))return previous;
 const next=append(previous,text);
 await storage.setItem(key,JSON.stringify({...draft,[field]:next,reviewed_transcription_ids:[...ids,id],...(target==='talk'?{inputSource:'voice'}:{day:typeof draft.day==='string'?draft.day:new Date().toISOString().slice(0,10),mood:typeof draft.mood==='string'?draft.mood:''})}));
 return next;
}
