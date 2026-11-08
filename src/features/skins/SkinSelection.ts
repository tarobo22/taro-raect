import {defaultSkinId,skins,type SkinId} from './catalog';
export type {SkinId} from './catalog';
export interface SkinStorage{getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>;}
export interface SkinSelection{id:SkinId;loaded:boolean;error:string;}
const key='yeoun.companion-skin.v1';
export const isSkinId=(value:unknown):value is SkinId=>typeof value==='string'&&Object.hasOwn(skins,value);
export class SkinSelectionStore{
 state:SkinSelection={id:defaultSkinId,loaded:false,error:''};
 private listeners=new Set<()=>void>();private revision=0;private writes:Promise<unknown>=Promise.resolve();
 constructor(private storage:SkinStorage){}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 getSnapshot=()=>this.state;
 private update(change:Partial<SkinSelection>){this.state={...this.state,...change};for(const listener of this.listeners)listener();}
 async load():Promise<void>{
  const revision=this.revision;let id:SkinId=defaultSkinId;
  try{const saved=JSON.parse(await this.storage.getItem(key)||'null');if(saved?.version===1&&isSkinId(saved.id))id=saved.id;}
  catch{/* Public appearance preference only: a broken record must not block the app. */}
  if(revision===this.revision)this.update({id,loaded:true});else this.update({loaded:true});
 }
 async select(id:string):Promise<boolean>{
  if(!isSkinId(id))return false;
  const revision=++this.revision;this.update({id,error:''});
  const write=this.writes.then(()=>this.storage.setItem(key,JSON.stringify({version:1,id})));
  this.writes=write.catch(()=>{});
  try{await write;if(this.revision===revision)this.update({error:''});return true;}
  catch{if(this.revision===revision)this.update({error:'이 공간을 기기에 저장하지 못했어요. 다시 선택하면 재시도해요.'});return false;}
 }
}
