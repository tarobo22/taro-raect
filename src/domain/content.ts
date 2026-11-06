export type Tone='warm'|'giga';
export interface Card{id:number;name:string;keyword:string;message:string;action:string;art:'sun'|'leaf'|'path';}
export const release={version:'1.4.0',label:'마음의 첫 여정',homeMessage:'오늘의 나에게, 작은 여운을.'};
export interface Advice{empathy:string;advice:string;action:string;expression:'concern'|'serious'|'encourage'|'listen'|'joy';}
export function localDay(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
