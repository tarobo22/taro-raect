import {recordDay,validRecordDate} from '../p0/selection';
import type {JournalRange} from './model';
const dayMs=86400000;
export function journalRange(from:string,to:string):JournalRange{
 if(!validRecordDate(from)||!validRecordDate(to)||from>to)throw new Error('시작일과 마지막 날을 YYYY-MM-DD 형식과 날짜 순서로 확인해 주세요.');
 return {range_start:from,range_end:to};
}
export function daysInRange(from:string,to:string):string[]{
 journalRange(from,to);const days:string[]=[];
 for(let day=Date.parse(from),end=Date.parse(to);day<=end;day+=dayMs)days.push(new Date(day).toISOString().slice(0,10));
 return days;
}
export function journalWindow(length:7|30,timezone:string,now=new Date()):JournalRange{
 const to=recordDay(now.toISOString(),timezone),from=new Date(Date.parse(to)-(length-1)*dayMs).toISOString().slice(0,10);
 return journalRange(from,to);
}
