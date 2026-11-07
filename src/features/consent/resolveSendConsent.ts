import {currentConsent,type Consent,type ConsentKind} from '../p0/model';

export type SendPermissions=Partial<Record<ConsentKind,Consent>>;
interface Snapshot {owner:string;policy:string;consents:Consent[];}
interface Ports {
 snapshot:()=>Snapshot;
 confirm:(kinds:ConsentKind[])=>Promise<boolean>;
 grant:(kind:ConsentKind,policy:string)=>Promise<Consent>;
}
export async function resolveSendConsent(kinds:ConsentKind[],ports:Ports):Promise<SendPermissions|null>{
 const start=ports.snapshot();
 if(!start.owner||!start.policy)return null;
 const unchanged=()=>{const now=ports.snapshot();return now.owner===start.owner&&now.policy===start.policy;};
 const permissions:SendPermissions={},missing:ConsentKind[]=[];
 for(const kind of new Set(kinds)){
  const existing=currentConsent(start.consents,kind,start.policy);
  if(existing)permissions[kind]=existing;else missing.push(kind);
 }
 if(missing.length&&!await ports.confirm(missing))return null;
 if(!unchanged())return null;
 for(const kind of missing){
  const granted=await ports.grant(kind,start.policy);
  if(!unchanged())return null;
  if(!granted.granted||granted.kind!==kind||granted.policy_version!==start.policy)throw new Error('전송 확인을 저장하지 못했어요. 다시 눌러 주세요.');
  permissions[kind]=granted;
 }
 return permissions;
}
