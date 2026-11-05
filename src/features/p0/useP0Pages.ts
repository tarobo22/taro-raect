import {useEffect,useMemo,useRef,useState} from 'react';
import {PageLoader} from './PageLoader';
import type {Page} from './model';
export function useP0Pages<T extends {id:string}>(read:(cursor?:string)=>Promise<Page<T>>,keys:readonly unknown[]){
 const reader=useRef(read);reader.current=read;const active=useRef(true);
 const loader=useMemo(()=>new PageLoader<T>(cursor=>reader.current(cursor)),[]),[state,setState]=useState(loader.snapshot);
 async function load(more=false){const pending=more?loader.more():loader.reload();if(active.current)setState(loader.snapshot);await pending;if(active.current)setState(loader.snapshot);}
 useEffect(()=>{active.current=true;void load();return()=>{active.current=false;loader.dispose();};},keys);
 return {...state,reload:()=>load(),more:()=>load(true)};
}
