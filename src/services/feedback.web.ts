import tap from '../../assets/audio/soft_tap.wav';
import select from '../../assets/audio/soft_select.wav';
import confirm from '../../assets/audio/soft_confirm.wav';
import back from '../../assets/audio/light_tap.wav';
import shuffle from '../../assets/audio/card_shuffle.wav';
import flip from '../../assets/audio/card_flip.wav';
import musicFile from '../../assets/audio/tarot_room.ogg';
import {AudioGate} from '../features/audio/AudioGate';
import {defaultSensory,SensoryPreferences} from '../features/audio/preferences';
export type {SensoryPreferences} from '../features/audio/preferences';
export type FeedbackKind='tap'|'select'|'confirm'|'back'|'shuffle'|'flip'|'tick';
const files={tap,select,confirm,back,shuffle,flip,tick:back};
const players:Partial<Record<FeedbackKind,HTMLAudioElement>>={};
let prefs:SensoryPreferences={...defaultSensory};let previous=0;
let music:HTMLAudioElement|undefined;
const audioGate=new AudioGate();
function stopEffects(){for(const player of Object.values(players)){player.pause();try{player.currentTime=0;}catch{}}}
function updateMusic(){
 if(audioGate.blocked||!prefs.music){music?.pause();return;}
 if(!music){music=new Audio(musicFile);music.loop=true;music.volume=.08;}
 if(music.paused)music.play().catch(()=>{});
}
function applyFeedback(){if(audioGate.blocked){stopEffects();music?.pause();if('vibrate' in navigator)navigator.vibrate(0);}else updateMusic();}
audioGate.setForeground(!document.hidden);
audioGate.subscribe(applyFeedback);
document.addEventListener('visibilitychange',()=>audioGate.setForeground(!document.hidden));
export function beginAudioCapture(){return audioGate.acquire();}
export function configureFeedback(value:SensoryPreferences){prefs={...value};if(!prefs.sound)stopEffects();applyFeedback();}
export function feedback(kind:FeedbackKind='tap'){
  if(audioGate.blocked)return;
  const now=Date.now();if(now-previous<55)return;previous=now;
  if(prefs.music&&(!music||music.paused))updateMusic();
  if(prefs.sound){const audio=players[kind]??(players[kind]=new Audio(files[kind]));audio.volume=.55;audio.currentTime=0;audio.play().catch(()=>{});}
  if(prefs.haptics&&'vibrate' in navigator)navigator.vibrate(kind==='confirm'?[8,35,8]:6);
}
