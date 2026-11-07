import {PageView as View,PageFlow} from '../components/PageFlow';
import {ChoiceStage} from '../components/ChoiceStage';
import {BottomSheet} from '../components/BottomSheet';
import React,{useState} from 'react';
import {} from 'react-native';
import {Button,Copy,Notice,Panel,s} from '../components/UI';
import {Character} from '../components/Character';
import {color} from '../design/tokens';
import {useStore} from '../state/store';
import {storyRepository} from '../composition';
import {useStoryMutation,useStoryRead} from '../features/story/useStory';
import type {StoryChoice,StoryEpisode,StoryRun,StoryStart} from '../features/story/model';
import {feedback} from '../services/feedback';
import {LoadState} from './P0';
import type {Nav,Route} from '../navigation';

export function Stories({nav}:{nav:Nav}){const owner=useStore().bootstrap!.user.id,data=useStoryRead(owner,()=>storyRepository.episodes());return <View style={s.stack}><Copy kind="hero">작은 쉼표 놀이.</Copy><Copy muted>잠깐의 이야기 속에서 나에게 편한 쪽을 골라 보세요. 정답도 점수도 없어요.</Copy><LoadState {...data} reload={data.reload}/>{data.value?.items.map(episode=><EpisodeCard key={owner+episode.id} owner={owner} episode={episode} nav={nav}/>)}{data.value&&!data.value.items.length?<Notice>아직 준비된 이야기가 없어요.</Notice>:null}</View>;}
function EpisodeCard({owner,episode,nav}:{owner:string;episode:StoryEpisode;nav:Nav}){
 const data=useStoryRead(owner,()=>storyRepository.progress(episode.id),[episode.id]),start=useStoryMutation(owner,'start.'+episode.id,(input:StoryStart,key)=>storyRepository.start(input,key));
 async function begin(){const run=await start.submit({episode_id:episode.id,episode_version:episode.version});if(run){await start.acknowledge();nav.push({name:'story',storyRunId:run.id});}}
 return <Panel style={{gap:12}}><Copy kind="subtitle">{episode.title}</Copy><Copy>{episode.summary}</Copy><Copy kind="small" muted>{episode.min_choices===episode.max_choices?episode.min_choices+'번의 선택':episode.min_choices+'~'+episode.max_choices+'번의 선택'} · 언제든 나갔다 이어갈 수 있어요.</Copy><LoadState {...data} reload={data.reload}/>{data.value?.run?<Button secondary onPress={()=>nav.push({name:'story',storyRunId:data.value!.run!.id})}>{data.value.run.state==='completed'?'결말 다시 읽기':'이야기 이어하기'}</Button>:<Button disabled={data.busy||!!data.error} busy={start.busy} onPress={()=>void begin()}>이야기 시작하기</Button>}{start.error?<Notice error>{start.error}</Notice>:null}</Panel>;
}
export function StoryScreen({route,nav}:{route:Route;nav:Nav}){
 const store=useStore(),owner=store.bootstrap!.user.id,runId=route.storyRunId!,data=useStoryRead(owner,()=>storyRepository.run(runId),[runId]),[saved,setSaved]=useState<{owner:string;run:StoryRun}|null>(null),[confirm,setConfirm]=useState(false);
 const choose=useStoryMutation(owner,'choice.'+runId,(input:StoryChoice,key)=>storyRepository.choose(runId,input,key)),restart=useStoryMutation(owner,'restart.'+runId,(version:number,key)=>storyRepository.restart(runId,version,key));
 const run=saved?.owner===owner&&saved.run.id===runId&&saved.run.version>(data.value?.version||0)?saved.run:data.value;
 async function answer(value:boolean){if(!run?.current_node||choose.busy||restart.busy)return false;const next=await choose.submit({expected_version:run.version,node_id:run.current_node.id,answer:value});if(next){setSaved({owner,run:next});feedback('confirm');await choose.acknowledge();return true;}return false;}
 async function beginAgain(){if(!run)return;const next=await restart.submit(run.version);if(next){await restart.acknowledge();setConfirm(false);nav.replace({name:'story',storyRunId:next.id});}}
 return <View style={s.stack}><Copy kind="hero">{run?.title||'이야기를 확인하고 있어요.'}</Copy><LoadState {...data} reload={data.reload}/>{run?.state==='active'&&run.current_node?<><Copy kind="small" muted>{run.choice_count+'번 골랐어요. 다음은 어떤 쪽이 편할까요?'}</Copy><StoryChoices prompt={run.current_node.prompt} expression={run.current_node.expression} busy={choose.busy||restart.busy} onChoice={answer}/></>:run?.state==='completed'&&run.ending?<><View style={{alignItems:'center'}}><Character expression="calm" size={170} reduced={store.reduced}/></View><Panel tone={color.mint} style={{gap:12}}><Copy kind="subtitle">{run.ending.title}</Copy><Copy>{run.ending.body}</Copy></Panel><Panel tone={color.sage} style={{gap:10}}><Copy kind="subtitle">원한다면, 작은 한 가지</Copy><Copy>{run.ending.action}</Copy></Panel><Copy kind="small" muted>{run.choice_count+'번의 선택으로 이야기를 마쳤어요. 나에게 편한 속도면 충분해요.'}</Copy></>:run?<Notice>이 이야기는 새로 시작한 진행으로 이어졌어요. 이야기 목록에서 현재 진행을 열어 주세요.</Notice>:null}{choose.error||restart.error?<><Notice error>{choose.error||restart.error}</Notice><Button secondary onPress={()=>void data.reload()}>현재 진행 다시 확인</Button></>:null}{run?<Button secondary disabled={choose.busy||restart.busy} onPress={()=>setConfirm(true)}>처음부터 다시하기</Button>:null}<Button secondary onPress={()=>nav.replace({name:'stories'})}>이야기 목록으로</Button><Button secondary onPress={()=>nav.tab('home')}>오늘로 돌아가기</Button><BottomSheet visible={confirm} onClose={()=>{if(!restart.busy)setConfirm(false);}} label="이야기 다시 시작"><Copy kind="subtitle">처음부터 다시 골라 볼까요?</Copy><Copy>새로운 선택으로 이야기를 시작해요. 지금 진행을 이어가려면 아래에서 돌아갈 수 있어요.</Copy><Button busy={restart.busy} onPress={()=>void beginAgain()}>확인하고 다시 시작</Button><Button secondary disabled={restart.busy} onPress={()=>setConfirm(false)}>지금 이야기 유지</Button></BottomSheet></View>;
}
function StoryChoices({expression,prompt,busy,onChoice}:{expression:NonNullable<StoryRun['current_node']>['expression'];prompt:string;busy:boolean;onChoice:(answer:boolean)=>Promise<boolean>}){
 const {reduced}=useStore();
 return <ChoiceStage label="이야기 선택" disabled={busy} reduced={reduced} onChoice={onChoice}><View style={{padding:18,borderRadius:24,backgroundColor:color.sage,alignItems:'center',gap:8}}><Character expression={expression} reduced={reduced} size={150} framed={false}/><Copy kind="subtitle" style={{textAlign:'center',fontSize:19,lineHeight:28}}>{prompt}</Copy></View></ChoiceStage>;
}
