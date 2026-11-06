import {readAccountSecret,writeAccountSecret,clearAccountSecret} from '../../services/secure';
import {decodePending,object,stamp,uuid} from './contracts';
import type {PendingPort} from './AccountFlow';
import type {GuestConnection,GuestVault} from './AccountRuntime';
export const pendingSocial:PendingPort={async read(){const raw=await readAccountSecret('pending');return raw?decodePending(JSON.parse(raw)):null;},write:value=>writeAccountSecret('pending',JSON.stringify(value)),clear:()=>clearAccountSecret('pending')};
export const guestVault:GuestVault={async read(){const raw=await readAccountSecret('guests');if(!raw)return[];const values:unknown=JSON.parse(raw);if(!Array.isArray(values))throw new Error('이전 기기 연결을 확인하지 못했어요.');return values.map(value=>{const v=object(value,['owner','token','saved_at']);if(typeof v.token!=='string'||!/^[\da-f]{64}$/.test(v.token))throw new Error('이전 기기 연결을 확인하지 못했어요.');return{owner:uuid(v.owner),token:v.token,saved_at:stamp(v.saved_at)} as GuestConnection;});},write:values=>writeAccountSecret('guests',JSON.stringify(values))};
