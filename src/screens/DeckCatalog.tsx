import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Animated,PanResponder,Platform,Pressable,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AssetImage,LoadState} from './P0';
import {Button,Copy,Notice} from '../components/UI';
import {useSkinTheme} from '../features/skins/useSkinTheme';
import {useP0Read} from '../features/p0/useP0';
import type {CatalogCard,Deck} from '../features/p0/model';
import {p0Repository} from '../composition';
import {useStore} from '../state/store';
import {feedback} from '../services/feedback';
import type {Nav,Route} from '../navigation';

export function Decks({nav,route}:{nav:Nav;route?:Route}){
 const store=useStore(),theme=useSkinTheme(),insets=useSafeAreaInsets();
 const catalog=useP0Read(()=>p0Repository.decks());
 const [deckId,setDeckId]=useState(route?.deckId||store.selectedDeck);
 const decks=catalog.value?.items||[],deck=decks.find(item=>item.id===deckId)||decks[0];
 const active=deck?decks.findIndex(item=>item.id===deck.id):0;
 function move(step:number){const next=decks[active+step];if(next){setDeckId(next.id);nav.update({deckId:next.id});feedback('select');}}
 return <View style={{flex:1,backgroundColor:theme.paper,padding:20,paddingBottom:Math.max(16,insets.bottom),gap:12}}>
  <Copy kind="subtitle">마음에 드는 그림을 골라요.</Copy>
  <Copy kind="small" muted>그림을 크게 보고, 사용할 덱을 선택하세요.</Copy>
  <LoadState {...catalog} reload={catalog.reload}/>
  {deck?<DeckChoice key={deck.id} deck={deck} selected={store.selectedDeck===deck.id} nav={nav} onSelect={()=>{store.setSelectedDeck(deck.id);nav.back();}}/>:!catalog.busy&&!catalog.error?<Notice>현재 선택할 수 있는 덱이 없어요.</Notice>:null}
  {decks.length>1?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Pressable accessibilityRole="button" accessibilityLabel="이전 덱" disabled={active===0} onPress={()=>move(-1)} style={{minHeight:48,justifyContent:'center',opacity:active===0?.35:1}}><Copy>← 이전 덱</Copy></Pressable>
   <Copy kind="small" muted>{active+1} / {decks.length}</Copy>
   <Pressable accessibilityRole="button" accessibilityLabel="다음 덱" disabled={active===decks.length-1} onPress={()=>move(1)} style={{minHeight:48,justifyContent:'center',opacity:active===decks.length-1?.35:1}}><Copy>다음 덱 →</Copy></Pressable>
  </View>:null}
 </View>;
}

