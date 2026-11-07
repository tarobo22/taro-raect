import {PageView as View,PageFlow,PageSection} from '../components/PageFlow';
import React,{useEffect,useRef,useState} from 'react';
import {Animated,Platform,Pressable,TextInput,useWindowDimensions} from 'react-native';
import {Copy,Panel,Button,Notice,s} from '../components/UI';
import {Icon} from '../components/Icon';
import {TarotArt,FlippingCard} from '../components/TarotArt';
import {SelectionDial} from '../components/SelectionDial';
import {VoiceButton} from '../components/VoiceButton';
import {localDay} from '../domain/content';
import {color} from '../design/tokens';
import {useStore,Reading} from '../state/store';
import {submitReading,submitDaily,readingRetries} from '../composition';
import {useSubmit} from '../features/experience/useSubmit';
import {feedback} from '../services/feedback';
import {Nav,Route} from '../navigation';
import {requestId} from '../infrastructure/requestId';
import AsyncStorage from '../features/account/storage';
import {DeckChoice,DrawV2,topicCode,ResourceDelete} from './P0Tarot';
import {useScreenDraft} from '../features/screenDraft/useScreenDraft';
import {TarotSetupIntro,CompactTopicPicker,TarotDepthPicker} from '../components/TarotSetup';

function shuffled(ids:number[]){const result=[...ids];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function LoadingConfig(){const store=useStore();return <View style={s.stack}><Notice error={!!store.error}>{store.error||'카드와 이야기를 준비하고 있어요.'}</Notice><Button secondary onPress={store.refresh}>다시 불러오기</Button></View>;}

export function Topics({nav,route}:{nav:Nav;route?:Route}){
 const store=useStore(),config=store.config;
 const [topic,setTopicState]=useState(route?.topic||''),[spreadId,setSpreadState]=useState(route?.spreadId||'three'),[question,setQuestionState]=useState(route?.question||''),[voice,setVoice]=useState(''),[hydrated,setHydrated]=useState(false);
 const draftSession=useScreenDraft(),[draftError,setDraftError]=useState('');
 const setTopic=(value:string)=>{draftSession.changed();setTopicState(value);};
 const setSpread=(value:string)=>{draftSession.changed();setSpreadState(value);};
 const setQuestion=(value:string)=>{draftSession.changed();setQuestionState(value);};
 useEffect(()=>{let active=true;void draftSession.restore(async()=>{const pairs=await AsyncStorage.multiGet(['yeoun.tarot.question','yeoun.tarot.options']);return Object.fromEntries(pairs);},saved=>{if(!active)return;if(saved['yeoun.tarot.question']!==null&&route?.question===undefined)setQuestionState(saved['yeoun.tarot.question']!);const raw=saved['yeoun.tarot.options'];if(raw){const options=JSON.parse(raw);if(route?.topic===undefined&&typeof options.topic==='string')setTopicState(options.topic);if(route?.spreadId===undefined&&typeof options.spreadId==='string')setSpreadState(options.spreadId);}}).catch(()=>{if(active)setDraftError('이전 질문을 불러오지 못했어요. 지금 입력한 내용은 유지해요.');}).finally(()=>{if(active)setHydrated(true);});return()=>{active=false;draftSession.dispose();};},[]);
 useEffect(()=>{if(hydrated){nav.update({topic,spreadId,question});void draftSession.write(()=>AsyncStorage.multiSet([['yeoun.tarot.question',question],['yeoun.tarot.options',JSON.stringify({topic,spreadId})]])).catch(()=>setDraftError('질문을 기기에 보관하지 못했어요. 입력한 내용은 이 화면에 남아 있어요.'));}},[topic,spreadId,question,hydrated]);
 if(!config)return <LoadingConfig/>;
 const selectedTopic=topic||config.topics[0],spread=config.spreads[spreadId]||Object.values(config.spreads)[0];
 return <View testID="tarot-setup" style={{gap:12}}>
  <View><TarotSetupIntro count={spread.positions.length} reduced={store.reduced}/></View>
  <View><CompactTopicPicker options={config.topics} value={selectedTopic} onChange={setTopic} reduced={store.reduced}/></View>
  <View><TarotDepthPicker spreads={config.spreads} value={spreadId} onChange={setSpread} reduced={store.reduced}/></View>
  <View style={{gap:6}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}><Copy kind="small" style={{flex:1,fontWeight:'600'}}>질문 (선택)</Copy><VoiceButton onCloud={()=>nav.push({name:'cloud-voice',cloudTarget:'tarot'})} value={question} onText={setQuestion} onStatus={setVoice}/><Pressable accessibilityRole="button" accessibilityLabel="클라우드 음성 파일로 질문 쓰기" onPress={()=>nav.push({name:'cloud-voice',cloudTarget:'tarot'})} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:color.sage}}><Icon name="book" size={17}/><Copy kind="label" muted>파일</Copy></Pressable></View>
   <TextInput accessibilityLabel="타로 질문 입력" value={question} onChangeText={setQuestion} multiline maxLength={config.maxTarotQuestion} placeholder="지금 어떤 마음인가요?" placeholderTextColor={color.muted} style={[s.input,{height:64,minHeight:64,maxHeight:88,padding:12,fontSize:14,lineHeight:21}]}/>
   <Copy kind="label" muted style={{textAlign:'right'}}>{question.length} / {config.maxTarotQuestion}</Copy>
  </View>
  {voice?<Notice>{voice}</Notice>:null}{draftError?<Notice error>{draftError}</Notice>:null}
  <DeckChoice nav={nav} compact/>
  {spread.positions.length===3||spread.positions.length===5?<Button icon="cards" onPress={()=>nav.push({name:'counseling',counselingDraftKey:requestId(),topic:topicCode(selectedTopic),initialText:question,cardCount:spread.positions.length as 3|5})}>{spread.positions.length}장 타로로 이야기하기</Button>:<Button icon="cards" onPress={()=>nav.push({name:'draw',topic:selectedTopic,question,spreadId,deck:shuffled(config.cards.map(c=>c.id)).slice(0,config.deckPreviewSize),selected:[]})}>{spread.positions.length}장의 카드 만나기</Button>}
 </View>;
}

