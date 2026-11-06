# 기록 목록의 화면과 데이터 수명

목록을 숨긴 채 DOM에 유지하던 방식은 상세와 같은 기분/원문을 두 번 렌더링했다. Root는 이제 활성 `records` 경로에만 `Records`를 mount한다. 상세·원본·편집 화면에는 비활성 목록 DOM이 남지 않는다. 기존 Animated opacity 효과와 다른 경로는 그대로다.

`RecordViewState`가 Root 수명 동안 `PageMemoryCache`와 스크롤 위치를 소유한다. 계정 전환은 기존 AccountBoundary가 Root를 교체하므로 캐시도 계정과 함께 분리된다. 디스크나 계정 저장소에는 목록 캐시를 쓰지 않는다.

- `PageMemoryProvider`는 기록 목록 하위에만 존재한다. `useP0Pages`의 선택적 명시 cache key를 지정한 기록·리딩·대화·대화 turn만 조회 스냅샷을 재사용한다. 다른 사용처의 기본 조회 동작은 유지한다.
- 완료된 빈 목록도 조회 완료로 구분한다. 추가 페이지와 cursor, 대화의 펼침 상태를 보관하여 상세 왕복에는 첫 페이지를 다시 요청하지 않는다. Root가 기존 스크롤 위치를 복원한다.
- 화면 종료 시 PageLoader의 generation을 무효화하고 busy 상태를 해제한다. 늦게 끝난 조회는 새 화면 상태나 캐시에 반영하지 않는다. 캐시 reset의 별도 generation은 이전 화면 cleanup이 삭제한 데이터를 다시 보관하는 것도 막는다.
- 필터·적용 날짜·실제 기록 메타데이터 변경, 명시 dataset refresh가 캐시와 위치를 초기화한다. Store의 메모리 전용 `recordsRevision`은 Dashboard snapshot을 게시할 때 증가한다. 따라서 legacy 목록이 계속 빈 배열이어도 v2 저장·편집 이후 갱신을 감지한다. 단순 상세 왕복과 동의/설정 렌더링에는 증가하지 않는다.

신규 단위3개는 페이지/cursor/펼침 복원, 빈 목록, dispose/reset 뒤 늦은 응답과 쓰기, legacy 메타데이터가 동일한 v2 수정 이후 refresh를 검증한다. 기존 페이지·스크롤 단위2개와 기존 브라우저4개(기분 정책2, 실API 원본 열기1, 추가 페이지·스크롤·재조회 없음1)를 변경 없이 실행했다. 실API 검증은 root의 isolated DB+mock provider 서버를 사용하며 실제 모델 호출은 없다.
