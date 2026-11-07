import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {Button,Copy,Panel} from '../../components/UI';
import {p0Repository} from '../../composition';
import {requestId} from '../../infrastructure/requestId';
import {useStore} from '../../state/store';
import type {ConsentKind} from '../p0/model';
import {resolveSendConsent,type SendPermissions} from './resolveSendConsent';

type Request=(kinds:ConsentKind[])=>Promise<SendPermissions|null>;
const Context=createContext<Request>(async()=>null);
export const useSendConsent=()=>useContext(Context);

// Called only from an explicit send action, never while opening a screen.
export function SendConsentProvider({children}:{children:React.ReactNode}){
 const store=useStore(),latest=useRef(store);latest.current=store;
 const [error,setError]=useState(''),inFlight=useRef(false),alive=useRef(true);
 const keys=useRef(new Map<string,string>());
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{setError('');keys.current.clear();},[store.bootstrap?.user.id]);
 async function request(kinds:ConsentKind[]){
  if(inFlight.current)return null;
  const owner=latest.current.bootstrap?.user.id;
  inFlight.current=true;setError('');
  try{
   const permissions=await resolveSendConsent(kinds,{
    snapshot:()=>({owner:alive.current&&latest.current.sessionState==='ready'?latest.current.bootstrap?.user.id||'':'',policy:latest.current.bootstrap?.policy_version||'',consents:latest.current.consents}),
    confirm:async()=>true,
    grant:async(kind,policy)=>{
     const identity=owner+':'+policy+':'+kind;
     const key=keys.current.get(identity)||requestId();keys.current.set(identity,key);
     const event=await p0Repository.consent(kind,policy,true,key);keys.current.delete(identity);return event;
    },
   });
   if(permissions)await latest.current.reloadConsents();
   return alive.current&&latest.current.bootstrap?.user.id===owner?permissions:null;
  }catch{if(alive.current&&latest.current.bootstrap?.user.id===owner)setError('보내지 못했어요. 입력한 내용은 그대로예요. 다시 눌러 주세요.');return null;}
  finally{inFlight.current=false;}
 }
 return <Context.Provider value={request}>{children}{error?<View accessibilityLiveRegion="polite" style={{position:'absolute',bottom:20,left:20,right:20,alignItems:'center'}}><Panel style={{maxWidth:390,gap:8,padding:16}}><Copy kind="small">{error}</Copy><Button secondary onPress={()=>setError('')}>닫기</Button></Panel></View>:null}</Context.Provider>;
}
