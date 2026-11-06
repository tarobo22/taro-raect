# 비AI 감각 수명주기

Character의 호흡·눈깜빡임과 BreathingDial의 반복 애니메이션·카운트다운은 AppState가 active일 때만 실행한다. inactive/background에서는 현재 자원을 정지하고 예약 콜백의 세대를 무효화한다. foreground에는 새 자원을 하나만 만든다. unmount 후 AppState 이벤트나 이전 타이머가 상태를 갱신하지 않는다. 호흡 카운트는 배경에서 진행하지 않으며 돌아오면 남은 단계부터 재개한다. 모션 감소는 기존 정적 표현을 유지한다.

감각 기본값은 `src/features/audio/preferences.ts` 한 곳에서 정의한다. 새 기기 또는 누락 필드는 효과음 off, 배경음 off, 햅틱 on이다. 기기에 이미 저장된 명시적 true/false는 변경하지 않는다. 서버의 현재 preferences 계약에는 sound/music/haptics가 없으므로 이 설정은 기기에서만 보관한다. 원격 감각 설정 동기화는 별도 계약이 필요하다.

AudioGate는 녹음 시도마다 개별 lease를 발급한다. 활성 lease가 하나라도 있거나 앱이 background이면 앱 소유 효과음·배경음을 재생하지 않는다. 녹음 시작은 이미 재생 중인 효과음을 멈추고 배경음을 일시정지한다. 이전 세션의 중복 종료·늦은 오류·취소가 새 세션의 lease를 해제하지 않는다. 시작 실패·권한 거절·종료·취소·소유 화면 unmount는 자기 lease만 해제한다. 마지막 lease가 해제되고 foreground이며 사용자가 배경음을 켜 둔 경우에만 배경음을 재개한다. 중단한 효과음은 뒤늦게 재생하지 않는다.

Web은 개별 SpeechRecognition 인스턴스의 콜백을 해제하고 abort한다. Android는 기존 `start(language)` 계약과 인식 엔진 선택을 유지하며, 추가된 `startCapture(language,captureId)` 이벤트를 해당 ID로만 처리한다. Native listener는 생성 당시 ID와 epoch를 사용해 이전 recognizer의 결과를 새 세션에 전달하지 않는다. JS 정리도 현재 세션만 native stop을 호출한다.

새 Android 기본 앱은 YeounFeedback의 `setCaptureMuted`로 활성 SoundPool stream을 stop하고 MediaPlayer를 pause한다. 이전 기본 앱에 이 메서드가 없으면 configure로 향후 앱 재생을 막는 호환 경로만 사용한다. 이전 네이티브 모듈에서 이미 재생 중인 stream 중지나 세션 ID 분리를 보장하지 않는다. 새 네이티브 동작은 기본 앱 빌드가 필요하며 JS OTA만으로 추가되지 않는다. OS·음성 인식기 자체의 시작/종료음은 앱 오디오 제어 범위 밖이다.

검증은 pure gate/캡처 6개와 반복 자원 수명 6개, 기존 단위 회귀·타입 검사·웹 production build로 수행한다. 별도 production harness의 브라우저 검증은 실제 모듈과 컴포넌트를 사용하며 오디오 장치와 SpeechRecognition만 모의 객체로 대체한다. 실제 주변 음성은 녹음하지 않고, AI/클라우드 전사 API·제공자·키를 사용하거나 수정하지 않는다. 실기기 촉감·OS 인식음·모든 제조사 동작 검증을 대신하지 않는다.

Web 재현(taro-raect 저장소): `node tests/e2e/run-sensory-harness.mjs`. 이 신규 검증 스크립트는 .local에 별도 production harness를 빌드하고 preview 서버와 브라우저 2개 검사를 실행한 뒤 서버를 종료한다. 기본 포트는 8836이며 YEOUN_SENSORY_PORT로 바꿀 수 있다. 원래 앱 엔트리·Vite 설정·기존 테스트 설정을 바꾸지 않는다. .local의 별도 번들 크기는 앱 production 번들 크기로 계산하지 않는다.
