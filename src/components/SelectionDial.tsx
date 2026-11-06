import React from 'react';
import {RotarySurface} from './RotarySurface';
import {useStore} from '../state/store';
export function SelectionDial({options,value,onChange,label,circular=false,disabled=false}:{options:string[];value:string;onChange:(value:string)=>void;label:string;circular?:boolean;disabled?:boolean}){
 const {reduced}=useStore();
 return <RotarySurface options={options} index={Math.max(0,options.indexOf(value))} onChange={index=>{if(options[index])onChange(options[index]);}} label={label} circular={circular} disabled={disabled} reduced={reduced}/>;
}
