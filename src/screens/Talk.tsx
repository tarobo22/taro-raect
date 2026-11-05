import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Animated,PanResponder,Platform,Pressable,Switch,TextInput,View,useWindowDimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Character,Expression} from '../components/Character';
import {Copy,Panel,Button,Chip,Notice,s} from '../components/UI';
import {VoiceButton} from '../components/VoiceButton';
import {color} from '../design/tokens';
import type {Advice} from '../domain/content';
import {submitCounsel,counselRetries} from '../composition';
import {useSubmit} from '../features/experience/useSubmit';
import {useStore,Counsel} from '../state/store';
import {feedback} from '../services/feedback';
import {Nav,Route} from '../navigation';
import {AIConversationSubmit} from './P0Tarot';

export function Talk({nav,route}:{nav:Nav;route?:Route}){
 const store=useStore(),config=store.config;
 const [topic,setTopic]=useState(''),[question,setQuestion]=useState(''),[answers,setAnswers]=useState<boolean[]>([]);
 const [response,setResponse]=useState<Counsel|null>(null),[parentId,setParent]=useState<string|undefined>(),[followup,setFollowup]=useState(false);
 const [useAI,setUseAI]=useState(!!route?.conversationId),[aiConversationId,setAIConversation]=useState<string|undefined>(route?.conversationId),[voice,setVoice]=useState(''),[preview,setPreview]=useState(0),[expression,setExpression]=useState<Expression>('listen');
 const [hydrated,setHydrated]=useState(false),[locked,setLocked]=useState(false);
 const {submit,busy,error,acknowledge}=useSubmit(submitCounsel,counselRetries);
 const width=Math.min(useWindowDimensions().width,430)-48,profileWidth=Math.max(130,width-116);
 const move=useRef(new Animated.Value(0)).current,fade=useRef(new Animated.Value(1)).current;
 useEffect(()=>{let mounted=true;AsyncStorage.getItem('yeoun.talk.draft').then(v=>{if(v&&mounted)try{const d=JSON.parse(v);if(typeof d.question==='string')setQuestion(d.question);if(Array.isArray(d.answers)&&d.answers.every((x:unknown)=>typeof x==='boolean'))setAnswers(d.answers);if(typeof d.topic==='string')setTopic(d.topic);if(typeof d.aiConversationId==='string')setAIConversation(d.aiConversationId);if(typeof d.parentId==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(d.parentId)){setParent(d.parentId);setFollowup(true);}}catch{}}).catch(()=>{}).finally(()=>{if(mounted)setHydrated(true);});return()=>{mounted=false;};},[]);
 useEffect(()=>{if(hydrated&&(!response||followup))AsyncStorage.setItem('yeoun.talk.draft',JSON.stringify({question,answers,topic,parentId,aiConversationId})).catch(()=>{});},[question,answers,topic,parentId,aiConversationId,hydrated,response,followup]);
 const choicesComplete=!!config&&answers.length>=config.questions.length;
 function choose(yes:boolean){
  if(locked||busy||response||choicesComplete||!config)return;setLocked(true);feedback('select');setExpression(yes?'encourage':'listen');
  setAnswers(v=>[...v,yes].slice(0,config.questions.length));
  Animated.sequence([Animated.timing(fade,{toValue:.55,duration:store.reduced?0:100,useNativeDriver:Platform.OS!=='web'}),Animated.timing(fade,{toValue:1,duration:store.reduced?0:150,useNativeDriver:Platform.OS!=='web'})]).start(()=>{move.setValue(0);setPreview(0);setLocked(false);});
 }
 const chooseRef=useRef(choose);chooseRef.current=choose;
 const pan=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>false,onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>10&&Math.abs(g.dx)>Math.abs(g.dy)*1.3,
  onPanResponderMove:(_,g)=>{move.setValue(Math.max(-8,Math.min(8,g.dx/10)));setPreview(Math.abs(g.dx)>24?(g.dx>0?1:-1):0);},
  onPanResponderRelease:(_,g)=>{if(Math.abs(g.dx)>width*.18&&Math.abs(g.dx)>Math.abs(g.dy)*1.3)chooseRef.current(g.dx>0);move.setValue(0);setPreview(0);},
  onPanResponderTerminate:()=>{move.setValue(0);setPreview(0);}
 }),[move,width]);
 if(!config)return <View style={s.stack}><Notice error={!!store.error}>{store.error||'이야기를 준비하고 있어요.'}</Notice><Button secondary onPress={store.refresh}>다시 불러오기</Button></View>;
 const currentTopic=config.topics.includes(topic)?topic:config.topics[0];
 async function ask(){
  if(useAI||busy||(!question.trim()&&!answers.length))return;
  const saved=await submit({topic:currentTopic,question,answers,tone:store.tone,useAI,consent:useAI,parentId});
  if(saved){feedback('confirm');setResponse(saved);setFollowup(false);setExpression(saved.expression);try{await AsyncStorage.removeItem('yeoun.talk.draft');await acknowledge();}catch{}await store.refresh();}
 }
 const canChoose=!busy&&!locked&&!response&&!choicesComplete;
 return <View style={s.stack}>
  <View style={s.wrap}><Chip selected={store.tone==='warm'} onPress={()=>store.setTone('warm')}>다정하게</Chip><Chip selected={store.tone==='giga'} onPress={()=>store.setTone('giga')}>기가차드 모드</Chip></View>
  {!parentId?<View style={s.wrap}>{config.topics.map(t=><Chip key={t} selected={currentTopic===t} onPress={()=>setTopic(t)}>{t}</Chip>)}</View>:null}
  <View style={{width,alignItems:'center',justifyContent:'center',paddingVertical:10}}>
   <Pressable accessibilityRole="button" accessibilityLabel="아니요 선택" disabled={!canChoose} onPress={()=>choose(false)} style={{position:'absolute',left:0,zIndex:2,alignItems:'center',gap:6,opacity:canChoose?1:.45}}><View style={{width:44,height:48,borderRadius:17,backgroundColor:preview<0?color.pink:color.surface,borderWidth:1,borderColor:color.line,alignItems:'center',justifyContent:'center'}}><Copy style={{fontSize:24}}>←</Copy></View><Copy kind="label">아니요</Copy></Pressable>
   <Animated.View {...(canChoose?pan.panHandlers:{})} style={{width:profileWidth,alignItems:'center',backgroundColor:color.mint,borderRadius:26,paddingVertical:14,opacity:fade,transform:[{translateX:move}]}}><Copy kind="label" muted>{store.tone==='giga'?'단호하지만, 네 편에서':'오늘도 당신의 편에서'}</Copy><Character expression={expression} giga={store.tone==='giga'} reduced={store.reduced} size={Math.min(198,profileWidth-18)}/></Animated.View>
   <Pressable accessibilityRole="button" accessibilityLabel="예 선택" disabled={!canChoose} onPress={()=>choose(true)} style={{position:'absolute',right:0,zIndex:2,alignItems:'center',gap:6,opacity:canChoose?1:.45}}><View style={{width:44,height:48,borderRadius:17,backgroundColor:preview>0?color.mintDeep:color.surface,borderWidth:1,borderColor:color.line,alignItems:'center',justifyContent:'center'}}><Copy style={{fontSize:24}}>→</Copy></View><Copy kind="label">예</Copy></Pressable>
  </View>
  {response?<><Panel><Copy kind="small" muted>나의 이야기</Copy><Copy style={{marginTop:8}}>{response.question||'선택으로 전한 오늘의 마음'}</Copy></Panel><AdviceBlocks data={response}/></>:!parentId?<><Copy kind="label" muted style={{textAlign:'center'}}>{Math.min(answers.length+1,config.questions.length)} / {config.questions.length} · 왼쪽 아니요, 오른쪽 예</Copy><Copy kind="subtitle" style={{textAlign:'center'}}>{choicesComplete?'선택을 확인하고, 준비되면 보내 주세요.':config.questions[answers.length]}</Copy>
   <View style={{height:3,backgroundColor:color.line,borderRadius:3}}><View style={{height:3,width:`${answers.length/config.questions.length*100}%`,backgroundColor:color.action,borderRadius:3}}/></View>
   {answers.length?<View style={[s.row,{justifyContent:'space-between'}]}><Copy kind="small" muted>{answers.map((yes,i)=>(i+1)+'. '+(yes?'예':'아니요')).join(' · ')}</Copy><Pressable accessibilityRole="button" accessibilityLabel="마지막 선택 취소" onPress={()=>{feedback('back');setAnswers(v=>v.slice(0,-1));}} style={{minHeight:44,justifyContent:'center'}}><Copy kind="small">한 단계 전으로</Copy></Pressable></View>:null}</>:null}
  {!response||followup?<><TextInput accessibilityLabel="상담 내용 입력" editable={!busy} multiline maxLength={config.maxCounselQuestion} value={question} onChangeText={setQuestion} placeholder={parentId?'조금 더 이야기해 주세요.':'선택 대신, 하고 싶은 이야기를 직접 적어도 좋아요.'} placeholderTextColor={color.muted} style={s.input}/>
   <View style={[s.row,{justifyContent:'space-between'}]}><VoiceButton value={question} onText={setQuestion} onStatus={setVoice}/><Copy kind="small" muted>{question.length} / {config.maxCounselQuestion}</Copy></View>
   <Button secondary onPress={()=>nav.push({name:'cloud-voice',cloudTarget:'talk'})}>클라우드 음성 파일로 이야기 쓰기</Button>
   <Panel style={{gap:8}}><View style={[s.row,{justifyContent:'space-between'}]}><Copy kind="small">GPT와 이야기하기</Copy><Switch accessibilityLabel="GPT 대화 방식 선택" disabled={!config.aiAvailable||busy} value={useAI} onValueChange={setUseAI} trackColor={{false:color.line,true:color.mintDeep}} thumbColor={color.surface}/></View><Copy kind="small" muted>{config.aiAvailable?'이야기 방식을 고른 뒤 목적별 동의와 전송 범위를 확인하고 직접 보내 주세요.':'현재 기본 가이드로 대화할 수 있어요. GPT 연결은 준비 중이에요.'}</Copy></Panel>
   {useAI?<AIConversationSubmit nav={nav} question={question} answers={answers} topic={currentTopic} conversationId={aiConversationId} onConversation={setAIConversation}/>:<Button disabled={!question.trim()&&!answers.length} busy={busy} onPress={ask} icon="send">내 이야기 보내기</Button>}{voice?<Notice>{voice}</Notice>:null}
  </>:<><Button onPress={()=>{setParent(response.id);setQuestion('');setAnswers([]);setFollowup(true);}}>이 이야기 이어가기</Button><Button icon="edit" secondary onPress={()=>nav.push({name:'journal',initialText:response.question+'\n\n지금의 조언: '+response.advice+'\n작은 행동: '+response.action+'\n\n내 마음은 '})}>마음기록으로 이어가기</Button><Button secondary onPress={()=>{setAnswers([]);setResponse(null);setParent(undefined);setQuestion('');setExpression('welcome');}}>새로운 이야기 시작</Button></>}
  {error?<Notice error>{error}</Notice>:null}
 </View>;
}
export function AdviceBlocks({data}:{data:Advice&{source?:Counsel['source']}}){
 return <View style={s.stack}><Copy style={{textAlign:'center'}}>{data.empathy}</Copy><Panel tone={color.sage}><Copy kind="subtitle">지금의 조언</Copy><Copy style={{marginTop:10}}>{data.advice}</Copy></Panel><Panel tone={color.peach}><Copy kind="subtitle">지금 할 수 있는 한 가지</Copy><Copy style={{marginTop:10}}>{data.action}</Copy></Panel><Copy kind="small" muted>{data.source==='openai'?'GPT가 함께 정리한 이야기예요.':data.source==='safety'?'지금은 안전한 곳에서 함께할 사람을 찾는 것이 먼저예요.':'선택한 상황을 바탕으로 마음을 정리하는 기본 가이드예요.'}</Copy></View>;
}
