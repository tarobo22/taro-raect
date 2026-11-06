import React,{useState} from 'react';
import {View} from 'react-native';
import {Button} from './UI';
import {RotarySurface} from './RotarySurface';
import {OptionRail} from './OptionRail';
import {StepProgress} from './StepProgress';
import {useStore} from '../state/store';
export function CardSlotDial({slots,selected,onToggle,disabled=false,version}:{slots:{id:string;index:number}[];selected:string[];onToggle:(id:string)=>void;disabled?:boolean;version?:number}){
 const {reduced}=useStore(),[focus,setFocus]=useState(0),index=Math.min(focus,Math.max(0,slots.length-1)),slot=slots[index],isSelected=!!slot&&selected.includes(slot.id);
 return <View style={{gap:8}}>
  <StepProgress value={selected.length} total={3} label="고른 카드" reduced={reduced} labels={selected.map(id=>(slots.find(item=>item.id===id)?.index||'')+'번 · ×')} onClear={i=>{if(!disabled&&selected[i])onToggle(selected[i]);}}/>
  <RotarySurface cards={slots.map(item=>item.id)} selected={selected} version={version} options={slots.map(item=>item.index+'번째 카드')} index={index} onChange={setFocus} label="지금 마음이 가는 카드" circular disabled={disabled} reduced={reduced}/>
  <OptionRail label="카드 번호로 탐색" options={slots.map(item=>String(item.index))} value={slot?String(slot.index):''} onChange={value=>setFocus(slots.findIndex(item=>String(item.index)===value))} disabled={disabled} quiet/>
  <Button secondary={isSelected} disabled={disabled||!slot||selected.length>=3&&!isSelected} onPress={()=>{if(slot)onToggle(slot.id);}}>{isSelected?'고른 카드에서 빼기':selected.length===3?'세 장을 모두 골랐어요':(slot?.index||1)+'번째 카드 고르기'}</Button>
 </View>;
}
