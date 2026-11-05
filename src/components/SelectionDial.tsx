import React,{useMemo,useRef} from 'react';
import {PanResponder,Pressable,View} from 'react-native';
import Svg,{Circle,Path} from 'react-native-svg';
import {Copy} from './UI';
import {color} from '../design/tokens';
import {feedback} from '../services/feedback';

export function SelectionDial({options,value,onChange,label}:{options:string[];value:string;onChange:(value:string)=>void;label:string}){
  const surface=useRef<View>(null),origin=useRef({x:0,y:0}),current=useRef({options,value,onChange});
  current.current={options,value,onChange};
  const index=Math.max(0,options.indexOf(value));
  function choose(next:number){const state=current.current;if(!state.options.length)return;const option=state.options[(next+state.options.length)%state.options.length];if(option!==state.value){feedback('tick');state.onChange(option);}}
  const chooseRef=useRef(choose);chooseRef.current=choose;
  const pan=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,
    onPanResponderGrant:()=>surface.current?.measureInWindow((x,y)=>{origin.current={x:x+72,y:y+72};}),
    onPanResponderMove:(_,g)=>{const angle=(Math.atan2(g.moveY-origin.current.y,g.moveX-origin.current.x)+Math.PI/2+Math.PI*2)%(Math.PI*2);chooseRef.current(Math.round(angle/(Math.PI*2)*current.current.options.length));},
  }),[]);
  return <View style={{alignItems:'center',gap:10}}><View style={{flexDirection:'row',alignItems:'center',gap:22}}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 이전`} onPress={()=>choose(index-1)} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'}}><Copy style={{fontSize:24}}>−</Copy></Pressable>
    <View ref={surface} {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{min:0,max:Math.max(0,options.length-1),now:index,text:value}}
      accessibilityActions={[{name:'increment',label:'다음'},{name:'decrement',label:'이전'}]} onAccessibilityAction={e=>choose(index+(e.nativeEvent.actionName==='increment'?1:-1))}
      style={{width:144,height:144,alignItems:'center',justifyContent:'center'}}>
      <View pointerEvents="none" style={{position:'absolute',inset:0}}><Svg width={144} height={144} viewBox="0 0 144 144"><Circle cx="72" cy="72" r="63" stroke={color.line} strokeWidth="3" fill="none"/>{options.map((_,i)=>{const a=i/options.length*Math.PI*2-Math.PI/2;return <Circle key={i} cx={72+Math.cos(a)*63} cy={72+Math.sin(a)*63} r={i===index?6:3} fill={i===index?color.action:color.mintDeep}/>;})}<Circle cx="72" cy="72" r="50" fill={color.sage}/></Svg></View>
      <View pointerEvents="none" style={{maxWidth:90,alignItems:'center'}}><Copy kind="label" muted>지금의 선택</Copy><Copy kind="subtitle" style={{textAlign:'center',marginTop:7}}>{value||'천천히'}</Copy></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 다음`} onPress={()=>choose(index+1)} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'}}><Copy style={{fontSize:24}}>＋</Copy></Pressable>
  </View><Copy kind="small" muted>다이얼을 돌리거나 양옆을 눌러 보세요.</Copy></View>;
}
