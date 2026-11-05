import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {experienceRepository,journalRepository,p0Repository,session} from '../composition';
import type {Bootstrap,Consent,DataReceipt,Preferences,PreferencePatch} from '../features/p0/model';
import {PreferencesWriter} from '../features/p0/PreferencesWriter';
import {eraseCurrentDeviceData} from '../features/p0/eraseCurrentDeviceData';
import type {Tone} from '../domain/content';
import type {JournalEntry,JournalPolicy} from '../features/journal/model';
import type {ExperienceConfig,Reading,Counsel} from '../features/experience/model';
import {configureFeedback,SensoryPreferences} from '../services/feedback';
import {DashboardLoader} from '../features/dashboard/DashboardLoader';
export type Entry=JournalEntry;
export type {Reading,Counsel} from '../features/experience/model';
interface State{
 sessionState:'checking'|'welcome'|'ready'|'blocked';sessionError:string;bootstrap:Bootstrap|null;connect:()=>Promise<void>;recover:()=>Promise<void>;reloadConsents:()=>Promise<void>;consents:Consent[];
 selectedDeck:string;setSelectedDeck:(id:string)=>void;contextIds:string[];setContextIds:(ids:string[])=>void;
 voiceMode:'device'|'cloud';setVoiceMode:(mode:'device'|'cloud')=>void;preferenceBusy:boolean;preferenceError:string;retryPreferences:()=>Promise<void>;
 completeErasure:(receipt:DataReceipt)=>Promise<void>;
 journalPolicy:JournalPolicy|null;config:ExperienceConfig|null;entries:Entry[];readings:Reading[];counsels:Counsel[];
 loading:boolean;error:string;refresh:()=>Promise<void>;tone:Tone;setTone:(v:Tone)=>void;
 reduced:boolean;setReduced:(v:boolean)=>void;draft:string;setDraft:(v:string)=>void;
 sensory:SensoryPreferences;setSensory:(v:SensoryPreferences)=>void;
}
const Context=createContext<State|null>(null);
export function Store({children}:{children:React.ReactNode}){
 const [sessionState,setSessionState]=useState<State['sessionState']>('checking'),[sessionError,setSessionError]=useState(''),[bootstrap,setBootstrap]=useState<Bootstrap|null>(null),[consents,setConsents]=useState<Consent[]>([]);
 const [selectedDeck,setSelectedDeckState]=useState(''),[contextIds,setContextIds]=useState<string[]>([]);
 const [entries,setEntries]=useState<Entry[]>([]),[readings,setReadings]=useState<Reading[]>([]),[counsels,setCounsels]=useState<Counsel[]>([]);
 const [journalPolicy,setJournalPolicy]=useState<JournalPolicy|null>(null),[config,setConfig]=useState<ExperienceConfig|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[tone,setToneState]=useState<Tone>('warm');
 const [reduced,setReducedState]=useState(false),[draft,setDraftState]=useState('');
 const [sensory,setSensoryState]=useState<SensoryPreferences>({sound:true,haptics:true,music:false});
 const [voiceMode,setVoiceModeState]=useState<'device'|'cloud'>('device'),[preferenceBusy,setPreferenceBusy]=useState(false),[preferenceError,setPreferenceError]=useState('');
 const preferenceWriter=useMemo(()=>new PreferencesWriter(p0Repository),[]),preferenceRevision=useRef(0),bootstrapReady=useRef(false),failedPreference=useRef<PreferencePatch|null>(null);
 function applyPreferences(value:Preferences){setToneState(value.tone);setReducedState(value.reduced_motion);setVoiceModeState(value.voice_mode);void AsyncStorage.multiSet([['yeoun.tone',value.tone],['yeoun.reduced',String(value.reduced_motion)],['yeoun.voice-mode',value.voice_mode]]).catch(()=>setPreferenceError('설정은 서버에 저장됐지만 기기 보관에 실패했어요.'));}
 async function savePreferences(patch:PreferencePatch){const revision=++preferenceRevision.current;setPreferenceBusy(true);setPreferenceError('');failedPreference.current=patch;if(patch.tone)setToneState(patch.tone);if(patch.reduced_motion!==undefined)setReducedState(patch.reduced_motion);if(patch.voice_mode)setVoiceModeState(patch.voice_mode);try{const saved=await preferenceWriter.change(patch);if(saved){applyPreferences(saved.preferences);setBootstrap(value=>value?{...value,user:saved}:value);failedPreference.current=null;}}catch(e){if(revision===preferenceRevision.current)setPreferenceError(e instanceof Error?e.message:'설정을 저장하지 못했어요. 다시 시도해 주세요.');}finally{if(revision===preferenceRevision.current)setPreferenceBusy(false);}}
 async function retryPreferences(){if(failedPreference.current)await savePreferences(failedPreference.current);}
 const setVoiceMode=(mode:'device'|'cloud')=>{void savePreferences({voice_mode:mode});};
 const dashboard=useMemo(()=>new DashboardLoader(journalRepository,experienceRepository),[]);
 async function completeErasure(receipt:DataReceipt){
  if(receipt.device_cleanup_complete===true)return;
  setSessionState('checking');dashboard.clear();preferenceWriter.reset();preferenceRevision.current++;bootstrapReady.current=false;
  await eraseCurrentDeviceData(AsyncStorage,session,receipt);
  setEntries([]);setReadings([]);setCounsels([]);setBootstrap(null);setConsents([]);setContextIds([]);setSelectedDeckState('');
  setJournalPolicy(null);setConfig(null);setDraftState('');setToneState('warm');setReducedState(false);setVoiceModeState('device');setPreferenceBusy(false);setPreferenceError('');setSensoryState({sound:true,haptics:true,music:false});setError('');setLoading(false);
  setSessionError('전체 삭제가 완료됐어요. 기기 연결과 이 앱의 임시 초안·설정도 정리했어요. 새 이용은 시작을 누를 때만 연결돼요.');setSessionState('welcome');
 }
 async function recover(){setSessionState('checking');setSessionError('');try{if(!await session.hasStoredSession()){setSessionState('welcome');return;}const next=await p0Repository.bootstrap();bootstrapReady.current=true;applyPreferences(next.user.preferences);setBootstrap(next);setConsents(next.consents);setSessionState('ready');void p0Repository.refreshSession().catch(()=>{});await refresh();}catch(e){setSessionError(e instanceof Error?e.message:'기기 연결을 확인하지 못했어요.');setSessionState('blocked');}}
 async function connect(){setSessionState('checking');setSessionError('');try{const raw=await AsyncStorage.getItem('yeoun.p0.data-receipt');if(raw){const receipt=JSON.parse(raw) as DataReceipt;if(receipt.kind==='erase'&&receipt.state==='completed'&&receipt.device_cleanup_complete!==true)await completeErasure(receipt);}await session.start();await recover();}catch(e){setSessionError(e instanceof Error?e.message:'연결을 만들지 못했어요.');setSessionState(await session.hasStoredSession()?'blocked':'welcome');}}
 async function reloadConsents(){const next=await p0Repository.bootstrap();bootstrapReady.current=true;applyPreferences(next.user.preferences);setBootstrap(next);setConsents(next.consents);}
 const setSelectedDeck=(id:string)=>{setSelectedDeckState(id);AsyncStorage.setItem('yeoun.deck',id).catch(()=>{});};
 async function refresh(){
  setLoading(true);
  const next=await dashboard.load();
  if(!next)return;
  setEntries(next.entries);setReadings(next.readings);setCounsels(next.counsels);
  setJournalPolicy(next.journalPolicy);setConfig(next.config);
  setError(Object.values(next.errors).join('\n'));setLoading(false);
 }
 useEffect(()=>{
  AsyncStorage.multiGet(['yeoun.tone','yeoun.reduced','yeoun.draft','yeoun.sensory','yeoun.deck','yeoun.voice-mode']).then(pairs=>{
   for(const [key,value] of pairs){
    if(bootstrapReady.current&&['yeoun.tone','yeoun.reduced','yeoun.voice-mode'].includes(key))continue;
    if(key==='yeoun.voice-mode'&&value==='cloud')setVoiceModeState('cloud');
    if(key==='yeoun.tone'&&value==='giga')setToneState('giga');
    if(key==='yeoun.deck'&&value)setSelectedDeckState(value);
    if(key==='yeoun.reduced')setReducedState(value==='true');
    if(key==='yeoun.draft'&&value)setDraftState(value);
    if(key==='yeoun.sensory'&&value)try{const v=JSON.parse(value);setSensoryState({sound:v.sound!==false,haptics:v.haptics!==false,music:v.music===true});}catch{}
   }
  }).catch(()=>{});void recover();
 },[]);
 useEffect(()=>configureFeedback(sensory),[sensory]);
 const setTone=(v:Tone)=>{void savePreferences({tone:v});};
 const setReduced=(v:boolean)=>{void savePreferences({reduced_motion:v});};
 const setDraft=(v:string)=>{setDraftState(v);AsyncStorage.setItem('yeoun.draft',v).catch(()=>{});};
 const setSensory=(v:SensoryPreferences)=>{configureFeedback(v);setSensoryState(v);AsyncStorage.setItem('yeoun.sensory',JSON.stringify(v)).catch(()=>{});};
 return <Context.Provider value={{voiceMode,setVoiceMode,preferenceBusy,preferenceError,retryPreferences,sessionState,sessionError,bootstrap,connect,recover,reloadConsents,consents,completeErasure,selectedDeck,setSelectedDeck,contextIds,setContextIds,entries,readings,counsels,journalPolicy,config,loading,error,refresh,tone,setTone,reduced,setReduced,draft,setDraft,sensory,setSensory}}>{children}</Context.Provider>;
}
export function useStore(){const value=useContext(Context);if(!value)throw new Error('Store provider is required');return value;}
