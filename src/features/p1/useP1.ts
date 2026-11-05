import {useEffect,useMemo,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {p1Repository} from '../../composition';
import {SummaryLoader} from './SummaryLoader';
import {insightSelection} from './selection';
import type {InsightSelection} from './model';

export const insightSelectionKey='yeoun.p1.insight-selection';
export const lastInsightKey='yeoun.p1.last-insight';
export function useJournalSummary(from:string,to:string){
 const loader=useMemo(()=>new SummaryLoader(p1Repository),[]),[state,setState]=useState(loader.snapshot),active=useRef(true);
 async function reload(){const pending=loader.load(from,to);setState(loader.snapshot);await pending;if(active.current)setState(loader.snapshot);}
 useEffect(()=>{active.current=true;void reload();return()=>{active.current=false;loader.dispose();};},[from,to]);
 const current=state.value?.range_start===from&&state.value.range_end===to?state.value:null;
 return {...state,value:current,reload};
}
/** Persist IDs, dates and versions only. Source bodies stay on the server and out of drafts. */
export function useInsightSelection(initial:InsightSelection,forceRange=false){
 const [value,setValue]=useState(initial),[ready,setReady]=useState(false),[error,setError]=useState(''),revision=useRef(0),writes=useRef(Promise.resolve());
 useEffect(()=>{let active=true;const starting=revision.current;
  void AsyncStorage.getItem(insightSelectionKey).then(raw=>{if(!active||starting!==revision.current||!raw)return;const parsed=JSON.parse(raw);const restored=insightSelection(parsed.range_start,parsed.range_end,parsed.entries);if(!forceRange||(initial.range_start===restored.range_start&&initial.range_end===restored.range_end))setValue(restored);}).catch(()=>{if(active)setError('이전에 고른 기록을 확인하지 못했어요. 기록을 다시 선택해 주세요.');}).finally(()=>{if(active)setReady(true);});
  return()=>{active=false;};
 },[]);
 function change(next:InsightSelection){const checked=insightSelection(next.range_start,next.range_end,next.entries);revision.current++;setValue(checked);setError('');writes.current=writes.current.catch(()=>{}).then(()=>AsyncStorage.setItem(insightSelectionKey,JSON.stringify(checked))).catch(()=>{setError('고른 기록을 기기에 보관하지 못했어요. 화면을 나가기 전에 다시 확인해 주세요.');});}
 return {value,ready,error,change};
}
