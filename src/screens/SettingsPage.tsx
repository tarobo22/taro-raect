import {PageView as View,PageFlow} from '../components/PageFlow';
import React,{useMemo,useRef,useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,Pressable,useWindowDimensions} from 'react-native';
import {SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';
import {Copy,Header,s} from '../components/UI';
import {Icon} from '../components/Icon';
import {useSkinTheme} from '../features/skins/useSkinTheme';
import {useStore} from '../state/store';
import type {Nav,Route,ScreenName} from '../navigation';
import {Settings} from './Settings';
import {Consents,Decks,CardDetail,Sources,DataControls,Feedback} from './P0';
import {AccountScreen} from './Account';
import {RemindersScreen} from './Reminders';
import {BillingScreen} from './Billing';
import {AdminScreen} from './Admin';

const titles:Partial<Record<ScreenName,string>>={settings:'설정',consents:'AI 이용 설정',decks:'카드 덱과 그림',card:'카드 상세',sources:'그림과 소리의 출처',data:'내 기록과 데이터',feedback:'의견 남기기',account:'계정 연결',reminders:'마음기록 알림',billing:'구매와 이용 권한',admin:'운영관리'};
export function isSettingsRoute(name:ScreenName){return name!=='card'&&name in titles;}

// Keep the conversation mounted while preferences and their detail pages are open.
export function SettingsPage({initialRoute,onClose,onNavigate,onTab}:{initialRoute:Route;onClose:()=>void;onNavigate:(route:Route)=>void;onTab:Nav['tab']}){
 const theme=useSkinTheme(),store=useStore(),insets=useSafeAreaInsets(),window=useWindowDimensions();
 const [stack,setStack]=useState<Route[]>(()=>initialRoute.name==='settings'?[initialRoute]:[{name:'settings'},initialRoute]);
 const route=stack[stack.length-1],offsets=useRef(new Map<string,number>()),pageKey=route.name+':'+(route.cardId||'');
 const nav:Nav=useMemo(()=>({
  push:next=>{if(next.name in titles)setStack(old=>[...old,next]);else onNavigate(next);},
  replace:next=>{if(next.name in titles)setStack(old=>[...old.slice(0,-1),next]);else onNavigate(next);},
  back:()=>{if(stack.length>1)setStack(old=>old.slice(0,-1));else onClose();},
  update:data=>setStack(old=>[...old.slice(0,-1),{...old[old.length-1],...data}]),
  tab:name=>{if(name==='settings')setStack([{name:'settings'}]);else onTab(name);},
 }),[stack.length,onClose,onNavigate,onTab]);
 let screen:React.ReactNode=null;
 switch(route.name){
  case 'settings':screen=<Settings nav={nav}/>;break;
  case 'consents':screen=<Consents/>;break;
  case 'decks':screen=<Decks nav={nav}/>;break;
  case 'card':screen=<CardDetail nav={nav} route={route}/>;break;
  case 'sources':screen=<Sources route={route}/>;break;
  case 'data':screen=<DataControls/>;break;
  case 'feedback':screen=<Feedback route={route}/>;break;
  case 'account':screen=<AccountScreen/>;break;
  case 'reminders':screen=<RemindersScreen/>;break;
  case 'billing':screen=<BillingScreen nav={nav}/>;break;
  case 'admin':screen=<AdminScreen/>;break;
 }
 const wide=Platform.OS==='web'&&window.width>600;
 return <Modal transparent animationType={store.reduced?'none':'fade'} onRequestClose={nav.back}>
  <View style={{flex:1,backgroundColor:'rgba(32,44,36,.3)',alignItems:'center',justifyContent:'center'}}>
   <View style={{width:wide?430:'100%',height:wide?Math.min(window.height-32,920):'100%',backgroundColor:theme.paper,borderRadius:wide?28:0,overflow:'hidden'}}>
    <SafeAreaView edges={['top','left','right']} style={{flex:1}}>
     <Header title={titles[route.name]||'설정'} back={nav.back} right={<Pressable accessibilityRole="button" accessibilityLabel="설정 닫기" onPress={onClose} style={{width:48,height:48,alignItems:'center',justifyContent:'center'}}><Icon name="close" tint={theme.action}/></Pressable>}/>
     <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <PageFlow key={pageKey} initialOffset={offsets.current.get(pageKey)||0} onPageChange={offset=>offsets.current.set(pageKey,offset)} title={titles[route.name]} contentContainerStyle={{padding:20,paddingBottom:Math.max(24,insets.bottom+16)}}>{screen}</PageFlow>
     </KeyboardAvoidingView>
    </SafeAreaView>
   </View>
  </View>
 </Modal>;
}