function DeckChoice({deck,selected,nav,onSelect}:{deck:Deck;selected:boolean;nav:Nav;onSelect:()=>void}){
 const theme=useSkinTheme(),cards=useP0Read(()=>p0Repository.cards(deck.id),[deck.id]);
 const [space,setSpace]=useState({width:320,height:440});
 const thumbs=cards.value?.items.slice(0,3)||[];
 const cardWidth=Math.min(94,(space.width-32)/3,Math.max(52,(space.height-240)/1.7));
 function preview(cardId?:number){nav.update({deckId:deck.id});nav.push({name:'deck-preview',deckId:deck.id,cardId});}
 return <View onLayout={e=>setSpace(e.nativeEvent.layout)} style={{flex:1,minHeight:0,gap:12}}>
  <View style={{flex:1,minHeight:0,justifyContent:'center',alignItems:'center',borderRadius:24,backgroundColor:theme.soft,padding:12}}>
   <View style={{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'}}>
    {thumbs.length?thumbs.map((card,i)=><Pressable key={card.id} accessibilityRole="button" accessibilityLabel={card.name_ko+' 크게 미리보기'} onPress={()=>preview(card.id)} style={{transform:[{rotate:(i-1)*5+'deg'},{translateY:i===1?-8:0}]}}><AssetImage asset={card.image_asset} label={card.name_ko+' 앞면'} width={cardWidth}/></Pressable>):<AssetImage asset={deck.back_asset} label={deck.name+' 뒷면'} width={Math.min(100,cardWidth)}/>}
   </View>
   <View style={{marginTop:14}}><Copy kind="small" muted>그림을 누르면 크게 볼 수 있어요</Copy></View>
  </View>
  <View style={{gap:5}}>
   <Copy kind="subtitle">{deck.name}</Copy>
   <Copy kind="small" muted>{deck.card_count}장 · {selected?'사용 중':deck.status==='retired'?'사용 종료':'선택 가능한 덱'}</Copy>
  </View>
  <LoadState {...cards} reload={cards.reload}/>
  <Button secondary disabled={cards.busy||!thumbs.length} onPress={()=>preview()}>전체 카드 미리보기</Button>
  <View style={{flexDirection:'row',gap:12,alignItems:'center'}}>
   <Pressable accessibilityRole="button" accessibilityLabel="덱 그림 출처" onPress={()=>nav.push({name:'sources',deckId:deck.id})} style={{minWidth:80,minHeight:48,alignItems:'center',justifyContent:'center'}}><Copy kind="small" muted>그림 출처</Copy></Pressable>
   <Button style={{flex:1}} disabled={deck.status==='retired'} onPress={onSelect}>{selected?'이 덱으로 완료':'이 덱 사용하기'}</Button>
  </View>
 </View>;
}

export function DeckPreviewScreen({nav,route}:{nav:Nav;route:Route}){
 const theme=useSkinTheme(),{reduced}=useStore(),insets=useSafeAreaInsets();
 const data=useP0Read(async()=>{
  const items:CatalogCard[]=[],seen=new Set<string>();let cursor:string|undefined;
  do{const page=await p0Repository.cards(route.deckId!,cursor);items.push(...page.items);cursor=page.next_cursor||undefined;if(cursor){if(seen.has(cursor))throw new Error('카드 목록을 다시 확인해 주세요.');seen.add(cursor);}}while(cursor);
  return items.filter((card,i,all)=>all.findIndex(item=>item.id===card.id)===i);
 },[route.deckId]);
 const [index,setIndex]=useState(0),[artSpace,setArtSpace]=useState({width:280,height:320});
 const cards=data.value||[],card=cards[index],shift=useRef(new Animated.Value(0)).current,transitioning=useRef(false);
 useEffect(()=>{setIndex(Math.max(0,data.value?.findIndex(item=>item.id===route.cardId)??0));shift.setValue(0);transitioning.current=false;},[data.value,route.cardId,shift]);
 useEffect(()=>()=>{shift.stopAnimation();},[shift]);
 const reset=()=>Animated.spring(shift,{toValue:0,speed:28,bounciness:0,useNativeDriver:Platform.OS!=='web'}).start();
 function turn(step:number){
  if(transitioning.current)return;const next=index+step;if(next<0||next>=cards.length){reset();return;}
  feedback('tick');
  if(reduced){shift.setValue(0);setIndex(next);return;}
  transitioning.current=true;
  Animated.timing(shift,{toValue:-step*90,duration:110,useNativeDriver:Platform.OS!=='web'}).start(({finished})=>{
   if(!finished){transitioning.current=false;return;}
   setIndex(next);shift.setValue(step*70);
   Animated.timing(shift,{toValue:0,duration:170,useNativeDriver:Platform.OS!=='web'}).start(()=>{transitioning.current=false;});
  });
 }
 const pan=useMemo(()=>PanResponder.create({
  onMoveShouldSetPanResponder:(_e,g)=>!transitioning.current&&Math.abs(g.dx)>7&&Math.abs(g.dx)>Math.abs(g.dy)*1.2,
  onPanResponderMove:(_e,g)=>{const boundary=index===0&&g.dx>0||index===cards.length-1&&g.dx<0;shift.setValue(Math.max(-120,Math.min(120,g.dx*(boundary?.2:1))));},
  onPanResponderRelease:(_e,g)=>{if(Math.abs(g.dx)>45||Math.abs(g.dx)>10&&Math.abs(g.vx)>.45)turn(g.dx<0?1:-1);else reset();},
  onPanResponderTerminate:reset,
 }),[index,cards.length,reduced]);
 const ratio=card?.image_asset?Math.min(2,card.image_asset.height/card.image_asset.width):1.68;
 const imageWidth=Math.max(40,Math.min(246,artSpace.width-24,(artSpace.height-24)/ratio));
 return <View style={{flex:1,minHeight:0,backgroundColor:theme.paper,paddingHorizontal:20,paddingTop:14,paddingBottom:Math.max(16,insets.bottom),gap:10}}>
  <LoadState {...data} reload={data.reload}/>
  {card?<>
   <View accessibilityLiveRegion="polite" style={{alignItems:'center',gap:2}}>
    <Copy kind="label" muted>{index+1} / {cards.length}</Copy>
    <Copy kind="title">{card.name_ko}</Copy>
    <Copy kind="small" muted>{card.name_en}</Copy>
   </View>
   <View {...pan.panHandlers} onLayout={e=>setArtSpace(e.nativeEvent.layout)} accessibilityLabel="카드 그림 · 좌우로 넘기기" style={{flex:1,minHeight:0,justifyContent:'center',alignItems:'center',overflow:'hidden',borderRadius:22,backgroundColor:theme.soft}}
    {...(Platform.OS==='web'?{onKeyDown:(e:{nativeEvent:{key?:string};preventDefault:()=>void})=>{if(e.nativeEvent.key==='ArrowLeft'||e.nativeEvent.key==='ArrowRight'){e.preventDefault();turn(e.nativeEvent.key==='ArrowLeft'?-1:1);}}}:{})}>
    <Animated.View style={{transform:[{translateX:shift}],opacity:shift.interpolate({inputRange:[-120,0,120],outputRange:[.25,1,.25],extrapolate:'clamp'})}}>
     <AssetImage key={card.id} asset={card.image_asset} label={card.name_ko+' 원본 앞면'} width={imageWidth}/>
    </Animated.View>
   </View>
   <Text selectable={false} style={{fontSize:12,textAlign:'center',color:theme.muted}}>카드를 좌우로 밀어 넘겨보세요</Text>
   <View style={{flexDirection:'row',gap:12}}>
    <Button secondary style={{flex:1}} disabled={index===0} onPress={()=>turn(-1)}>← 이전 카드</Button>
    <Button secondary style={{flex:1}} disabled={index===cards.length-1} onPress={()=>turn(1)}>다음 카드 →</Button>
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel="이 카드의 그림 출처" onPress={()=>nav.push({name:'sources',deckId:route.deckId,cardId:card.id})} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><Copy kind="small" muted>그림 출처</Copy></Pressable>
  </>:!data.busy&&!data.error?<Notice>미리 볼 카드가 없어요.</Notice>:null}
 </View>;
}
