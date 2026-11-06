import React,{useEffect,useSyncExternalStore} from 'react';
import {View} from 'react-native';
import {accountFlow,accountRuntime} from '../../composition';
import {Store} from '../../state/store';
import {Button,Copy,Notice,s} from '../../components/UI';
import {listenSocial} from '../../services/social';
export function AccountBoundary({children}:{children:React.ReactNode}){
 const state=useSyncExternalStore(accountRuntime.subscribe,()=>accountRuntime.snapshot);
 useEffect(()=>{void accountRuntime.initialize();return listenSocial(url=>{void accountRuntime.initialize().then(()=>accountFlow.receive(url));});},[]);
 useEffect(()=>{if(state.switching)accountRuntime.viewUnmounted();},[state.switching]);
 if(!state.ready||state.switching)return <View style={[s.stack,{padding:24}]}><Copy kind="title">{state.switching?'계정의 기록을 전환하고 있어요.':'기기 연결을 확인하고 있어요.'}</Copy><Copy>진행 중이던 저장을 확인하고 초안과 요청 연결을 계정별로 보관해요. 서버 처리 결과가 불확실한 요청은 자동으로 다시 보내지 않아요.</Copy>{state.error?<><Notice error>{state.error}</Notice><Button onPress={()=>void accountRuntime.retry()}>연결 상태 다시 확인</Button></>:null}</View>;
 return <Store key={state.epoch}>{children}</Store>;
}
