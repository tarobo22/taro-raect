# 여운 · React 웹

타로 카드와 대화로 고민을 정리하는 여운의 웹입니다. React Native Web으로 모바일과 주요 화면을 공유합니다. [공개 데모](https://yeoun-43-201-209-249.sslip.io/) · [포트폴리오 자료실](https://app.notion.com/p/411b37c6fe72812b9723cf911343c5d1)

## 먼저 체험할 흐름

- **오늘의 한 장**에서 카드를 열면 이름과 쉬운 해석 한 문장이 먼저 보입니다. 카드를 누르면 상세를 읽을 수 있습니다.
- **고민 타로**에서 3장과 질문을 고르고 시작하면 입력한 질문을 바로 보냅니다. 세 장을 하나씩 풀이한 뒤 함께 읽은 결론과 해 볼 일 하나를 제안합니다.
- **설정**에서 세 공간과 덱을 고를 수 있습니다. 캐릭터 표정 목록은 스크롤 중에도 상단에서 설정으로 돌아갈 수 있습니다.

## 로컬 실행

Node 24.22.2 이상을 사용합니다. [FastAPI](https://github.com/tarobo22/taro-back)의 로컬 API를 먼저 시작하세요.

```powershell
. ./tools/use-env.ps1
npm ci
npm run typecheck
npm test
npm run build
npm run preview
```

웹은 `http://127.0.0.1:8807`에서 열립니다. Vite는 `/api`를 기본값 `http://127.0.0.1:8808`로 전달합니다. API 주소가 다르면 `VITE_API_PROXY`로 지정합니다.

## 배포·검증

2026-11-08 기준 웹 소스 `73eb0b9`와 API 소스 `3646de3`을 공개 데모에서 확인했습니다. 웹 기존 테스트 170개와 타입 검사, 프로덕션 빌드가 통과했습니다. [웹 CI](https://github.com/tarobo22/taro-raect/actions/runs/42470984935) · [운영 버전](https://yeoun-43-201-209-249.sslip.io/deployment-status.json)

공개 브라우저에서 빈 질문은 0회, 입력한 3장 질문은 1회 전송됐습니다. 카드 상세를 열었다 돌아와도 총 1회였고, 실제 응답에서 세 카드의 풀이와 종합 조언을 확인했습니다. [API 계약](docs/contracts/openapi.json) · [React Native 앱](https://github.com/tarobo22/taro)

## 설계 기록

[기획 PDF](docs/planning/타로기획1안.pdf) · [2026-11-06 구현 현황](docs/planning/implementation-status-20261106.md) · [요구사항 추적표](docs/planning/requirements-traceability-20261106.csv) · [남은 결정안](docs/planning/remaining-decisions-20261106.md) · [P0 완료 기록](docs/quality/p0-completion.md) · [TDD 평가](docs/quality/tdd-audit.md)
