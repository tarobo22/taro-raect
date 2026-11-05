import {useEffect,useMemo,useRef,useState} from 'react';
import {createJournalSaver, journalRepository} from '../../composition';
import {RemoveJournal} from './removeJournal';
import type {JournalDraft} from './model';

export function useJournalSave() {
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const saver = useMemo(createJournalSaver, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(draft: JournalDraft) {
    setBusy(true);
    setError('');
    try {
      const saved=await saver.save(draft);
      return active.current?saved:null;
    } catch (cause) {
      if(active.current)setError(cause instanceof Error ? cause.message : '저장하지 못했어요. 내용은 그대로 유지돼요.');
      return null;
    } finally {
      if(active.current)setBusy(false);
    }
  }
  return {save, busy, error,clearError:()=>setError('')};
}

export function useJournalDelete() {
  const useCase = useMemo(() => new RemoveJournal(journalRepository), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove(id: string) {
    if (busy) return false;
    setBusy(true);
    setError('');
    try {
      await useCase.remove(id);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '지우지 못했어요. 다시 시도해 주세요.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return {remove, busy, error};
}
