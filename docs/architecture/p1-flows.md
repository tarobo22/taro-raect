# P1: 마음의 흐름, 소중한 리딩, 선택 기록 요약

- `P1Api`는 `/v2/journal-summary`, `/v2/favorites`, `/v2/journal-insights`를 엄격하게 읽고 쓴다. 화면은 Fetch/원시 JSON을 다루지 않는다.
- `journalWindow`는 사용자 시간대의 날짜와 inclusive 7일/30일 범위를 계산한다. 집계는 일기의 `local_day`를 사용하며 GET만 수행한다. 달력은 기록 여부와 날짜 링크, 기분은 5개 선택 항목별 실제 횟수만 표시한다.
- `SummaryLoader`는 기간 변경 후 늦게 도착한 이전 응답을 버린다. 빈 목록에 임의의 점수·AI 응답·진단을 생성하지 않는다.
- 소중한 리딩은 v2 본인 리딩 ID를 POST/DELETE한다. POST 재시도는 기존 operation receipt의 동일 UUID를 재사용한다. 목록은 cursor를 사용하고 원본 상세를 다시 조회한다. 원본 삭제 이후 목록 정리는 서버가 담당한다.
- AI 요약 선택은 타로·대화 참조 선택(최대 3개)과 독립된 `yeoun.p1.insight-selection`에 최대 10개 ID/날짜/version만 보관한다. 본문을 기기 초안에 복사하지 않는다. 기간을 적용하면 선택을 비운다.
- 명시적인 GPT 요청 버튼을 누를 때 bootstrap의 최신 `ai_processing` 및 별도의 `journal_context` 동의를 확인한다. 선택 ID와 정확한 version map만 서버에 보내며 변경된 원본은 서버의 409를 그대로 표시한다.
- 202 응답은 기존 `rememberJob`/작업 상태 화면으로 이어진다. 화면 이탈·재시작·수동 상태 조회는 AI POST를 반복하지 않는다. 취소와 명시적 재시도는 기존 작업 API를 사용한다. `Job.kind=insight` 완료는 요약 상세로 연결한다.
- GET Insight의 `entry_ids`/`entry_versions`는 본문 없는 원본 참조다. 결과는 서버 상태가 `ready`이며 kind가 `insight`일 때만 표시한다. 동의 변경·원본 수정/삭제로 `invalidated`가 되면 이전 결과를 숨기고 재선택을 안내한다. 원본 열기는 최신 기록을 조회한 후 읽기 화면으로 이동한다.
- AI 제공자가 준비되지 않은 경우 요청 버튼은 비활성화하고 준비 안내를 표시한다. 기본 집계와 즐겨찾기는 계속 사용할 수 있다.

공유 UI 토큰과 버튼을 재사용하며 새 달력 날짜의 최소 터치 영역은 48×52이다. 좁은 화면의 7열 달력은 가로 스크롤로 최소 폭을 유지한다. 새로운 자동 모션은 추가하지 않는다.

검증: 신규 `tests/p1-contract.test.ts`가 날짜 경계·응답 검증·기간 응답 경쟁·소유권 오류·동의·선택 버전·무효화 계약을 확인한다. Web `tests/e2e/p1-flow.test.mjs`는 mock API를 사용하며 실제 OpenAI 요청을 실행하지 않는다.
