import React,{useEffect,useState} from 'react';
import {Modal,View} from 'react-native';
import {Button,Copy,Panel} from './UI';
import {SelectionDial} from './SelectionDial';
import {useStore} from '../state/store';
/** Exploring and cancelling never mutate the journal draft. Saving remains the form's own action. */
export function MoodDial({options,value,onConfirm,disabled=false}:{options:string[];value:string;onConfirm:(value:string)=>void;disabled?:boolean}){
 const {reduced}=useStore(),[preview,setPreview]=useState(value||options[0]||''),[pending,setPending]=useState<string|null>(null);
 useEffect(()=>{setPreview(options.includes(value)?value:options[0]||'');},[value,options]);
 return <View style={{gap:12}}><SelectionDial label="오늘의 마음" options={options} value={preview} disabled={disabled} onChange={setPreview}/><Copy kind="small" muted>{'현재 고른 마음: '+(value||'아직 고르지 않았어요.')}</Copy><Button secondary disabled={disabled||!options.includes(preview)} onPress={()=>setPending(preview)}>탐색한 마음 확인</Button><Modal transparent visible={pending!==null} animationType={reduced?'none':'fade'} onRequestClose={()=>setPending(null)}><View style={{flex:1,justifyContent:'flex-end',padding:24,backgroundColor:'rgba(32,44,36,.24)'}}><Panel style={{gap:16,maxWidth:430,width:'100%',alignSelf:'center'}}><Copy kind="subtitle">이 마음으로 남길까요?</Copy><Copy>{pending||''}</Copy><Copy kind="small" muted>마음만 선택하고 글은 그대로 두어요. 기록 저장은 화면의 저장 버튼을 누를 때 진행해요.</Copy><Button disabled={disabled||!pending||!options.includes(pending)} onPress={()=>{if(pending&&!disabled&&options.includes(pending)){onConfirm(pending);setPending(null);}}}>이 마음으로 선택</Button><Button secondary onPress={()=>setPending(null)}>마음 선택 취소</Button></Panel></View></Modal></View>;
}
