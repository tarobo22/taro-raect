import tap from '../../assets/audio/soft_tap.wav';
import select from '../../assets/audio/soft_select.wav';
import confirm from '../../assets/audio/soft_confirm.wav';
import back from '../../assets/audio/light_tap.wav';
import shuffle from '../../assets/audio/card_shuffle.wav';
import flip from '../../assets/audio/card_flip.wav';
import musicFile from '../../assets/audio/tarot_room.ogg';
export interface SensoryPreferences{sound:boolean;haptics:boolean;music:boolean;}
export type FeedbackKind='tap'|'select'|'confirm'|'back'|'shuffle'|'flip'|'tick';
const files={tap,select,confirm,back,shuffle,flip,tick:back};
const players:Partial<Record<FeedbackKind,HTMLAudioElement>>={};
let prefs:SensoryPreferences={sound:true,haptics:true,music:false};let previous=0;
let music:HTMLAudioElement|undefined;
function updateMusic(){if(!music){music=new Audio(musicFile);music.loop=true;music.volume=.08;}if(prefs.music&&!document.hidden)music.play().catch(()=>{});else music.pause();}
document.addEventListener('visibilitychange',()=>{if(music)updateMusic();});
export function configureFeedback(value:SensoryPreferences){prefs=value;if(prefs.music||music)updateMusic();}
export function feedback(kind:FeedbackKind='tap'){
  const now=Date.now();if(now-previous<55)return;previous=now;
  if(prefs.music&&(!music||music.paused))updateMusic();
  if(prefs.sound){const audio=players[kind]??(players[kind]=new Audio(files[kind]));audio.volume=.55;audio.currentTime=0;audio.play().catch(()=>{});}
  if(prefs.haptics&&'vibrate' in navigator)navigator.vibrate(kind==='confirm'?[8,35,8]:6);
}
