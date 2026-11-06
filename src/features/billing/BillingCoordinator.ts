import type {BillingApi} from './BillingApi';
import type {BillingCatalog,Entitlement,StoreBilling,StoreReceipt} from './model';
export class BillingCoordinator{
 private busy=false;private generation=0;
 constructor(private api:Pick<BillingApi,'verify'>,private store:StoreBilling,private owner:()=>string){}
 invalidate(){this.generation++;}
 private check(owner:string,generation:number){if(owner!==this.owner()||generation!==this.generation)throw new Error('계정이 바뀌었어요. 원래 구매 계정에서 구매 복원을 확인해 주세요.');}
 async buy(catalog:BillingCatalog,id:string,offer:string):Promise<{state:string;entitlements:Entitlement[]}>{
  if(this.busy)throw new Error('진행 중인 구매를 먼저 확인해 주세요.');
  const product=catalog.products.find(p=>p.product_id===id);
  if(!product||!catalog.can_purchase)throw new Error('계정 연결과 등록된 상품을 먼저 확인해 주세요.');
  this.busy=true;const owner=this.owner(),generation=this.generation;
  try{const result=await this.store.purchase(id,product.kind,catalog.account_id,offer);this.check(owner,generation);
   if(result.state==='cancelled')return {state:'cancelled',entitlements:[]};
   const receipts=result.purchases.filter(p=>p.product_id===id);if(!receipts.length)throw new Error('구매 결과를 확인 중이에요. 구매 복원을 눌러 확인해 주세요.');
   let verified;for(const receipt of receipts){this.check(owner,generation);verified=await this.api.verify(receipt.product_id,receipt.purchase_token);this.check(owner,generation);}
   return {state:verified!.state,entitlements:verified!.entitlements};
  }finally{this.busy=false;}
 }
 async restore(catalog:BillingCatalog):Promise<{verified:number}>{
  if(this.busy)throw new Error('진행 중인 구매를 먼저 확인해 주세요.');
  if(!catalog.can_purchase)throw new Error('구매한 계정으로 연결한 뒤 복원해 주세요.');
  this.busy=true;const owner=this.owner(),generation=this.generation;
  try{const receipts=await this.store.restore();this.check(owner,generation);const seen=new Set<string>();let verified=0;
   for(const receipt of receipts){if(!catalog.products.some(p=>p.product_id===receipt.product_id))continue;
    const key=receipt.product_id+':'+receipt.purchase_token;if(seen.has(key))continue;seen.add(key);this.check(owner,generation);
    await this.api.verify(receipt.product_id,receipt.purchase_token);this.check(owner,generation);verified++;
   }return {verified};
  }finally{this.busy=false;}
 }
}
