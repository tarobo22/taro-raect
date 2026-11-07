import {PageView as View,PageFlow} from '../components/PageFlow';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Modal,Pressable,TextInput} from 'react-native';
import {Copy,Panel,Button,Chip,FieldLabel,Notice,s} from '../components/UI';
import {Icon} from '../components/Icon';
import {VoiceButton} from '../components/VoiceButton';
import {MoodDial} from '../components/MoodDial';
import {color} from '../design/tokens';
import {localDay} from '../domain/content';
import {Entry,useStore} from '../state/store';
import {useJournalSave,useJournalDelete} from '../features/journal/useJournalSave';
import {useJournalDraft} from '../features/journal/useJournalDraft';
import {useJournalLatest} from '../features/journal/useJournalLatest';
import {Nav,Route} from '../navigation';
import {recordDay,validRecordDate} from '../features/p0/selection';
import type {RecordFilter} from '../features/p0/model';
import {V2Records} from './P0Tarot';
import {getJournalSource} from '../composition';
import {sourceRoute} from '../features/navigation/sourceRoute';
import {HttpError} from '../infrastructure/http/FetchClient';
export function JournalForm({nav,route}:{nav:Nav;route:Route}){
 const store=useStore();
 const editor=useJournalDraft({id:route.entry?.id,version:route.entry?.version,apiVersion:route.entry?.apiVersion,sourceReadingId:route.entry?.sourceReadingId??route.sourceReadingId,sourceTurnId:route.entry?.sourceTurnId??route.sourceTurnId,
  day:route.entry?.day||localDay(),mood:route.entry?.mood||'',
  body:route.entry?route.entry.body:(route.initialText??store.draft)});
 const {mood,body,day}=editor.draft;
 const [voice,setVoice]=useState(''),[notice,setNotice]=useState('');
 const {save:saveEntry,busy,error,clearError}=useJournalSave();
 const latest=useJournalLatest();const [resolving,setResolving]=useState(false);
 const policy=store.journalPolicy;
 const change=(value:string)=>editor.change({body:value});
 async function save(){
  if(!mood||!policy||busy)return;
  const revision=editor.revision();
  const entry=await saveEntry(editor.draft);
  if(!entry)return;
  try{
   const cleared=await editor.acknowledge(revision);
   await store.refresh();
   if(!cleared){setNotice('저장됐어요. 그 뒤에 쓴 글은 새 초안으로 남겨 두었어요.');return;}
   if(!route.entry&&!route.sourceReadingId&&!route.sourceTurnId)store.setDraft('');
   nav.replace({name:'entry',entry});
  }catch{setNotice('기록은 저장됐어요. 임시 글 정리는 잠시 뒤 다시 시도해 주세요.');}
 }
 async function inspect(){
  if(route.entry&&await latest.load(route.entry.id))setResolving(true);
 }
 function adopt(useSavedText:boolean){
  if(!latest.entry?.version)return;
  editor.change({version:latest.entry.version,...(useSavedText?{body:latest.entry.body,mood:latest.entry.mood}:{})});
  clearError();setResolving(false);setNotice(useSavedText?'저장된 글을 불러왔어요.':'입력한 글을 유지했어요. 확인 후 저장해 주세요.');
 }
 return <View style={s.stack}>
  <Copy kind="label" muted>{day.replaceAll('-','. ')}</Copy>
  <Copy kind="title">지금의 마음을, 있는 그대로.</Copy>
  <Copy kind="small" muted>한 줄이어도 충분해요.</Copy>{editor.draft.sourceReadingId||editor.draft.sourceTurnId?<Notice>{editor.draft.sourceReadingId?'이 타로 리딩과 연결해 남기는 기록이에요.':'이 대화 답변과 연결해 남기는 기록이에요.'}</Notice>:null}
  <View style={{marginTop:4}}>
   <FieldLabel>지금 내 마음 · 하나를 골라 주세요</FieldLabel>
   {policy?<View><MoodDial options={policy.moods} value={mood} disabled={busy} onConfirm={value=>{if(!busy)editor.change({mood:value});}}/></View>:null}
  </View>
  <View>
   <FieldLabel>오늘의 이야기</FieldLabel>
   <TextInput accessibilityLabel="마음기록 내용 입력" editable={!busy} multiline maxLength={policy?.maxBodyLength}
    value={body} onChangeText={change} placeholder="오늘 마음에 남은 순간이나, 나에게 건네고 싶은 말."
    placeholderTextColor={color.muted} style={[s.input,{minHeight:132}]}/>
   <View style={[s.row,{justifyContent:'space-between',marginTop:10}]}>
    <Copy kind="small" muted>{body.length} / {policy?.maxBodyLength??'—'}</Copy>
    <View pointerEvents={busy?'none':'auto'}><VoiceButton onCloud={()=>nav.push({name:'cloud-voice',cloudTarget:'journal'})} value={body} onText={change} onStatus={setVoice}/></View>
   </View>
  </View>
  {!policy?<Notice>{store.error||'마음기록 설정을 불러오고 있어요.'}</Notice>:null}
  {voice?<Notice>{voice}</Notice>:null}{!route.entry?<Button secondary onPress={()=>nav.push({name:'cloud-voice',cloudTarget:'journal'})}>클라우드 음성 파일로 기록 쓰기</Button>:null}
  {error||editor.error?<Notice error>{error||editor.error}</Notice>:null}
  {notice?<Notice>{notice}</Notice>:null}
  {latest.error?<Notice error>{latest.error}</Notice>:null}
  {route.entry&&(error||editor.draft.version!==route.entry.version)?<Button secondary busy={latest.busy} onPress={inspect}>최신 기록 확인</Button>:null}

  <Button disabled={!mood||!policy} busy={busy} icon="check" onPress={save}>{route.entry?'수정한 마음 저장하기':'이 마음 저장하기'}</Button>
  <Copy kind="small" muted>입력 중인 글과 마음은 뒤로 가도 기기에 임시로 남겨 둬요.</Copy>
  <Modal transparent visible={resolving} animationType={store.reduced?'none':'fade'} onRequestClose={()=>setResolving(false)}>
   <View style={{flex:1,backgroundColor:'rgba(32,44,36,.24)',justifyContent:'center',padding:24}}>
    <PageFlow title="기록 확인" style={{height:'90%',flex:0,backgroundColor:color.paper,borderRadius:24}}>
     <Copy kind="subtitle">지금 저장된 기록이에요.</Copy>
     <View><Copy>{latest.entry?.body||'글 없이 마음만 남긴 기록이에요.'}</Copy></View>
     <Copy kind="small" muted>입력한 글은 그대로 있어요. 어떤 글로 이어갈지 골라 주세요.</Copy>
     <Button onPress={()=>adopt(false)}>내 글 유지하고 다시 편집</Button>
     <Button secondary onPress={()=>adopt(true)}>저장된 글 불러오기</Button>
     <Button secondary onPress={()=>setResolving(false)}>닫기</Button>
    </PageFlow>
   </View>
  </Modal>
 </View>;
}
export function Records({nav}:{nav:Nav}){
 const store=useStore(),filter=store.recordFilter,[date,setDate]=useState(store.recordDate),[dateError,setDateError]=useState('');
 const rows=[...store.readings.map(r=>({kind:'타로',id:r.id||r.created_at||r.question,date:r.created_at||'',day:r.day,title:r.topic,body:r.summary,route:{name:'reading' as const,reading:r}})),...store.counsels.map(c=>({kind:'대화',id:c.id,date:c.created_at,day:undefined,title:c.topic,body:c.question,route:{name:'counsel' as const,counsel:c}}))].filter(r=>(filter==='전체'||r.kind===filter)&&(!store.recordDate||recordDay(r.date,store.bootstrap!.user.timezone,r.day)===store.recordDate)).sort((a,b)=>b.date.localeCompare(a.date));
 return <View style={s.stack}><Copy kind="hero">나의 마음이{`\n`}차곡차곡.</Copy><Button secondary onPress={()=>nav.push({name:'journal-summary'})}>마음의 흐름 · 통계와 달력</Button><Button secondary onPress={()=>nav.push({name:'favorites'})}>소중한 리딩 모아보기</Button><View style={s.wrap}>{(['전체','마음','타로','대화'] as RecordFilter[]).map(f=><Chip key={f} selected={filter===f} onPress={()=>store.setRecordFilter(f)}>{f}</Chip>)}</View><View style={{gap:10}}><FieldLabel>날짜로 살펴보기 · YYYY-MM-DD</FieldLabel><TextInput accessibilityLabel="기록 날짜 필터" value={date} onChangeText={setDate} placeholder="2026-11-06" maxLength={10} style={[s.input,{minHeight:48}]}/><Button secondary onPress={()=>{if(date&&!validRecordDate(date)){setDateError('날짜를 YYYY-MM-DD 형식으로 확인해 주세요.');return;}setDateError('');store.setRecordDate(date);}}>이 날짜의 기록 보기</Button><Button secondary onPress={()=>{setDate('');setDateError('');store.setRecordDate('');}}>전체 날짜 보기</Button></View>{dateError?<Notice error>{dateError}</Notice>:null}{store.loading?<ActivityIndicator color={color.action}/>:null}{store.error?<><Notice error>{store.error}</Notice><Button secondary onPress={store.refresh}>다시 불러오기</Button></>:null}{rows.map(r=><Pressable key={r.kind+'-'+r.id} accessibilityRole="button" onPress={()=>nav.push(r.route)}><Panel style={{gap:9}}><Copy kind="label" muted>{r.kind} · {new Date(r.date).toLocaleDateString('ko-KR')}</Copy><Copy kind="subtitle">{r.title}</Copy><Copy kind="small" muted>{r.body.slice(0,78)||'마음만 남겨도 괜찮아요.'}</Copy></Panel></Pressable>)}<V2Records nav={nav} filter={filter} date={store.recordDate}/><Button secondary icon="edit" onPress={()=>nav.push({name:'journal'})}>새 마음기록 쓰기</Button></View>;
}
export function EntryDetail({nav,entry}:{nav:Nav;entry:Entry}){const store=useStore();const [confirm,setConfirm]=useState(false);const latest=useJournalLatest();const {remove:removeEntry,busy,error}=useJournalDelete();const [opening,setOpening]=useState(false),[sourceError,setSourceError]=useState(''),sourceActive=useRef(true);useEffect(()=>{sourceActive.current=true;return()=>{sourceActive.current=false;};},[entry.id]);async function openSource(){setOpening(true);setSourceError('');try{const source=await getJournalSource(entry.id);if(sourceActive.current)nav.push(sourceRoute(source));}catch(e){if(sourceActive.current)setSourceError(e instanceof HttpError&&e.status===404?'연결된 원본을 찾지 못했어요.':e instanceof Error?e.message:'연결된 원본을 확인하지 못했어요.');}finally{if(sourceActive.current)setOpening(false);}}async function remove(){if(await removeEntry(entry.id)){await store.refresh();nav.tab('records');}setConfirm(false);}return <View style={s.stack}><Copy kind="label" muted>{entry.day.replaceAll('-','. ')}</Copy><Copy kind="hero">{entry.mood}</Copy><Panel tone={color.sage}><Copy>{entry.body||'오늘의 마음을 조용히 남겨 두었어요.'}</Copy></Panel><Copy kind="small" muted>그날의 나에게도, 지금의 나에게도 다정하게.</Copy><Button secondary busy={opening} onPress={()=>void openSource()}>연결된 원본 보기</Button>{sourceError?<Notice error>{sourceError}</Notice>:null}<Button icon="edit" onPress={()=>{void latest.load(entry.id).then(full=>{if(full)nav.replace({name:'journal',entry:full});});}}>기록 수정하기</Button><Pressable accessibilityRole="button" onPress={()=>setConfirm(true)} style={{minHeight:48,alignItems:'center',justifyContent:'center'}}><Copy kind="small" muted>이 기록 지우기</Copy></Pressable>{error||latest.error?<Notice error>{error||latest.error}</Notice>:null}<Modal transparent visible={confirm} animationType={store.reduced?'none':'fade'} onRequestClose={()=>setConfirm(false)}><View style={{flex:1,backgroundColor:'rgba(32,44,36,.24)',justifyContent:'center',padding:28}}><Panel style={{gap:18}}><Copy kind="subtitle">이 마음기록을 지울까요?</Copy><Copy muted>지운 기록은 다시 불러올 수 없어요.</Copy><Button busy={busy} onPress={remove}>지우기</Button><Button secondary onPress={()=>setConfirm(false)}>남겨 두기</Button></Panel></View></Modal></View>;}
