import React, {useMemo, useRef, useState} from 'react';
import {Animated, Easing, Platform, StyleSheet, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {Button, Copy, Panel} from './UI';
import {color} from '../design/tokens';
import {useActivityEffect} from '../features/motion/useActivityEffect';
import {useSkinTheme} from '../features/skins/useSkinTheme';
import {useStore} from '../state/store';

const phaseSeconds = 4;

export function BreathingDial() {
  const {reduced} = useStore();
  const theme = useSkinTheme();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const progress = useRef(new Animated.Value(0)).current;
  const inhale = elapsed < phaseSeconds;
  const remaining = phaseSeconds - elapsed % phaseSeconds;
  const animation = useMemo(() => ({
    haloScale: progress.interpolate({inputRange: [0, 1], outputRange: [0.9, 1.1]}),
    haloOpacity: progress.interpolate({inputRange: [0, 1], outputRange: [0.45, 0.8]}),
    ringScale: progress.interpolate({inputRange: [0, 1], outputRange: [0.86, 1.12]}),
    orbScale: progress.interpolate({inputRange: [0, 1], outputRange: [0.88, 1.12]}),
  }), [progress]);

  useActivityEffect(current => {
    const secondsInPhase = elapsedRef.current % phaseSeconds;
    const expanding = elapsedRef.current < phaseSeconds;
    const fraction = secondsInPhase / phaseSeconds;
    const target = expanding ? 1 : 0;
    progress.setValue(reduced ? 0 : expanding ? fraction : 1 - fraction);
    const interval = setInterval(() => {
      if (!current()) return;
      elapsedRef.current = (elapsedRef.current + 1) % (phaseSeconds * 2);
      setElapsed(elapsedRef.current);
    }, 1000);

    const timing = (toValue: number, duration: number) => Animated.timing(progress, {
      toValue, duration, easing: Easing.inOut(Easing.sin),
      useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    });
    const loop = Animated.sequence([
      timing(target, (phaseSeconds - secondsInPhase) * 1000),
      Animated.loop(Animated.sequence([
        timing(1 - target, phaseSeconds * 1000),
        timing(target, phaseSeconds * 1000),
      ])),
    ]);
    if (!reduced) loop.start();

    return () => {
      clearInterval(interval);
      loop.stop();
      progress.setValue(0);
    };
  }, [reduced, progress], running);

  function toggle() {
    elapsedRef.current = 0;
    setElapsed(0);
    setRunning(value => !value);
  }

  return (
    <Panel tone={color.sage} style={styles.panel}>
      <Copy kind="subtitle" style={styles.centerText}>잠깐, 숨을 쉬어요</Copy>
      <View style={styles.visual} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
        <Animated.View style={[styles.halo, {
          backgroundColor: theme.tint,
          opacity: animation.haloOpacity,
          transform: [{scale: animation.haloScale}],
        }]} />
        <Animated.View style={[styles.ring, {
          borderColor: theme.frame,
          transform: [{scale: animation.ringScale}],
        }]} />
        <Animated.View style={[styles.orb, {
          backgroundColor: theme.surface,
          borderColor: theme.frame,
          transform: [{scale: animation.orbScale}],
        }]}>
          <Svg width={54} height={38} viewBox="0 0 54 38" fill="none">
            <Path d="M5 14h29c7 0 8-9 2-9-2 0-4 1-5 3M8 21h37c7 0 8 10 1 10-3 0-4-1-5-3M4 28h23c6 0 7 8 1 8" stroke={theme.action} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </View>
      <View style={styles.readout}>
        <View accessibilityLiveRegion="polite">
          <Copy kind="title" style={styles.centerText}>
            {running ? (inhale ? '숨을 들이쉬어요' : '숨을 내쉬어요') : '편하게 시작해요'}
          </Copy>
        </View>
        {running ? <Copy muted style={styles.centerText}>{remaining}초</Copy> : null}
      </View>
      <Copy kind="small" muted style={styles.centerText}>
        {running ? '힘들면 멈추고 평소처럼 숨 쉬어요.' : '편한 만큼만 따라 해요. 언제든 멈춰도 좋아요.'}
      </Copy>
      <Button secondary onPress={toggle} style={styles.button}>
        {running ? '여기서 쉬기' : '호흡 시작하기'}
      </Button>
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: {alignItems: 'center', gap: 12},
  centerText: {textAlign: 'center'},
  visual: {width: 180, height: 180, alignItems: 'center', justifyContent: 'center'},
  halo: {position: 'absolute', width: 156, height: 156, borderRadius: 78},
  ring: {position: 'absolute', width: 133, height: 133, borderRadius: 66.5, borderWidth: 1},
  orb: {width: 104, height: 104, borderRadius: 52, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  readout: {alignItems: 'center', gap: 2},
  button: {alignSelf: 'stretch'},
});
