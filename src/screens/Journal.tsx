import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Modal,Pressable,ScrollView,TextInput,View} from 'react-native';
import {Copy,Panel,Button,Chip,FieldLabel,Notice,s} from '../components/UI';
import {Icon} from '../components/Icon';
import {VoiceButton} from '../components/VoiceButton';
import {SelectionDial} from '../components/SelectionDial';
import {color} from '../design/tokens';
import {localDay} from '../domain/content';
import {Entry,useStore} from '../state/store';
import {useJournalSave,useJournalDelete} from '../features/journal/useJournalSave';
import {useJournalDraft} from '../features/journal/useJournalDraft';
import {useJournalLatest} from '../features/journal/useJournalLatest';
import {Nav,Route} from '../navigation';
import {V2Records} from './P0Tarot';
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
  <Copy kind="hero">지금의 마음을{`\n`}있는 그대로.</Copy>
  <Copy muted>잘 쓸 필요 없어요. 한 줄이어도 충분해요.</Copy>{editor.draft.sourceReadingId||editor.draft.sourceTurnId?<Notice>{editor.draft.sourceReadingId?'이 타로 리딩과 연결해 남기는 기록이에요.':'이 대화 답변과 연결해 남기는 기록이에요.'}</Notice>:null}
  <View style={{marginTop:4}}>
   <FieldLabel>지금 내 마음 · 하나를 골라 주세요</FieldLabel>
   {policy?<SelectionDial label="오늘의 마음" options={policy.moods} value={mood} onChange={value=>{if(!busy)editor.change({mood:value});}}/>:null}
   <View style={s.wrap}>{(policy?.moods||[]).map(value=><Chip key={value} selected={mood===value} onPress={()=>{if(!busy)editor.change({mood:value});}}>{value}</Chip>)}</View>
  </View>
  <View>
   <FieldLabel>오늘의 이야기</FieldLabel>
   <TextInput accessibilityLabel="마음기록 내용 입력" editable={!busy} multiline maxLength={policy?.maxBodyLength}
    value={body} onChangeText={change} placeholder="오늘 마음에 남은 순간이나, 나에게 건네고 싶은 말."
    placeholderTextColor={color.muted} style={[s.input,{minHeight:210}]}/>
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
    <Panel style={{gap:16}}>
     <Copy kind="subtitle">지금 저장된 기록이에요.</Copy>
     <ScrollView style={{maxHeight:280}}><Copy>{latest.entry?.body||'글 없이 마음만 남긴 기록이에요.'}</Copy></ScrollView>
     <Copy kind="small" muted>입력한 글은 그대로 있어요. 어떤 글로 이어갈지 골라 주세요.</Copy>
     <Button onPress={()=>adopt(false)}>내 글 유지하고 다시 편집</Button>
     <Button secondary onPress={()=>adopt(true)}>저장된 글 불러오기</Button>
     <Button secondary onPress={()=>setResolving(false)}>닫기</Button>
    </Panel>
   </View>
  </Modal>
 </View>;
}
export function Records({nav}:{nav:Nav}){const store=useStore();const [filter,setFilter]=useState('전체');const rows=[...store.entries.map(e=>({kind:'마음',id:e.id,date:e.createdAt,title:e.mood,body:e.body,route:{name:'entry' as const,entry:e}})),...store.readings.map(r=>({kind:'타로',id:r.id||r.created_at||r.question,date:r.created_at||'',title:r.topic,body:r.summary,route:{name:'reading' as const,reading:r}})),...store.counsels.map(c=>({kind:'대화',id:c.id,date:c.created_at,title:c.topic,body:c.question,route:{name:'counsel' as const,counsel:c}}))].filter(r=>filter==='전체'||r.kind===filter).sort((a,b)=>b.date.localeCompare(a.date));return <View style={s.stack}><Copy kind="hero">나의 마음이{`\n`}차곡차곡.</Copy><View style={s.wrap}>{['전체','마음','타로','대화'].map(f=><Chip key={f} selected={filter===f} onPress={()=>setFilter(f)}>{f}</Chip>)}</View>{store.loading?<ActivityIndicator color={color.action}/>:null}{store.error?<><Notice error>{store.error}</Notice><Button secondary onPress={store.refresh}>다시 불러오기</Button></>:null}{!store.loading&&!rows.length?<Panel style={{alignItems:'center',paddingVertical:34,gap:14}}><Icon name="book" size={32}/><Copy kind="subtitle">첫 기록을 기다리고 있어요.</Copy><Copy kind="small" muted style={{textAlign:'center'}}>일기, 타로, 대화를{`\n`}여기서 다시 만날 수 있어요.</Copy><Button onPress={()=>nav.push({name:'journal'})}>지금 마음 남기기</Button></Panel>:rows.map(r=><Pressable key={`${r.kind}-${r.id}`} accessibilityRole="button" onPress={()=>nav.push(r.route)}><Panel style={{gap:9}}><View style={[s.row,{justifyContent:'space-between'}]}><Copy kind="label" muted>{r.kind} · {new Date(r.date).toLocaleDateString('ko-KR')}</Copy><Icon name="arrow" size={17}/></View><Copy kind="subtitle">{r.title}</Copy><Copy kind="small" muted>{r.body.length>78?r.body.slice(0,78)+'…':r.body||'마음만 남겨도 괜찮아요.'}</Copy></Panel></Pressable>)}{filter==='전체'||filter==='타로'||filter==='대화'?<V2Records nav={nav}/>:null}<Button secondary icon="edit" onPress={()=>nav.push({name:'journal'})}>새 마음기록 쓰기</Button></View>;}
export function EntryDetail({nav,entry}:{nav:Nav;entry:Entry}){const store=useStore();const [confirm,setConfirm]=useState(false);const latest=useJournalLatest();const {remove:removeEntry,busy,error}=useJournalDelete();async function remove(){if(await removeEntry(entry.id)){await store.refresh();nav.tab('records');}setConfirm(false);}return <View style={s.stack}><Copy kind="label" muted>{entry.day.replaceAll('-','. ')}</Copy><Copy kind="hero">{entry.mood}</Copy><Panel tone={color.sage}><Copy>{entry.body||'오늘의 마음을 조용히 남겨 두었어요.'}</Copy></Panel><Copy kind="small" muted>그날의 나에게도, 지금의 나에게도 다정하게.</Copy><Button icon="edit" onPress={()=>{void latest.load(entry.id).then(full=>{if(full)nav.replace({name:'journal',entry:full});});}}>기록 수정하기</Button><Pressable accessibilityRole="button" onPress={()=>setConfirm(true)} style={{minHeight:48,alignItems:'center',justifyContent:'center'}}><Copy kind="small" muted>이 기록 지우기</Copy></Pressable>{error||latest.error?<Notice error>{error||latest.error}</Notice>:null}<Modal transparent visible={confirm} animationType={store.reduced?'none':'fade'} onRequestClose={()=>setConfirm(false)}><View style={{flex:1,backgroundColor:'rgba(32,44,36,.24)',justifyContent:'center',padding:28}}><Panel style={{gap:18}}><Copy kind="subtitle">이 마음기록을 지울까요?</Copy><Copy muted>지운 기록은 다시 불러올 수 없어요.</Copy><Button busy={busy} onPress={remove}>지우기</Button><Button secondary onPress={()=>setConfirm(false)}>남겨 두기</Button></Panel></View></Modal></View>;}
