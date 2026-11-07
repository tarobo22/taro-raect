import React,{createContext,useContext,useEffect,useRef,useSyncExternalStore} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SkinSelectionStore} from './SkinSelection';
import {feedback} from '../../services/feedback';
const SkinContext=createContext<SkinSelectionStore|null>(null);
export function SkinProvider({children}:{children:React.ReactNode}){
 const store=useRef<SkinSelectionStore|null>(null);store.current??=new SkinSelectionStore(AsyncStorage);
 useEffect(()=>{void store.current!.load();},[]);
 return <SkinContext.Provider value={store.current}>{children}</SkinContext.Provider>;
}
const defaultState={id:'cafe' as const,loaded:true,error:''};
const noSubscribe=()=>()=>{};const defaultSnapshot=()=>defaultState;
export function useSkin(){
 const store=useContext(SkinContext);const state=useSyncExternalStore(store?.subscribe??noSubscribe,store?.getSnapshot??defaultSnapshot);
 return {...state,select:(id:string)=>{if(!store)return;void store.select(id);feedback(id==='playroom'?'meow':'select');}};
}
