import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {experienceRepository,journalRepository} from '../composition';
import type {Tone} from '../domain/content';
import type {JournalEntry,JournalPolicy} from '../features/journal/model';
import type {ExperienceConfig,Reading,Counsel} from '../features/experience/model';
import {configureFeedback,SensoryPreferences} from '../services/feedback';
export type Entry=JournalEntry;
export type {Reading,Counsel} from '../features/experience/model';
interface State{
 journalPolicy:JournalPolicy|null;config:ExperienceConfig|null;entries:Entry[];readings:Reading[];counsels:Counsel[];
 loading:boolean;error:string;refresh:()=>Promise<void>;tone:Tone;setTone:(v:Tone)=>void;
 reduced:boolean;setReduced:(v:boolean)=>void;draft:string;setDraft:(v:string)=>void;
 sensory:SensoryPreferences;setSensory:(v:SensoryPreferences)=>void;
}
const Context=createContext<State|null>(null);
export function Store({children}:{children:React.ReactNode}){
 const [entries,setEntries]=useState<Entry[]>([]),[readings,setReadings]=useState<Reading[]>([]),[counsels,setCounsels]=useState<Counsel[]>([]);
 const [journalPolicy,setJournalPolicy]=useState<JournalPolicy|null>(null),[config,setConfig]=useState<ExperienceConfig|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[tone,setToneState]=useState<Tone>('warm');
 const [reduced,setReducedState]=useState(false),[draft,setDraftState]=useState('');
 const [sensory,setSensoryState]=useState<SensoryPreferences>({sound:true,haptics:true,music:false});
 const generation=useRef(0);
 async function refresh(){
  const request=++generation.current;setLoading(true);
  try{
   const [e,r,c,p,settings]=await Promise.all([journalRepository.list(),experienceRepository.readings(),experienceRepository.counsels(),journalRepository.policy(),experienceRepository.config()]);
   if(request!==generation.current)return;
   setEntries(e);setReadings(r);setCounsels(c);setJournalPolicy(p);setConfig(settings);setError('');
  }catch(e){if(request===generation.current)setError(e instanceof Error?e.message:'기록을 불러오지 못했어요.');}
  finally{if(request===generation.current)setLoading(false);}
 }
 useEffect(()=>{
  AsyncStorage.multiGet(['yeoun.tone','yeoun.reduced','yeoun.draft','yeoun.sensory']).then(pairs=>{
   for(const [key,value] of pairs){
    if(key==='yeoun.tone'&&value==='giga')setToneState('giga');
    if(key==='yeoun.reduced')setReducedState(value==='true');
    if(key==='yeoun.draft'&&value)setDraftState(value);
    if(key==='yeoun.sensory'&&value)try{const v=JSON.parse(value);setSensoryState({sound:v.sound!==false,haptics:v.haptics!==false,music:v.music===true});}catch{}
   }
  }).catch(()=>{});refresh();
 },[]);
 useEffect(()=>configureFeedback(sensory),[sensory]);
 const setTone=(v:Tone)=>{setToneState(v);AsyncStorage.setItem('yeoun.tone',v).catch(()=>{});};
 const setReduced=(v:boolean)=>{setReducedState(v);AsyncStorage.setItem('yeoun.reduced',String(v)).catch(()=>{});};
 const setDraft=(v:string)=>{setDraftState(v);AsyncStorage.setItem('yeoun.draft',v).catch(()=>{});};
 const setSensory=(v:SensoryPreferences)=>{configureFeedback(v);setSensoryState(v);AsyncStorage.setItem('yeoun.sensory',JSON.stringify(v)).catch(()=>{});};
 return <Context.Provider value={{entries,readings,counsels,journalPolicy,config,loading,error,refresh,tone,setTone,reduced,setReduced,draft,setDraft,sensory,setSensory}}>{children}</Context.Provider>;
}
export function useStore(){const value=useContext(Context);if(!value)throw new Error('Store provider is required');return value;}
