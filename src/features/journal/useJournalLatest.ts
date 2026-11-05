import {useEffect,useRef,useState} from 'react';
import {getJournalEntry} from '../../composition';
import type {JournalEntry} from './model';

export function useJournalLatest(){
  const [entry,setEntry]=useState<JournalEntry|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function load(id:string){
    setBusy(true);setError('');
    try{
      const latest=await getJournalEntry(id);
      if(!active.current)return null;
      setEntry(latest);return latest;
    }catch(cause){
      if(active.current)setError(cause instanceof Error?cause.message:'최신 기록을 불러오지 못했어요.');
      return null;
    }finally{if(active.current)setBusy(false);}
  }
  return {entry,busy,error,load};
}
