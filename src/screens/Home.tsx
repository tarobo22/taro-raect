import {PageView as View,PageFlow,PageSection} from '../components/PageFlow';
import React from 'react';
import {Pressable} from 'react-native';
import {SceneHero} from '../features/skins/SceneHero';
import {SkinPicker} from '../features/skins/SkinPicker';
import {Copy,Panel,Button,s} from '../components/UI';
import {Icon} from '../components/Icon';
import {color} from '../design/tokens';
import {useStore} from '../state/store';
import {useSkin} from '../features/skins/SkinProvider';
import {release} from '../domain/content';
import {Nav} from '../navigation';
export function Home({nav}:{nav:Nav}){const store=useStore(),{id}=useSkin();const cafe=id==='cafe';return <View style={{gap:20}}><PageSection title="마음 이야기">
 <View><Copy kind="label" muted>{cafe?'차 한 잔, 마음 한 장':'오늘, 나에게 건네는 시간'}</Copy><Copy kind="hero" style={{marginTop:8,fontSize:25,lineHeight:33}}>{cafe?'마음에 남은 걱정,\n혼자 품고 있나요?':release.homeMessage.replace(', ',','+'\n')}</Copy><Copy muted style={{marginTop:8}}>{cafe?'혼자 걱정하지 말아요.\n따뜻한 차 한 잔과 타로로 천천히 풀어가요.':'서두르지 않아도 괜찮아요.'}</Copy></View>
 <View style={{gap:12}}><View style={cafe?{width:180,alignSelf:'center'}:undefined}><SceneHero reduced={store.reduced} giga={store.tone==='giga'}/></View><Button onPress={()=>nav.push({name:'talk'})} icon="heart">마음 이야기 시작하기</Button></View>
<Copy kind="small" muted style={{textAlign:'center'}}>당신의 선택을 대신 정하지 않고, 함께 살펴볼게요.</Copy> </PageSection><PageSection title="타로와 마음기록"><SkinPicker/>
 <Button secondary icon="cards" onPress={()=>nav.push({name:'counseling'})}>타로 AI와 이야기하기</Button>
 <View style={[s.row,{alignItems:'stretch'}]}><Pressable accessibilityRole="button" onPress={()=>nav.push({name:'daily'})} style={{flex:1}}><Panel tone={color.peach} style={{flex:1,gap:9,borderWidth:0}}><Icon name="cards"/><Copy kind="subtitle">오늘의 한 장</Copy><Copy kind="small" muted>하루에 한 번,{`\n`}나를 위한 힌트</Copy></Panel></Pressable><Pressable accessibilityRole="button" onPress={()=>nav.push({name:'topics'})} style={{flex:1}}><Panel tone={color.pink} style={{flex:1,gap:9,borderWidth:0}}><Icon name="heart"/><Copy kind="subtitle">고민 타로</Copy><Copy kind="small" muted>나에게 맞는 카드로{`\n`}마음을 정리해요</Copy></Panel></Pressable></View>
 <Pressable accessibilityRole="button" onPress={()=>nav.push({name:'journal'})}><Panel style={[s.row,{padding:18}]}><View style={{width:44,height:44,borderRadius:15,backgroundColor:color.sage,alignItems:'center',justifyContent:'center'}}><Icon name="edit"/></View><View style={{flex:1}}><Copy style={{fontWeight:'600'}}>지금의 마음 남기기</Copy><Copy kind="small" muted>{store.entries.length?`${store.entries.length}개의 마음을 소중히 모았어요.`:'한 줄이어도 충분한 나의 기록'}</Copy></View><Icon name="arrow" size={19}/></Panel></Pressable>
 <Button secondary onPress={()=>nav.push({name:'stories'})}>작은 쉼표 놀이</Button>
 </PageSection></View>;}

