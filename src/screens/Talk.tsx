import {ChoiceStage} from '../components/ChoiceStage';
import {OptionRail} from '../components/OptionRail';
import {StepProgress} from '../components/StepProgress';
import React,{useEffect,useState} from 'react';
import {Pressable,Switch,TextInput,View} from 'react-native';
import AsyncStorage from '../features/account/storage';
import {Character,Expression} from '../components/Character';
import {Copy,Panel,Button,Chip,Notice,s} from '../components/UI';
import {VoiceButton} from '../components/VoiceButton';
import {color} from '../design/tokens';
import type {Advice} from '../domain/content';
import {submitCounsel,counselRetries} from '../composition';
import {useSubmit} from '../features/experience/useSubmit';
import {useSkinTheme} from '../features/skins/useSkinTheme';
import {useStore,Counsel} from '../state/store';
import {feedback} from '../services/feedback';
import {Nav,Route} from '../navigation';
import {AIConversationSubmit,ResourceDelete} from './P0Tarot';
import {useScreenDraft} from '../features/screenDraft/useScreenDraft';

export function Talk({nav,route}:{nav:Nav;route?:Route}){
 const theme=useSkinTheme(),store=useStore(),config=store.config;
 const [topic,setTopicState]=useState(''),[question,setQuestionState]=useState(''),[answers,setAnswersState]=useState<boolean[]>([]);
 const draftSession=useScreenDraft(),[draftError,setDraftError]=useState('');
 const setTopic=(value:string)=>{draftSession.changed();setTopicState(value);};
 const setQuestion=(value:string)=>{draftSession.changed();setQuestionState(value);};
 const setAnswers=(value:React.SetStateAction<boolean[]>)=>{draftSession.changed();setAnswersState(value);};
 const [response,setResponse]=useState<Counsel|null>(null),[parentId,setParent]=useState<string|undefined>(),[followup,setFollowup]=useState(false);
 const [useAI,setUseAI]=useState(!!route?.conversationId),[aiConversationId,setAIConversation]=useState<string|undefined>(route?.conversationId),[inputSource,setInputSource]=useState<'text'|'voice'>('text'),[voice,setVoice]=useState(''),[preview,setPreview]=useState(0),[expression,setExpression]=useState<Expression>('listen');
 const [hydrated,setHydrated]=useState(false),[writing,setWriting]=useState(false);
 const {submit,busy,error,acknowledge}=useSubmit(submitCounsel,counselRetries);
 useEffect(()=>{let mounted=true;void draftSession.restore(()=>AsyncStorage.getItem('yeoun.talk.draft'),v=>{if(v&&mounted){const d=JSON.parse(v);if(typeof d.question==='string')setQuestionState(d.question);if(Array.isArray(d.answers)&&d.answers.every((x:unknown)=>typeof x==='boolean'))setAnswersState(d.answers);if(typeof d.topic==='string')setTopicState(d.topic);if(typeof d.aiConversationId==='string')setAIConversation(d.aiConversationId);if(d.useAI===true)setUseAI(true);if(d.inputSource==='voice')setInputSource('voice');if(typeof d.parentId==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(d.parentId)){setParent(d.parentId);setFollowup(true);}}}).catch(()=>{if(mounted)setDraftError('이전 이야기를 불러오지 못했어요. 지금 입력한 내용은 유지해요.');}).finally(()=>{if(mounted)setHydrated(true);});return()=>{mounted=false;draftSession.dispose();};},[]);
 useEffect(()=>{if(hydrated&&(!response||followup))void draftSession.write(()=>AsyncStorage.setItem('yeoun.talk.draft',JSON.stringify({question,answers,topic,parentId,aiConversationId,useAI,inputSource}))).catch(()=>setDraftError('이야기를 기기에 보관하지 못했어요. 입력한 내용은 이 화면에 남아 있어요.'));},[question,answers,topic,parentId,aiConversationId,useAI,inputSource,hydrated,response,followup]);
 const choicesComplete=!!config&&answers.length>=config.questions.length;
 function choose(yes:boolean){
  if(busy||response||choicesComplete||!config)return false;
  setExpression(yes?'encourage':'listen');setAnswers(v=>[...v,yes].slice(0,config.questions.length));return true;
 }
 if(!config)return <View style={s.stack}><Notice error={!!store.error}>{store.error||'이야기를 준비하고 있어요.'}</Notice><Button secondary onPress={store.refresh}>다시 불러오기</Button></View>;
 const currentTopic=config.topics.includes(topic)?topic:config.topics[0];
 async function ask(){
  if(useAI||busy||(!question.trim()&&!answers.length))return;
  const saved=await submit({topic:currentTopic,question,answers,tone:store.tone,useAI,consent:useAI,parentId});
  if(saved){feedback('confirm');setResponse(saved);setFollowup(false);setExpression(saved.expression);try{await draftSession.write(()=>AsyncStorage.removeItem('yeoun.talk.draft'));await acknowledge();}catch{}await store.refresh();}
 }
 const canChoose=!busy&&!response&&!choicesComplete;
 return <View style={s.stack}>
  <Button secondary onPress={()=>nav.push({name:'counseling',initialText:question})}>타로와 함께 마음 이야기</Button>
  <OptionRail options={['다정하게','기가차드 모드']} value={store.tone==='warm'?'다정하게':'기가차드 모드'} onChange={value=>store.setTone(value==='다정하게'?'warm':'giga')} label="대화 말투"/>
  {!parentId?<OptionRail options={config.topics} value={currentTopic} onChange={setTopic} label="대화 주제"/>:null}
  {response?<><View style={{alignItems:'center'}}><Character expression={expression} giga={store.tone==='giga'} reduced={store.reduced} size={150} framed={false}/></View><Panel><Copy kind="small" muted>나의 이야기</Copy><Copy style={{marginTop:8}}>{response.question||'선택으로 전한 오늘의 마음'}</Copy></Panel><AdviceBlocks data={response}/></>:!parentId?<>
   <ChoiceStage disabled={!canChoose} reduced={store.reduced} onChoice={choose}>
    <View style={{backgroundColor:theme.soft,borderRadius:24,padding:16,alignItems:'center',gap:4}}><Copy kind="label" muted>{store.tone==='giga'?'단호하지만, 네 편에서':'오늘도 당신의 편에서'}</Copy><Character expression={expression} giga={store.tone==='giga'} reduced={store.reduced} size={142} framed={false}/><Copy kind="subtitle" style={{textAlign:'center',fontSize:19,lineHeight:27}}>{choicesComplete?'준비되면 이야기를 보내 주세요.':config.questions[answers.length]}</Copy></View>
   </ChoiceStage>
   <StepProgress value={answers.length} total={config.questions.length} reduced={store.reduced} label="대화 선택"/>
   {answers.length?<View style={[s.row,{justifyContent:'space-between'}]}><Copy kind="small" muted>{answers.map((yes,i)=>(i+1)+'. '+(yes?'예':'아니요')).join(' · ')}</Copy><Pressable accessibilityRole="button" accessibilityLabel="마지막 선택 취소" onPress={()=>{feedback('back');setAnswers(v=>v.slice(0,-1));}} style={{minHeight:48,justifyContent:'center'}}><Copy kind="small">한 단계 전으로</Copy></Pressable></View>:null}
  </>:null}
  {!response||followup?<><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Pressable accessibilityRole="button" accessibilityLabel="상담 직접 쓰기 열기" onPress={()=>setWriting(!writing)} style={{minHeight:48,justifyContent:'center'}}><Copy kind="small" style={{fontWeight:'600'}}>{writing?'입력 접기 ↑':question.trim()?'작성한 이야기 보기 ↓':'직접 쓰기 ↓'}</Copy></Pressable><VoiceButton onCloud={()=>nav.push({name:'cloud-voice',cloudTarget:'talk'})} value={question} onText={value=>{setQuestion(value);setInputSource('voice');setWriting(true);}} onStatus={setVoice}/></View>
   {writing||!!parentId?<><TextInput accessibilityLabel="상담 내용 입력" editable={!busy} multiline maxLength={config.maxCounselQuestion} value={question} onChangeText={value=>{setQuestion(value);setInputSource('text');}} placeholder={parentId?'조금 더 이야기해 주세요.':'선택 대신, 하고 싶은 이야기를 직접 적어도 좋아요.'} placeholderTextColor={color.muted} style={[s.input,{minHeight:104}]}/>
<Copy kind="small" muted>{question.length} / {config.maxCounselQuestion}</Copy>

</>:null}
   {config.aiAvailable?<View style={{gap:8}}> <View style={[s.row,{justifyContent:'space-between'}]}><Copy kind="small">GPT와 이야기하기</Copy><Switch accessibilityLabel="GPT 대화 방식 선택" disabled={!config.aiAvailable||busy} value={useAI} onValueChange={setUseAI} trackColor={{false:color.line,true:color.mintDeep}} thumbColor={color.surface}/></View><Copy kind="small" muted>{config.aiAvailable?'이야기 방식을 고른 뒤 목적별 동의와 전송 범위를 확인하고 직접 보내 주세요.':'현재 기본 가이드로 대화할 수 있어요. GPT 연결은 준비 중이에요.'}</Copy></View>:null}
   {useAI?<AIConversationSubmit nav={nav} question={question} answers={answers} topic={currentTopic} conversationId={aiConversationId} onConversation={setAIConversation} inputSource={inputSource}/>:<Button disabled={!question.trim()&&!answers.length} busy={busy} onPress={ask} icon="send">내 이야기 보내기</Button>}{voice?<Notice>{voice}</Notice>:null}
  </>:<><Button onPress={()=>{setParent(response.id);setQuestion('');setAnswers([]);setFollowup(true);}}>이 이야기 이어가기</Button><Button icon="edit" secondary onPress={()=>nav.push({name:'journal',sourceTurnId:response.id,initialText:response.question+'\n\n지금의 조언: '+response.advice+'\n작은 행동: '+response.action+'\n\n내 마음은 '})}>마음기록으로 이어가기</Button><ResourceDelete kind="legacy-counsel" id={response.id} nav={nav}/><Button secondary onPress={()=>{setAnswers([]);setResponse(null);setParent(undefined);setQuestion('');setExpression('welcome');}}>새로운 이야기 시작</Button></>}
  {error||draftError?<Notice error>{error||draftError}</Notice>:null}
 </View>;
}
export function AdviceBlocks({data}:{data:Advice&{source?:Counsel['source']}}){
 return <View style={s.stack}><Copy style={{textAlign:'center'}}>{data.empathy}</Copy><Panel tone={color.sage}><Copy kind="subtitle">지금의 조언</Copy><Copy style={{marginTop:10}}>{data.advice}</Copy></Panel><Panel tone={color.peach}><Copy kind="subtitle">지금 할 수 있는 한 가지</Copy><Copy style={{marginTop:10}}>{data.action}</Copy></Panel><Copy kind="small" muted>{data.source==='openai'?'GPT가 함께 정리한 이야기예요.':data.source==='safety'?'지금은 안전한 곳에서 함께할 사람을 찾는 것이 먼저예요.':'선택한 상황을 바탕으로 마음을 정리하는 기본 가이드예요.'}</Copy></View>;
}
