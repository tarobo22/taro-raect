import type {DataReceipt} from './model';
interface OwnedStorage{getAllKeys():Promise<readonly string[]>;multiRemove(keys:readonly string[]):Promise<void>;setItem(key:string,value:string):Promise<void>;}
/** Called only after the server reports erase completion. Preserve this one status-only receipt. */
export async function eraseCurrentDeviceData(storage:OwnedStorage,identity:{forget():Promise<void>},receipt:DataReceipt):Promise<void>{
 if(receipt.kind!=='erase'||receipt.state!=='completed')throw new Error('서버의 전체 삭제 완료를 먼저 확인해 주세요.');
 if(receipt.device_cleanup_complete===true)return;
 const receiptKey='yeoun.p0.data-receipt';
 await storage.setItem(receiptKey,JSON.stringify(receipt));
 const keys=await storage.getAllKeys();
 await storage.multiRemove(keys.filter(key=>key.startsWith('yeoun.')&&key!==receiptKey));
 await identity.forget();
 await storage.setItem(receiptKey,JSON.stringify({...receipt,device_cleanup_complete:true}));
}
