import {useEffect,useMemo,useState} from 'react';
import {createJournalDraft} from '../../composition';
import type {JournalDraft} from './model';

export function useJournalDraft(initial:JournalDraft){
  const session=useMemo(()=>createJournalDraft(initial),[initial.id,initial.sourceReadingId,initial.sourceTurnId]);
  const [draft,setDraft]=useState(()=>session.snapshot),[error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    session.restore().then(()=>{if(active)setDraft(session.snapshot);})
      .catch(()=>{if(active)setError('임시 글을 불러오지 못했어요. 작성 중인 내용은 그대로예요.');});
    return()=>{active=false;};
  },[session]);
  function change(value:Partial<JournalDraft>){
    const writing=session.change(value);
    setDraft(session.snapshot);setError('');
    writing.catch(()=>setError('기기에 임시 저장하지 못했어요. 이 화면에서 글을 확인해 주세요.'));
  }
  return {draft,change,error,revision:()=>session.revision,
    acknowledge:(revision:number)=>session.acknowledge(revision)};
}
