import AsyncStorage from '../account/storage';
import type {Route} from '../../navigation';
const key='yeoun.p0.pending-job';
export async function rememberJob(route:Route){await AsyncStorage.setItem(key,JSON.stringify(route));}
export async function pendingJob():Promise<Route|null>{
 const value=await AsyncStorage.getItem(key);if(!value)return null;
 try{const r:unknown=JSON.parse(value);if(typeof r==='object'&&r!==null&&'name' in r&&r.name==='job'&&'jobId' in r&&typeof r.jobId==='string'&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(r.jobId))return r as Route;}catch{}
 throw new Error('진행 중인 작업 연결을 확인하지 못했어요. 저장된 초안은 유지됩니다.');
}
export async function forgetJob(id:string){const current=await pendingJob();if(current?.jobId===id)await AsyncStorage.removeItem(key);}
