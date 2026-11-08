import React,{useEffect,useState} from 'react';
import {Pressable,View} from 'react-native';
import {Character,Expression} from '../../components/Character';
import {Copy} from '../../components/UI';
import {SceneArt} from './SceneArt';
import {useSkin} from './SkinProvider';
import {skins} from './catalog';
import {feedback} from '../../services/feedback';
export function SceneHero({reduced=false,giga=false}:{reduced?:boolean;giga?:boolean}){
 const {id}=useSkin();const [expression,setExpression]=useState<Expression>('welcome');const [interaction,setInteraction]=useState(0);
 useEffect(()=>{setExpression('welcome');const timeout=setTimeout(()=>setExpression('calm'),1900);return()=>clearTimeout(timeout);},[id,interaction]);
 return <View style={{gap:12}}><Pressable accessibilityRole="button" accessibilityLabel={`${skins[id].name}에게 인사하기`} onPress={()=>{setInteraction(v=>v+1);feedback(skins[id].cues.greet);}} style={{height:258,borderRadius:26,overflow:'hidden',alignItems:'center',justifyContent:'flex-end'}}>
  <View pointerEvents="none" style={{position:'absolute',inset:0}}><SceneArt id={id}/></View>
  <View pointerEvents="none" style={{paddingBottom:2}}><Character size={198} expression={expression} reduced={reduced} giga={giga} framed={false}/></View>
  <View pointerEvents="none" style={{position:'absolute',left:16,top:15}}><Copy kind="label" muted>{skins[id].hint}</Copy></View>
 </Pressable><Copy kind="small" muted style={{textAlign:'center'}}>{skins[id].greeting}</Copy></View>;
}
