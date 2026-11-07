import {PageView as View,PageFlow} from '../components/PageFlow';
import React,{useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {ActivityIndicator,Linking,Modal,Pressable,ScrollView,Switch,Text,TextInput} from 'react-native';
import {Copy,Panel,Button,Chip,Notice,s} from '../components/UI';
import {TarotArt} from '../components/TarotArt';
import {VoiceButton} from '../components/VoiceButton';
import {RevealingAssetImage} from './P0';
import {useStore} from '../state/store';
import {color} from '../design/tokens';
import {counselingRepository} from '../composition';
import {requestId} from '../infrastructure/requestId';
import {currentConsent} from '../features/p0/model';
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

const fail=(code:string|null)=>({UNKNOWN_PROVIDER_OUTCOME:'앞선 요청의 처리 여부를 확인하지 못했어요. 새 요청은 추가 비용이 생길 수 있어요.',CONSENT_REQUIRED:'AI 이용 동의가 바뀌었어요. 설정을 확인해 주세요.',GLOSSARY_CHANGED:'사전이 바뀌었어요. 이야기를 다시 보내 뜻을 확인해 주세요.',AI_RATE_LIMITED:'요청이 몰려 잠시 쉬고 있어요. 조금 뒤 다시 시도해 주세요.'} as Record<string,string>)[code||'']||'답변을 마치지 못했어요. 이야기는 남아 있고, 뽑은 카드는 유지돼요.';
function SourceLink({source}:{source:Source}){return source.url?.startsWith('https://')?<Text accessibilityRole="link" onPress={()=>{void Linking.openURL(source.url!);}} style={{fontSize:13,lineHeight:21,color:color.action,textDecorationLine:'underline'}}>{source.title}</Text>:<Copy kind="small" muted>{source.title}</Copy>;}

export function CounselingScreen({nav,route}:{nav:Nav;route:Route}){
 const store=useStore(),owner=store.bootstrap?.user.id||'',draftMemory=useCounselingDraft(),skin=useSkin(),theme=useSkinTheme();
 const controller=useMemo(()=>new CounselingController(counselingRepository,requestId,draftMemory,
  {owner,topic:route.topic as Topic,sessionId:route.counselingSessionId,initialText:route.initialText}),
  [owner,route.counselingSessionId,route.initialText,route.topic,draftMemory]);
 const {value,text,busy,error,caps,definitions,sessions,pending}=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
 const setText=(next:string)=>controller.setText(next),processing=controller.processing;
 const [voice,setVoice]=useState(''),[count,setCount]=useState<1|3>(3),[web,setWeb]=useState(true),[remember,setRemember]=useState(true),[activeCard,setActiveCard]=useState(0);
 const [settings,setSettings]=useState(false),[term,setTerm]=useState(''),[meaning,setMeaning]=useState('');
 const [editing,setEditing]=useState(false),[history,setHistory]=useState(false),[deleting,setDeleting]=useState(false),[references,setReferences]=useState(false);
 const input=useRef<TextInput>(null),scroll=useRef<ScrollView>(null);
 const consent=store.bootstrap?currentConsent(store.consents,'ai_processing',store.bootstrap.policy_version):undefined;
 useEffect(()=>{void controller.initialize();return()=>controller.dispose();},[controller]);
 useEffect(()=>{
  if(!processing)return;let disposed=false;let timer:ReturnType<typeof setTimeout>;
  async function poll(){await controller.refresh();if(!disposed&&controller.processing)timer=setTimeout(()=>void poll(),1200);}
  timer=setTimeout(()=>void poll(),500);return()=>{disposed=true;clearTimeout(timer);};
 },[controller,processing,value?.id]);
 useEffect(()=>{if(value?.job?.state==='succeeded'){feedback('confirm');setActiveCard(0);}},[value?.job?.id,value?.job?.state]);
 async function refresh(){await controller.refresh();}
 async function send(){if(consent)await controller.send(consent.id,remember);}
 function confirm(){if(consent)void controller.confirm(consent.id,count,web);}
 async function openSettings(){setSettings(true);await controller.loadManagement();}
 async function saveDefinition(){if(await controller.define(term,meaning)){setTerm('');setMeaning('');setEditing(false);}}
 async function forget(entry:Definition){await controller.forget(entry.id);}
 async function remove(){if(await controller.deleteCurrent()){setSettings(false);setDeleting(false);nav.replace({name:'counseling'});}}
 const result=value?.result,lastUser=[...(value?.history||[])].reverse().find(item=>item.role==='user');
 const card=value?.cards[activeCard],reflection=result?.tarot.find(item=>item.card_id===card?.card_id);
 const canSend=!!consent&&!!caps?.available&&!busy&&!processing&&!pending&&!!text.trim();
 return <View style={{flex:1,backgroundColor:theme.paper}}>
  <View style={{paddingHorizontal:20,paddingTop:6,paddingBottom:12,borderBottomWidth:1,borderColor:theme.line,backgroundColor:theme.paper}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><Copy kind="label" muted>{value?.phase==='support'?'지금은 안전이 먼저예요':value?.cards.length?'지금 함께 살펴보는 카드':'이야기를 먼저 들을게요'}</Copy><Pressable accessibilityRole="button" onPress={()=>void openSettings()} style={{minHeight:44,justifyContent:'center'}}><Copy kind="small">사전·대화기록</Copy></Pressable></View>
   {value?.phase!=='support'?<View style={{flexDirection:'row',justifyContent:'center',gap:20}}>{value?.cards.length?value.cards.map((c,i)=><Pressable key={c.position} accessibilityRole="button" accessibilityLabel={c.card.name_ko+' 카드 설명 보기'} accessibilityState={{selected:activeCard===i}} onPress={()=>{setActiveCard(i);feedback('select');}} style={{alignItems:'center',gap:4,padding:4,borderRadius:12,borderWidth:1,borderColor:activeCard===i?theme.action:'transparent'}}><RevealingAssetImage asset={c.card.image_asset} label={c.card.name_ko} width={64} eventKey={(value.draw?.id||value.id)+':'+c.card_id} delay={i*170}/><Copy kind="label" style={{maxWidth:84,textAlign:'center'}}>{c.card.name_ko}</Copy></Pressable>):[0,1,2].slice(0,count).map(i=><View key={i} style={{opacity:.72}}><TarotArt back width={54}/></View>)}</View>:null}
   {card?<Copy kind="small" muted style={{textAlign:'center',marginTop:7}}>{card.position_label}</Copy>:null}
  </View>
  <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{padding:20,gap:14}} onContentSizeChange={()=>{if(!history)scroll.current?.scrollTo({y:0,animated:!store.reduced});}}>
   {!value?<View style={{flexDirection:'row',gap:14,alignItems:'center'}}><Character size={76} expression="welcome" reduced={store.reduced} framed={false}/><View style={{flex:1,gap:6}}><Copy kind="subtitle">어떤 마음으로 오셨나요?</Copy><Copy muted>잘 정리된 말이 아니어도 괜찮아요. 먼저 듣고, 제가 이해한 게 맞는지 여쭤볼게요.</Copy></View></View>:null}
   {!caps?.available&&caps?<Notice>지금은 AI 대화 연결을 준비하고 있어요. 기본 가이드와 마음기록은 계속 이용하실 수 있어요.</Notice>:null}
   {!consent?<><Copy kind="small" muted>오른쪽 위 설정에서 AI 이용을 허용하면 이야기를 보낼 수 있어요.</Copy></>:null}
   {value&&value.history.length>2?<Pressable accessibilityRole="button" onPress={()=>setHistory(!history)} style={{minHeight:44,justifyContent:'center'}}><Copy kind="small" muted>{history?'앞선 이야기 접기':'앞선 이야기 보기'}</Copy></Pressable>:null}
   {history?value?.history.slice(0,-2).map((h,i)=><Panel key={i} tone={h.role==='user'?theme.tint:theme.surface}><Copy kind="small" muted>{h.role==='user'?'나의 이야기':'함께 나눈 말'}</Copy><Copy>{h.text}</Copy></Panel>):null}
   {lastUser?<Panel tone={theme.tint} style={{alignSelf:'flex-end',maxWidth:'94%',padding:16}}><Copy>{lastUser.text}</Copy></Panel>:null}
   {processing?<View accessibilityLiveRegion="polite" style={{flexDirection:'row',gap:10,alignItems:'center',paddingVertical:12}}><ActivityIndicator color={theme.action}/><Copy muted>{value?.cards.length?'카드와 이야기를 함께 살펴보고 있어요.':'말씀해주신 마음을 천천히 듣고 있어요.'}</Copy></View>:null}
   {!processing&&value?.acknowledgement&&!result?<View style={{flexDirection:'row',gap:10,alignItems:'center'}}><Character size={60} expression="listen" reduced={store.reduced} framed={false}/><View style={{flex:1,gap:5}}><Copy kind="label" muted>{skins[skin.id].name}</Copy><Copy style={{fontSize:17,lineHeight:28}}>{value.acknowledgement}</Copy></View></View>:null}
   {!processing&&value?.phase==='clarifying'?<Panel style={{padding:16}}><Copy style={{fontSize:17,lineHeight:28}}>{value.clarification_question}</Copy></Panel>:null}
   {!processing&&value?.phase==='confirmation'?<><Panel style={{padding:18,gap:10}}>{value.perspective?<Copy kind="label" muted>{value.perspective}의 입장에서</Copy>:null}<Copy style={{fontSize:17,lineHeight:28}}>{value.understanding}</Copy>{!/[?？]\s*$/.test(value.understanding||'')?<Copy muted>제가 이해한 내용이 맞을까요?</Copy>:null}</Panel>{value.response_mode!=='listen'?<View style={{flexDirection:'row',gap:8}}><Chip selected={count===1} onPress={()=>setCount(1)}>한 장으로</Chip><Chip selected={count===3} onPress={()=>setCount(3)}>세 장으로</Chip></View>:null}<Button busy={busy} disabled={!consent||!caps?.available||!!pending} onPress={confirm}>{value.response_mode==='listen'?'맞아요, 이야기 이어갈게요':'맞아요, 함께 살펴봐요'}</Button><Button secondary onPress={()=>input.current?.focus()}>조금 달라요 · 이야기 보태기</Button></>:null}
   {!processing&&result?<><View style={{flexDirection:'row',gap:10,alignItems:'center'}}><Character size={60} expression="encourage" reduced={store.reduced} framed={false}/><View style={{flex:1,gap:5}}><Copy kind="label" muted>{skins[skin.id].name}</Copy><Copy style={{fontSize:17,lineHeight:28}}>{result.empathy}</Copy></View></View>{reflection?<Panel tone={theme.soft} style={{padding:18,gap:8}}><Copy kind="label" muted>{card?.card.name_ko}에서 살펴본 관점</Copy><Copy style={{fontSize:17,lineHeight:28}}>{reflection.reflection}</Copy></Panel>:null}<Panel style={{padding:18,gap:10}}><Copy kind="subtitle">{value?.response_mode==='listen'?'편하게 이어가세요':'지금의 나에게'}</Copy><Copy style={{fontSize:17,lineHeight:28}}>{result.advice}</Copy></Panel>{result.actions.map((a,i)=><Panel key={i} tone={theme.warm} style={{padding:16,gap:8}}><Copy kind="label">오늘의 작은 행동 {result.actions.length>1?i+1:''}</Copy><Copy>{a}</Copy><Pressable accessibilityRole="button" onPress={()=>{setText('이 방법을 해봤어요. '+a+'\n해보니 ');input.current?.focus();}} style={{minHeight:44,justifyContent:'center'}}><Copy kind="small">해본 이야기 나누기 →</Copy></Pressable></Panel>)}<>{result.facts.length?<><Pressable accessibilityRole="button" onPress={()=>setReferences(!references)} style={{minHeight:44,justifyContent:"center"}}><Copy kind="small" muted>{references?"참고한 내용 접기":"이야기에 참고한 내용"}</Copy></Pressable>{references?result.facts.map((f,i)=><Panel key={i} style={{padding:16,gap:7}}><Copy>{f.text}</Copy>{f.source_ids.map(id=>{const source=value?.sources.find(s=>s.id===id);return source?<SourceLink key={id} source={source}/>:null;})}</Panel>):null}</>:null}</>{result.follow_up_question?<Copy>{result.follow_up_question}</Copy>:null}<Button secondary onPress={()=>nav.push({name:'journal',initialText:(lastUser?.text||'')+'\n\n마음에 남은 말: '+result.advice})}>마음기록으로 남기기</Button><Copy kind="small" muted>타로는 마음을 돌아보는 관점이에요. 선택은 내가 정해요.</Copy></>:null}
   {value?.job?.state==='failed'?<Notice error>{fail(value.job.error_code)}</Notice>:null}
   {error?<><Notice error>{error}</Notice>{pending?<Button secondary busy={busy} onPress={()=>{void controller.retry();}}>같은 요청으로 상태 확인</Button>:<Button secondary onPress={()=>void refresh()}>상태 다시 확인</Button>}</>:null}
  </ScrollView>
  <View style={{paddingHorizontal:16,paddingTop:10,paddingBottom:16,gap:8,borderTopWidth:1,borderColor:theme.line,backgroundColor:theme.surface}}>
   <TextInput ref={input} accessibilityLabel="여운 상담 이야기 입력" multiline maxLength={2000} editable={!busy&&!processing} value={text} onChangeText={setText} placeholder={value?.phase==='clarifying'?'편하게 더 들려주세요.':'지금 하고 싶은 말, 편하게 적어주세요.'} placeholderTextColor={theme.muted} style={[s.input,{minHeight:58,maxHeight:120,padding:12,fontSize:16,lineHeight:25}]}/>
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


