import React,{createContext,useContext,useEffect,useRef} from 'react';
import {useStore} from '../../state/store';
import {DraftMemory} from './DraftMemory';
const Context=createContext<DraftMemory|null>(null);
export function CounselingDraftProvider({children}:{children:React.ReactNode}){
 const store=useStore(),memory=useRef(new DraftMemory()).current;
 memory.attach(store.sessionState==='ready'?store.bootstrap?.user.id||'':'');
 useEffect(()=>()=>memory.clear(),[memory]);
 return <Context.Provider value={memory}>{children}</Context.Provider>;
}
export function useCounselingDraft(){const value=useContext(Context);if(!value)throw new Error('상담 입력 연결을 확인해 주세요.');return value;}
