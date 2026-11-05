import React,{useEffect,useRef,useState} from 'react';
import {Animated,Platform,View} from 'react-native';
import {Button,Copy,Panel,s} from './UI';
import {color} from '../design/tokens';
import {useStore} from '../state/store';

export function BreathingDial(){
 const {reduced}=useStore();const [running,setRunning]=useState(false),[elapsed,setElapsed]=useState(0);
 const scale=useRef(new Animated.Value(1)).current;const inhale=Math.floor(elapsed/4)%2===0;
 useEffect(()=>{if(!running){scale.setValue(1);return;}const interval=setInterval(()=>setElapsed(n=>n+1),1000);
  const loop=Animated.loop(Animated.sequence([Animated.timing(scale,{toValue:1.1,duration:4000,useNativeDriver:Platform.OS!=='web'}),Animated.timing(scale,{toValue:1,duration:4000,useNativeDriver:Platform.OS!=='web'})]));
  if(!reduced)loop.start();return()=>{clearInterval(interval);loop.stop();scale.setValue(1);};
 },[running,reduced,scale]);
 return <Panel tone={color.sage} style={{alignItems:'center',gap:18}}><Copy kind="subtitle">잠깐, 내 호흡에 맞춰요.</Copy><View style={{width:160,height:160,alignItems:'center',justifyContent:'center'}}><Animated.View style={{position:'absolute',width:128,height:128,borderRadius:64,backgroundColor:color.mint,borderWidth:1,borderColor:color.mintDeep,transform:[{scale}]}}/><View style={{alignItems:'center'}}><Copy kind="subtitle">{running?(inhale?'편하게 들이쉬고':'천천히 내쉬어요'):'잠깐의 여유'}</Copy>{running?<Copy muted>{4-elapsed%4}</Copy>:null}</View></View><Copy kind="small" muted style={{textAlign:'center'}}>편안한 만큼만 따라가요. 언제든 멈춰도 좋아요.</Copy><Button secondary onPress={()=>{setElapsed(0);setRunning(v=>!v);}}>{running?'여기서 쉬기':'호흡 시작하기'}</Button></Panel>;
}
