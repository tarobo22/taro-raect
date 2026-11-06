import React,{useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import {Button,Copy,Notice,Panel,s} from '../components/UI';
import {SelectionDial} from '../components/SelectionDial';
import {reminderController} from '../features/reminders/composition';
import {defaultReminderTime} from '../features/reminders/policy';
import type {ReminderState} from '../features/reminders/types';
const hours=Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}시`);
const minutes=Array.from({length:60},(_,i)=>`${String(i).padStart(2,'0')}분`);
export function RemindersScreen(){
 const [state,setState]=useState<ReminderState|null>(null),[hour,setHour]=useState(defaultReminderTime.hour),[minute,setMinute]=useState(defaultReminderTime.minute),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function refresh(){try{const next=await reminderController.read();setState(next);setHour(next.hour);setMinute(next.minute);setError('');}catch(e){setError(e instanceof Error?e.message:'알림 설정을 읽지 못했어요.');}}
 useEffect(()=>{void refresh();const subscription=AppState.addEventListener('change',value=>{if(value==='active')void refresh();});return()=>subscription.remove();},[]);
 async function change(action:'enable'|'disable'|'preview'){
  if(busy)return;setBusy(true);setMessage('');setError('');
  try{
   if(action==='preview'){await reminderController.preview();setMessage('기기의 알림 창에서 확인해 주세요.');}
   else{const next=action==='enable'?await reminderController.enable({hour,minute}):await reminderController.disable();setState(next);setMessage(next.enabled?'마음을 돌아볼 시간을 기기에 저장했어요.':action==='disable'?'알림을 껐어요.': '알림 권한이 꺼져 있어요. 기기 설정에서 허용한 뒤 다시 켜 주세요.');}
  }catch(e){setError(e instanceof Error?e.message:'알림 설정을 저장하지 못했어요.');}finally{setBusy(false);}
 }
 return <View style={s.stack}><Copy kind="hero">나를 돌아볼 시간.</Copy><Copy muted>원할 때만, 하루에 한 번 조용히 알려 드려요.</Copy>{error?<Notice error>{error}</Notice>:null}{message?<Notice>{message}</Notice>:null}
  {!state?<Button secondary onPress={()=>void refresh()}>알림 설정 확인</Button>:!state.supported?<Panel style={{gap:12}}><Copy kind="subtitle">Android 앱에서 만나요</Copy><Copy>기기 알림은 새 Android 앱에서 지원해요. 웹에서는 매일 배달되는 알림을 예약하지 않아요.</Copy></Panel>:<>
   <Panel style={{gap:14}}><Copy kind="subtitle">매일 {String(hour).padStart(2,'0')}:{String(minute).padStart(2,'0')} 즈음</Copy><Copy kind="small" muted>알림은 기본으로 꺼져 있어요. 아래에서 직접 켤 때만 권한을 요청해요.</Copy><SelectionDial circular label="알림 시" options={hours} value={hours[hour]} onChange={value=>setHour(hours.indexOf(value))}/><SelectionDial circular label="알림 분" options={minutes} value={minutes[minute]} onChange={value=>setMinute(minutes.indexOf(value))}/><Button busy={busy} onPress={()=>void change('enable')}>{state.enabled?'선택한 시간으로 저장':'이 시간에 알림 켜기'}</Button>{state.enabled?<Button secondary disabled={busy} onPress={()=>void change('disable')}>알림 끄기</Button>:null}</Panel>
   <Panel style={{gap:12}}><Copy kind="subtitle">{state.enabled?'알림이 켜져 있어요':'알림이 꺼져 있어요'}</Copy>{state.nextAt?<Copy kind="small" muted>다음 예정: {new Date(state.nextAt).toLocaleString('ko-KR')}</Copy>:null}<Copy kind="small" muted>기기 시간대를 따라요. 배터리 절약 등 기기 상태에 따라 알림이 늦어질 수 있어요.</Copy>{state.permission!=='granted'?<><Notice>기기의 알림 허용이 필요해요. 허용 후 이 화면에서 직접 켜 주세요.</Notice><Button secondary onPress={()=>{void reminderController.openSettings().catch(()=>setError('기기 설정을 열지 못했어요.'));}}>기기 알림 설정 열기</Button></>:<Button secondary disabled={busy} onPress={()=>void change('preview')}>한 번 미리 보기</Button>}</Panel>
  </>}
  <Copy kind="small" muted>알림에는 마음기록 내용이 표시되지 않아요. 시간 설정은 이 기기에만 저장하며 전체 데이터 삭제 시 함께 지워져요.</Copy>
 </View>;
}