export function Draw({nav,route}:{nav:Nav;route:Route}){
 return route.readingV2?<DrawV2 nav={nav} route={route}/>:<ClassicDraw nav={nav} route={route}/>;
}
function ClassicDraw({nav,route}:{nav:Nav;route:Route}){
 const store=useStore(),config=store.config,width=Math.min(useWindowDimensions().width,430)-48;
 const [shuffling,setShuffling]=useState(false);const shift=useRef(new Animated.Value(0)).current;
 const {submit,busy,error,acknowledge}=useSubmit(submitReading,readingRetries);const selected=route.selected||[],deck=route.deck||[];
 const spread=config?.spreads[route.spreadId||'three'];if(!config||!spread)return <LoadingConfig/>;
 const count=spread.positions.length,cell=(width-24)/4;
 async function finish(){if(selected.length!==count||busy)return;const result=await submit({topic:route.topic||config!.topics[0],question:route.question||'',cardIds:selected,spreadId:route.spreadId||'three'});if(result){feedback('confirm');await store.refresh();nav.push({name:'reading',reading:result});await acknowledge().catch(()=>{});}}
 function shuffle(){
  if(busy||shuffling)return;setShuffling(true);feedback('shuffle');
  Animated.sequence([Animated.timing(shift,{toValue:7,duration:store.reduced?0:120,useNativeDriver:Platform.OS!=='web'}),Animated.timing(shift,{toValue:-7,duration:store.reduced?0:140,useNativeDriver:Platform.OS!=='web'}),Animated.timing(shift,{toValue:0,duration:store.reduced?0:120,useNativeDriver:Platform.OS!=='web'})]).start(()=>{
   nav.update({deck:shuffled(config!.cards.map(c=>c.id)).slice(0,config!.deckPreviewSize),selected:[]});setShuffling(false);
  });
 }
 return <View style={s.stack}><Copy kind="title">마음이 가는 {count}장을 골라요.</Copy><Copy muted>{route.topic}{route.question?' · '+route.question:''}</Copy>
  <View style={[s.row,{justifyContent:'space-between',gap:6}]}>{spread.positions.map((p,i)=><View key={p} style={{alignItems:'center',gap:7,width:(width-(count-1)*6)/count}}><View style={{width:'100%',height:64,backgroundColor:selected[i]===undefined?color.surface:color.mint,borderColor:color.line,borderWidth:1,borderRadius:14,alignItems:'center',justifyContent:'center'}}>{selected[i]===undefined?<Copy muted>{i+1}</Copy>:<Icon name="check" tint={color.action}/>}</View><Copy kind="label" muted style={{textAlign:'center',fontSize:11}}>{p}</Copy></View>)}</View>
  <View style={[s.row,{justifyContent:'space-between'}]}><Copy kind="small" muted>{selected.length} / {count}장 선택</Copy><Pressable accessibilityRole="button" accessibilityLabel="카드 다시 섞기" onPress={shuffle} disabled={busy||shuffling} style={[s.row,{minHeight:48}]}><Icon name="refresh" size={18}/><Copy kind="small">다시 섞기</Copy></Pressable></View>
  <Animated.View style={[s.wrap,{gap:8,paddingVertical:6,transform:[{translateX:shift}]}]}>{deck.map((id,i)=><Pressable key={id} accessibilityRole="button" accessibilityLabel={`${i+1}번째 카드${selected.includes(id)?', 선택됨':''}`} accessibilityState={{selected:selected.includes(id)}} disabled={busy||shuffling} onPress={()=>{if(selected.includes(id)||selected.length<count){feedback('select');nav.update({selected:selected.includes(id)?selected.filter(v=>v!==id):[...selected,id]});}}} style={{opacity:selected.length===count&&!selected.includes(id)?.4:1,transform:[{translateY:selected.includes(id)?-4:0}]}}><TarotArt width={cell} back selected={selected.includes(id)}/>{selected.includes(id)?<View style={{position:'absolute',top:6,right:6,width:23,height:23,borderRadius:12,backgroundColor:color.surface,alignItems:'center',justifyContent:'center'}}><Copy kind="label">{selected.indexOf(id)+1}</Copy></View>:null}</Pressable>)}</Animated.View>
  {error?<Notice error>{error}</Notice>:null}<Button disabled={selected.length!==count} busy={busy} onPress={finish}>선택한 카드의 이야기 듣기</Button>
 </View>;
}

