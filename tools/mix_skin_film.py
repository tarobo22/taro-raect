"""Original soft instrumental + local Korean TTS + licensed project cues."""
from pathlib import Path
import json, os, shutil, subprocess, wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'media/three-spaces-20261107'
SR=48000
FFMPEG=os.environ.get('YEOUN_FFMPEG') or shutil.which('ffmpeg') or str(Path.home()/'.cache/yb26/python-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe')
def save(path,data):
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(data,-.98,.98)*32767).astype('<i2').tobytes())
def load(path):
    with wave.open(str(path),'rb') as w:
        channels,rate=w.getnchannels(),w.getframerate()
        if w.getsampwidth()!=2:raise ValueError('Expected 16-bit PCM source')
        data=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768
    if channels>1:data=data.reshape(-1,channels).mean(axis=1)
    if rate!=SR:data=np.interp(np.arange(round(len(data)*SR/rate))*rate/SR,np.arange(len(data)),data)
    return data
def music(seconds):
    audio=np.zeros(round(SR*seconds));beat=60/88
    chords=((60,64,67,71),(57,60,64,67),(53,57,60,64),(55,59,62,67))
    for index,start in enumerate(np.arange(0,seconds,beat*.5)):
        chord=chords[(index//16)%4];midi=chord[(index%8//2)%4]+(12 if index%8 in (5,7) else 0)
        t=np.arange(min(round(1.8*SR),len(audio)-round(start*SR)))/SR;frequency=440*2**((midi-69)/12)
        signal=(np.sin(2*np.pi*frequency*t)+.22*np.sin(4*np.pi*frequency*t)+.07*np.sin(6*np.pi*frequency*t))*(1-np.exp(-t/.009))*np.exp(-t/.47)*.026
        pos=round(start*SR);audio[pos:pos+len(signal)]+=signal
    return audio*np.minimum(np.arange(len(audio))/SR/1.3,1)*np.minimum((len(audio)-np.arange(len(audio)))/SR/4,1)
def render(script,duration,name,guide=False):
    audio=music(duration);vo=np.zeros_like(audio);metadata=[]
    for item in json.loads((OUT/script).read_text(encoding='utf-8')):
        data=load(OUT/'voice'/(item['id']+'.wav'));rms=np.sqrt(np.mean(data*data));gain=min(.115/max(rms,1e-7),.78/max(np.max(np.abs(data)),1e-7))
        data*=gain;start=round(item['at']*SR);end=min(len(audio),start+len(data));vo[start:end]+=data[:end-start];audio[max(0,start-SR//6):min(len(audio),end+SR//6)]*=.48
        metadata.append(dict(**item,duration=round(len(data)/SR,3),gain=round(gain,3)))
    audio+=vo
    events=[(.4,'cat_meow',.22),(8.5,'soft_select',.1),(11.2,'soft_select',.1),(14.5,'cat_meow',.2),(22.2,'soft_tap',.12),(26.6,'soft_confirm',.12),(30.2,'card_shuffle',.1),(31.2,'card_flip',.13),(31.82,'card_flip',.13),(32.44,'card_flip',.13),(45.4,'soft_tap',.1)]
    if guide:events=[(2,'soft_select',.12),(7,'cat_meow',.22),(9.4,'cat_meow',.20),(14,'soft_select',.1),(22,'soft_select',.1)]
    for at,file,peak in events:
        data=load(ROOT/'assets/audio'/(file+'.wav'));data*=peak/max(np.max(np.abs(data)),1e-7);start=round(at*SR);end=min(len(audio),start+len(data));audio[start:end]+=data[:end-start]
    scratch=ROOT/'.local/media';scratch.mkdir(parents=True,exist_ok=True);raw=scratch/(name+'-premix.wav');target=OUT/(name+'.wav');save(raw,audio)
    subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-y','-i',str(raw),'-af','loudnorm=I=-16:TP=-1.5:LRA=7','-ar',str(SR),str(target)],check=True)
    (OUT/(name+'-audio.json')).write_text(json.dumps({'narration':'Microsoft Heami Desktop, local System.Speech, rate 0','voiceSegments':metadata,'duration':duration,'music':'Original procedural soft piano at 88 BPM','catSource':'freemaster2 / CC0, see assets/audio/cat_meow.license.json','mastering':'FFmpeg loudnorm I=-16 TP=-1.5 LRA=7'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(name,[(x['id'],x['duration']) for x in metadata],flush=True)
render('narration.json',60,'introduction')
render('guide-narration.json',30,'guide',True)
