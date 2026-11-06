import {useEffect,useMemo,useRef,useState} from 'react';
import {PageLoader} from './PageLoader';
import type {Page} from './model';
import {usePageMemory} from './PageMemoryCache';
export function useP0Pages<T extends {id:string}>(read:(cursor?:string)=>Promise<Page<T>>,keys:readonly unknown[],cacheKey?:string){
 const reader=useRef(read);reader.current=read;const active=useRef(true),lifecycle=useRef(0),context=usePageMemory(),cache=cacheKey?context:null,scope=cache?JSON.stringify([cacheKey,...keys]):'',cacheGeneration=cache?.generation;
 const loader=useMemo(()=>new PageLoader<T>(cursor=>reader.current(cursor),cache?cache.read<T>(scope):undefined),[cache,scope]),[state,setState]=useState({loader,value:loader.snapshot});
 function remember(){if(cache&&cacheGeneration!==undefined)cache.remember(scope,loader,cacheGeneration);}
 async function load(more=false){const generation=lifecycle.current,pending=more?loader.more():loader.reload();if(active.current)setState({loader,value:loader.snapshot});await pending;if(active.current&&generation===lifecycle.current){remember();setState({loader,value:loader.snapshot});}}
 useEffect(()=>{active.current=true;lifecycle.current++;setState({loader,value:loader.snapshot});if(!cache||!loader.hasLoaded)void load();return()=>{active.current=false;lifecycle.current++;loader.dispose();remember();};},[loader,...keys]);
 return {...(state.loader===loader?state.value:loader.snapshot),reload:()=>load(),more:()=>load(true)};
}
