import test from 'node:test';
import assert from 'node:assert/strict';
import {BillingCoordinator} from '../src/features/billing/BillingCoordinator';
import {HttpError} from '../src/infrastructure/http/FetchClient';

function context(){
 let owner='first',verification=0,resolvePurchase:(v:any)=>void=()=>{};
 const api:any={verify:async()=>{verification++;return {state:'active',acknowledged:true,entitlements:[{key:'deck:test'}]};}};
 const native:any={purchase:()=>new Promise(r=>{resolvePurchase=r;}),restore:async()=>[{product_id:'test.deck',purchase_token:'private-fixture',state:'purchased'}]};
 const coordinator=new BillingCoordinator(api,native,()=>owner);
 const catalog:any={account_id:'a'.repeat(64),can_purchase:true,products:[{product_id:'test.deck',kind:'inapp',entitlement_key:'deck:test'}]};
 return {coordinator,catalog,finish:(v:any)=>resolvePurchase(v),verifications:()=>verification,switchOwner:()=>{owner='second';}};
}
test('cancelled store sheet does not call receipt verification or grant an entitlement',async()=>{
 const c=context(),pending=c.coordinator.buy(c.catalog,'test.deck','offer');
 c.finish({state:'cancelled',purchases:[]});
 assert.deepEqual(await pending,{state:'cancelled',entitlements:[]});
 assert.equal(c.verifications(),0);
});
test('account switch while store sheet is open never verifies against the new account',async()=>{
 const c=context(),pending=c.coordinator.buy(c.catalog,'test.deck','offer');
 c.switchOwner();c.finish({state:'completed',purchases:[{product_id:'test.deck',purchase_token:'private-fixture',state:'purchased'}]});
 await assert.rejects(pending,/계정/);assert.equal(c.verifications(),0);
});
test('purchase state from the client cannot grant an entitlement before server verification',async()=>{
 const c=context(),pending=c.coordinator.buy(c.catalog,'test.deck','offer');
 c.finish({state:'completed',purchases:[{product_id:'test.deck',purchase_token:'private-fixture',state:'purchased'}]});
 assert.deepEqual(await pending,{state:'active',entitlements:[{key:'deck:test'}]});assert.equal(c.verifications(),1);
});
test('restore verifies known store receipts and duplicate taps do not launch a second purchase',async()=>{
 const c=context(),pending=c.coordinator.buy(c.catalog,'test.deck','offer');
 await assert.rejects(c.coordinator.buy(c.catalog,'test.deck','offer'),/진행/);
 c.finish({state:'cancelled',purchases:[]});await pending;
 const restored=await c.coordinator.restore(c.catalog);assert.equal(restored.verified,1);assert.equal(c.verifications(),1);
});
test('restore continues after a foreign receipt while preserving account denial and reports partial rejection',async()=>{
 const attempted:string[]=[];
 const api:any={verify:async(_id:string,token:string)=>{attempted.push(token);if(token==='foreign')throw new HttpError('거절',403);return {state:'active',entitlements:[],acknowledged:true};}};
 const native:any={restore:async()=>['foreign','owned'].map(purchase_token=>({product_id:'test.deck',purchase_token,state:'purchased'}))};
 const coordinator=new BillingCoordinator(api,native,()=>'owner'),catalog:any={can_purchase:true,products:[{product_id:'test.deck',kind:'inapp'}]};
 assert.deepEqual(await coordinator.restore(catalog),{verified:1,rejected:1,pending:0});assert.deepEqual(attempted,['foreign','owned']);
 api.verify=async()=>{throw new HttpError('만료',401);};await assert.rejects(coordinator.restore(catalog),/만료/);
});
