import React,{useEffect,useRef} from 'react';
import {Animated,Platform,Pressable,Text,View} from 'react-native';
import {color} from '../design/tokens';
function Step({active,index,reduced,label,onPress}:{active:boolean;index:number;reduced:boolean;label?:string;onPress?:()=>void}){
 const value=useRef(new Animated.Value(active?1:0)).current;
 useEffect(()=>{const animation=Animated.spring(value,{toValue:active?1:0,damping:20,stiffness:240,useNativeDriver:Platform.OS!=='web'});if(reduced)value.setValue(active?1:0);else animation.start();return()=>animation.stop();},[active,reduced]);
 return <Pressable disabled={!onPress||!active} accessibilityRole={onPress?'button':undefined} accessibilityLabel={onPress?(index+1)+'순위 카드 선택 취소':undefined} onPress={onPress} style={{flex:1,height:onPress?48:30,borderRadius:10,backgroundColor:color.sage,overflow:'hidden',justifyContent:'center',alignItems:'center'}}><Animated.View pointerEvents="none" style={{position:'absolute',inset:0,backgroundColor:color.mint,opacity:value,transform:[{translateY:value.interpolate({inputRange:[0,1],outputRange:[48,0]})}]}}/><Text style={{fontSize:12,color:active?color.action:color.muted,fontWeight:'600'}}>{active?label||'✓':index+1}</Text></Pressable>;
}
export function StepProgress({value,total,reduced,label,labels,onClear}:{value:number;total:number;reduced:boolean;label:string;labels?:string[];onClear?:(index:number)=>void}){return <View accessibilityLabel={`${label} ${value} / ${total}`} style={{flexDirection:'row',gap:6}}>{Array.from({length:total},(_,i)=><Step key={i} index={i} active={i<value} reduced={reduced} label={labels?.[i]} onPress={onClear?()=>onClear(i):undefined}/>)}</View>;}
