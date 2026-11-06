# 비AI 전체 흐름·브라우저 QA

확인일: 2026-11-06. 현재 Android·웹 비AI 구현과 로컬/원격 검증 결과다. 실제 OAuth·실과금·iOS native·운영 배포는 별도다. AI 처리 로직·모델·프롬프트 추가 개발과 실제 모델 호출은 이번 범위에서 제외했다.

[Notion 비공개 인계 초안](https://app.notion.com/p/410b37c6fe7281249a4dfa62b85a3c46?pvs=204) · [RN 보고서](https://github.com/tarobo22/taro/tree/codex/complete-non-ai-20261106/docs/reports/non-ai-20261106) · [Backend 계약](https://github.com/tarobo22/taro-back/tree/codex/complete-non-ai-20261106/docs/quality/non-ai-20261106) · [Web QA](https://github.com/tarobo22/taro-raect/tree/codex/complete-non-ai-20261106/docs/quality/non-ai-20261106)

단위: Back532 / RN133 / Web130, 브라우저39, Android JVM6 통과. 세 저장소 GitHub CI도 성공했다. 기존 baseline 테스트 수정·삭제·skip0. 같은 공유 규칙 검증을 품질 점수나 사용자 성능으로 합산하지 않는다.

## 증거 읽기

- logs/browser-delivery.log: 최종 전체39시나리오. AI 회귀는 기존 fake provider이며 실제 외부 호출0.
- 로그·실제 픽셀 회귀: 카드 decode/transform만으로 앞면을 증명하지 못한 문제를 painted-pixel RED→GREEN으로 보완.
- measured-motion.json: 실제 선택/해제 중간 프레임, 실패·성공 셔플 구분, reduced motion 보존과 세장220ms 시작 간격.
- summary.json: 기본8장·18초 영상 촬영 provenance. 홈 이후 최종 보정은 home-final-comparison.json과 함께 읽는다.
- api-latency.json: 각GET warmup1+순차20회. loopback/새 빈 게스트 표본이며 운영 부하 SLO가 아니다.
- final-evidence.json과 all-changed-files.csv: 마지막 빌드·검증·실제 변경 경로.

그림·영상은 RN 보고서 폴더에서 공유한다. 초기 촬영 bundle은 index-Bd0ou1yk.js, 홈높이보정은 index-mAbMCFC4.js, 최종모션·largefont JS는 index-_T8rPMzX.js다. 최종전체39테스트는 마지막bundle에서 통과했다. 스크린샷 시점을 숨기거나 이전 이미지 전체를 최신 실행이라고 바꾸지 않았다.

최종 JS766.71kB/gzip215.20kB의 chunk 경고를 유지했다. 일반 오프라인 안내·이미지 준비와 전체 오프라인 제품을 구분한다. 실제 공급자 OAuth·Play 결제는 웹 화면에서 가짜로 성공시키지 않는다.
