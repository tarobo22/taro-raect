import {PageView as View,PageFlow} from '../components/PageFlow';
import React,{useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {ActivityIndicator,Linking,Modal,Pressable,ScrollView,Switch,Text,TextInput,useWindowDimensions} from 'react-native';
import {Copy,Panel,Button,Chip,Notice,s} from '../components/UI';
import {TarotArt} from '../components/TarotArt';
import {VoiceButton} from '../components/VoiceButton';
import {RevealingAssetImage} from './P0';
import {useStore} from '../state/store';
import {color} from '../design/tokens';
import {counselingRepository} from '../composition';
import {requestId} from '../infrastructure/requestId';
import {useSendConsent} from '../features/consent/SendConsentProvider';
import type {Topic} from '../features/p0/model';
import {CounselingController} from '../features/counseling/CounselingController';
import {useCounselingDraft} from '../features/counseling/DraftProvider';
import type {Definition,Source} from '../features/counseling/CounselingApi';
import type {Nav,Route} from '../navigation';
import {feedback} from '../services/feedback';
import {Character} from '../components/Character';
import {useSkin} from '../features/skins/SkinProvider';
import {skins} from '../features/skins/catalog';
import {useSkinTheme} from '../features/skins/useSkinTheme';

const fail=(code:string|null)=>({UNKNOWN_PROVIDER_OUTCOME:'앞선 요청의 처리 여부를 확인하지 못했어요. 새 요청은 추가 비용이 생길 수 있어요.',CONSENT_REQUIRED:'이야기를 다시 보내면 전송 여부를 확인할 수 있어요.',GLOSSARY_CHANGED:'사전이 바뀌었어요. 이야기를 다시 보내 뜻을 확인해 주세요.',AI_RATE_LIMITED:'요청이 몰려 잠시 쉬고 있어요. 조금 뒤 다시 시도해 주세요.'} as Record<string,string>)[code||'']||'답변을 마치지 못했어요. 이야기는 남아 있고, 뽑은 카드는 유지돼요.';
function SourceLink({source}:{source:Source}){return source.url?.startsWith('https://')?<Text accessibilityRole="link" onPress={()=>{void Linking.openURL(source.url!);}} style={{fontSize:13,lineHeight:21,color:color.action,textDecorationLine:'underline'}}>{source.title}</Text>:<Copy kind="small" muted>{source.title}</Copy>;}

export function CounselingScreen({nav,route}:{nav:Nav;route:Route}){
 const store=useStore(),owner=store.bootstrap?.user.id||'',draftMemory=useCounselingDraft(),skin=useSkin(),theme=useSkinTheme();
 const controller=useMemo(()=>new CounselingController(counselingRepository,requestId,draftMemory,
  {owner,topic:route.topic as Topic,sessionId:route.counselingSessionId,initialText:route.initialText,sourceReadingId:route.sourceReadingId,draftKey:route.counselingDraftKey}),
  [owner,route.counselingSessionId,route.initialText,route.topic,route.sourceReadingId,route.counselingDraftKey,draftMemory]);
 const {value,text,busy,error,caps,definitions,sessions,pending}=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const setText=(next:string)=>controller.setText(next),processing=controller.processing;
 const processingStart=useRef<{id:string;version:number}|null>(null);
 if(value?.job&&processingStart.current?.id!==value.job.id)processingStart.current={id:value.job.id,version:value.version};
 const preparedAcknowledgement=processing&&value?.job?.state==='running'&&value.phase==='confirmation'&&value.version>(processingStart.current?.version??value.version);
 const [voice,setVoice]=useState(''),[count,setCount]=useState<1|3|5>(route.cardCount||3),[web,setWeb]=useState(true),[remember,setRemember]=useState(true);
 const [settings,setSettings]=useState(false),[term,setTerm]=useState(''),[meaning,setMeaning]=useState('');
 const [editing,setEditing]=useState(false),[deleting,setDeleting]=useState(false),[references,setReferences]=useState(false);
 const input=useRef<TextInput>(null),scroll=useRef<ScrollView>(null),followLatest=useRef(true);
 const requestConsent=useSendConsent(),[sendError,setSendError]=useState('');
 useEffect(()=>{followLatest.current=true;void controller.initialize();return()=>controller.dispose();},[controller]);
 useEffect(()=>{
  if(!processing)return;let disposed=false;let timer:ReturnType<typeof setTimeout>;
  async function poll(){await controller.refresh();if(!disposed&&controller.processing)timer=setTimeout(()=>void poll(),500);}
  timer=setTimeout(()=>void poll(),100);return()=>{disposed=true;clearTimeout(timer);};
 },[controller,processing,value?.id]);
 useEffect(()=>{if(value?.job?.state==='succeeded'){feedback('confirm');}},[value?.job?.id,value?.job?.state]);
 async function refresh(){await controller.refreshCapabilities();await controller.refresh();}
 async function send(){
  if(busy||processing||pending||!text.trim())return;
  setSendError('');
  if(!caps?.available&&!await controller.refreshCapabilities()){setSendError('지금은 답변을 받지 못했어요. 잠시 후 다시 보내 주세요.');return;}
  const permission=await requestConsent(['ai_processing']);
  if(permission?.ai_processing){followLatest.current=true;await controller.send(permission.ai_processing.id,remember,{cardCount:count,webSearch:web});}
 }
 async function confirm(){const permission=await requestConsent(['ai_processing']);if(permission?.ai_processing){followLatest.current=true;await controller.confirm(permission.ai_processing.id,count,web);}}
 async function openSettings(){setSettings(true);await controller.loadManagement();}
 async function saveDefinition(){if(await controller.define(term,meaning)){setTerm('');setMeaning('');setEditing(false);}}
 async function forget(entry:Definition){await controller.forget(entry.id);}
 async function remove(){if(await controller.deleteCurrent()){setSettings(false);setDeleting(false);nav.replace({name:'counseling'});}}
 const result=value?.result,lastUser=[...(value?.history||[])].reverse().find(item=>item.role==='user');
 const windowWidth=useWindowDimensions().width,displayCount=value?.cards.length||count,cardWidth=Math.min(64,Math.floor((Math.min(windowWidth,430)-40-6*displayCount-8*(displayCount-1))/displayCount));
 const transcript=value?.history||[];
 const hasCurrentReply=!processing&&!!(result||value?.acknowledgement||value?.clarification_question||value?.understanding);
 const earlierMessages=hasCurrentReply&&transcript.at(-1)?.role==='assistant'?transcript.slice(0,-1):transcript;
 const canSend=!busy&&!processing&&!pending&&!!text.trim();
 const composerHint=result?'이어서 하고 싶은 말을 적어 주세요.':'지금 하고 싶은 말, 편하게 적어주세요.';
 return <View style={{flex:1,backgroundColor:theme.paper}}>
  <View style={{paddingHorizontal:20,paddingTop:6,paddingBottom:12,borderBottomWidth:1,borderColor:theme.line,backgroundColor:theme.paper}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><Copy kind="label" muted>{value?.phase==='support'?'지금은 안전이 먼저예요':value?.cards.length?'카드를 누르면 해석을 볼 수 있어요':count+'장 타로 · 이야기를 먼저 들을게요'}</Copy><Pressable accessibilityRole="button" onPress={()=>void openSettings()} style={{minHeight:44,justifyContent:'center'}}><Copy kind="small">대화 옵션</Copy></Pressable></View>
   {value?.phase!=='support'&&value?.response_mode!=='listen'?<View style={{flexDirection:'row',justifyContent:'center',gap:8}}>{value?.cards.length?value.cards.map((c,i)=><Pressable key={c.position} accessibilityRole="button" accessibilityLabel={c.card.name_ko+' 카드 해석 보기'} onPress={()=>{feedback('select');nav.push({name:'card',cardId:c.card_id,cardData:c.card,cardReflection:result?.tarot.find(item=>item.card_id===c.card_id)?.reflection,positionLabel:c.position_label,orientation:c.orientation});}} style={{alignItems:'center',gap:4,padding:3}}><RevealingAssetImage asset={c.card.image_asset} label={c.card.name_ko} width={cardWidth} eventKey={(value.draw?.id||value.id)+':'+c.card_id} delay={i*130}/><Copy kind="label" style={{maxWidth:cardWidth+6,fontSize:11,textAlign:'center'}}>{c.card.name_ko}</Copy></Pressable>):Array.from({length:count},(_,i)=>i).map(i=><View key={i} style={{opacity:.72}}><TarotArt back width={Math.min(54,cardWidth)}/></View>)}</View>:null}
  </View>
  <ScrollView ref={scroll} accessibilityLabel="상담 채팅 내역" style={{flex:1,minHeight:0}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator contentContainerStyle={{padding:20,gap:14}} scrollEventThrottle={16}
   onScroll={event=>{const {contentOffset,layoutMeasurement,contentSize}=event.nativeEvent;followLatest.current=contentSize.height-layoutMeasurement.height-contentOffset.y<64;}}
   onContentSizeChange={()=>{if(followLatest.current)scroll.current?.scrollToEnd({animated:!store.reduced});}}>
   {!value||value.phase==='listening'?<View style={{flexDirection:'row',gap:14,alignItems:'center'}}><Character size={76} expression="welcome" reduced={store.reduced} framed={false}/><View style={{flex:1,gap:6}}><Copy kind="subtitle">{route.sourceReadingId?'어떤 이야기를 더 나누고 싶나요?':'어떤 마음으로 오셨나요?'}</Copy><Copy muted>{route.sourceReadingId?'뽑은 카드와 앞선 고민을 기억하고 있어요. 지금 마음을 편하게 들려주세요.':'먼저 이야기를 듣고, 고른 장수의 카드와 함께 살펴볼게요.'}</Copy></View></View>:null}
   {earlierMessages.map((h,i)=><Panel key={i} tone={h.role==='user'?theme.tint:theme.surface} style={{alignSelf:h.role==='user'?'flex-end':'flex-start',maxWidth:'94%',padding:16,gap:6}}>{h.role==='assistant'?<Copy kind="small" muted>{skins[skin.id].name}</Copy>:null}<Copy>{h.text}</Copy></Panel>)}
   {processing?<View accessibilityLiveRegion="polite" style={{flexDirection:'row',gap:10,alignItems:'center',paddingVertical:12}}><ActivityIndicator color={theme.action}/><Copy muted>{value?.cards.length?'뽑은 카드로 답변을 정리하고 있어요.':'답변을 준비하고 있어요.'}</Copy></View>:null}
   {(!processing||preparedAcknowledgement)&&value?.acknowledgement&&!result?<View style={{flexDirection:'row',gap:10,alignItems:'center'}}><Character size={60} expression="listen" reduced={store.reduced} framed={false}/><View style={{flex:1,gap:5}}><Copy kind="label" muted>{skins[skin.id].name}</Copy><Copy style={{fontSize:17,lineHeight:28}}>{value.acknowledgement}</Copy></View></View>:null}
   {!processing&&value?.phase==='clarifying'?<Panel style={{padding:16}}><Copy style={{fontSize:17,lineHeight:28}}>{value.clarification_question}</Copy></Panel>:null}
   {!processing&&value?.phase==='confirmation'?<><Panel style={{padding:18,gap:10}}>{value.perspective?<Copy kind="label" muted>{value.perspective}의 입장에서</Copy>:null}<Copy style={{fontSize:17,lineHeight:28}}>{value.understanding}</Copy>{!/[?？]\s*$/.test(value.understanding||'')?<Copy muted>제가 이해한 내용이 맞을까요?</Copy>:null}</Panel>{value.response_mode!=='listen'&&!value.cards.length?<View style={{flexDirection:'row',gap:8}}><Chip selected={count===1} onPress={()=>setCount(1)}>1장</Chip><Chip selected={count===3} onPress={()=>setCount(3)}>3장</Chip><Chip selected={count===5} onPress={()=>setCount(5)}>5장</Chip></View>:null}<Button busy={busy} disabled={!caps?.available||!!pending} onPress={confirm}>{value.response_mode==='listen'?'맞아요, 이야기 이어갈게요':'맞아요, 함께 살펴봐요'}</Button><Button secondary onPress={()=>input.current?.focus()}>조금 달라요 · 이야기 보태기</Button></>:null}
   {!processing&&result?<>
    <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
     <Character size={60} expression="encourage" reduced={store.reduced} framed={false}/>
     <Copy kind="label" muted>{skins[skin.id].name}</Copy>
    </View>
    <Panel style={{padding:18,gap:8}}>
     <Copy>{result.empathy}</Copy>
     <Copy>{result.advice}</Copy>
     {result.actions.map((action,index)=><Copy key={index}>{action}</Copy>)}
     {result.follow_up_question?<Copy>{result.follow_up_question}</Copy>:null}
    </Panel>
    {result.facts.length?<>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:references}} onPress={()=>setReferences(!references)} style={{minHeight:44,justifyContent:'center'}}>
      <Copy kind="small" muted>{references?'참고한 내용 접기':'이야기에 참고한 내용'}</Copy>
     </Pressable>
     {references?result.facts.map((fact,index)=><Panel key={index} style={{padding:16,gap:7}}>
      <Copy>{fact.text}</Copy>
      {fact.source_ids.map(id=>{const source=value?.sources.find(item=>item.id===id);return source?<SourceLink key={id} source={source}/>:null;})}
     </Panel>):null}
    </>:null}
    <Copy kind="small" muted>타로는 마음을 돌아보는 관점이에요. 선택은 내가 정해요.</Copy>
   </>:null}
   {value?.job?.state==='failed'?<Notice error>{fail(value.job.error_code)}</Notice>:null}
   {sendError?<View accessibilityLiveRegion="polite"><Copy kind="small" muted>{sendError}</Copy></View>:null}
   {error?<><Notice error>{error}</Notice>{pending?<Button secondary busy={busy} onPress={()=>{void controller.retry();}}>같은 요청으로 상태 확인</Button>:<Button secondary onPress={()=>void refresh()}>상태 다시 확인</Button>}</>:null}
  </ScrollView>
  <View style={{paddingHorizontal:16,paddingTop:10,paddingBottom:16,gap:8,borderTopWidth:1,borderColor:theme.line,backgroundColor:theme.surface}}>
   <TextInput ref={input} accessibilityLabel="여운 상담 이야기 입력" multiline maxLength={2000} editable={!busy&&!processing} value={text} onChangeText={setText} placeholder={value?.phase==='clarifying'?'편하게 더 들려주세요.':composerHint} placeholderTextColor={theme.muted} style={[s.input,{minHeight:58,maxHeight:120,padding:12,fontSize:16,lineHeight:25}]}/>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><VoiceButton value={text} onText={setText} onStatus={setVoice} onCloud={()=>{draftMemory.write(value?.id||'new',{text,sessionId:value?.id});nav.push({name:'cloud-voice',cloudTarget:'counseling',counselingSessionId:value?.id});}}/><Button busy={busy} disabled={!canSend} onPress={()=>void send()} style={{minWidth:112}}>이야기 보내기</Button></View>{voice?<Copy kind="small" muted>{voice}</Copy>:null}
  </View>
  <Modal visible={settings} transparent animationType={store.reduced?'none':'fade'} onRequestClose={()=>setSettings(false)}><View style={{flex:1,backgroundColor:'rgba(32,44,36,.3)',justifyContent:'center',padding:20}}><Panel style={{height:'88%',padding:18,gap:10}}><View style={[s.row,{justifyContent:'space-between'}]}><Copy kind="subtitle">내 사전과 대화</Copy><Button secondary onPress={()=>setSettings(false)}>닫기</Button></View><PageFlow title="내 사전과 대화" style={{flex:1}} contentContainerStyle={{gap:14,padding:0}}>
   <View style={[s.row,{justifyContent:'space-between'}]}><View style={{flex:1}}><Copy>내가 설명한 용어 기억</Copy><Copy kind="small" muted>명확하게 알려주신 뜻만 내 사전에 보관해요.</Copy></View><Switch accessibilityLabel="개인 용어 기억" value={remember} onValueChange={setRemember}/></View>
   <View style={[s.row,{justifyContent:"space-between"}]}><View style={{flex:1}}><Copy>필요한 표현의 뜻만 참고</Copy><Copy kind="small" muted>상담에 꼭 필요한 낯선 표현만 짧게 확인해요.</Copy></View><Switch accessibilityLabel="필요한 상담 표현 참고" value={web} onValueChange={setWeb}/></View><Copy kind="subtitle">개인 용어사전</Copy>{definitions.length?definitions.map(d=><Panel key={d.id} style={{padding:12,gap:6}}><Copy>{d.term}</Copy><Copy kind="small" muted>{d.definition}</Copy><View style={{flexDirection:'row',gap:16}}><Pressable accessibilityRole="button" onPress={()=>{setTerm(d.term);setMeaning(d.definition);setEditing(true);}} style={{minHeight:44,justifyContent:'center'}}><Copy kind="small">뜻 수정</Copy></Pressable><Pressable accessibilityRole="button" onPress={()=>void forget(d)} style={{minHeight:44,justifyContent:'center'}}><Copy kind="small">사전에서 지우기</Copy></Pressable></View></Panel>):<Copy kind="small" muted>아직 기억한 용어가 없어요.</Copy>}
   <Button secondary onPress={()=>setEditing(!editing)}>용어 직접 추가</Button>{editing?<><TextInput accessibilityLabel="개인 용어" value={term} onChangeText={setTerm} maxLength={60} style={[s.input,{minHeight:48}]} placeholder="용어"/><TextInput accessibilityLabel="개인 용어 의미" value={meaning} onChangeText={setMeaning} maxLength={400} multiline style={s.input} placeholder="나에게 어떤 뜻인가요?"/><Button disabled={!term.trim()||!meaning.trim()} onPress={()=>void saveDefinition()}>이 뜻으로 기억하기</Button></>:null}
   <Copy kind="subtitle">이전 대화</Copy>{sessions.map(v=><Button key={v.id} secondary onPress={()=>{setSettings(false);nav.replace({name:'counseling',counselingSessionId:v.id});}}>{v.summary.slice(0,48)}</Button>)}<Button secondary onPress={()=>{setSettings(false);controller.startNew();nav.replace({name:'counseling'});}}>새 이야기 시작하기</Button>{value?<Button secondary onPress={()=>setDeleting(true)}>이 대화 삭제</Button>:null}{deleting?<><Notice>대화와 카드 기록을 함께 지울까요? 개인 용어사전은 따로 관리할 수 있어요.</Notice><Button onPress={()=>void remove()}>확인하고 대화 삭제</Button><Button secondary onPress={()=>setDeleting(false)}>대화 남겨두기</Button></>:null}
  </PageFlow></Panel></View></Modal>
 </View>;
}