export function Daily({nav}:{nav:Nav}){
 const store=useStore(),config=store.config;const [topic,setTopic]=useState('');
 const {submit,busy,error}=useSubmit(submitDaily);if(!config)return <LoadingConfig/>;
 const current=topic||config.topics[0];
 async function draw(){const result=await submit({day:localDay(),topic:current});if(result){await store.refresh();nav.push({name:'reading',reading:result});}}
 return <View style={[s.stack,{alignItems:'center'}]}><Copy kind="label" muted>{localDay().replaceAll('-','. ')}</Copy><Copy kind="hero" style={{textAlign:'center'}}>오늘을 위한, 한 장.</Copy><Copy muted style={{textAlign:'center'}}>같은 날, 같은 주제의 카드를 간직해요.</Copy><View style={{paddingVertical:12}}><TarotArt back width={130}/></View>
  <View><SelectionDial label="오늘의 카드 주제" options={config.topics} value={current} onChange={setTopic}/></View>
  {error?<Notice error>{error}</Notice>:null}<Button busy={busy} onPress={draw} style={{alignSelf:'stretch'}}>오늘의 카드 열기</Button>
 </View>;
}

export function ReadingResult({nav,reading}:{nav:Nav;reading:Reading}){
 const store=useStore();
 return <View style={s.stack}><PageSection title="카드 확인"><Copy kind="label" muted>{reading.day?'오늘의 한 장':reading.topic+' · '+reading.cards.length+'장의 리딩'}</Copy><Copy kind="hero">{reading.cards[0].keyword},{'\n'}지금의 나를 위한 힌트.</Copy>
  {reading.question?<Panel><Copy kind="label" muted>나의 질문</Copy><Copy style={{marginTop:6}}>{reading.question}</Copy></Panel>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:14,paddingVertical:10}}>{reading.cards.map((card,i)=><View key={card.id} style={{alignItems:'center',gap:8}}><FlippingCard card={card} owner={store.bootstrap?.user.id||'local'} eventKey={reading.id?reading.id+':'+i+':'+card.id:undefined} width={reading.cards.length>3?86:100} delay={i*130} reduced={store.reduced}/><Copy kind="label" muted style={{textAlign:'center',maxWidth:100}}>{card.position}</Copy></View>)}</View>
  </PageSection><PageSection title="리딩의 메시지"><Panel tone={color.mint} style={{borderWidth:0}}><Copy kind="subtitle">{reading.summary}</Copy></Panel>
  </PageSection>{reading.cards.map((card,index)=><PageSection key={card.id} title={(index+1)+'번째 카드 해석'}><Panel><Copy kind="label" muted>{card.position}</Copy><Copy kind="subtitle" style={{marginTop:6,marginBottom:10}}>{card.name} · {card.keyword}</Copy><Copy>{card.message}</Copy></Panel></PageSection>)}
  <PageSection title="조언과 작은 행동"><Panel tone={color.sage}><Copy kind="subtitle">지금의 조언</Copy><Copy style={{marginTop:10}}>{reading.advice}</Copy></Panel><Panel tone={color.peach}><Copy kind="subtitle">오늘의 작은 행동</Copy><Copy style={{marginTop:10}}>{reading.action}</Copy></Panel>
  </PageSection><PageSection title="저장·이어가기"><Button icon="edit" onPress={()=>nav.push({name:'journal',sourceReadingId:reading.id,initialText:reading.question+'\n\n오늘의 힌트: '+reading.summary+'\n작은 행동: '+reading.action+'\n\n지금 내 마음은 '})}>이 마음을 기록으로 남기기</Button><Button secondary onPress={()=>nav.tab('records')}>내 기록 보러 가기</Button>
  {reading.id?<ResourceDelete kind="legacy-reading" id={reading.id} nav={nav}/>:null}<Copy kind="small" muted style={{textAlign:'center'}}>카드 해석은 선택을 돕는 참고로 만나 주세요.</Copy>
 </PageSection></View>;
}
