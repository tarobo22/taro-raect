import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,ScrollView,Text,View} from 'react-native';
import {RailHighlight} from './RailHighlight';
import {color} from '../design/tokens';
import {feedback} from '../services/feedback';
import {useStore} from '../state/store';
/** Stable labels and one moving highlight: selecting never changes an item's measured width. */
export function OptionRail({options,value,onChange,label,disabled=false,quiet=false}:{options:string[];value:string;onChange:(value:string)=>void;label:string;disabled?:boolean;quiet?:boolean}){
 const {reduced}=useStore(),scroll=useRef<ScrollView>(null),[frames,setFrames]=useState<Record<string,{x:number;width:number}>>({}),[width,setWidth]=useState(300);
 const selected=frames[value];
 useEffect(()=>{if(selected)scroll.current?.scrollTo({x:Math.max(0,selected.x-(width-selected.width)/2),animated:!reduced});},[value,selected?.x,selected?.width,width,reduced]);
 function select(next:string){if(disabled||next===value)return;if(!quiet)feedback('select');onChange(next);}
 return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" onLayout={e=>setWidth(e.nativeEvent.layout.width)} contentContainerStyle={{paddingVertical:3}} style={{flexGrow:0}}>
  <View accessibilityLabel={label} style={{flexDirection:'row',gap:6,position:'relative'}}>
   {selected?<RailHighlight x={selected.x} width={selected.width} reduced={reduced}/>:null}
   {options.map((option,i)=><Pressable key={option} accessibilityRole="button" accessibilityLabel={option} accessibilityState={{selected:option===value,disabled}} disabled={disabled}
    onLayout={e=>{const {x,width:w}=e.nativeEvent.layout;setFrames(old=>old[option]?.x===x&&old[option]?.width===w?old:{...old,[option]:{x,width:w}});}}
    {...(Platform.OS==='web'?{onKeyDown:(e:{nativeEvent:{key?:string};preventDefault:()=>void})=>{const key=e.nativeEvent.key,j=key==='ArrowRight'?Math.min(options.length-1,i+1):key==='ArrowLeft'?Math.max(0,i-1):key==='Home'?0:key==='End'?options.length-1:-1;if(j>=0){e.preventDefault();select(options[j]);}}}:{})}
    onPress={()=>select(option)} style={{minHeight:48,paddingHorizontal:16,justifyContent:'center',borderRadius:18,borderWidth:1,borderColor:option===value?'transparent':color.line,opacity:disabled?.45:1}}>
    <Text numberOfLines={1} style={{fontSize:14,fontWeight:'500',color:option===value?color.action:color.muted}}>{option}</Text>
   </Pressable>)}
  </View>
 </ScrollView>;
}
