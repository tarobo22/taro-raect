import React,{useEffect,useRef,useState} from 'react';
import {feedback} from '../services/feedback';
import {color} from '../design/tokens';
import type {RotaryProps} from './RotarySurface.types';

const STEP=Math.PI/8;
const mod=(v:number,n:number)=>((v%n)+n)%n;
/** Canvas is painted only while moving. Detents, rather than frames, enter React state. */
export function RotarySurface(props:RotaryProps){
 const {options,index,label,disabled,reduced,circular=false,cards,selected=[]}=props,count=Math.max(1,options.length);
 const ring=useRef<HTMLCanvasElement>(null),fan=useRef<HTMLCanvasElement>(null),strip=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null);
 const latest=useRef(props);latest.current=props;
 const motion=useRef({p:index,target:index,v:0,raf:0,last:0,pointerTime:0,active:false,angle:0,origin:index,total:0,detent:index,shuffleStart:0,version:props.version,lifts:new Map<string,number>(),lifting:false});
 const drawRef=useRef<()=>void>(()=>{});const [hint,setHint]=useState(true);
 const clamp=(v:number)=>latest.current.circular?v:Math.max(0,Math.min(latest.current.options.length-1,v));
 function draw(){
  const m=motion.current,current=latest.current,n=Math.max(1,current.options.length),dpr=Math.min(2,window.devicePixelRatio||1);
  function context(canvas:HTMLCanvasElement|null,w:number,h:number){if(!canvas)return null;if(canvas.width!==Math.round(w*dpr)||canvas.height!==h*dpr){canvas.width=Math.round(w*dpr);canvas.height=h*dpr;}const c=canvas.getContext('2d');if(!c)return null;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);return c;}
  const c=context(ring.current,96,96);
  if(c){c.fillStyle=color.sage;c.beginPath();c.arc(48,48,42,0,Math.PI*2);c.fill();c.save();c.translate(48,48);c.rotate(-m.p*STEP);c.strokeStyle=color.mintDeep;c.lineWidth=2;c.lineCap='round';for(let i=0;i<32;i++){const a=i*Math.PI/16,r=i%4===0?33:37;c.beginPath();c.moveTo(Math.sin(a)*r,-Math.cos(a)*r);c.lineTo(Math.sin(a)*42,-Math.cos(a)*42);c.stroke();}c.restore();c.fillStyle=color.paper;c.beginPath();c.arc(48,48,29,0,Math.PI*2);c.fill();c.fillStyle=color.action;c.beginPath();c.arc(48,6,4,0,Math.PI*2);c.fill();}
  if(strip.current)strip.current.style.transform=`translate3d(0,${-(current.circular?mod(m.p,n)+n:clamp(m.p))*32}px,0)`;
  if(current.cards&&fan.current){const w=host.current?.clientWidth||300,f=context(fan.current,w,192),elapsed=m.shuffleStart?performance.now()-m.shuffleStart:900,s=elapsed<210?elapsed/210:elapsed<410?1:elapsed<740?1-(elapsed-410)/330:0;if(elapsed>=740)m.shuffleStart=0;
   if(f){const positions=current.cards.map((id,i)=>({id,i,d:mod(i-m.p+n/2,n)-n/2})).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));
    positions.forEach(({id,i,d})=>{const base=Math.max(0,Math.min(1,1.9-Math.abs(d))),opacity=base+(1-base)*s;if(!opacity)return;const chosen=(current.selected||[]).includes(id);f.save();f.globalAlpha=opacity;f.translate(w/2+d*70*(1-s),87+Math.abs(d)*12*(1-s)-(m.lifts.get(id)||0)+s*14);f.rotate(d*.11*(1-s)+Math.sin(i*1.7)*s*.17);const scale=1-Math.min(3,Math.abs(d))*.065;f.scale(scale,scale);
     const rect=(x:number,y:number,rw:number,rh:number,r:number,fill:string)=>{f.fillStyle=fill;f.beginPath();f.roundRect(x,y,rw,rh,r);f.fill();};rect(-43,-65,86,134,12,chosen?color.action:color.mintDeep);rect(-37,-59,74,122,8,color.paper);rect(-33,-55,66,114,6,chosen?color.mint:color.sage);f.save();f.rotate(Math.PI/4);rect(-18,-18,36,36,0,color.mintDeep);rect(-13,-13,26,26,0,color.sage);f.restore();f.fillStyle=color.action;f.beginPath();f.arc(0,0,7,0,Math.PI*2);f.fill();if(chosen){f.beginPath();f.arc(25,-46,5,0,Math.PI*2);f.fill();}f.restore();});
   }
  }
 }
 function frame(now:number){const m=motion.current;m.raf=0;const dt=Math.min(.032,(now-(m.last||now-16))/1000);m.last=now;if(!m.active){if(latest.current.reduced){m.p=m.target;m.v=0;}else{m.v+=(m.target-m.p)*240*dt-m.v*25*dt;m.p+=m.v*dt;if(Math.abs(m.p-m.target)<.001&&Math.abs(m.v)<.015){m.p=m.target;m.v=0;}}}m.lifting=false;for(const id of latest.current.cards||[]){const target=(latest.current.selected||[]).includes(id)?9:0,old=m.lifts.get(id)||0,next=latest.current.reduced||Math.abs(target-old)<.03?target:old+(target-old)*(1-Math.exp(-22*dt));m.lifts.set(id,next);if(Math.abs(target-next)>.03)m.lifting=true;}emit();draw();if(m.active||Math.abs(m.p-m.target)>.001||!m.active&&Math.abs(m.v)>.015||m.shuffleStart||m.lifting)m.raf=requestAnimationFrame(frame);else m.last=0;}
 function wake(){if(!motion.current.raf&&!document.hidden)motion.current.raf=requestAnimationFrame(frame);}
 function emit(){const m=motion.current,n=latest.current.options.length;if(!n)return;const next=mod(Math.round(m.p),n);if(next===m.detent)return;m.detent=next;feedback('tick');if(m.active)latest.current.onChange(next);}
 drawRef.current=()=>{draw();wake();};
 useEffect(()=>{const m=motion.current;if(!m.active){m.target=circular?m.p+mod(index-mod(Math.round(m.p),count)+count/2,count)-count/2:index;if(reduced)m.p=m.target;wake();}},[index,count,circular,reduced]);
 useEffect(()=>{const m=motion.current;if(m.version!==undefined&&props.version!==m.version)m.shuffleStart=reduced?0:performance.now();m.version=props.version;wake();},[props.version,reduced]);
 useEffect(()=>{draw();const observer=new ResizeObserver(()=>drawRef.current());if(host.current)observer.observe(host.current);const visibility=()=>{if(document.hidden){cancelAnimationFrame(motion.current.raf);motion.current.raf=0;motion.current.active=false;motion.current.target=latest.current.index;motion.current.p=motion.current.target;motion.current.v=0;motion.current.shuffleStart=0;}else drawRef.current();};document.addEventListener('visibilitychange',visibility);return()=>{observer.disconnect();cancelAnimationFrame(motion.current.raf);document.removeEventListener('visibilitychange',visibility);};},[]);
 useEffect(()=>{drawRef.current();},[selected.join(','),cards?.join(',')]);
 function choose(next:number){if(disabled||!options.length)return;if(!circular&&(next<0||next>=count)){feedback('boundary');return;}setHint(false);props.onChange(mod(next,count));}
 function end(e:React.PointerEvent<HTMLDivElement>,cancel=false){const m=motion.current;if(!m.active)return;m.active=false;const speed=performance.now()-m.pointerTime>100?0:m.v,target=cancel?m.origin:clamp(Math.round(m.p+Math.max(-1.25,Math.min(1.25,speed*.075))));m.target=target;m.v=0;props.onChange(mod(Math.round(target),count));if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);wake();}
 const button:React.CSSProperties={width:48,height:48,border:0,borderRadius:16,background:color.sage,color:color.action,fontSize:22,cursor:disabled?'default':'pointer',opacity:disabled?.4:1};
 return <div ref={host} style={{width:'100%',color:color.ink,fontFamily:'inherit'}}>
  {cards?<canvas ref={fan} aria-hidden style={{display:'block',width:'100%',height:192}}/>:null}
  <div style={{display:'flex',alignItems:'center',gap:12}}>
   <div role="slider" tabIndex={disabled?-1:0} aria-label={label} aria-valuemin={0} aria-valuemax={count-1} aria-valuenow={index} aria-valuetext={options[index]} aria-disabled={disabled}
    onKeyDown={e=>{const change=e.key==='ArrowRight'||e.key==='ArrowUp'?1:e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:0;if(change||e.key==='Home'||e.key==='End'){e.preventDefault();choose(e.key==='Home'?0:e.key==='End'?count-1:index+change);}}}
    onPointerDown={e=>{if(disabled||!options.length)return;const r=e.currentTarget.getBoundingClientRect(),x=e.clientX-r.left-48,y=e.clientY-r.top-48;if(Math.hypot(x,y)<28)return;e.currentTarget.setPointerCapture(e.pointerId);const m=motion.current;m.active=true;m.origin=m.p;m.angle=Math.atan2(x,-y);m.total=0;m.v=0;m.pointerTime=performance.now();setHint(false);wake();}}
    onPointerMove={e=>{const m=motion.current;if(!m.active)return;const r=e.currentTarget.getBoundingClientRect(),a=Math.atan2(e.clientX-r.left-48,48-(e.clientY-r.top));let delta=a-m.angle;if(delta>Math.PI)delta-=Math.PI*2;if(delta<-Math.PI)delta+=Math.PI*2;m.total+=delta;m.angle=a;const now=performance.now(),next=clamp(m.origin+m.total/STEP);m.v=(next-m.p)/Math.max(.008,(now-m.pointerTime)/1000);m.pointerTime=now;m.p=next;m.target=m.p;emit();draw();}}
    onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)} style={{width:96,height:96,position:'relative',flexShrink:0,touchAction:'none',cursor:'grab',borderRadius:'50%'}}>
    <canvas ref={ring} aria-hidden style={{width:96,height:96,display:'block'}}/>
    <div style={{position:'absolute',inset:21,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:600,pointerEvents:'none'}}>{index+1}<span style={{color:color.muted,fontWeight:400,whiteSpace:'pre'}}> / {count}</span></div>
   </div>
   <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:6}}><span style={{fontSize:12,color:color.muted}}>{label}</span>
    <div aria-hidden style={{height:32,overflow:'hidden',containerType:'inline-size'}}><div ref={strip} style={{willChange:'transform'}}>{(circular?[...options,...options,...options]:options).map((option,i)=><div key={i} style={{height:32,lineHeight:'32px',fontSize:'clamp(14px,10cqi,19px)',fontWeight:600,whiteSpace:'nowrap',letterSpacing:'-.5px'}}>{option}</div>)}</div></div>
    <span style={{fontSize:11,color:color.muted,whiteSpace:'nowrap'}}>{hint?'테두리를 돌려 골라요':'천천히, 내 마음이 가는 쪽으로'}</span>
   </div>
   <div style={{display:'flex',flexDirection:'column',gap:2}}><button aria-label={label+' 이전'} disabled={disabled} onClick={()=>choose(index-1)} style={button}>−</button><button aria-label={label+' 다음'} disabled={disabled} onClick={()=>choose(index+1)} style={button}>+</button></div>
  </div>
 </div>;
}
