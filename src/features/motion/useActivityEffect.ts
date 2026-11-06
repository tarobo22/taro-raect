import {DependencyList,useEffect} from 'react';
import {AppState} from 'react-native';
import {ActivityEffect} from './ActivityEffect';

export function useActivityEffect(start:(current:()=>boolean)=>()=>void,dependencies:DependencyList,enabled=true){
 useEffect(()=>{
  const activity=new ActivityEffect(start,AppState.currentState==='active',enabled);
  const subscription=AppState.addEventListener('change',state=>activity.setForeground(state==='active'));
  return()=>{subscription.remove();activity.dispose();};
 },[...dependencies,enabled]);
}
