import React,{useEffect,useState} from 'react';
import {Pressable,View} from 'react-native';
import {Button,Copy} from './UI';
import {SelectionDial} from './SelectionDial';
import {OptionRail} from './OptionRail';
import {BottomSheet} from './BottomSheet';
import {color} from '../design/tokens';
import {feedback} from '../services/feedback';
export function MoodDial({options,value,onConfirm,disabled=false}:{options:string[];value:string;onConfirm:(value:string)=>void;disabled?:boolean}){
 const [preview,setPreview]=useState(value||options[0]||''),[pending,setPending]=useState<string|null>(null);
 useEffect(()=>{setPreview(options.includes(value)?value:options[0]||'');},[value,options]);
 return <View style={{gap:8}}><SelectionDial label="지금 내 마음" options={options} value={preview} disabled={disabled} onChange={setPreview}/>
  <OptionRail options={options} value={preview} onChange={setPreview} label="마음 한 줄 선택" disabled={disabled} quiet/>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Copy kind="small" muted>{value?'기록할 마음 · '+value:'아직 기록할 마음을 정하지 않았어요'}</Copy><Pressable accessibilityRole="button" accessibilityLabel="탐색한 마음 확인" disabled={disabled||!options.includes(preview)} onPress={()=>setPending(preview)} style={{minWidth:64,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:16,backgroundColor:color.mint,paddingHorizontal:14}}><Copy kind="small" style={{color:color.action,fontWeight:'600'}}>선택</Copy></Pressable></View>
  <BottomSheet label="마음 선택 확인" visible={pending!==null} onClose={()=>setPending(null)}><Copy kind="subtitle">{pending||''}</Copy><Copy kind="small" muted>이 마음으로 남길까요? 글은 그대로 두고, 저장은 나중에 해요.</Copy><Button disabled={disabled||!pending||!options.includes(pending)} onPress={()=>{if(pending&&!disabled&&options.includes(pending)){feedback('confirm');onConfirm(pending);setPending(null);}}}>이 마음으로 선택</Button><Button secondary onPress={()=>setPending(null)}>마음 선택 취소</Button></BottomSheet>
 </View>;
}
