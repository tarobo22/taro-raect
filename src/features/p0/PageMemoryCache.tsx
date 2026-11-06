import React,{createContext,useContext,useState} from 'react';
import type {PageLoader,PageSnapshot} from './PageLoader';
/** One Root owns this cache. It contains data only, never an inactive screen tree. */
export class PageMemoryCache{
 private pages=new Map<string,PageSnapshot<{id:string}>>();private expanded=new Set<string>();private epoch=0;
 get generation(){return this.epoch;}
 read<T extends {id:string}>(key:string):PageSnapshot<T>|undefined{return this.pages.get(key) as PageSnapshot<T>|undefined;}
 remember<T extends {id:string}>(key:string,loader:PageLoader<T>,generation:number){if(generation!==this.epoch||!loader.hasLoaded)return;const value=loader.snapshot;this.pages.set(key,{...value,items:[...value.items],busy:false});}
 isExpanded(key:string){return this.expanded.has(key);}
 setExpanded(key:string,value:boolean,generation:number){if(generation!==this.epoch)return;if(value)this.expanded.add(key);else this.expanded.delete(key);}
 clear(){this.epoch++;this.pages.clear();this.expanded.clear();}
}
const Context=createContext<PageMemoryCache|null>(null);
export function PageMemoryProvider({cache,children}:{cache:PageMemoryCache;children:React.ReactNode}){return <Context.Provider value={cache}>{children}</Context.Provider>;}
export function usePageMemory(){return useContext(Context);}
export function usePageExpansion(key:string){const cache=usePageMemory(),generation=cache?.generation,[open,setOpen]=useState(()=>cache?.isExpanded(key)||false);return [open,(next:boolean|((value:boolean)=>boolean))=>{setOpen(current=>{const value=typeof next==='function'?next(current):next;if(cache&&generation!==undefined)cache.setExpanded(key,value,generation);return value;});}] as const;}
