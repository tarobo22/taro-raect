import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {AppState} from 'react-native';
import {adminRepository,adminSession} from '../../composition';
import type {AdminEligibility} from './model';
/** Eligibility never confers a session, and errors keep the ordinary user entry hidden. */
export function useAdminEligibility(owner:string|undefined){
 const [result,setResult]=useState<{owner:string;value:AdminEligibility}|null>(null);
 useEffect(()=>{let active=true;if(owner)void adminRepository.eligibility().then(value=>{if(active)setResult({owner,value});}).catch(()=>{if(active)setResult(null);});return()=>{active=false;};},[owner]);
 return result&&result.owner===owner?result.value:null;
}
export function useAdminSession(owner:string){
 const subscribe=useCallback((listener:()=>void)=>adminSession.subscribe(listener),[]),snapshot=useSyncExternalStore(subscribe,()=>adminSession.snapshot,()=>adminSession.snapshot);
 useEffect(()=>{adminSession.clear();const close=()=>{void adminRepository.close(owner).catch(()=>{});},listener=AppState.addEventListener('change',state=>{if(state!=='active')close();});return()=>{listener.remove();close();};},[owner]);
 useEffect(()=>{if(!snapshot.open||snapshot.owner!==owner||!snapshot.expiresAt)return;const timeout=setTimeout(()=>adminSession.clear(),Math.max(0,Date.parse(snapshot.expiresAt)-Date.now()));return()=>clearTimeout(timeout);},[snapshot.open,snapshot.expiresAt,snapshot.owner,owner]);
 return snapshot;
}
/** Results are scoped to both the connected owner and this in-memory admin grant. */
export function useAdminRead<T>(owner:string,generation:number,read:()=>Promise<T>,keys:readonly unknown[]=[]){
 const scope=JSON.stringify([owner,generation,...keys]),currentScope=useRef(scope);currentScope.current=scope;
 const current=useRef(read);current.current=read;const active=useRef(0),mounted=useRef(true);const [state,setState]=useState<{scope:string;value:T|null;busy:boolean;error:string}>({scope,value:null,busy:true,error:''});
 const reload=useCallback(async()=>{const request=++active.current;setState(value=>({...value,scope,busy:true,error:''}));try{const value=await current.current();if(mounted.current&&request===active.current&&scope===currentScope.current&&generation===adminSession.generation)setState({scope,value,busy:false,error:''});}catch(error){if(mounted.current&&request===active.current&&scope===currentScope.current&&generation===adminSession.generation)setState(value=>({...value,busy:false,error:error instanceof Error?error.message:'운영 정보를 다시 확인해 주세요.'}));}},[generation,scope]);
 useEffect(()=>{mounted.current=true;setState({scope,value:null,busy:true,error:''});void reload();return()=>{mounted.current=false;active.current++;};},[reload,scope]);
 const replace=(value:T)=>{if(mounted.current&&scope===currentScope.current&&generation===adminSession.generation)setState({scope,value,busy:false,error:''});};
 return {...(state.scope===scope?state:{value:null,busy:true,error:''}),reload,replace};
}
