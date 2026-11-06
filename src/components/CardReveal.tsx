import React,{useRef} from 'react';
import {Animated,Platform,View} from 'react-native';
import AsyncStorage from '../features/account/storage';
import {RevealLedger} from '../features/motion/RevealLedger';
import {useActivityEffect} from '../features/motion/useActivityEffect';
import {feedback} from '../services/feedback';
const ledgers=new Map<string,RevealLedger>();
function forOwner(owner:string){
 let ledger=ledgers.get(owner);if(ledger)return ledger;
 const key='yeoun.revealed-cards.'+owner;
 ledger=new RevealLedger({read:async()=>{const raw=await AsyncStorage.getItem(key);return raw?JSON.parse(raw):[];},write:value=>AsyncStorage.setItem(key,JSON.stringify(value))});
 ledgers.set(owner,ledger);if(ledgers.size>16)ledgers.delete(ledgers.keys().next().value!);return ledger;
}
/** The front image is decoded before a once-per-action reveal; screen reentry is static. */
export function CardReveal({owner,eventKey,ready,failed=false,reduced=false,delay=0,width=100,height=168,front,back}:{owner:string;eventKey?:string;ready:boolean;failed?:boolean;reduced?:boolean;delay?:number;width?:number;height?:number;front:React.ReactNode;back:React.ReactNode}){
 const turn=useRef(new Animated.Value(eventKey&&!failed?0:1)).current,ledger=forOwner(owner);
 useActivityEffect(current=>{
  if(failed){turn.setValue(1);return()=>{};}
  let cancelled=false,startTimer:ReturnType<typeof setTimeout>|undefined,cueTimer:ReturnType<typeof setTimeout>|undefined,animation:Animated.CompositeAnimation|undefined;
  void (async()=>{
   let first=false;try{first=!!eventKey&&await ledger.claim(eventKey);}catch{}
   if(!current()||cancelled)return;
   if(!first||failed){turn.setValue(1);return;}
   turn.setValue(0);startTimer=setTimeout(()=>{
    if(!current()||cancelled)return;
    if(!reduced)cueTimer=setTimeout(()=>{if(current()&&!cancelled)feedback('flip');},210);
    animation=Animated.timing(turn,{toValue:1,duration:reduced?100:420,useNativeDriver:Platform.OS!=='web'});animation.start();
   },reduced?0:delay);
  })();
  return()=>{cancelled=true;clearTimeout(startTimer);clearTimeout(cueTimer);animation?.stop();turn.stopAnimation();turn.setValue(1);};
 },[ledger,eventKey,ready,failed,reduced,delay,turn],ready||failed);
 const staticFront=failed||!eventKey;
 if(staticFront)return <View style={{width}}>{front}</View>;
 return <View testID="card-reveal" style={{width,height}}>
  <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',backfaceVisibility:'hidden',width,height,opacity:reduced?0:1,transform:[{perspective:900},{rotateY:turn.interpolate({inputRange:[0,1],outputRange:['0deg','180deg']})}]}}>{back}</Animated.View>
  <Animated.View testID="card-reveal-front" style={{position:'absolute',backfaceVisibility:'hidden',width,height,opacity:turn.interpolate({inputRange:[0,1],outputRange:reduced?[0,1]:[1,1]}),transform:[{perspective:900},{rotateY:turn.interpolate({inputRange:[0,1],outputRange:reduced?['0deg','0deg']:['180deg','360deg']})}]}}>{front}</Animated.View>
 </View>;
}
