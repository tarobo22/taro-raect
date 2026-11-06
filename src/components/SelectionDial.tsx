import React,{useEffect,useMemo,useRef} from 'react';
import {PanResponder,Platform,Pressable,View,useWindowDimensions} from 'react-native';
import Svg,{Circle,Path} from 'react-native-svg';
import {Copy} from './UI';
import {color} from '../design/tokens';
import {feedback} from '../services/feedback';
import {beginDialDrag,dialAngle,dialIndex,dialKeyIndex,moveDialDrag} from '../features/motion/dial';
import type {DialDrag} from '../features/motion/dial';

export function SelectionDial({options,value,onChange,label,circular=false,disabled=false}:{options:string[];value:string;onChange:(value:string)=>void;label:string;circular?:boolean;disabled?:boolean}){
  const surface=useRef<View>(null),origin=useRef({x:0,y:0}),drag=useRef<DialDrag|null>(null),gesture=useRef(0),current=useRef({options,value,onChange,circular,disabled});
  current.current={options,value,onChange,circular,disabled};
  const index=Math.max(0,options.indexOf(value));
  const largeText=useWindowDimensions().fontScale>1.3;
  function choose(next:number){const state=current.current;if(!state.options.length||state.disabled)return;const count=state.options.length,target=state.circular?(next+count)%count:Math.max(0,Math.min(count-1,next)),option=state.options[target];if(option!==state.value){current.current.value=option;feedback('tick');state.onChange(option);}}
  const chooseRef=useRef(choose);chooseRef.current=choose;
  useEffect(()=>()=>{gesture.current++;drag.current=null;},[]);
  const pan=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponder:(_,g)=>!current.current.disabled&&Math.abs(g.dx)>8&&Math.abs(g.dx)>Math.abs(g.dy)*1.2,
    onPanResponderGrant:(_,g)=>{const sequence=++gesture.current,x0=g.x0,y0=g.y0;surface.current?.measureInWindow((x,y)=>{if(sequence!==gesture.current||current.current.disabled)return;origin.current={x:x+72,y:y+72};const dx=x0-origin.current.x,dy=y0-origin.current.y,state=current.current;drag.current=beginDialDrag(Math.max(0,state.options.indexOf(state.value)),state.options.length,Math.atan2(dx,-dy)*180/Math.PI,Math.hypot(dx,dy)>36,state.circular);chooseRef.current(dialIndex(drag.current.position,state.options.length,state.circular));});},
    onPanResponderMove:(_,g)=>{if(!drag.current)return;const state=current.current,angle=Math.atan2(g.moveX-origin.current.x,-(g.moveY-origin.current.y))*180/Math.PI;drag.current=moveDialDrag(drag.current,angle,state.circular);chooseRef.current(dialIndex(drag.current.position,state.options.length,state.circular));},
    onPanResponderRelease:()=>{gesture.current++;drag.current=null;},
    onPanResponderTerminate:()=>{gesture.current++;drag.current=null;},
    onPanResponderTerminationRequest:(_,g)=>Math.abs(g.dx)<=Math.abs(g.dy)*1.2,
  }),[]);
  const keyboard=Platform.OS==='web'?{onKeyDown:(event:{nativeEvent:{key?:string};preventDefault:()=>void})=>{const next=dialKeyIndex(event.nativeEvent.key||'',index,options.length,circular);if(next!==null){event.preventDefault();choose(next);}}}:{};
  const previousDisabled=disabled||!options.length||!circular&&index===0,nextDisabled=disabled||!options.length||!circular&&index===options.length-1;
  return <View style={{alignItems:'center',gap:10}}><View style={{flexDirection:'row',alignItems:'center',gap:22}}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 이전`} accessibilityState={{disabled:previousDisabled}} disabled={previousDisabled} onPress={()=>choose(index-1)} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',opacity:previousDisabled?.45:1}}><Copy style={{fontSize:24}}>−</Copy></Pressable>
    <View ref={surface} {...pan.panHandlers} {...keyboard} accessible focusable accessibilityRole="adjustable" accessibilityLabel={label} accessibilityState={{disabled}} accessibilityValue={{min:0,max:Math.max(0,options.length-1),now:index,text:value+', '+(options.length?index+1:0)+' / '+options.length}} aria-valuemin={0} aria-valuemax={Math.max(0,options.length-1)} aria-valuenow={index} aria-valuetext={value+', '+(options.length?index+1:0)+' / '+options.length}
      accessibilityActions={[{name:'increment',label:'다음'},{name:'decrement',label:'이전'}]} onAccessibilityAction={e=>choose(index+(e.nativeEvent.actionName==='increment'?1:-1))}
      style={{width:144,height:144,alignItems:'center',justifyContent:'center',...(Platform.OS==='web'?{touchAction:'pan-y' as const}:{})}}>
      <View pointerEvents="none" style={{position:'absolute',inset:0}}><Svg width={144} height={144} viewBox="0 0 144 144">{circular?<Circle cx="72" cy="72" r="63" stroke={color.line} strokeWidth="3" fill="none"/>:<Path d="M 27.45 116.55 A 63 63 0 1 1 116.55 116.55" stroke={color.line} strokeWidth="3" fill="none"/>}{options.map((_,i)=>{const a=dialAngle(i,options.length,circular)*Math.PI/180;return <Circle key={i} cx={72+Math.sin(a)*63} cy={72-Math.cos(a)*63} r={i===index?6:3} fill={i===index?color.action:color.mintDeep}/>;})}<Circle cx="72" cy="72" r="50" fill={color.sage}/></Svg></View>
      <View pointerEvents="none" style={{maxWidth:90,alignItems:'center'}}>{largeText?<Copy kind="subtitle" style={{textAlign:'center'}}>{(options.length?index+1:0)+' / '+options.length}</Copy>:<><Copy kind="label" muted>지금의 선택</Copy><Copy kind="subtitle" style={{textAlign:'center',marginTop:7}}>{value||'천천히'}</Copy></>}</View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 다음`} accessibilityState={{disabled:nextDisabled}} disabled={nextDisabled} onPress={()=>choose(index+1)} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',opacity:nextDisabled?.45:1}}><Copy style={{fontSize:24}}>＋</Copy></Pressable>
  </View>{largeText?<View style={{alignSelf:'stretch',alignItems:'center',gap:6}}><Copy kind="label" muted>{label}</Copy><Copy kind="subtitle" style={{textAlign:'center'}}>{value||'천천히'}</Copy></View>:<Copy kind="small" muted>{(options.length?index+1:0)+' / '+options.length}</Copy>}<Copy kind="small" muted>다이얼을 돌리거나 양옆을 눌러 보세요.</Copy></View>;
}
