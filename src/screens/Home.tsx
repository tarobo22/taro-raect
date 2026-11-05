import React from 'react';
import {Pressable,View} from 'react-native';
import {Character} from '../components/Character';
import {Copy,Panel,Button,s} from '../components/UI';
import {Icon} from '../components/Icon';
import {color} from '../design/tokens';
import {useStore} from '../state/store';
import {release} from '../domain/content';
import {Nav} from '../navigation';
export function Home({nav}:{nav:Nav}){const store=useStore();return <View style={{gap:20}}>
 <View><Copy kind="label" muted>오늘, 나에게 건네는 시간</Copy><Copy kind="hero" style={{marginTop:8}}>{release.homeMessage}</Copy><Copy muted style={{marginTop:8}}>서두르지 않아도 괜찮아요.</Copy></View>
 <Panel tone={color.mint} style={{alignItems:'center',paddingTop:8,paddingBottom:24,borderWidth:0}}><Character expression={store.tone==='giga'?'encourage':'welcome'} giga={store.tone==='giga'} reduced={store.reduced} size={156}/><Copy kind="subtitle" style={{textAlign:'center',marginTop:4}}>{store.tone==='giga'?'네 마음은 네 편부터 들어주자.':'지금, 어떤 마음인가요?'}</Copy><Copy kind="small" muted style={{textAlign:'center',marginTop:6}}>이야기해도, 잠깐 쉬어도 좋아요.</Copy><Button onPress={()=>nav.push({name:'talk'})} style={{alignSelf:'stretch',marginTop:20}} icon="heart">마음 이야기 시작하기</Button></Panel>
 <View style={[s.row,{alignItems:'stretch'}]}><Pressable accessibilityRole="button" onPress={()=>nav.push({name:'daily'})} style={{flex:1}}><Panel tone={color.peach} style={{height:'100%',gap:9,borderWidth:0}}><Icon name="cards"/><Copy kind="subtitle">오늘의 한 장</Copy><Copy kind="small" muted>하루에 한 번,{`\n`}나를 위한 힌트</Copy></Panel></Pressable><Pressable accessibilityRole="button" onPress={()=>nav.push({name:'topics'})} style={{flex:1}}><Panel tone={color.pink} style={{height:'100%',gap:9,borderWidth:0}}><Icon name="heart"/><Copy kind="subtitle">고민 타로</Copy><Copy kind="small" muted>나에게 맞는 카드로{`\n`}마음을 정리해요</Copy></Panel></Pressable></View>
 <Pressable accessibilityRole="button" onPress={()=>nav.push({name:'journal'})}><Panel style={[s.row,{padding:18}]}><View style={{width:44,height:44,borderRadius:15,backgroundColor:color.sage,alignItems:'center',justifyContent:'center'}}><Icon name="edit"/></View><View style={{flex:1}}><Copy style={{fontWeight:'600'}}>지금의 마음 남기기</Copy><Copy kind="small" muted>{store.entries.length?`${store.entries.length}개의 마음을 소중히 모았어요.`:'한 줄이어도 충분한 나의 기록'}</Copy></View><Icon name="arrow" size={19}/></Panel></Pressable>
 <Copy kind="small" muted style={{textAlign:'center'}}>당신의 선택을 대신 정하지 않고, 함께 살펴볼게요.</Copy>
 </View>;}
