import React,{createContext,forwardRef,useContext,useEffect,useId,useMemo,useRef,useState} from 'react';
import {Animated,Keyboard,Platform,Pressable,StyleSheet,Text as NativeText,View as NativeView} from 'react-native';
import type {StyleProp,TextProps,ViewProps,ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSkinTheme} from '../features/skins/useSkinTheme';
import {useStore} from '../state/store';
import {feedback} from '../services/feedback';

type Node=React.ElementRef<typeof NativeView>;
type Bounds={id:string;top:number;bottom:number;title?:string;section?:boolean;lineHeight?:number};
type Page={start:number;end:number;title:string};
type Registration={node:()=>Node|null;title?:string;section?:boolean;lineHeight?:number};
type Registry={register:(id:string,value:Registration)=>()=>void;measure:()=>void;bounds:Bounds[];page:Page};
const FlowContext=createContext<Registry|null>(null);

// Break at measured content boundaries. A control or panel that fits is never cut.
export function arrangePages(bounds:Bounds[],height:number,total:number,title:string):Page[]{
 if(height<40||total<=0)return [{start:0,end:Math.max(0,total),title}];
 total=Math.min(total,Math.max(0,...bounds.map(b=>b.bottom))||total);
 const sections=bounds.filter(b=>b.section).sort((a,b)=>a.top-b.top);
 const points=[0,total,...bounds.flatMap(b=>[b.top,b.bottom])].filter(p=>p>=0&&p<=total).sort((a,b)=>a-b);
 const pages:Page[]=[];
 let start=0;
 while(start<total-1){
  const section=sections.filter(b=>b.top<=start+32).at(-1);
  const nextSection=sections.find(b=>b.top>start+32);
  const limit=Math.min(total,start+height,nextSection?.top??total);
  let end=limit;
  if(limit<total&&limit!==nextSection?.top){
   const protectedBlocks=bounds.filter(b=>b.bottom-b.top<=height&&b.bottom-b.top>2);
   const candidates=points.filter(p=>p>start+2&&p<=limit+.5&&!protectedBlocks.some(b=>p>b.top+.5&&p<b.bottom-.5));
   end=candidates.at(-1)??limit;
   if(end-start<32&&limit-start>32)end=limit;
   // Long paragraphs can span pages, but the boundary stays between text lines.
   const paragraph=bounds.find(b=>b.lineHeight&&b.top<end&&b.bottom>end&&b.bottom-b.top>height);
   if(paragraph){const line=paragraph.lineHeight!;const aligned=paragraph.top+Math.floor((end-paragraph.top)/line)*line;if(aligned>start+2)end=aligned;}
  }
  pages.push({start,end,title:section?.title||title});
  start=end;
 }
 return pages.length?pages:[{start:0,end:total,title}];
}

function useMeasurement(ref:React.MutableRefObject<Node|null>,options:Omit<Registration,'node'>){
 const registry=useContext(FlowContext),id=useId();
 const register=registry?.register,measure=registry?.measure;
 useEffect(()=>register?.(id,{node:()=>ref.current,...options}),[register,id,options.title,options.section,options.lineHeight]);
 const bounds=registry?.bounds.find(b=>b.id===id);
 const outside=!!bounds&&!!registry&&(bounds.bottom<=registry.page.start+.5||bounds.top>=registry.page.end-.5);
 return {measure,outside};
}

export const PageView=forwardRef<Node,ViewProps&{pageTitle?:string;pageBreak?:boolean}>(function PageView({pageTitle,pageBreak,onLayout,...props},forwarded){
 const ref=useRef<Node|null>(null),{measure,outside}=useMeasurement(ref,{title:pageTitle,section:pageBreak});
 return <NativeView {...props} collapsable={false} ref={node=>{ref.current=node;if(typeof forwarded==='function')forwarded(node);else if(forwarded)forwarded.current=node;}}
  onLayout={event=>{onLayout?.(event);measure?.();}}
  accessibilityElementsHidden={outside||props.accessibilityElementsHidden} importantForAccessibility={outside?'no-hide-descendants':props.importantForAccessibility} aria-hidden={outside||props['aria-hidden']}/>;
});

export const PageText=forwardRef<React.ElementRef<typeof NativeText>,TextProps>(function PageText({onLayout,...props},forwarded){
 const ref=useRef<Node|null>(null),style=StyleSheet.flatten(props.style),{measure,outside}=useMeasurement(ref,{lineHeight:style?.lineHeight||Math.ceil((style?.fontSize||16)*1.5)});
 return <NativeText {...props} ref={node=>{ref.current=node as unknown as Node;if(typeof forwarded==='function')forwarded(node);else if(forwarded)forwarded.current=node;}}
  onLayout={event=>{onLayout?.(event);measure?.();}} accessibilityElementsHidden={outside||props.accessibilityElementsHidden} importantForAccessibility={outside?'no-hide-descendants':props.importantForAccessibility} aria-hidden={outside||props['aria-hidden']}/>;
});

export function PageSection({title,children,style}:{title:string;children:React.ReactNode;style?:StyleProp<ViewStyle>}){
 return <PageView pageTitle={title} pageBreak style={[{gap:14},style]}>{children}</PageView>;
}

