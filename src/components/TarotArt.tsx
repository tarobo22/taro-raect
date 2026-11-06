import React,{useEffect,useRef,useState} from 'react';
import {Image,View} from 'react-native';
import Svg,{Path,Circle} from 'react-native-svg';
import {color} from '../design/tokens';
import {Copy} from './UI';
import type {Card} from '../domain/content';
import {cardImages} from './cardImages';
import {CardReveal} from './CardReveal';
import {decodedImage} from '../services/imageReady';

export function TarotArt({card,width=130,back=false,selected=false,onReady,onFailure}:{card?:Card;width?:number;back?:boolean;selected?:boolean;onReady?:()=>void;onFailure?:()=>void}){
 const generation=useRef(0);useEffect(()=>{generation.current++;return()=>{generation.current++;};},[card?.id]);
 async function loaded(){if(!card||!onReady)return;const current=generation.current;try{const source=cardImages[card.id],uri=source?.uri||Image.resolveAssetSource(source)?.uri;if(uri)await decodedImage(uri);if(current===generation.current)onReady();}catch{if(current===generation.current)onFailure?.();}}
 return <View accessible accessibilityLabel={back?'뒤집힌 타로 카드':card?card.name+' · '+card.keyword:'타로 카드'}
  style={{width,height:width*1.68,borderRadius:14,backgroundColor:back?color.action:color.surface,borderWidth:selected?2:1,borderColor:selected?color.ink:color.line,padding:back?10:5,alignItems:'center',justifyContent:'center'}}>
  {back?<><View style={{position:'absolute',top:9,left:9,right:9,bottom:9,borderWidth:1,borderColor:color.mint,borderRadius:9,opacity:.6}}/><Svg width="70%" height="55%" viewBox="0 0 100 100" fill="none" stroke={color.mint} strokeWidth="1.7"><Path d="M20 70Q50 5 80 70M20 48Q50 95 80 48"/><Circle cx="50" cy="46" r="13"/></Svg><Copy kind="label" style={{color:color.mint,fontSize:width<90?10:12}}>여운</Copy></>:
   card?<Image source={cardImages[card.id]} resizeMode="contain" accessible={false} onLoad={()=>void loaded()} onError={onFailure} style={{width:'100%',height:'100%',borderRadius:8}}/>:null}
 </View>;
}

export function FlippingCard({card,width=100,delay=0,reduced=false,owner='local',eventKey}:{card:Card;width?:number;delay?:number;reduced?:boolean;owner?:string;eventKey?:string}){
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{setReady(false);setFailed(false);},[card.id]);
 return <CardReveal owner={owner} eventKey={eventKey} ready={ready} failed={failed} reduced={reduced} delay={delay} width={width} height={width*1.68}
  back={<TarotArt back width={width}/>} front={<TarotArt card={card} width={width} onReady={()=>setReady(true)} onFailure={()=>setFailed(true)}/>}/>;
}
