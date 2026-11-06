const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const circle=(value:number)=>((value%360)+360)%360;
export interface DialDrag{position:number;last:number;}
export function dialAngle(index:number,count:number,circular=false){return circular?Math.max(0,index)/Math.max(1,count)*360:-135+clamp(index,0,Math.max(0,count-1))/Math.max(1,count-1)*270;}
export function dialIndex(angle:number,count:number,circular=false){if(count<2)return 0;return circular?Math.round(circle(angle)/360*count)%count:Math.round((clamp(angle,-135,135)+135)/270*(count-1));}
export function beginDialDrag(index:number,count:number,angle:number,onRing:boolean,circular=false):DialDrag{
 return {position:onRing&&(circular||Math.abs(angle)<=135)?(circular?circle(angle):angle):dialAngle(index,count,circular),last:angle};
}
/** Unwrap each movement before clamping so crossing the lower gap never jumps between endpoints. */
export function moveDialDrag(drag:DialDrag,angle:number,circular=false):DialDrag{
 const delta=circle(angle-drag.last+180)-180;
 return {position:circular?circle(drag.position+delta):clamp(drag.position+delta,-135,135),last:angle};
}
export function dialKeyIndex(key:string,index:number,count:number,circular=false):number|null{
 if(!count)return null;let next=index;
 if(key==='Home')next=0;else if(key==='End')next=count-1;else if(key==='ArrowRight'||key==='ArrowUp')next++;else if(key==='ArrowLeft'||key==='ArrowDown')next--;else return null;
 return circular?(next+count)%count:clamp(next,0,count-1);
}
