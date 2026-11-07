import React,{useEffect,useId,useRef,useState} from 'react';
import {Animated,Platform,View} from 'react-native';
import Svg,{Path,Circle,Ellipse,Defs,ClipPath,Image as SvgImage} from 'react-native-svg';
import {motion} from '../design/tokens';
import {useActivityEffect} from '../features/motion/useActivityEffect';
import {useSkin} from '../features/skins/SkinProvider';
import {geometry,Pose,skins} from '../features/skins/catalog';
import {SkinId} from '../features/skins/SkinSelection';
import {skinAssets} from '../features/skins/skinAssets';
import expressions from '../../assets/skins/expressions.json';
export type Expression=keyof typeof expressions;
export const expressionNames:Record<Expression,string>={calm:'편안함',welcome:'반가움',listen:'경청',encourage:'응원',joy:'기쁨',concern:'걱정',serious:'진지함'};
type Visual={id:SkinId;pose:Pose};
const poseFor=(expression:Expression):Pose=>expression==='welcome'||expression==='joy'?'greeting':expression==='encourage'?'explain':'rest';
function Artwork({visual,expression,blink,giga}:{visual:Visual;expression:Expression;blink:boolean;giga:boolean}){
 const {id,pose}=visual,info=geometry[id].poses[pose],clipId=useId().replace(/:/g,''),[x,y,w,h]=info.rect;
 const closed=blink||expression==='joy',cat=id==='playroom',hair=id==='clinic'?'#57554D':'#645246';
 return <Svg width="100%" height="100%" viewBox="0 0 280 350">
  <Defs><ClipPath id={clipId}><Path d={info.outline} fillRule="evenodd" transform={'translate('+x+' '+y+') scale('+info.scale+')'}/></ClipPath></Defs>
  {cat?<Path d="M205 314 C264 316 263 261 250 249 C236 237 226 252 237 264 C246 277 236 293 216 289" fill="none" stroke="#F3DAB6" strokeWidth="17" strokeLinecap="round"/>:null}
  <SvgImage href={skinAssets[id][pose]} x={x} y={y} width={w} height={h} clipPath={'url(#'+clipId+')'}/>
  {cat?<Svg x={info.face[0]-50} y={info.face[1]-35} width={100} height={80} viewBox="-50 -35 100 80">
   {expression==='concern'?<Path d="M-24 -12 L-11 -16 M11 -16 L24 -12" fill="none" stroke="#88775F" strokeWidth={2} strokeLinecap="round"/>:null}
   {closed?<Path d="M-23 0 Q-17 -6 -11 0 M11 0 Q17 -6 23 0" stroke="#514B42" strokeWidth={2.8} fill="none" strokeLinecap="round"/>:<><Circle cx={-17} cy={0} r={3.5} fill="#514B42"/><Circle cx={17} cy={0} r={3.5} fill="#514B42"/></>}
   <Path d="M-4 9 Q0 6 4 9 L0 12 Z" fill="#D8A28E"/><Path d={expressions[expression].catMouth} fill="none" stroke="#514B42" strokeWidth={2.2} strokeLinecap="round"/>
  </Svg>:<>
   <Ellipse cx={103} cy={96} rx={6} ry={11} fill={info.faceColor}/><Ellipse cx={177} cy={96} rx={6} ry={11} fill={info.faceColor}/>
   <Path d={giga?'M100 62 C100 42 180 42 180 62 L180 99 C180 119 160 141 140 145 C120 141 100 119 100 99 Z':'M104 62 C104 42 176 42 176 62 L176 96 C176 119 162 139 140 142 C118 139 104 119 104 96 Z'} fill={info.faceColor}/>
   <Path d={id==='clinic'?'M101 91 L100 70 C99 47 113 31 136 30 C162 26 181 40 183 61 L180 94 L173 80 L170 60 C156 65 139 65 125 57 C121 72 114 79 106 80 Z':'M103 91 C95 80 96 65 100 55 C104 39 116 29 132 29 C142 21 158 24 166 30 C184 33 191 47 190 62 C191 76 185 88 177 96 L172 76 C158 75 147 68 140 56 C135 72 122 79 108 80 Z'} fill={hair}/>
   <Path d={expression==='concern'?'M116 88 Q123 81 131 84 M149 84 Q157 81 164 88':giga?'M116 85 L132 84 M148 84 L164 85':'M117 86 Q124 83 131 85 M149 85 Q156 83 163 86'} stroke={hair} strokeWidth={giga?3.2:2.8} fill="none" strokeLinecap="round"/>
   {closed?<Path d="M120 97 Q124 93 128 97 M152 97 Q156 93 160 97" fill="none" stroke="#303F3A" strokeWidth={2.4} strokeLinecap="round"/>:<><Circle cx={124} cy={96} r={2.8} fill="#303F3A"/><Circle cx={156} cy={96} r={2.8} fill="#303F3A"/></>}
   <Path d="M140 103 L137 112 Q139 114 142 113" stroke="#DFA580" strokeWidth={2.4} strokeLinecap="round" fill="none"/>
   <Path d={expressions[expression].mouth} stroke={hair} strokeWidth={2.5} strokeLinecap="round" fill="none"/>
  </>}
 </Svg>;
}
export function Character({expression='calm',giga=false,reduced=false,size=230,framed=true,skinId,pose}:{expression?:Expression;giga?:boolean;reduced?:boolean;size?:number;framed?:boolean;skinId?:SkinId;pose?:Pose}){
 const skin=useSkin(),id=skinId??skin.id,targetPose=pose??poseFor(expression),visual={id,pose:targetPose};
 const previous=useRef<Visual>(visual),[under,setUnder]=useState<Visual|null>(null);
 const fade=useRef(new Animated.Value(1)).current,breath=useRef(new Animated.Value(0)).current,[blink,setBlink]=useState(false);
 useEffect(()=>{
  if(reduced){fade.stopAnimation();fade.setValue(1);setUnder(null);previous.current={id,pose:targetPose};return;}
  if(previous.current.id===id&&previous.current.pose===targetPose)return;
  fade.stopAnimation();setUnder(reduced?null:previous.current);previous.current={id,pose:targetPose};fade.setValue(reduced?1:0);
  const animation=Animated.timing(fade,{toValue:1,duration:220,useNativeDriver:Platform.OS!=='web'});animation.start(({finished})=>{if(finished)setUnder(null);});return()=>animation.stop();
 },[id,targetPose,reduced,fade]);
 useActivityEffect(current=>{
  const loop=Animated.loop(Animated.sequence([Animated.timing(breath,{toValue:1,duration:motion.breath,useNativeDriver:Platform.OS!=='web'}),Animated.timing(breath,{toValue:0,duration:motion.breath,useNativeDriver:Platform.OS!=='web'})]));loop.start();
  let close:ReturnType<typeof setTimeout>|undefined;const timer=setInterval(()=>{if(!current())return;setBlink(true);close=setTimeout(()=>{if(current())setBlink(false);},150);},motion.blink);
  return()=>{loop.stop();clearInterval(timer);clearTimeout(close);breath.setValue(0);setBlink(false);};
 },[breath],!reduced);
 return <View accessible accessibilityRole="image" accessibilityLabel={skins[id].name+', '+(giga?'기가차드 모드, ':'')+expressionNames[expression]+' 표정'} style={{width:size,height:size*1.25}}>
  <Animated.View style={{width:'100%',height:'100%',backgroundColor:framed?skins[id].accent:'transparent',borderRadius:22,transform:[{translateY:breath.interpolate({inputRange:[0,1],outputRange:[0,-1.5]})}]}}>
   {under?<View style={{position:'absolute',inset:0}}><Artwork visual={under} expression={expression} blink={blink} giga={giga}/></View>:null}
   <Animated.View style={{position:'absolute',inset:0,opacity:fade}}><Artwork visual={visual} expression={expression} blink={blink} giga={giga}/></Animated.View>
  </Animated.View>
 </View>;
}


