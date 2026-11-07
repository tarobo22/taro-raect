# 여운 - 세 공간 소개영상

| 파일 | 규격 | 용도 |
|---|---|---|
| videos/yeoun-three-spaces-landscape-60s.mp4 | 1920×1080, 60초, 60fps | 소개·포트폴리오 |
| videos/yeoun-three-spaces-portrait-60s.mp4 | 1080×1920, 60초, 60fps | 세로 소개 |
| videos/yeoun-three-spaces-guide-30s.mp4 | 1920×1080, 30초, 60fps | 공간·소리·움직임 사용법 |

모두 H.264 / AAC / faststart. 실제 길이와 프레임 수는 videos/verified-media.json에 있다. 앱 실측 FPS와 영상 출력 FPS를 구분한다.

## 편집

- 도입 → 공간 → 공감·이해 확인 → 카드 → 조언·기록 → 브랜드 순서.
- 클릭 표시의 위치는 편집 화면의 실제 DOM 경계에서 계산한다.
- 상담 화면은 실제 React 캡처를 크게 재배치했다. 대화는 로컬 합성 QA 제공자의 예시이고, GPT를 호출하지 않았다.
- 카드는 실제 로컬 백엔드가 뽑은 결과 화면을 캡처했다. 영상에서는 같은 결과를 보여주는 3D 뒤집기를 재현했다.
- 원본 타임라인: film-template.html. 미리보기: film.html. window.renderFrame(seconds)로 장면을 확인할 수 있다.
- narration.json / guide-narration.json에 한국어 대본과 시작 시각을 분리했다.
- 음성: 로컬 Microsoft Heami Desktop, System.Speech, rate 0. 외부 API 키와 사용자 대화 전송 없이 생성했다.
- 배경 음악: 직접 만든 88 BPM 피아노. 기존 앱의 직접 만든 터치·카드 효과음을 재사용했다.
- 야옹: freemaster2 / CC0. 출처·가공·해시는 assets/audio/cat_meow.license.json에 있다.
- 음량: FFmpeg loudnorm, 목표 -16 LUFS, true peak -1.5 dBTP.

## 다시 만들기

Node 24+, 프로젝트 Playwright, Python numpy, FFmpeg를 사용한다. PDF 보고서는 reportlab과 Windows 한글 폰트를 사용한다. YEOUN_FFMPEG로 FFmpeg 위치를 지정할 수 있다.

1. tools/capture_skin_flow.mjs: 별도 로컬 QA 서버에서 실제 앱 화면 캡처.
2. powershell.exe -File tools/narrate_skins.ps1: 로컬 음성 생성. 사용법은 -ScriptName guide-narration.json.
3. python tools/mix_skin_film.py: 목소리·음악·효과음 마스터 생성.
4. node tools/build_skin_film.mjs: 화면·에셋과 타임라인 결합.
5. node tools/render_skin_film.mjs landscape / portrait / guide: 각각 인코딩. --posters는 장면 사진만 생성.

GitHub의 영상·QR은 저장소 접근 권한이 필요할 수 있다. 공개 영상 사이트나 운영 앱에는 배포하지 않았다.
