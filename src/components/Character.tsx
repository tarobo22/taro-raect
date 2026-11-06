import React,{useRef,useState} from 'react';
import {Animated,Image,Platform,View} from 'react-native';
import Svg,{Path,Ellipse,Circle} from 'react-native-svg';
import {color,motion} from '../design/tokens';
import {characterBody} from './characterBody';
import {useActivityEffect} from '../features/motion/useActivityEffect';
export type Expression='calm'|'welcome'|'listen'|'encourage'|'joy'|'concern'|'serious';
export const expressionNames:Record<Expression,string>={calm:'편안함',welcome:'반가움',listen:'경청',encourage:'응원',joy:'기쁨',concern:'걱정',serious:'진지함'};

export function Character({expression='calm',giga=false,reduced=false,size=230}:{expression?:Expression;giga?:boolean;reduced?:boolean;size?:number}){
 const breath=useRef(new Animated.Value(0)).current;
 const [blink,setBlink]=useState(false);
 useActivityEffect(current=>{breath.setValue(0);setBlink(false);const loop=Animated.loop(Animated.sequence([Animated.timing(breath,{toValue:1,duration:motion.breath,useNativeDriver:Platform.OS!=='web'}),Animated.timing(breath,{toValue:0,duration:motion.breath,useNativeDriver:Platform.OS!=='web'})]));loop.start();let close:ReturnType<typeof setTimeout>|undefined;const timer=setInterval(()=>{if(!current())return;setBlink(true);close=setTimeout(()=>{if(current())setBlink(false);},150);},motion.blink);return()=>{loop.stop();clearInterval(timer);clearTimeout(close);breath.setValue(0);setBlink(false);};},[breath],!reduced);
 const happy=['joy','welcome','encourage'].includes(expression);
 const mouth=expression==='serious'?'M129 124 Q140 125 151 124':expression==='concern'?'M130 124 Q140 126 150 124':happy?'M127 121 Q140 134 153 121':'M129 122 Q140 129 151 122';
 const face=giga?'M98 62 C98 42 182 42 182 62 L182 99 C182 115 172 132 160 139 L140 145 L120 139 C108 132 98 115 98 99 Z':'M104 62 C104 42 176 42 176 62 L176 96 C176 119 162 139 140 142 C118 139 104 119 104 96 Z';
 return <View accessible accessibilityRole="image" accessibilityLabel={`${giga?'기가차드 모드, ':''}${expressionNames[expression]} 표정의 안내자`} style={{width:size,height:size*1.25,alignItems:'center',justifyContent:'center'}}>
  <Animated.View style={{width:size,height:size*1.25,backgroundColor:'#D4E5D9',borderRadius:16,transform:[{translateY:breath.interpolate({inputRange:[0,1],outputRange:[0,-1.5]})}]}}>
   <Image source={characterBody} accessible={false} resizeMode="contain" style={{position:'absolute',left:size*.1,top:size*(123/280),width:size*.8,height:size*.8}}/>
   <Svg width="100%" height="100%" viewBox="0 0 280 350" style={{position:'absolute',top:0,left:0,zIndex:1}}>
    <Ellipse cx={giga?98:103} cy="96" rx="6" ry="11" fill={color.skin}/><Ellipse cx={giga?182:177} cy="96" rx="6" ry="11" fill={color.skin}/>
    <Path d={face} fill={color.skin}/>
    <Path d="M103 91 C95 80 96 65 100 55 C104 39 116 29 132 29 C142 21 158 24 166 30 C184 33 191 47 190 62 C191 76 185 88 177 96 L172 76 C158 75 147 68 140 56 C135 72 122 79 108 80 Z" fill={color.hair}/>
    {expression==='concern'?<><Path d="M116 88 Q123 81 131 84" stroke={color.hair} strokeWidth="2.8" strokeLinecap="round" fill="none"/><Path d="M149 84 Q157 81 164 88" stroke={color.hair} strokeWidth="2.8" strokeLinecap="round" fill="none"/></>:<><Path d={giga?'M116 85 L132 84':'M117 86 Q124 83 131 85'} stroke={color.hair} strokeWidth={giga?3.5:2.8} strokeLinecap="round" fill="none"/><Path d={giga?'M148 84 L164 85':'M149 85 Q156 83 163 86'} stroke={color.hair} strokeWidth={giga?3.5:2.8} strokeLinecap="round" fill="none"/></>}
    {blink||expression==='joy'?<><Path d="M120 97 Q124 93 128 97" stroke={color.ink} strokeWidth="2.4" strokeLinecap="round" fill="none"/><Path d="M152 97 Q156 93 160 97" stroke={color.ink} strokeWidth="2.4" strokeLinecap="round" fill="none"/></>:<><Circle cx="124" cy="96" r="2.8" fill={color.ink}/><Circle cx="156" cy="96" r="2.8" fill={color.ink}/></>}
    <Path d="M140 103 L137 112 Q139 114 142 113" stroke={color.skinShade} strokeWidth="2.4" strokeLinecap="round" fill="none"/>
    <Path d={mouth} stroke={color.hair} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
   </Svg>
  </Animated.View>
 </View>;
}
