import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {p0Receipts} from '../../composition';
import {useSubmit} from '../experience/useSubmit';
export function useP0Mutation<I,O>(name:string,execute:(input:I,id:string)=>Promise<O>){
 const action=useRef(execute);action.current=execute;
 const stable=useCallback((input:I,id:string)=>action.current(input,id),[]),receipts=useMemo(()=>p0Receipts(name),[name]);
 return useSubmit(stable,receipts);
}
export function useP0Read<T>(read:()=>Promise<T>,keys:readonly unknown[]=[]){
 const active=useRef(0),reader=useRef(read);reader.current=read;
 const [value,setValue]=useState<T|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const reload=useCallback(async()=>{const generation=++active.current;setBusy(true);setError('');try{const next=await reader.current();if(generation===active.current)setValue(next);}catch(e){if(generation===active.current)setError(e instanceof Error?e.message:'연결을 확인해 주세요.');}finally{if(generation===active.current)setBusy(false);}},[]);
 useEffect(()=>{setValue(null);void reload();return()=>{active.current++;};},keys);
 return {value,busy,error,reload};
}
