import type {Entry,Reading,Counsel} from './state/store';
export type ScreenName='home'|'records'|'settings'|'topics'|'draw'|'reading'|'daily'|'talk'|'journal'|'entry'|'counsel';
export interface Route{name:ScreenName;topic?:string;question?:string;spreadId?:string;deck?:number[];selected?:number[];reading?:Reading;entry?:Entry;initialText?:string;counsel?:Counsel;}
export interface Nav{push:(r:Route)=>void;replace:(r:Route)=>void;back:()=>void;update:(data:Partial<Route>)=>void;tab:(name:'home'|'records'|'settings')=>void;}
