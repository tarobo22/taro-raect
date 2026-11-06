import React,{useEffect,useRef} from 'react';
import {Animated,AppState,Platform} from 'react-native';
import {useActivityEffect} from '../features/motion/useActivityEffect';

/** Motion decorates the existing choice; it never owns a card ID, check, or selection command. */
export function TarotSelectionMotion({selected,reduced,slotIndex,children}:{selected:boolean;reduced:boolean;slotIndex:number;children:React.ReactNode}){
 const target=selected?-4:0,offset=useRef(new Animated.Value(target)).current,last=useRef(target),latest=useRef(target),foreground=useRef(AppState.currentState==='active'),animation=useRef<Animated.CompositeAnimation|null>(null);latest.current=target;
 useActivityEffect(()=>{foreground.current=true;offset.setValue(latest.current);return()=>{foreground.current=false;animation.current?.stop();offset.stopAnimation();offset.setValue(latest.current);};},[offset]);
 useEffect(()=>{const changed=last.current!==target;last.current=target;animation.current?.stop();offset.stopAnimation();if(reduced||!foreground.current||!changed)offset.setValue(target);else{animation.current=Animated.timing(offset,{toValue:target,duration:180,useNativeDriver:Platform.OS!=='web'});animation.current.start();}return()=>{animation.current?.stop();offset.stopAnimation();};},[offset,target,reduced]);
 return <Animated.View testID={'tarot-slot-motion-'+slotIndex} style={{transform:[{translateY:reduced?target:offset}]}}>{children}</Animated.View>;
}

/** A new server draft version is the only trigger. First mount and foreground reentry stay settled. */
export function TarotShuffleMotion({version,reduced,children}:{version:number;reduced:boolean;children:React.ReactNode}){
 const opacity=useRef(new Animated.Value(1)).current,last=useRef(version),foreground=useRef(AppState.currentState==='active'),animation=useRef<Animated.CompositeAnimation|null>(null);
 useActivityEffect(()=>{foreground.current=true;opacity.setValue(1);return()=>{foreground.current=false;animation.current?.stop();opacity.stopAnimation();opacity.setValue(1);};},[opacity]);
 useEffect(()=>{const changed=last.current!==version;last.current=version;animation.current?.stop();opacity.stopAnimation();if(reduced||!foreground.current||!changed)opacity.setValue(1);else{opacity.setValue(.55);animation.current=Animated.timing(opacity,{toValue:1,duration:180,useNativeDriver:Platform.OS!=='web'});animation.current.start();}return()=>{animation.current?.stop();opacity.stopAnimation();};},[opacity,version,reduced]);
 return <Animated.View testID="tarot-shuffle-motion" style={{opacity:reduced?1:opacity}}>{children}</Animated.View>;
}
