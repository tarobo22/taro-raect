import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SceneHero} from '../features/skins/SceneHero';
import {SkinPicker} from '../features/skins/SkinPicker';
import {Copy, Panel, Button, s} from '../components/UI';
import {Icon} from '../components/Icon';
import {color} from '../design/tokens';
import {useStore} from '../state/store';
import {useSkin} from '../features/skins/SkinProvider';
import {Nav} from '../navigation';

export function Home({nav}: {nav: Nav}) {
  const {reduced, tone} = useStore();
  const {id} = useSkin();

  return (
    <View style={styles.home}>
      <View style={styles.intro}>
        <Copy kind="label" muted>{id === 'cafe' ? '차 한 잔, 마음 한 장' : '오늘, 나에게 건네는 시간'}</Copy>
        <Copy kind="title">오늘, 어떤 마음인가요?</Copy>
      </View>

      <View style={[s.row, styles.primaryActions]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="오늘 한 장"
          accessibilityHint="오늘을 위한 카드 한 장을 살펴봐요."
          onPress={() => nav.push({name: 'daily'})}
          style={styles.action}
        >
          <Panel tone={color.peach} style={styles.actionPanel}>
            <Icon name="cards" />
            <Copy kind="subtitle">오늘 한 장</Copy>
            <Copy kind="small" muted>오늘을 위한 카드 한 장</Copy>
          </Panel>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="고민 이야기"
          accessibilityHint="고민을 쓰고 카드와 함께 살펴봐요."
          onPress={() => nav.push({name: 'counseling'})}
          style={styles.action}
        >
          <Panel tone={color.mint} style={styles.actionPanel}>
            <Icon name="heart" />
            <Copy kind="subtitle">고민 이야기</Copy>
            <Copy kind="small" muted>카드와 고민 나누기</Copy>
          </Panel>
        </Pressable>
      </View>

      <View style={styles.space}>
        <SkinPicker />
        <SceneHero reduced={reduced} giga={tone === 'giga'} />
      </View>

      <View style={styles.alternateAction}>
        <Copy kind="small" muted>카드 장수를 직접 고르고 싶을 때</Copy>
        <Button secondary icon="cards" onPress={() => nav.push({name: 'topics'})}>고민 타로</Button>
      </View>
      <View style={styles.alternateAction}>
        <Copy kind="small" muted>예·아니요 질문 세 가지로 가볍게</Copy>
        <Button secondary icon="heart" onPress={() => nav.push({name: 'talk'})}>마음 이야기 시작하기</Button>
      </View>
      <Button secondary onPress={() => nav.push({name: 'stories'})}>작은 쉼표 놀이</Button>
      <Copy kind="small" muted style={styles.note}>당신의 선택을 대신 정하지 않고, 함께 살펴볼게요.</Copy>
    </View>
  );
}

const styles = StyleSheet.create({
  home: {gap: 20},
  intro: {gap: 4},
  primaryActions: {alignItems: 'stretch'},
  action: {flex: 1},
  actionPanel: {flex: 1, gap: 6, padding: 14, borderWidth: 0},
  space: {gap: 12},
  alternateAction: {gap: 6},
  note: {textAlign: 'center'},
});
