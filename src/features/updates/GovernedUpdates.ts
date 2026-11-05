import type {OtaPolicy} from '../p0/model';
import {UpdateManager} from './UpdateManager';
interface ChannelUpdatePort{check(channel:string):Promise<{download():Promise<boolean>}|null>;reload():Promise<void>;}
function version(value:string|null):number[]{if(!value||!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value))throw new Error('설치된 기본 앱 버전을 확인하지 못했어요. 업데이트를 적용하지 않았어요.');const parts=value.split('.').map(Number);if(parts.some(v=>!Number.isSafeInteger(v)))throw new Error('기본 앱 버전을 확인하지 못했어요.');return parts;}
/** An SDK download and a prepared reload both require the current server policy. */
export class GovernedUpdates{
 private policy:OtaPolicy|null=null;private generation=0;private manager:UpdateManager;
 constructor(private readonly port:ChannelUpdatePort,private readonly nativeVersion:()=>string|null){this.manager=this.createManager(0);}
 configure(policy:OtaPolicy|null){if(JSON.stringify(policy)===JSON.stringify(this.policy))return;this.policy=policy?{...policy}:null;this.generation++;this.manager=this.createManager(this.generation);}
 get ready(){return this.manager.ready;}
 private approve(generation=this.generation):OtaPolicy{
  if(generation!==this.generation)throw new Error('업데이트 정책이 바뀌었어요. 다시 확인해 주세요.');
  const policy=this.policy;if(!policy||typeof policy.updates_enabled!=='boolean'||typeof policy.channel!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(policy.channel))throw new Error('업데이트 정책을 확인하지 못했어요. 기존 내용을 유지해요.');
  if(!policy.updates_enabled)throw new Error('현재 업데이트 받기가 꺼져 있어요. 기존 내용은 계속 사용할 수 있어요.');
  const installed=version(this.nativeVersion()),minimum=version(policy.min_native_version);
  for(let i=0;i<3;i++){if(installed[i]>minimum[i])return policy;if(installed[i]<minimum[i])throw new Error('새 기본 앱으로 업데이트한 뒤 새로운 내용을 받아 주세요.');}
  return policy;
 }
 private createManager(generation:number){return new UpdateManager({check:async()=>{const policy=this.approve(generation);const update=await this.port.check(policy.channel);this.approve(generation);return update?{download:async()=>{this.approve(generation);const ready=await update.download();this.approve(generation);return ready;}}:null;},reload:async()=>{this.approve(generation);await this.port.reload();}});}
 async checkAndDownload(){const generation=this.generation,manager=this.manager;this.approve(generation);const ready=await manager.checkAndDownload();this.approve(generation);return ready;}
 async apply(){this.approve();await this.manager.apply();}
}
