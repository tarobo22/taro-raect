import {OptionRail} from './OptionRail';
import React,{useEffect,useRef} from 'react';
import {Animated,AppState,Platform,Pressable,View,useWindowDimensions} from 'react-native';
import type {StyleProp,ViewStyle} from 'react-native';
import {Copy} from './UI';
import {TarotArt} from './TarotArt';
import {color} from '../design/tokens';
import {feedback} from '../services/feedback';
import {useActivityEffect} from '../features/motion/useActivityEffect';
import type {ExperienceConfig} from '../features/experience/model';

/** Decorative backs explain the selected spread without exposing or choosing real cards. */
function SpreadFan({count,reduced}:{count:number;reduced:boolean}){
  const entrance=useRef(new Animated.Value(1)).current;
  const drift=useRef(new Animated.Value(0)).current;
  useActivityEffect(()=>{
    entrance.setValue(0);drift.setValue(0);
    const opening=Animated.timing(entrance,{toValue:1,duration:320,useNativeDriver:Platform.OS!=='web'});
    const floating=Animated.loop(Animated.sequence([
      Animated.timing(drift,{toValue:1,duration:1500,useNativeDriver:Platform.OS!=='web'}),
      Animated.timing(drift,{toValue:0,duration:1500,useNativeDriver:Platform.OS!=='web'}),
    ]));
    opening.start();floating.start();
    return()=>{opening.stop();floating.stop();entrance.stopAnimation();drift.stopAnimation();entrance.setValue(1);drift.setValue(0);};
  },[count,entrance,drift],!reduced);
  const spacing=Math.min(22,48/Math.max(1,count-1));
  return <View testID="tarot-setup-fan" aria-hidden accessible={false} importantForAccessibility="no-hide-descendants" style={{width:100,height:96}}>
    {Array.from({length:count},(_,index)=>{
      const position=index-(count-1)/2,offset=position*spacing,angle=position*8;
      return <Animated.View key={index} testID="tarot-setup-card" style={{position:'absolute',left:28,top:5,
        opacity:reduced?1:entrance.interpolate({inputRange:[0,(index+1)/(count+2)*.38,1],outputRange:[0,0,1]}),
        transform:[
          {translateX:reduced?offset:entrance.interpolate({inputRange:[0,1],outputRange:[0,offset]})},
          {translateY:reduced?Math.abs(position)*2:Animated.add(entrance.interpolate({inputRange:[0,1],outputRange:[8,Math.abs(position)*2]}),drift.interpolate({inputRange:[0,1],outputRange:[0,-3]}))},
          {rotate:reduced?angle+'deg':entrance.interpolate({inputRange:[0,1],outputRange:['0deg',angle+'deg']})},
          {scale:reduced?1:entrance.interpolate({inputRange:[0,1],outputRange:[.9,1]})},
        ]}}><TarotArt back width={44}/></Animated.View>;
    })}
  </View>;
}

export function TarotSetupIntro({count,reduced}:{count:number;reduced:boolean}){
  const largeText=useWindowDimensions().fontScale>1.3;
  return <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
    <View style={{flex:1,gap:6}}>
      <Copy style={{fontSize:23,lineHeight:30,fontWeight:'700'}}>지금의 마음을,{`\n`}카드로 살펴봐요.</Copy>
      <Copy kind="small" muted>선택하고 바로 시작해요.</Copy>
    </View>
    {!largeText?<SpreadFan count={count} reduced={reduced}/>:null}
  </View>;
}

function SetupChoice({label,selected,reduced,onPress,style,children}:{label:string;selected:boolean;reduced:boolean;onPress:()=>void;style?:StyleProp<ViewStyle>;children:React.ReactNode}){
  const fill=useRef(new Animated.Value(selected?1:0)).current;
  const press=useRef(new Animated.Value(1)).current;
  const latest=useRef(selected?1:0),foreground=useRef(AppState.currentState==='active');latest.current=selected?1:0;
  const selection=useRef<Animated.CompositeAnimation|null>(null),touch=useRef<Animated.CompositeAnimation|null>(null);
  useActivityEffect(()=>{foreground.current=true;fill.setValue(latest.current);return()=>{
    foreground.current=false;selection.current?.stop();touch.current?.stop();fill.stopAnimation();press.stopAnimation();fill.setValue(latest.current);press.setValue(1);
  };},[fill,press]);
  useEffect(()=>{
    selection.current?.stop();
    if(reduced||!foreground.current)fill.setValue(selected?1:0);
    else{selection.current=Animated.timing(fill,{toValue:selected?1:0,duration:180,useNativeDriver:Platform.OS!=='web'});selection.current.start();}
    return()=>selection.current?.stop();
  },[fill,selected,reduced]);
  function animate(toValue:number){touch.current?.stop();if(reduced){press.setValue(1);return;}touch.current=Animated.timing(press,{toValue,duration:toValue===1?160:90,useNativeDriver:Platform.OS!=='web'});touch.current.start();}
  return <Animated.View style={[style,{transform:[{scale:reduced?1:press}]}]}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected}} aria-pressed={selected}
      onPressIn={()=>animate(.965)} onPressOut={()=>animate(1)} onPress={()=>{feedback('select');onPress();}}
      style={{minHeight:48,justifyContent:'center',alignItems:'center',paddingHorizontal:7,paddingVertical:9,borderRadius:14,borderWidth:1,borderColor:selected?color.action:color.line,backgroundColor:color.surface,overflow:'hidden'}}>
      <Animated.View pointerEvents="none" style={{position:'absolute',inset:0,backgroundColor:color.mint,opacity:reduced?(selected?1:0):fill}}/>
      {children}
    </Pressable>
  </Animated.View>;
}

export function CompactTopicPicker({options,value,onChange}:{options:string[];value:string;onChange:(value:string)=>void;reduced:boolean}){
 return <View style={{gap:8}}><Copy kind="small" style={{fontWeight:'600'}}>주제</Copy><OptionRail options={options} value={value} onChange={onChange} label="타로 주제"/></View>;
}

export function TarotDepthPicker({spreads,value,onChange,reduced}:{spreads:ExperienceConfig['spreads'];value:string;onChange:(value:string)=>void;reduced:boolean}){
  return <View style={{gap:8}}><Copy kind="small" style={{fontWeight:'600'}}>카드 장수</Copy>
    <View style={{flexDirection:'row',alignItems:'stretch',gap:6}}>{Object.entries(spreads).map(([id,spread])=><SetupChoice key={id} label={spread.positions.length+'장 · '+spread.name} selected={value===id} reduced={reduced} onPress={()=>onChange(id)} style={{flex:1}}>
      <Copy style={{fontSize:17,lineHeight:23,fontWeight:'600',color:value===id?color.action:color.ink}}>{spread.positions.length}장</Copy>
      <Copy kind="label" muted style={{textAlign:'center',marginTop:2}}>{spread.name}</Copy>
    </SetupChoice>)}</View>
  </View>;
}
