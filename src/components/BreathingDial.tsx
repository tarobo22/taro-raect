import React,{useRef,useState} from 'react';
import {Animated,Platform,View} from 'react-native';
import {Button,Copy,Panel,s} from './UI';
import {color} from '../design/tokens';
import {useStore} from '../state/store';
import {useActivityEffect} from '../features/motion/useActivityEffect';

export function BreathingDial(){
 const {reduced}=useStore();const [running,setRunning]=useState(false),[elapsed,setElapsed]=useState(0);
 const elapsedRef=useRef(0),scale=useRef(new Animated.Value(1)).current;const inhale=Math.floor(elapsed/4)%2===0;
 useActivityEffect(current=>{const phase=elapsedRef.current%8,firstInhale=phase<4,fraction=(phase%4)/4;scale.setValue(reduced?1:firstInhale?1+fraction*.1:1.1-fraction*.1);const interval=setInterval(()=>{if(current()){elapsedRef.current++;setElapsed(elapsedRef.current);}},1000);
  const timing=(toValue:number,duration:number)=>Animated.timing(scale,{toValue,duration,useNativeDriver:Platform.OS!=='web'});
  const loop=Animated.sequence([timing(firstInhale?1.1:1,(4-phase%4)*1000),Animated.loop(Animated.sequence([timing(firstInhale?1:1.1,4000),timing(firstInhale?1.1:1,4000)]))]);
  if(!reduced)loop.start();return()=>{clearInterval(interval);loop.stop();scale.setValue(1);};
 },[reduced,scale],running);
 return <Panel tone={color.sage} style={{alignItems:'center',gap:18}}><Copy kind="subtitle">잠깐, 내 호흡에 맞춰요.</Copy><View style={{width:160,height:160,alignItems:'center',justifyContent:'center'}}><Animated.View style={{position:'absolute',width:128,height:128,borderRadius:64,backgroundColor:color.mint,borderWidth:1,borderColor:color.mintDeep,transform:[{scale}]}}/><View style={{alignItems:'center'}}><Copy kind="subtitle">{running?(inhale?'편하게 들이쉬고':'천천히 내쉬어요'):'잠깐의 여유'}</Copy>{running?<Copy muted>{4-elapsed%4}</Copy>:null}</View></View><Copy kind="small" muted style={{textAlign:'center'}}>편안한 만큼만 따라가요. 언제든 멈춰도 좋아요.</Copy><Button secondary onPress={()=>{elapsedRef.current=0;setElapsed(0);setRunning(v=>!v);}}>{running?'여기서 쉬기':'호흡 시작하기'}</Button></Panel>;
}
