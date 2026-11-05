import React,{useEffect,useRef,useState} from 'react';
import {Pressable,View} from 'react-native';
import {startVoice} from '../services/voice';
import {Icon} from './Icon';
import {Copy,s} from './UI';
import {useStore} from '../state/store';
import {color} from '../design/tokens';
export function VoiceButton({value,onText,onStatus,onCloud}:{value:string;onText:(s:string)=>void;onStatus:(s:string)=>void;onCloud?:()=>void}){const {voiceMode}=useStore();const [listening,setListening]=useState(false);const stop=useRef<(()=>void)|null>(null);useEffect(()=>()=>stop.current?.(),[]);async function press(){if(voiceMode==='cloud'){if(onCloud)onCloud();else onStatus('이 입력에서는 기기 음성 입력이나 글 입력을 이용해 주세요.');return;}if(listening){stop.current?.();stop.current=null;setListening(false);onStatus('입력한 내용을 확인해 주세요.');return;}try{const prefix=value.trim();stop.current=await startVoice(v=>onText(prefix?`${prefix} ${v}`:v),v=>{onStatus(v);setListening(v.startsWith('듣고'));});}catch{setListening(false);onStatus('음성을 옮기지 못했어요. 글로 이어갈 수 있어요.');}}return <Pressable accessibilityRole="button" accessibilityLabel={voiceMode==='cloud'?'클라우드 음성으로 입력하기':listening?'음성 입력 멈추기':'음성으로 입력하기'} onPress={press} style={[s.row,{minHeight:48,paddingHorizontal:12,borderRadius:14,backgroundColor:listening?color.pink:color.sage,gap:7}]}><Icon name={listening?'close':'mic'} size={20}/><Copy kind="small" style={{fontWeight:'600'}}>{voiceMode==='cloud'?'음성 파일 선택':listening?'멈추기':'음성 입력'}</Copy></Pressable>;}
