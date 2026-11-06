# 계정 연결과 기기별 기록 격리

이 문서는 비AI 소셜 로그인 프런트엔드의 구현 계약을 설명한다. 제공자 설정, 실제 OAuth 승인, AI·전사 API는 이 작업에서 변경하거나 호출하지 않는다.

## 로그인 계약

- 공개 `GET /v2/auth/providers`의 `available`과 `reason`을 표시한다. 설정되지 않은 Google/Apple은 비활성 상태와 실제 준비 상태를 안내한다.
- 기존 bearer를 유지한 채 `/v2/auth/social/{provider}/start`에 `return_uri`, S256 `code_challenge`, `platform`, 명시적 `intent`를 보낸다. 회원의 새 제공자 추가는 별도의 `link` 동작이다.
- Web 복귀 주소는 현재 origin의 `/auth/complete`, Android는 `yeoun://auth/complete`이다. 주소에 bearer를 넣지 않는다. 서버의 exact allowlist와 SPA fallback이 배포 환경에 필요하다.
- Web Crypto 또는 Android의 `SecureRandom`·SHA-256만 PKCE를 만든다. 네이티브 모듈이 없는 기존 앱은 업데이트 안내와 함께 로그인 기능을 비활성화한다. iOS용 동등한 PKCE 모듈은 아직 구현하지 않았다.
- 콜백은 동일 복귀 주소, 중복 없는 fragment, 예상 제공자, 허용된 ticket/error 형식만 받는다. Web은 fragment를 주소창에서 즉시 지운다. pending 항목은 교환 전에 지워 중복 콜백을 한 번만 처리한다. 서버가 일회용 ticket·만료·PKCE·원래 소유자를 최종 검증한다.
- exchange 응답은 UUID, 64자리 소문자 hex access token, 만료 시각, `previous_user_id`, `guest_records_preserved:true`를 엄격히 확인한다. 사용자 kind는 기존 guest와 member를 함께 허용한다.
- 계정 화면은 현재/다른 기기 세션, 현재 기기 로그아웃, 전체 로그아웃, 명시적인 이전 게스트 복원을 제공한다. 취소·실패 시 기존 연결을 유지하며 자동 재교환하지 않는다.

## 소유자 전환과 로컬 보관

처음 게스트를 회원으로 연결해 owner UUID가 같으면 로컬 값을 유지한다. 다른 계정으로 바뀌면 Store·화면·navigation을 먼저 unmount한다. 앱 HTTP 요청은 중단하고 늦게 도착한 응답을 거절한다. 이미 서버에 도달한 변경은 취소됐다고 가정하지 않으며 pending 연결을 자동 재전송하지 않는다.

추적 중인 설정·기기 삭제·연결 작업과 storage 작업이 끝난 뒤 기존 `yeoun.*` 키와 값을 해석하지 않고 계정별 archive에 보관한다. 기존 키와 값 형식은 유지한다. 다음 owner의 archive만 활성 키에 복원한 뒤 세션을 generation-safe하게 교체하고 새 Store를 mount한다. 같은 복원 요청은 합치고 다른 전환 요청은 거절한다. 진행이 길어지거나 실패하면 기록 화면 대신 전환 상태와 재확인 동작을 표시한다.

서로 다른 owner로 이동할 때 원래 게스트 연결을 별도 vault에 보관하여 사용자가 직접 돌아갈 수 있다. Android는 별도 Keychain 서비스, Web은 기존 세션과 동일한 브라우저 저장 신뢰 경계의 localStorage를 사용한다. Web의 PKCE pending은 sessionStorage에 둔다. 기기 저장소를 지우면 보관된 연결도 사라지며, 만료·로그아웃된 게스트 연결은 복원할 수 없다. 서버 기록을 자동으로 병합하지 않는다.

현재 계정 전체 삭제는 그 owner의 archive·게스트 연결·pending만 정리한다. 다른 계정의 archive와 기존 최소 삭제 receipt는 유지한다. 원래 AI/일기/결제 payload는 이 인프라에서 해석하거나 변경하지 않는다.

## 검증과 제한

새 단위 검증 6개는 PKCE, strict decode와 member bootstrap, 같은 owner 및 다른 owner 초안·pending 보관, 지연 저장과 중복 복원, HTTP stale 응답, 세션 adopt/forget 경쟁, 콜백 중복·취소를 검증한다. 새 브라우저 검증 2개는 미설정 제공자와 모의 로그인→회원 초안 분리→게스트 복원→취소를 production build에서 확인한다. 제공자 URL은 브라우저 fixture가 가로채며 실제 OAuth를 호출하지 않는다.

브라우저 검증에서 확인한 기존 실패 원인은 member bootstrap을 guest-only decoder가 거절한 계약 누락이었다. guest 검증은 유지하고 kind의 두 번째 literal을 추가했다. 실제 제공자 승인, 기기 deep link 왕복, 네이티브 빌드·설치는 별도 통합 검증 대상이다. 앱 버전과 제공자 키 설정은 변경하지 않았다.
