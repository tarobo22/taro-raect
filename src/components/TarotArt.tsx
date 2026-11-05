import React,{useEffect,useRef} from 'react';
import {Animated,Image,Platform,View} from 'react-native';
import Svg,{Path,Circle} from 'react-native-svg';
import {color} from '../design/tokens';
import {Copy} from './UI';
import type {Card} from '../domain/content';
import {cardImages} from './cardImages';
import {feedback} from '../services/feedback';

export function TarotArt({card,width=130,back=false,selected=false}:{card?:Card;width?:number;back?:boolean;selected?:boolean}){
 return <View accessible accessibilityLabel={back?'뒤집힌 타로 카드':card?card.name+' · '+card.keyword:'타로 카드'}
  style={{width,height:width*1.68,borderRadius:14,backgroundColor:back?color.action:color.surface,borderWidth:selected?2:1,borderColor:selected?color.ink:color.line,padding:back?10:5,alignItems:'center',justifyContent:'center'}}>
  {back?<><View style={{position:'absolute',top:9,left:9,right:9,bottom:9,borderWidth:1,borderColor:color.mint,borderRadius:9,opacity:.6}}/><Svg width="70%" height="55%" viewBox="0 0 100 100" fill="none" stroke={color.mint} strokeWidth="1.7"><Path d="M20 70Q50 5 80 70M20 48Q50 95 80 48"/><Circle cx="50" cy="46" r="13"/></Svg><Copy kind="label" style={{color:color.mint,fontSize:width<90?10:12}}>여운</Copy></>:
   card?<Image source={cardImages[card.id]} resizeMode="contain" accessible={false} style={{width:'100%',height:'100%',borderRadius:8}}/>:null}
 </View>;
}

export function FlippingCard({card,width=100,delay=0,reduced=false}:{card:Card;width?:number;delay?:number;reduced?:boolean}){
 const turn=useRef(new Animated.Value(reduced?1:0)).current;
 useEffect(()=>{
  const timer=setTimeout(()=>{if(!reduced)feedback('flip');Animated.timing(turn,{toValue:1,duration:reduced?0:520,useNativeDriver:Platform.OS!=='web'}).start();},reduced?0:delay);
  return()=>clearTimeout(timer);
 },[turn,reduced,delay]);
 return <Animated.View style={{width,height:width*1.68,transform:[{perspective:900},{rotateY:turn.interpolate({inputRange:[0,1],outputRange:['0deg','180deg']})}]}}>
  <View style={{position:'absolute',backfaceVisibility:'hidden'}}><TarotArt back width={width}/></View>
  <View style={{backfaceVisibility:'hidden',transform:[{rotateY:'180deg'}]}}><TarotArt card={card} width={width}/></View>
 </Animated.View>;
}
