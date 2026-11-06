# 짧은 마음돌봄 이야기

`window-pause@1.0.0`는 자작 에피소드 한 편이다. 모든 경로는 세 번의 선택 뒤 세 개의 완결된 결말 중 하나로 끝난다. AI·재화·점수·무작위 보상·결제는 사용하지 않는다.

Home → 작은 쉼표 놀이 → 시작 또는 이어하기 → 좌 아니요/우 예 선택과 같은 버튼 → 결말 → 명시적인 다시 시작. 화면을 열거나 다시 읽는 행동은 새 진행을 만들지 않는다. 서버 응답이 확인되기 전에는 선택이 저장된 것처럼 진행하지 않는다.

서버의 story catalog는 배포 시 그래프 전체를 검사한다. 같은 콘텐츠 버전은 변경하지 않으며 진행 중인 버전의 정의를 이후 배포에서도 보존한다. 진행은 owner와 콘텐츠 버전에 묶이고 요청 UUID·aggregate version·현재 node를 함께 확인한다. 예전 선택의 재전송은 다시 진행시키지 않으며 다른 내용으로 같은 키를 재사용하거나 오래된 version을 보내면 409로 거절한다.

클라이언트는 `StoryApi` DTO 검증과 `useStoryRead`/`useStoryMutation`을 사용한다. 진행과 선택은 서버에 저장하므로 별도 로컬 본문 초안이 없다. 멱등키 보관은 owner ID가 포함된 `yeoun.p0.attempt.story.<owner>.*` namespace를 사용한다. 계정 전환 뒤 이전 owner의 늦은 읽기·쓰기 응답은 표시하지 않는다. 현재 owner로 진행을 다시 조회한다.

서버는 `StoryCatalog` 순수 domain → `StoryService` → repository/UoW ports → PostgreSQL adapter로 분리한다. `story_router`는 인증 owner를 주입받으며 `main.py` 조립은 통합 담당자가 수행한다. `export_owner(connection, owner)`는 선택 이력을 포함한 `story_runs`를 제공하고 `erase_owner(connection, owner)`는 동일 개인정보 처리 트랜잭션에서 진행과 멱등키 metadata를 함께 지운다.

테스트는 실제 데이터의 그래프·세 결말, 재전송·충돌·소유권·삭제 중 거절, PostgreSQL 동시 시작/선택과 개인정보 callback, typed client DTO, 브라우저 reload 후 이어하기와 명시적인 다시 시작을 확인한다. 기존 테스트와 AI 모듈은 변경하지 않는다.
