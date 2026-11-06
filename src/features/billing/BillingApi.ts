import type {BillingCatalog,Entitlement,VerifiedPurchase} from './model';
interface Transport{request(path:string,options?:RequestInit):Promise<unknown>;}
function object(v:unknown):Record<string,any>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('구매 응답을 확인하지 못했어요.');return v as Record<string,any>;}
function text(v:unknown){if(typeof v!=='string'||!v)throw new Error('구매 응답을 확인하지 못했어요.');return v;}
function date(v:unknown){const s=text(v);if(!Number.isFinite(Date.parse(s)))throw new Error('구매 확인 시간을 확인하지 못했어요.');return s;}
function list(v:unknown){if(!Array.isArray(v))throw new Error('구매 목록을 확인하지 못했어요.');return v;}
function entitlement(v:unknown):Entitlement{const r=object(v);return {key:text(r.key),product_id:text(r.product_id),expires_at:r.expires_at===null?null:date(r.expires_at),verified_at:date(r.verified_at)};}
export class BillingApi{
 constructor(private http:Transport){}
 async catalog():Promise<BillingCatalog>{const r=object(await this.http.request('/v2/billing/catalog'));if(r.store!=='google_play'||typeof r.available!=='boolean'||typeof r.can_purchase!=='boolean'||!['catalog_not_configured','store_not_configured',null].includes(r.reason)||!/^[a-f0-9]{64}$/.test(r.account_id))throw new Error('스토어 설정을 확인하지 못했어요.');const products=list(r.products).map(v=>{const p=object(v);if(!['inapp','subs'].includes(p.kind))throw new Error('상품 종류를 확인하지 못했어요.');return {product_id:text(p.product_id),kind:p.kind as 'inapp'|'subs',entitlement_key:text(p.entitlement_key)};});if(new Set(products.map(p=>p.product_id)).size!==products.length)throw new Error('상품 목록이 중복됐어요.');return {store:r.store,available:r.available,can_purchase:r.can_purchase,reason:r.reason,account_id:r.account_id,package_name:text(r.package_name),products};}
 async entitlements():Promise<{items:Entitlement[];checked_at:string}>{const r=object(await this.http.request('/v2/billing/entitlements'));return {items:list(r.items).map(entitlement),checked_at:date(r.checked_at)};}
 async verify(product_id:string,purchase_token:string):Promise<VerifiedPurchase>{const r=object(await this.http.request('/v2/billing/purchases/verify',{method:'POST',body:JSON.stringify({product_id,purchase_token})}));if(!['active','pending','expired','revoked'].includes(r.state)||typeof r.acknowledged!=='boolean')throw new Error('구매 결과를 확인하지 못했어요.');return {state:r.state,acknowledged:r.acknowledged,entitlements:list(r.entitlements).map(entitlement)};}
}
