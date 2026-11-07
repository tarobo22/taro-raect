import tap from '../../assets/audio/soft_tap.wav';
import select from '../../assets/audio/soft_select.wav';
import confirm from '../../assets/audio/soft_confirm.wav';
import back from '../../assets/audio/light_tap.wav';
import shuffle from '../../assets/audio/card_shuffle.wav';
import flip from '../../assets/audio/card_flip.wav';
import musicFile from '../../assets/audio/tarot_room.ogg';
import meow from '../../assets/audio/cat_meow.wav';
import {CharacterCue} from '../features/skins/CharacterCue';
import {AudioGate} from '../features/audio/AudioGate';
import {defaultSensory,SensoryPreferences} from '../features/audio/preferences';
export type {SensoryPreferences} from '../features/audio/preferences';
export type FeedbackKind='tap'|'select'|'confirm'|'back'|'shuffle'|'flip'|'tick'|'boundary'|'meow';
const files={tap,select,confirm,back,shuffle,flip,tick:back,boundary:back,meow};
const characterCue=new CharacterCue();
let prefs:SensoryPreferences={...defaultSensory};
let previousTick=0,previousAction=0,music:HTMLAudioElement|undefined,context:AudioContext|undefined;
const buffers=new Map<string,Promise<AudioBuffer>>(),sources=new Set<AudioBufferSourceNode>(),audioGate=new AudioGate();
function stopEffects(){for(const source of sources){try{source.stop();}catch{}}sources.clear();}
function updateMusic(){if(audioGate.blocked||!prefs.music){music?.pause();return;}if(!music){music=new Audio(musicFile);music.loop=true;music.volume=.08;}if(music.paused)music.play().catch(()=>{});}
function applyFeedback(){if(audioGate.blocked){stopEffects();music?.pause();if('vibrate' in navigator)navigator.vibrate(0);}else updateMusic();}
function buffer(file:string){if(!context)throw new Error('Audio unavailable');let value=buffers.get(file);if(!value){const c=context;value=fetch(file).then(r=>{if(!r.ok)throw new Error('Sound unavailable');return r.arrayBuffer();}).then(data=>c.decodeAudioData(data));buffers.set(file,value);void value.catch(()=>buffers.delete(file));}return value;}
function prepare(){if(!prefs.sound||audioGate.blocked||typeof AudioContext==='undefined')return;context??=new AudioContext();if(context.state==='suspended')void context.resume().catch(()=>{});for(const file of new Set(Object.values(files)))void buffer(file).catch(()=>{});}
document.addEventListener('pointerdown',prepare,{capture:true,passive:true});
document.addEventListener('keydown',prepare,{capture:true});
audioGate.setForeground(!document.hidden);audioGate.subscribe(applyFeedback);
document.addEventListener('visibilitychange',()=>audioGate.setForeground(!document.hidden));
export function beginAudioCapture(){return audioGate.acquire();}
export function configureFeedback(value:SensoryPreferences){prefs={...value};if(!prefs.sound)stopEffects();applyFeedback();}
export function feedback(kind:FeedbackKind='tap'){
 if(audioGate.blocked)return;const now=performance.now();if(kind==='meow'){if(!characterCue.request(now,prefs.sound,audioGate.blocked))return;}else if(kind==='tick'){if(now-previousTick<35)return;previousTick=now;}else{if(now-previousAction<45)return;previousAction=now;}
 if(prefs.music&&(!music||music.paused))updateMusic();
 if(prefs.sound){prepare();if(context){const c=context,requestedAt=performance.now();void buffer(files[kind]).then(data=>{if(audioGate.blocked||!prefs.sound||document.hidden||performance.now()-requestedAt>160)return;const source=c.createBufferSource(),gain=c.createGain();source.buffer=data;gain.gain.value=kind==='tick'?.18:kind==='boundary'?.22:.45;source.connect(gain);gain.connect(c.destination);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect();};source.start();}).catch(()=>{});}}
 if(kind!=='meow'&&prefs.haptics&&'vibrate' in navigator)navigator.vibrate(kind==='confirm'?[8,28,8]:kind==='tick'?3:kind==='boundary'?4:7);
}
