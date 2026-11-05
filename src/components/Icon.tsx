import React from 'react';
import Svg,{Path,Circle,Rect} from 'react-native-svg';
import {color} from '../design/tokens';
export type IconName='home'|'book'|'settings'|'back'|'arrow'|'mic'|'send'|'check'|'close'|'cards'|'heart'|'refresh'|'edit';
export function Icon({name,size=22,tint=color.ink}:{name:IconName;size?:number;tint?:string}){
 const paths:Partial<Record<IconName,string>>={home:'M3 10 12 3 21 10M5 9v12h14V9M9 21v-8h6v8',book:'M4 3h13a3 3 0 0 1 3 3v15H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3M4 17h16M8 7h8M8 11h6',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',back:'M15 5 8 12l7 7',arrow:'M5 12h14M13 6l6 6-6 6',mic:'M8 6a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0V6M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8',send:'M3 3 22 12 3 21l3-9-3-9ZM6 12h16',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',cards:'M7 3h12v18H7V3M3 6v12M11 7h4M11 17h4',heart:'M20 5c-2-3-6-2-8 1-2-3-6-4-8-1-3 4 1 8 8 14 7-6 11-10 8-14Z',refresh:'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 2M18 17a7 7 0 0 1-12 2l-2-2',edit:'m4 16 12-12 4 4L8 20H4v-4ZM14 6l4 4'};
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><Path d={paths[name]||paths.heart}/></Svg>;
}