// Content stays mounted. Turning pages never clears drafts, selections or API state.
export function PageFlow({children,title='이어 보기',style,contentContainerStyle,initialOffset=0,onPageChange}:{children:React.ReactNode;title?:string;style?:StyleProp<ViewStyle>;contentContainerStyle?:StyleProp<ViewStyle>;initialOffset?:number;onPageChange?:(offset:number)=>void}){
 const theme=useSkinTheme(),insets=useSafeAreaInsets(),reduced=useStore().reduced,root=useRef<Node|null>(null),entries=useRef(new Map<string,Registration>()),frame=useRef<number|null>(null),alive=useRef(true),generation=useRef(0);
 const [height,setHeight]=useState(0),[total,setTotal]=useState(0),[bounds,setBounds]=useState<Bounds[]>([]),[index,setIndex]=useState(0);
 const motion=useRef(new Animated.Value(1)).current,direction=useRef(1),restore=useRef<number|null>(initialOffset);
 const measure=useMemo(()=>()=>{if(!alive.current||frame.current!==null)return;frame.current=requestAnimationFrame(()=>{frame.current=null;const parent=root.current;if(!parent)return;const version=++generation.current,pending=[...entries.current.entries()];void Promise.all(pending.map(([id,item])=>new Promise<Bounds|null>(resolve=>{const node=item.node();if(!node){resolve(null);return;}node.measureLayout(parent,(_x,y,_width,h)=>resolve(h>0?{id,top:Math.round(y*2)/2,bottom:Math.round((y+h)*2)/2,title:item.title,section:item.section,lineHeight:item.lineHeight}:null),()=>resolve(null));}))).then(values=>{if(!alive.current||version!==generation.current)return;const next=values.filter((v):v is Bounds=>v!==null).sort((a,b)=>a.id.localeCompare(b.id));setBounds(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);});});},[]);
 const register=useMemo(()=>((id:string,value:Registration)=>{entries.current.set(id,value);measure();return()=>{entries.current.delete(id);measure();};}),[measure]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(frame.current!==null)cancelAnimationFrame(frame.current);};},[]);
 useEffect(measure,[height,total,measure]);
 const pages=useMemo(()=>arrangePages(bounds,Math.max(1,height),total,title),[bounds,height,total,title]);
 const current=Math.min(index,pages.length-1),page=pages[current];
 useEffect(()=>{const target=restore.current;if(target!==null&&bounds.length&&total>target){const restored=pages.findIndex(p=>target>=p.start&&target<p.end);if(restored>=0){setIndex(restored);restore.current=null;}}},[bounds.length,total,pages]);
 useEffect(()=>{if(index>=pages.length)setIndex(pages.length-1);},[index,pages.length]);
 const context=useMemo(()=>({register,measure,bounds,page}),[register,measure,bounds,page]);
 function turn(next:number){if(next<0||next>=pages.length||next===current)return;Keyboard.dismiss();direction.current=next>current?1:-1;motion.stopAnimation();motion.setValue(reduced?1:0);setIndex(next);onPageChange?.(pages[next].start);restore.current=null;feedback('select');if(!reduced)Animated.timing(motion,{toValue:1,duration:180,useNativeDriver:Platform.OS!=='web'}).start();}
 const first=Math.max(0,Math.min(current-1,pages.length-3)),visible=Array.from({length:Math.min(3,pages.length)},(_,i)=>first+i);
 const ready=height>0&&total>0;
 return <NativeView style={[{flex:1,minHeight:0},style]}>
  <NativeView style={{flex:1,minHeight:0,overflow:'hidden'}} onLayout={e=>setHeight(Math.floor(e.nativeEvent.layout.height))}>
   <Animated.View style={{height:ready?Math.min(height,page.end-page.start):height,overflow:'hidden',opacity:ready?motion:0,transform:[{translateX:motion.interpolate({inputRange:[0,1],outputRange:[direction.current*22,0]})}]}}>
    <FlowContext.Provider value={context}><NativeView collapsable={false} ref={root} onLayout={e=>{setTotal(Math.ceil(e.nativeEvent.layout.height));measure();}} style={[{position:'absolute',top:0,left:0,right:0,padding:20,gap:16,transform:[{translateY:-page.start}]},contentContainerStyle]}>{children}</NativeView></FlowContext.Provider>
   </Animated.View>
  </NativeView>
  <NativeView style={{paddingHorizontal:16,paddingTop:8,paddingBottom:Math.max(10,insets.bottom+8),borderTopWidth:1,borderColor:theme.line,backgroundColor:theme.paper,gap:6}}>
   <NativeText accessibilityLiveRegion="polite" style={{fontSize:12,lineHeight:16,textAlign:'center',color:theme.muted}}>{page.title+' · '+(current+1)+' / '+pages.length}</NativeText>
   <NativeView style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6}}>
    <Pressable accessibilityRole="button" accessibilityLabel="이전 페이지" disabled={current===0} onPress={()=>turn(current-1)} style={{minWidth:64,minHeight:44,alignItems:'center',justifyContent:'center',opacity:current===0?.35:1}}><NativeText style={{color:theme.ink,fontWeight:'600'}}>← 이전</NativeText></Pressable>
    <NativeView style={{flexDirection:'row',gap:4}}>{visible.map(n=><Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n+1}번 페이지`} accessibilityState={{selected:current===n}} onPress={()=>turn(n)} style={{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:current===n?theme.action:theme.soft}}><NativeText style={{color:current===n?'#fff':theme.ink,fontWeight:'600',fontSize:15}}>{n+1}</NativeText></Pressable>)}</NativeView>
    <Pressable accessibilityRole="button" accessibilityLabel="다음 페이지" disabled={current===pages.length-1} onPress={()=>turn(current+1)} style={{minWidth:64,minHeight:44,alignItems:'center',justifyContent:'center',opacity:current===pages.length-1?.35:1}}><NativeText style={{color:theme.action,fontWeight:'600'}}>다음 →</NativeText></Pressable>
   </NativeView>
  </NativeView>
 </NativeView>;
}
