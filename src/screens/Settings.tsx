import React,{useEffect,useState} from 'react';
import {Modal,Platform,ScrollView,Switch,View} from 'react-native';
import {Character,Expression,expressionNames} from '../components/Character';
import {Copy,Panel,Button,Chip,Notice,s} from '../components/UI';
import {BreathingDial} from '../components/BreathingDial';
import {color} from '../design/tokens';
import {useStore} from '../state/store';
import {release} from '../domain/content';
import {voiceAvailable} from '../services/voice';
import {checkAndDownload,applyUpdate,getUpdateNotice,subscribeUpdateNotice,isUpdateReady} from '../services/updates';

export function Settings(){
 const store=useStore();const [faces,setFaces]=useState(false),[voice,setVoice]=useState<boolean|null>(null),[busy,setBusy]=useState(false),[downloaded,setDownloaded]=useState(isUpdateReady),[status,setStatus]=useState(getUpdateNotice);
 useEffect(()=>{voiceAvailable().then(setVoice).catch(()=>setVoice(false));return subscribeUpdateNotice(()=>setStatus(getUpdateNotice()));},[]);
 async function update(){
  if(Platform.OS==='web'){setStatus('업데이트 확인은 Android 앱에서 사용할 수 있어요.');return;}
  setBusy(true);setStatus('새로운 내용을 확인하고 있어요.');
  try{const found=await checkAndDownload();setDownloaded(found);setStatus(found?'새로운 내용이 준비됐어요. 다시 열면 적용돼요.':'지금 최신 내용을 사용하고 있어요.');}
  catch{setStatus('업데이트에 연결하지 못했어요. 기존 내용은 계속 사용할 수 있어요.');}
  finally{setBusy(false);}
 }
 async function apply(){
  if(busy)return;
  setBusy(true);setStatus('새로운 내용을 적용하고 있어요.');
  try{await applyUpdate();setDownloaded(false);}
  catch{setStatus('다시 열지 못했어요. 잠시 뒤 다시 시도해 주세요.');}
  finally{setBusy(false);}
 }
 return <View style={s.stack}><Copy kind="hero">나에게 편한 방식으로.</Copy>
  <Panel style={{gap:16}}><Copy kind="subtitle">이야기를 건네는 방식</Copy><View style={s.wrap}><Chip selected={store.tone==='warm'} onPress={()=>store.setTone('warm')}>다정하게</Chip><Chip selected={store.tone==='giga'} onPress={()=>store.setTone('giga')}>기가차드 모드</Chip></View><Copy kind="small" muted>{store.tone==='giga'?'단호하게 응원해요. 비난하거나 몰아붙이지 않아요.':'천천히 듣고, 다정하게 함께 정리해요.'}</Copy><View style={{alignItems:'center'}}><Character size={132} expression="encourage" giga={store.tone==='giga'} reduced={store.reduced}/></View><Button secondary onPress={()=>setFaces(true)}>캐릭터 표정 살펴보기</Button></Panel>
  <Panel style={{gap:20}}><Copy kind="subtitle">손끝과 소리의 감각</Copy>
   <View style={[s.row,{justifyContent:'space-between'}]}><View style={{flex:1}}><Copy style={{fontWeight:'600'}}>버튼과 카드 소리</Copy><Copy kind="small" muted>짧고 조용한 터치의 여운</Copy></View><Switch accessibilityLabel="효과음" value={store.sensory.sound} onValueChange={sound=>store.setSensory({...store.sensory,sound})} trackColor={{false:color.line,true:color.mintDeep}} thumbColor={color.surface}/></View>
   <View style={[s.row,{justifyContent:'space-between'}]}><View style={{flex:1}}><Copy style={{fontWeight:'600'}}>손끝의 작은 반응</Copy><Copy kind="small" muted>기기가 지원하는 촉각 피드백</Copy></View><Switch accessibilityLabel="햅틱" value={store.sensory.haptics} onValueChange={haptics=>store.setSensory({...store.sensory,haptics})} trackColor={{false:color.line,true:color.mintDeep}} thumbColor={color.surface}/></View>
   <View style={[s.row,{justifyContent:'space-between'}]}><View style={{flex:1}}><Copy style={{fontWeight:'600'}}>잔잔한 배경 음악</Copy><Copy kind="small" muted>내 공간을 채우는 작은 피아노</Copy></View><Switch accessibilityLabel="배경 음악" value={store.sensory.music} onValueChange={music=>store.setSensory({...store.sensory,music})} trackColor={{false:color.line,true:color.mintDeep}} thumbColor={color.surface}/></View>
   <View style={[s.row,{justifyContent:'space-between'}]}><View style={{flex:1}}><Copy style={{fontWeight:'600'}}>움직임 줄이기</Copy><Copy kind="small" muted>숨쉬기·뒤집기·전환을 간결하게</Copy></View><Switch accessibilityLabel="움직임 줄이기" value={store.reduced} onValueChange={store.setReduced} trackColor={{false:color.line,true:color.mintDeep}} thumbColor={color.surface}/></View>
  </Panel>
  <BreathingDial/>
  <Panel style={{gap:8}}><Copy kind="subtitle">음성으로 이야기하기</Copy><Copy kind="small" muted>{voice===null?'기기의 음성 입력을 확인하고 있어요.':voice?'마이크를 누를 때만 시작해요. 글로 옮겨진 내용을 확인한 뒤 직접 보내 주세요.':'이 기기에서는 글로 이야기할 수 있어요. 음성인식 서비스가 있는 기기에서 음성 입력을 지원해요.'}</Copy></Panel>
  <Panel style={{gap:10}}><Copy kind="subtitle">내 이야기와 GPT</Copy><Copy kind="small" muted>{store.config?.aiAvailable?'GPT 전송은 대화 화면에서 직접 켤 때만 이뤄져요. 질문·선택·이전 대화만 전송하고, 마음기록은 보내지 않아요.':'현재 기본 가이드를 이용할 수 있어요. GPT 연결이 준비되면 대화 화면에서 직접 선택할 수 있어요.'}</Copy><Copy kind="small" muted>여운의 이야기는 진단이나 치료를 대신하지 않아요.</Copy></Panel>
  <Panel style={{gap:12}}><Copy kind="subtitle">여운의 새로운 이야기</Copy><Copy kind="small" muted>앱을 다시 설치하지 않고 새로운 화면과 이야기를 받을 수 있어요.</Copy>{status?<Notice>{status}</Notice>:null}<Button secondary busy={busy} onPress={downloaded?apply:update}>{downloaded?'지금 다시 열어 적용하기':'업데이트 확인'}</Button></Panel>
  <Copy kind="small" muted style={{textAlign:'center'}}>여운 {release.version} · {release.label}</Copy>
  <Modal visible={faces} animationType={store.reduced?'none':'slide'} onRequestClose={()=>setFaces(false)}><ScrollView style={{backgroundColor:color.paper}} contentContainerStyle={{padding:24,paddingTop:52,gap:20,width:'100%',maxWidth:430,alignSelf:'center'}}><Copy kind="title">상황에 맞게, 따뜻하게.</Copy><Copy muted>걱정되는 순간에는 배려하고, 중요한 순간에는 진지하게 들어요.</Copy><View style={s.wrap}>{(Object.keys(expressionNames) as Expression[]).map(e=><View key={e} style={{width:'47%',alignItems:'center',backgroundColor:color.sage,borderRadius:20,paddingBottom:12}}><Character size={118} expression={e} giga={store.tone==='giga'} reduced={store.reduced}/><Copy kind="label">{expressionNames[e]}</Copy></View>)}</View><Button onPress={()=>setFaces(false)}>닫기</Button></ScrollView></Modal>
 </View>;
}
