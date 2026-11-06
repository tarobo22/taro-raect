import React,{useEffect,useRef,useState} from 'react';
import {color} from '../design/tokens';
import {feedback} from '../services/feedback';
import type {ChoiceStageProps} from './ChoiceStage.types';
export function ChoiceStage({children,onChoice,disabled=false,reduced,label='대화 선택'}:ChoiceStageProps){
 const node=useRef<HTMLDivElement>(null),left=useRef<HTMLDivElement>(null),right=useRef<HTMLDivElement>(null),latest=useRef({onChoice,disabled,reduced});latest.current={onChoice,disabled,reduced};
 const m=useRef({x:0,target:0,v:0,raf:0,last:0,drag:false,startX:0,startY:0,locked:false,alive:true,ticked:false,width:320,exit:0 as number,commit:false,pointer:0});
 const [locked,setLocked]=useState(false),[hint,setHint]=useState(true);
 function paint(){const s=m.current;if(node.current)node.current.style.transform=`translate3d(${s.x}px,0,0) rotate(${latest.current.reduced?0:s.x/s.width*12}deg)`;if(left.current)left.current.style.opacity=String(Math.min(.65,Math.max(0,-s.x/s.width*1.5)));if(right.current)right.current.style.opacity=String(Math.min(.65,Math.max(0,s.x/s.width*1.5)));}
 function unlock(){const s=m.current;s.locked=false;s.exit=0;s.commit=false;if(s.alive)setLocked(false);}
 async function commit(yes:boolean){const s=m.current;let success=true;try{success=(await latest.current.onChoice(yes))!==false;}catch{success=false;}if(!s.alive)return;s.exit=0;s.x=latest.current.reduced?0:success?(yes?-1:1)*s.width*.55:s.x;s.target=0;s.v=0;requestAnimationFrame(()=>{if(!s.alive)return;if(latest.current.reduced){paint();unlock();}else wake();});}
 function frame(now:number){const s=m.current;s.raf=0;if(!s.alive||document.hidden)return;const dt=Math.min(.032,(now-(s.last||now-16))/1000);s.last=now;if(!s.drag){s.v+=(s.target-s.x)*(s.exit?280:240)*dt-s.v*26*dt;s.x+=s.v*dt;if(Math.abs(s.x-s.target)<.4&&Math.abs(s.v)<4){s.x=s.target;s.v=0;}}paint();if(s.exit&&Math.abs(s.x-s.target)<3&&!s.commit){s.commit=true;void commit(s.exit>0);return;}if(s.drag||Math.abs(s.x-s.target)>.4||Math.abs(s.v)>4)wake();else{s.last=0;if(s.locked&&!s.commit)unlock();if(s.locked&&s.commit&&!s.exit)unlock();}}
 function wake(){if(!m.current.raf&&!document.hidden)m.current.raf=requestAnimationFrame(frame);}
 function choose(yes:boolean){const s=m.current;if(s.locked||latest.current.disabled)return;s.drag=false;s.locked=true;setLocked(true);setHint(false);feedback('select');s.exit=yes?1:-1;s.target=(yes?1:-1)*s.width*1.1;if(latest.current.reduced){s.commit=true;void commit(yes);}else wake();}
 function reset(){const s=m.current;s.drag=false;s.target=0;s.v=0;wake();}
 useEffect(()=>{m.current.alive=true;const visibility=()=>{const s=m.current;if(document.hidden){cancelAnimationFrame(s.raf);s.raf=0;s.drag=false;s.x=0;s.target=0;s.v=0;paint();if(!s.commit)unlock();}else{paint();wake();}};document.addEventListener('visibilitychange',visibility);return()=>{m.current.alive=false;cancelAnimationFrame(m.current.raf);document.removeEventListener('visibilitychange',visibility);};},[]);
 const button:React.CSSProperties={flex:1,minHeight:48,border:0,borderRadius:17,fontSize:15,fontFamily:'inherit',fontWeight:600,color:color.ink,cursor:disabled||locked?'default':'pointer',opacity:disabled||locked?.5:1};
 return <div style={{display:'flex',flexDirection:'column',gap:10}}>
  <div style={{position:'relative'}}><div ref={left} aria-hidden style={{position:'absolute',inset:0,background:color.pink,borderRadius:24,opacity:0}}/><div ref={right} aria-hidden style={{position:'absolute',inset:0,background:color.mintDeep,borderRadius:24,opacity:0}}/>
   <div ref={node} data-testid="choice-profile" onPointerDown={e=>{const s=m.current;if(latest.current.disabled||s.locked||e.button!==0)return;s.width=e.currentTarget.clientWidth;s.startX=e.clientX;s.startY=e.clientY;s.pointer=e.pointerId;s.drag=true;s.ticked=false;s.v=0;e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{const s=m.current;if(!s.drag)return;const dx=e.clientX-s.startX,dy=e.clientY-s.startY;if(Math.abs(dy)>20&&Math.abs(dy)>Math.abs(dx)){reset();return;}s.x=dx*.92;s.target=s.x;if(Math.abs(dx)>8)setHint(false);if(Math.abs(dx)>s.width*.22&&!s.ticked){s.ticked=true;feedback('select');}paint();}}
    onPointerUp={e=>{const s=m.current;if(!s.drag)return;s.drag=false;const dx=e.clientX-s.startX;if(Math.abs(dx)>s.width*.22)choose(dx>0);else reset();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
    onPointerCancel={reset} style={{touchAction:'pan-y',userSelect:'none',willChange:'transform',cursor:disabled||locked?'default':'grab'}}>{children}</div>
  </div>
  <div style={{display:'flex',gap:8}}><button aria-label="아니요 선택" disabled={disabled||locked} onClick={()=>choose(false)} style={{...button,background:color.pink}}>← 아니요</button><button aria-label="예 선택" disabled={disabled||locked} onClick={()=>choose(true)} style={{...button,background:color.mint}}>예 →</button></div>
  {hint&&!disabled?<div style={{textAlign:'center',fontSize:11,color:color.muted}}>{label+' · 왼쪽 아니요, 오른쪽 예'}</div>:null}
 </div>;
}
