import type {AccountApi} from './AccountApi';
import type {AccountCache} from './AccountCache';
import type {AccountTransport} from './AccountTransport';
import type {GuestSession} from '../../infrastructure/http/GuestSession';
import type {Account,Grant} from './contracts';
export type GuestConnection={owner:string;token:string;saved_at:string};
export interface GuestVault{read():Promise<GuestConnection[]>;write(values:GuestConnection[]):Promise<void>;}
export class AccountRuntime{
 private value={ready:false,switching:false,error:'',epoch:0,entryAccount:false};private listeners=new Set<()=>void>();private initializing:Promise<void>|null=null;private unmounted:(()=>void)|null=null;
 private localTasks=new Set<Promise<unknown>>();
 private transition:Promise<void>|null=null;private transitionKey='';
 constructor(private readonly api:AccountApi,private readonly identity:GuestSession,private readonly cache:AccountCache,private readonly http:AccountTransport,private readonly vault:GuestVault,private readonly resolveOwner:()=>Promise<string>=async()=> (await api.account()).user_id,private readonly eraseFlow:(owner:string)=>Promise<void>=async()=>{}){}
 get snapshot(){return this.value;}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private update(value:Partial<typeof this.value>){this.value={...this.value,...value};for(const listener of this.listeners)listener();}
 async initialize(){if(this.initializing)return this.initializing;if(this.value.ready)return;
  this.initializing=(async()=>{try{if(await this.identity.hasStoredSession())await this.cache.attach(await this.resolveOwner());this.update({ready:true,error:''});}catch{this.update({error:'기존 계정 연결을 확인하지 못했어요. 기록을 열기 전에 다시 확인해 주세요.'});}})().finally(()=>{this.initializing=null;});return this.initializing;
 }
 async retry(){try{if(await this.identity.hasStoredSession())await this.cache.attach(await this.resolveOwner());else await this.cache.activate(null);this.http.resume();this.update({ready:true,switching:false,error:'',epoch:this.value.epoch+1,entryAccount:true});}catch{this.update({error:'연결을 다시 확인하지 못했어요. 계정별 초안은 보관돼요.'});}}
 viewUnmounted(){this.unmounted?.();this.unmounted=null;}
 trackLocal<T>(work:()=>Promise<T>){const result=work().finally(()=>this.localTasks.delete(result));this.localTasks.add(result);return result;}
 private async prepare(){const gone=new Promise<void>(resolve=>{this.unmounted=resolve;});this.update({switching:true,error:'',entryAccount:true});await gone;await this.http.pause();await Promise.allSettled([...this.localTasks]);await this.cache.drain();}
 private complete(){this.http.resume();this.update({ready:true,switching:false,error:'',epoch:this.value.epoch+1,entryAccount:true});}
 private exclusive(key:string,work:()=>Promise<void>){if(this.transition)return this.transitionKey===key?this.transition:Promise.reject(new Error('다른 계정으로 전환하고 있어요. 먼저 진행 중인 연결을 확인해 주세요.'));this.transitionKey=key;const transition=work().finally(()=>{if(this.transition===transition){this.transition=null;this.transitionKey='';}});this.transition=transition;return transition;}
 apply(grant:Grant,previous:Account){return this.exclusive('grant:'+grant.session_id,()=>this.applyAccount(grant,previous));}
 private async applyAccount(grant:Grant,previous:Account){
  const oldToken=await this.identity.token();if(previous.user_id!==grant.previous_user_id||await this.cache.owner()!==previous.user_id)throw new Error('기존 계정 연결이 바뀌어 적용하지 않았어요.');
  await this.prepare();
  try{if(previous.kind==='guest'&&grant.user_id!==previous.user_id){const saved=await this.vault.read();await this.vault.write([...saved.filter(v=>v.owner!==previous.user_id),{owner:previous.user_id,token:oldToken,saved_at:new Date().toISOString()}]);}
   await this.cache.activate(grant.user_id);await this.identity.adopt(grant.access_token,oldToken);this.complete();
  }catch(error){this.update({error:'계정 연결 적용을 확인하지 못했어요. 초안은 보관했으니 연결 상태를 다시 확인해 주세요.'});throw error;}
 }
 async previousGuests(){return(await this.vault.read()).map(({owner,saved_at})=>({owner,saved_at}));}
 restoreGuest(owner:string){return this.exclusive('guest:'+owner,()=>this.restoreAccount(owner));}
 private async restoreAccount(owner:string){const saved=(await this.vault.read()).find(v=>v.owner===owner);if(!saved)throw new Error('이전 게스트 연결을 찾지 못했어요.');const expected=await this.identity.hasStoredSession()?await this.identity.token():undefined;
  await this.prepare();try{await this.cache.activate(owner);await this.identity.adopt(saved.token,expected);const account=await this.api.account();if(account.user_id!==owner)throw new Error('기록 소유자를 확인하지 못했어요.');this.complete();}catch{this.update({error:'이전 게스트 연결이 만료됐거나 확인되지 않았어요. 기록은 계정별로 보관돼요.'});}
 }
 detach(){return this.exclusive('detach',()=>this.detachAccount());}
 private async detachAccount(){await this.prepare();try{await this.cache.activate(null);await this.identity.forget();this.complete();}catch{this.update({error:'기기의 계정 전환을 마치지 못했어요. 연결 상태를 다시 확인해 주세요.'});}}
 async erased(owner:string|undefined){if(!owner)return;if(await this.cache.owner()===owner)await this.cache.forgetOwner();else await this.cache.eraseArchive(owner);const saved=await this.vault.read();await this.vault.write(saved.filter(v=>v.owner!==owner));await this.eraseFlow(owner);}
}
