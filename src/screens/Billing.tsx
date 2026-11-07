import {PageView as View,PageFlow} from '../components/PageFlow';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Linking} from 'react-native';
import {Button,Copy,Notice,Panel,s} from '../components/UI';
import {http} from '../composition';
import {BillingApi} from '../features/billing/BillingApi';
import {BillingCoordinator} from '../features/billing/BillingCoordinator';
import type {BillingCatalog,Entitlement,StoreProduct} from '../features/billing/model';
import {storeBilling} from '../services/billing';
import {useStore} from '../state/store';
import type {Nav} from '../navigation';
const api=new BillingApi(http);
function periodLabel(value:string){const match=/^P(\d+)([DWMY])$/.exec(value);if(!match)return '이용 기간은 스토어에서 확인';return match[1]+({D:'일',W:'주',M:'개월',Y:'년'}[match[2] as 'D'|'W'|'M'|'Y']);}
export function BillingScreen({nav}:{nav:Nav}){
 const store=useStore(),owner=store.bootstrap?.user.id||'',ownerRef=useRef(owner);ownerRef.current=owner;
 const controller=useMemo(()=>new BillingCoordinator(api,storeBilling,()=>ownerRef.current),[]);
 const [catalog,setCatalog]=useState<BillingCatalog|null>(null),[products,setProducts]=useState<StoreProduct[]>([]),[items,setItems]=useState<Entitlement[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const alive=useRef(true),revision=useRef(0);
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;revision.current++;controller.invalidate();};},[owner]);
 async function load(){const current=++revision.current;setBusy(true);setError('');
  try{const c=await api.catalog(),e=await api.entitlements();const p=storeBilling.supported&&c.available?await storeBilling.products(c.products):[];
   if(alive.current&&current===revision.current){setCatalog(c);setItems(e.items);setProducts(p);}
  }catch(e){if(alive.current&&current===revision.current){setItems([]);setError(e instanceof Error?e.message:'구매 정보를 확인하지 못했어요.');}}
  finally{if(alive.current&&current===revision.current)setBusy(false);}
 }
 async function buy(id:string,offer:string){if(!catalog||busy)return;setBusy(true);setError('');setMessage('');
  try{const result=await controller.buy(catalog,id,offer);if(!alive.current)return;
   if(result.state==='cancelled'){setMessage('구매를 취소했어요.');return;}
   setItems(result.entitlements);setMessage(result.state==='active'?'구매를 확인했어요. 이용 권한이 연결됐어요.':result.state==='pending'?'결제가 대기 중이에요. 완료되면 구매 복원으로 확인해 주세요.':'현재 이용할 수 있는 구매가 아니에요.');
  }catch(e){if(alive.current){setItems([]);setError(e instanceof Error?e.message:'구매를 확인하지 못했어요.');}}
  finally{if(alive.current)setBusy(false);}
 }
 async function restore(){if(!catalog||busy)return;setBusy(true);setError('');setMessage('');
  try{const result=await controller.restore(catalog),e=await api.entitlements();if(alive.current){setItems(e.items);setMessage((result.verified?'스토어 구매와 이용 권한을 다시 확인했어요.':'이 계정에서 확인된 구매가 없어요.')+(result.pending?' 결제가 대기 중인 구매가 있어요.':'')+(result.rejected?' 일부 구매는 이 계정에서 확인되지 않았어요. 처음 구매한 앱 계정도 확인해 주세요.':''));}}
  catch(e){if(alive.current){setItems([]);setError(e instanceof Error?e.message:'구매를 복원하지 못했어요.');}}
  finally{if(alive.current)setBusy(false);}
 }
 return <View style={s.stack}><Copy kind="hero">내가 고른 여운.</Copy><Copy muted>가격과 결제 조건은 스토어에서 확인하고, 이용 권한은 계정에 연결해요.</Copy>
  {error?<Notice error>{error}</Notice>:null}{message?<Notice>{message}</Notice>:null}
  {catalog&&!catalog.available?<Notice>{catalog.reason==='catalog_not_configured'?'아직 판매 중인 상품이 없어요. 무료 기능은 계속 사용할 수 있어요.':'스토어 연결을 준비 중이에요. 지금은 구매를 진행할 수 없어요.'}</Notice>:null}
  {!store.bootstrap||store.bootstrap.user.kind==='guest'?<Panel><Copy>구매를 잃지 않도록 먼저 계정을 연결해 주세요.</Copy><Button secondary onPress={()=>nav.tab('settings')}>계정 연결하러 가기</Button></Panel>:null}
  {!storeBilling.supported?<Notice>웹에서는 연결된 이용 권한을 확인할 수 있어요. 구매·복원은 Google Play에서 설치한 Android 앱에서 진행해 주세요.</Notice>:null}
  {products.map(product=><Panel key={product.product_id} style={{gap:12}}><Copy kind="subtitle">{product.title}</Copy><Copy>{product.description}</Copy>{product.offers.map(offer=><View key={offer.offer_token} style={{gap:8}}>{offer.phases.map((phase,i)=><Copy key={i} kind="small">{phase.price}{phase.period?' · '+periodLabel(phase.period):''}{phase.recurrence===1?' · 자동 갱신':phase.cycles>1?' · '+phase.cycles+'회':''}</Copy>)}<Button disabled={busy||!catalog?.can_purchase} onPress={()=>void buy(product.product_id,offer.offer_token)}>스토어에서 구매 조건 확인</Button></View>)}</Panel>)}
  {catalog?.available&&storeBilling.supported&&products.length===0&&!busy?<Notice>이 스토어 계정·지역에서 구매 가능한 상품을 찾지 못했어요.</Notice>:null}
  <Panel style={{gap:12}}><Copy kind="subtitle">연결된 이용 권한</Copy>{items.length?items.map(item=><View key={item.key}><Copy>{products.find(p=>p.product_id===item.product_id)?.title||item.product_id}</Copy><Copy kind="small" muted>{item.expires_at?'이용 기한 · '+new Date(item.expires_at).toLocaleDateString('ko-KR'):'기간 제한 없는 이용 권한'}</Copy></View>):<Copy muted>연결된 유료 이용 권한이 없어요.</Copy>}
   <Button secondary disabled={busy||!storeBilling.supported||!catalog?.can_purchase} onPress={()=>void restore()}>구매 복원</Button>
   <Button secondary disabled={busy} onPress={()=>void load()}>구매 상태 새로 확인</Button>
   {catalog?.products.some(p=>p.kind==='subs')?<Button secondary onPress={()=>{void Linking.openURL('https://play.google.com/store/account/subscriptions?package='+encodeURIComponent(catalog.package_name));}}>스토어에서 구독 관리·해지</Button>:null}
   <Copy kind="small" muted>결제창 닫기는 구매 취소예요. 구독 갱신 해지와 환불은 스토어에서 별도로 관리해요. 계정 데이터 삭제만으로 구독이 해지되지는 않아요.</Copy>
  </Panel></View>;
}
export function BillingRecovery(){
 const store=useStore(),owner=store.bootstrap?.user.id,epoch=useRef(0);
 useEffect(()=>{const current=++epoch.current;let running=false;
  async function recover(){if(running||!storeBilling.supported||store.sessionState!=='ready')return;running=true;
   const controller=new BillingCoordinator(api,storeBilling,()=>current===epoch.current?owner||'':'changed');
   try{const c=await api.catalog();if(current!==epoch.current||!c.can_purchase)return;await controller.restore(c);}catch{}finally{running=false;}
  }
  void recover();const subscription=AppState.addEventListener('change',state=>{if(state==='active')void recover();});
  return()=>{epoch.current++;subscription.remove();};
 },[owner,store.sessionState]);
 return null;
}
