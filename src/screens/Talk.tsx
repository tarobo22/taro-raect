import {PageView as View} from '../components/PageFlow';
import {ChoiceStage} from '../components/ChoiceStage';
import {OptionRail} from '../components/OptionRail';
import {StepProgress} from '../components/StepProgress';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Pressable,Switch,TextInput} from 'react-native';
import AsyncStorage from '../features/account/storage';
import {Character,type Expression} from '../components/Character';
import {Copy,Panel,Button,Chip,Notice,s} from '../components/UI';
import {VoiceButton} from '../components/VoiceButton';
import {color} from '../design/tokens';
import {localDay,type Advice} from '../domain/content';
import {submitCounsel,counselRetries} from '../composition';
import {useSubmit} from '../features/experience/useSubmit';
import {useSkinTheme} from '../features/skins/useSkinTheme';
import {useStore,Counsel} from '../state/store';
import {feedback} from '../services/feedback';
import {Nav,Route} from '../navigation';
import {AIConversationSubmit} from './P0Tarot';
import {useScreenDraft} from '../features/screenDraft/useScreenDraft';

const TALK_DRAFT_KEY='yeoun.talk.draft';

export function Talk({nav,route}:{nav:Nav;route?:Route}){
 const theme=useSkinTheme(),store=useStore(),config=store.config;
 const [topic,setTopicState]=useState(''),[question,setQuestionState]=useState(''),[answers,setAnswersState]=useState<boolean[]>([]);
 const draftSession=useScreenDraft(),[draftError,setDraftError]=useState('');
 const setTopic=(value:string)=>{draftSession.changed();setTopicState(value);};
 const setQuestion=(value:string)=>{draftSession.changed();setQuestionState(value);};
 const setAnswers=(value:React.SetStateAction<boolean[]>)=>{draftSession.changed();setAnswersState(value);};
 const [response,setResponse]=useState<Counsel|null>(null),[parentId,setParent]=useState<string|undefined>(),[followup,setFollowup]=useState(false);
 const [useAI,setUseAI]=useState(!!route?.conversationId),[aiConversationId,setAIConversation]=useState<string|undefined>(route?.conversationId),[inputSource,setInputSource]=useState<'text'|'voice'>('text'),[voice,setVoice]=useState('');
 const [hydrated,setHydrated]=useState(false),[writing,setWriting]=useState(true);
 const [resetCount,setResetCount]=useState(0),[showSubmitError,setShowSubmitError]=useState(false);
 const draftDay=useRef(localDay()),generation=useRef(0);
 const {submit,busy,error,acknowledge}=useSubmit(submitCounsel,counselRetries);
 const resetDraft=useCallback((day:string)=>{
  generation.current++;
  draftSession.changed();
  draftDay.current=day;
  setResetCount(count=>count+1);
  setTopicState('');
  setQuestionState('');
  setAnswersState([]);
  setResponse(null);
  setParent(undefined);
  setFollowup(false);
  setAIConversation(undefined);
  setUseAI(false);
  setInputSource('text');
  setVoice('');
  setWriting(true);
  setDraftError('');
  setShowSubmitError(false);
  if(route?.conversationId)nav.update({conversationId:undefined});
 },[draftSession,nav,route?.conversationId]);
 useEffect(()=>{
  let mounted=true;
  void draftSession.restore(()=>AsyncStorage.getItem(TALK_DRAFT_KEY),raw=>{
   if(!raw||!mounted)return;
   const draft=JSON.parse(raw);
   if(typeof draft.day==='string'&&draft.day!==draftDay.current)return;
   if(typeof draft.question==='string')setQuestionState(draft.question);
   if(Array.isArray(draft.answers)&&draft.answers.every((value:unknown)=>typeof value==='boolean'))setAnswersState(draft.answers);
   if(typeof draft.topic==='string')setTopicState(draft.topic);
   if(typeof draft.aiConversationId==='string')setAIConversation(draft.aiConversationId);
   if(draft.useAI===true)setUseAI(true);
   if(draft.inputSource==='voice')setInputSource('voice');
   if(typeof draft.parentId==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(draft.parentId)){
    setParent(draft.parentId);
    setFollowup(true);
   }
  }).catch(()=>{if(mounted)setDraftError('이전 이야기를 불러오지 못했어요. 지금 입력한 내용은 유지해요.');})
   .finally(()=>{if(mounted)setHydrated(true);});
  return()=>{mounted=false;draftSession.dispose();};
 },[draftSession]);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  function syncDay(){
   clearTimeout(timer);
   const day=localDay();
   if(day!==draftDay.current)resetDraft(day);
   const midnight=new Date();
   midnight.setHours(24,0,0,0);
   timer=setTimeout(syncDay,Math.max(1,midnight.getTime()-Date.now()));
  }
  syncDay();
  const foreground=AppState.addEventListener('change',state=>{if(state==='active')syncDay();});
  return()=>{foreground.remove();clearTimeout(timer);};
 },[resetDraft]);
 useEffect(()=>{
  if(!hydrated||response&&!followup)return;
  const draft={day:draftDay.current,question,answers,topic,parentId,aiConversationId,useAI,inputSource};
  void draftSession.write(()=>AsyncStorage.setItem(TALK_DRAFT_KEY,JSON.stringify(draft)))
   .catch(()=>setDraftError('이야기를 기기에 보관하지 못했어요. 입력한 내용은 이 화면에 남아 있어요.'));
 },[draftSession,question,answers,topic,parentId,aiConversationId,useAI,inputSource,hydrated,response,followup,resetCount]);
 const choicesComplete=!!config&&answers.length>=config.questions.length;
 function choose(yes:boolean){
  if(!hydrated||busy||response||choicesComplete||!config)return false;
  setAnswers(v=>[...v,yes].slice(0,config.questions.length));return true;
 }
 if(!config)return <View style={s.stack}><Notice error={!!store.error}>{store.error||'이야기를 준비하고 있어요.'}</Notice><Button secondary onPress={store.refresh}>다시 불러오기</Button></View>;
 const currentTopic=config.topics.includes(topic)?topic:config.topics[0];
 async function ask(){
  if(useAI||busy||(!question.trim()&&!answers.length))return;
  setShowSubmitError(true);
  const requestGeneration=generation.current;
  const saved=await submit({topic:currentTopic,question,answers,tone:store.tone,useAI,consent:useAI,parentId});
  if(!saved)return;
  if(requestGeneration===generation.current){
   feedback('confirm');
   setResponse(saved);
   setFollowup(false);
   try{await draftSession.write(()=>AsyncStorage.removeItem(TALK_DRAFT_KEY));}catch{}
  }
  try{await acknowledge();}catch{}
  await store.refresh();
 }
 const canChoose=hydrated&&!busy&&!response&&!choicesComplete;
 const expression:Expression=answers.length?(answers[answers.length-1]?'encourage':'listen'):'welcome';
 return <View style={s.stack}>
  <Button secondary onPress={()=>nav.push({name:'counseling',initialText:question})}>타로와 함께 마음 이야기</Button>
  {!parentId?<OptionRail options={config.topics} value={currentTopic} onChange={setTopic} label="대화 주제"/>:null}
  {response?<><View style={{alignItems:'center'}}><Character expression={response.expression} giga={store.tone==='giga'} reduced={store.reduced} size={130} framed={false}/></View><Panel><Copy kind="small" muted>나의 이야기</Copy><Copy style={{marginTop:8}}>{response.question||'선택으로 전한 오늘의 마음'}</Copy></Panel><AdviceBlocks data={response}/></>:!parentId?<>
   <View><ChoiceStage key={resetCount} showButtons={false} disabled={!canChoose} reduced={store.reduced} onChoice={choose}>
    <View style={{backgroundColor:theme.soft,borderRadius:24,padding:16,alignItems:'center',gap:6}}><Copy kind="label" muted>{store.tone==='giga'?'단호하지만, 네 편에서':'오늘도 당신의 편에서'}</Copy><View pointerEvents="none"><Character expression={expression} giga={store.tone==='giga'} reduced={store.reduced} size={164} framed={false}/></View><Copy kind="subtitle" style={{textAlign:'center',fontSize:19,lineHeight:27}}>{choicesComplete?'질문에 모두 답했어요. 아래에서 대화를 시작해요.':config.questions[answers.length]}</Copy></View>
   </ChoiceStage></View>
   <View><StepProgress value={answers.length} total={config.questions.length} reduced={store.reduced} label="대화 선택"/></View>
  </>:null}
  <Button secondary disabled={!hydrated||busy} onPress={()=>resetDraft(localDay())}>초기화</Button>
  {!response||followup?<><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Pressable accessibilityRole="button" accessibilityLabel="상담 직접 쓰기 열기" onPress={()=>setWriting(!writing)} style={{minHeight:48,justifyContent:'center'}}><Copy kind="small" style={{fontWeight:'600'}}>{writing?'입력 접기 ↑':question.trim()?'작성한 이야기 보기 ↓':'직접 쓰기 ↓'}</Copy></Pressable><VoiceButton onCloud={()=>nav.push({name:'cloud-voice',cloudTarget:'talk'})} value={question} onText={value=>{setQuestion(value);setInputSource('voice');setWriting(true);}} onStatus={setVoice}/></View>
   {writing||!!parentId?<><TextInput accessibilityLabel="상담 내용 입력" editable={!busy} multiline maxLength={config.maxCounselQuestion} value={question} onChangeText={value=>{setQuestion(value);setInputSource('text');}} placeholder={parentId?'조금 더 이야기해 주세요.':'선택 대신, 하고 싶은 이야기를 직접 적어도 좋아요.'} placeholderTextColor={color.muted} style={[s.input,{minHeight:104}]}/>
<Copy kind="small" muted>{question.length} / {config.maxCounselQuestion}</Copy>

</>:null}
   {config.aiAvailable?<View style={[s.row,{justifyContent:'space-between'}]}><Copy kind="small">GPT와 이야기하기</Copy><Switch accessibilityLabel="GPT 대화 방식 선택" disabled={!config.aiAvailable||busy} value={useAI} onValueChange={setUseAI} trackColor={{false:color.line,true:color.mintDeep}} thumbColor={color.surface}/></View>:null}
   {useAI?<AIConversationSubmit key={resetCount} nav={nav} question={question} answers={answers} topic={currentTopic} conversationId={aiConversationId} onConversation={setAIConversation} inputSource={inputSource}/>:<Button disabled={!question.trim()&&!answers.length} busy={busy} onPress={ask} icon="send">대화하기</Button>}{voice?<Notice>{voice}</Notice>:null}
  </>:<Button onPress={()=>{setParent(response.id);setQuestion('');setAnswers([]);setFollowup(true);}}>이 이야기 이어가기</Button>}
  {(showSubmitError&&error)||draftError?<Notice error>{(showSubmitError&&error)||draftError}</Notice>:null}
 </View>;
}
export function AdviceBlocks({data}:{data:Advice&{source?:Counsel['source']}}){
 return <View style={s.stack}><Copy style={{textAlign:'center'}}>{data.empathy}</Copy><Panel tone={color.sage}><Copy kind="subtitle">지금의 조언</Copy><Copy style={{marginTop:10}}>{data.advice}</Copy></Panel><Panel tone={color.peach}><Copy kind="subtitle">지금 할 수 있는 한 가지</Copy><Copy style={{marginTop:10}}>{data.action}</Copy></Panel><Copy kind="small" muted>{data.source==='openai'?'GPT가 함께 정리한 이야기예요.':data.source==='safety'?'지금은 안전한 곳에서 함께할 사람을 찾는 것이 먼저예요.':'선택한 상황을 바탕으로 마음을 정리하는 기본 가이드예요.'}</Copy></View>;
}
