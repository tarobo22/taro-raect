import React,{useState} from 'react';
import {View} from 'react-native';
import {Button,Copy} from './UI';
import {SelectionDial} from './SelectionDial';
/** Focus is local exploration. Only the separate CTA delegates an existing server slot ID. */
export function CardSlotDial({slots,selected,onToggle,disabled=false}:{slots:{id:string;index:number}[];selected:string[];onToggle:(id:string)=>void;disabled?:boolean}){
 const [focus,setFocus]=useState(slots[0]?.id||''),slot=slots.find(item=>item.id===focus)||slots[0],isSelected=!!slot&&selected.includes(slot.id);
 return <View style={{gap:12}}><SelectionDial label="카드 슬롯 탐색" options={slots.map(item=>item.index+'번째 카드')} value={slot?slot.index+'번째 카드':''} disabled={disabled} onChange={label=>{const next=slots.find(item=>item.index+'번째 카드'===label);if(next)setFocus(next.id);}}/><Copy kind="small" muted>{slot?(isSelected?'고른 순서 '+(selected.indexOf(slot.id)+1)+'번째 카드예요.':'탐색 중이에요. 선택 버튼을 누르면 고른 카드에 더해져요.'):'탐색할 슬롯이 없어요.'}</Copy><Button secondary disabled={disabled||!slot||selected.length>=3&&!isSelected} onPress={()=>{if(slot)onToggle(slot.id);}}>{isSelected?'이 슬롯 선택 해제':'이 슬롯 선택'}</Button></View>;
}
