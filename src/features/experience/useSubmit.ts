import {useEffect,useMemo,useRef,useState} from 'react';
import {IdempotentSubmit,requestId} from './submit';

export function useSubmit<I,O>(execute:(input:I,id:string)=>Promise<O>){
  const operation=useMemo(()=>new IdempotentSubmit(execute,requestId),[execute]);
  const active=useRef(true);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function submit(input:I):Promise<O|null>{
    setBusy(true);setError('');
    try{const value=await operation.submit(input);return active.current?value:null;}
    catch(e){if(active.current)setError(e instanceof Error?e.message:'잠시 뒤 다시 시도해 주세요.');return null;}
    finally{if(active.current)setBusy(false);}
  }
  return {submit,busy,error};
}
