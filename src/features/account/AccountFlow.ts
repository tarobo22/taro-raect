import type {AccountApi} from './AccountApi';
import {Account,Grant,PendingSocial,Provider,parseCallback,validatePkce} from './contracts';
export interface PendingPort{read():Promise<PendingSocial|null>;write(value:PendingSocial):Promise<void>;clear():Promise<void>;}
export interface SocialPort{pkce():Promise<{verifier:string;challenge:string}>;returnUri():string;platform:'web'|'android'|'ios';open(url:string):Promise<void>;}
export class AccountFlow{
 private listeners=new Set<()=>void>();private processing:Promise<void>|null=null;private generation=0;private pendingChanges:Promise<void>=Promise.resolve();
 private value={phase:'idle' as 'idle'|'authorizing'|'exchanging'|'applying',error:'',notice:'',event:0};
 constructor(private readonly api:AccountApi,private readonly pending:PendingPort,private readonly platform:SocialPort,private readonly adopt:(grant:Grant,previous:Account)=>Promise<void>){}
 get snapshot(){return this.value;}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private update(value:Partial<typeof this.value>){this.value={...this.value,...value};for(const listener of this.listeners)listener();}
 private changePending(work:()=>Promise<void>){const next=this.pendingChanges.catch(()=>{}).then(work);this.pendingChanges=next;return next;}
 async begin(provider:Provider,intent:'sign_in'|'link'='sign_in'){
  if(this.value.phase!=='idle')return;const generation=++this.generation;this.update({phase:'authorizing',error:'',notice:''});
  try{const providers=await this.api.providers();if(!providers.providers.some(p=>p.provider===provider&&p.available))throw new Error('이 로그인 방법은 아직 연결 준비가 되지 않았어요. 게스트 기록은 그대로 이용할 수 있어요.');
   const account=await this.api.account(),pkce=validatePkce(await this.platform.pkce()),return_uri=this.platform.returnUri();if(generation!==this.generation)return;
   const result=await this.api.start(provider,{return_uri,code_challenge:pkce.challenge,platform:this.platform.platform,intent});if(generation!==this.generation)return;
   await this.changePending(async()=>{if(generation===this.generation)await this.pending.write({owner:account.user_id,provider,return_uri,verifier:pkce.verifier,expires_at:result.expires_at});});
   if(generation!==this.generation)return;await this.platform.open(result.authorization_url);
  }catch(error){if(generation===this.generation){await this.changePending(async()=>{if(generation===this.generation)await this.pending.clear();});if(generation===this.generation)this.update({phase:'idle',error:error instanceof Error?error.message:'계정 연결을 시작하지 못했어요.'});}}
 }
 async cancel(){const generation=++this.generation;await this.changePending(async()=>{if(generation===this.generation)await this.pending.clear();});if(generation===this.generation)this.update({phase:'idle',error:'계정 연결을 취소했어요. 기존 기록과 초안은 그대로예요.',event:this.value.event+1});}
 async eraseOwner(owner:string){await this.changePending(async()=>{let pending:PendingSocial|null;try{pending=await this.pending.read();}catch{await this.pending.clear();return;}if(pending?.owner===owner){this.generation++;await this.pending.clear();this.update({phase:'idle',error:'',notice:''});}});}
 receive(url:string){if(!/#(?:.*&)?auth_(?:ticket|error)=/.test(url))return Promise.resolve();if(this.processing)return this.processing;this.processing=this.consume(url).finally(()=>{this.processing=null;});return this.processing;}
 private async consume(url:string){let generation=this.generation;
  try{await this.pendingChanges.catch(()=>{});const pending=await this.pending.read();if(!pending)return;generation=++this.generation;
   const result=parseCallback(url,pending.return_uri,pending.provider);await this.changePending(async()=>{if(generation===this.generation)await this.pending.clear();});if(generation!==this.generation)return;
   if('error'in result)throw new Error(result.error==='cancelled'?'계정 연결을 취소했어요. 기존 기록과 초안은 그대로예요.':'계정 승인을 확인하지 못했어요. 다시 연결해 주세요.');
   if(Date.parse(pending.expires_at)<=Date.now())throw new Error('계정 연결 시간이 지났어요. 다시 시작해 주세요.');
   this.update({phase:'exchanging',error:'',event:this.value.event+1});const previous=await this.api.account();if(previous.user_id!==pending.owner)throw new Error('연결을 시작한 계정과 달라 적용하지 않았어요.');
   const grant=await this.api.exchange({ticket:result.ticket,code_verifier:pending.verifier});if(generation!==this.generation)return;
   if(grant.previous_user_id!==pending.owner)throw new Error('이전 기록의 연결을 확인하지 못해 계정을 바꾸지 않았어요.');
   this.update({phase:'applying'});await this.adopt(grant,previous);this.update({phase:'idle',notice:'계정 연결을 마쳤어요. 이전 기록과 초안은 각 계정에 보관했어요.'});
  }catch(error){if(generation===this.generation)this.update({phase:'idle',error:error instanceof Error?error.message:'계정 연결 결과를 확인하지 못했어요.',event:this.value.event+1});}
 }
}
