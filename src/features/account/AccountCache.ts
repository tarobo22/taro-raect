export interface CacheStorage{getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>;removeItem(key:string):Promise<void>;getAllKeys():Promise<readonly string[]>;multiGet(keys:readonly string[]):Promise<readonly [string,string|null][]>;multiSet(values:readonly [string,string][]):Promise<void>;multiRemove(keys:readonly string[]):Promise<void>;}
const ownerKey='yeoun.account.active-owner',archivePrefix='yeoun.account.archive.';
function owned(key:string){return key.startsWith('yeoun.')&&key!==ownerKey&&!key.startsWith(archivePrefix)&&!key.startsWith('yeoun.auth.')&&key!=='yeoun.session';}
/** Values are opaque. No journal, provider, AI, or pending-request schema is interpreted here. */
export class AccountCache implements CacheStorage{
 private pending=new Set<Promise<unknown>>();private revision=0;
 constructor(private readonly raw:CacheStorage){}
 private track<T>(work:Promise<T>):Promise<T>{this.revision++;const tracked=work.finally(()=>{this.pending.delete(tracked);this.revision++;});this.pending.add(tracked);return tracked;}
 getItem(key:string){return this.track(this.raw.getItem(key));}setItem(key:string,value:string){return this.track(this.raw.setItem(key,value));}removeItem(key:string){return this.track(this.raw.removeItem(key));}
 multiGet(keys:readonly string[]){return this.track(this.raw.multiGet(keys));}multiSet(values:readonly [string,string][]){return this.track(this.raw.multiSet(values));}multiRemove(keys:readonly string[]){return this.track(this.raw.multiRemove(keys));}
 async getAllKeys(){return(await this.track(this.raw.getAllKeys())).filter(owned);}
 async drain(){for(;;){await Promise.allSettled([...this.pending]);const revision=this.revision;await new Promise(resolve=>setTimeout(resolve,0));if(!this.pending.size&&revision===this.revision)return;}}
 owner(){return this.raw.getItem(ownerKey);}
 async attach(owner:string){const current=await this.owner();if(current===null)await this.raw.setItem(ownerKey,owner);else if(current!==owner)await this.activate(owner);}
 private async snapshot(){const keys=(await this.raw.getAllKeys()).filter(owned);return(await this.raw.multiGet(keys)).filter((p):p is [string,string]=>p[1]!==null);}
 private async readArchive(owner:string):Promise<[string,string][]> {const value=await this.raw.getItem(archivePrefix+owner);if(!value)return[];const parsed:unknown=JSON.parse(value);if(!Array.isArray(parsed)||parsed.some(p=>!Array.isArray(p)||p.length!==2||typeof p[0]!=='string'||typeof p[1]!=='string'||!owned(p[0])))throw new Error('이 계정의 기기 초안을 확인하지 못했어요. 원래 초안은 보관돼요.');return parsed as [string,string][];}
 async activate(next:string|null){
  await this.drain();const current=await this.owner();if(current===next)return;
  const before=await this.snapshot(),after=next?await this.readArchive(next):[];
  if(current)await this.raw.setItem(archivePrefix+current,JSON.stringify(before));
  try{await this.raw.multiRemove(before.map(([key])=>key));await this.raw.multiSet(after);if(next)await this.raw.setItem(ownerKey,next);else await this.raw.removeItem(ownerKey);}
  catch(error){await this.raw.multiRemove((await this.snapshot()).map(([key])=>key));await this.raw.multiSet(before);if(current)await this.raw.setItem(ownerKey,current);else await this.raw.removeItem(ownerKey);throw error;}
 }
 async eraseCurrent(){await this.drain();const current=await this.owner();if(current)await this.raw.removeItem(archivePrefix+current);await this.raw.multiRemove((await this.snapshot()).map(([key])=>key));await this.raw.removeItem(ownerKey);}
 async forgetOwner(){await this.drain();const current=await this.owner();if(current)await this.raw.removeItem(archivePrefix+current);await this.raw.removeItem(ownerKey);}
 async eraseArchive(owner:string){await this.raw.removeItem(archivePrefix+owner);}
}
