# P1-01 기기 알림

현재 구현: Android 로컬 알림. 웹과 이전 네이티브 앱은 미지원 상태를 표시한다. iOS 구현은 포함하지 않는다.

## 흐름과 저장

설정 또는 로그인 전 안내 → 알림 시간 다이얼 → 직접 켜기 → Android 알림 권한 → 기기 예약 → 시간 변경 / 끄기.

- 최초에는 꺼짐. 화면 진입·동의 화면 열기만으로 권한을 요청하지 않는다.
- `ReminderController`가 포트를 통해 읽기·권한·예약·끄기·삭제를 호출한다. 화면에서 네이티브 API를 직접 호출하지 않는다.
- SharedPreferences에는 enabled, hour, minute, next_at만 저장한다. 서버 업로드·계정 ID·기록 본문·GPT 호출은 없다.
- 권한이 늦게 허용되거나 저장이 진행 중이어도 더 최근의 끄기·전체 삭제가 우선한다. 마지막 시간 선택만 예약한다.
- 전체 데이터 삭제 완료 후 `eraseCurrentDeviceData`가 기기 알림을 취소하고 시간 설정을 지운다. 이미 처리한 과거 삭제 영수증으로 새 연결의 설정을 지우지 않는다.
- Android가 권한 또는 채널을 차단하면 읽을 때 기존 예약을 취소하고 꺼짐으로 표시한다. 권한만 다시 허용해도 자동으로 켜지지 않는다.

## 네이티브 경계

하나의 immutable PendingIntent와 `AlarmManager.setAndAllowWhileIdle(RTC_WAKEUP)`를 사용한다. 날짜는 기기 시간대의 Calendar로 계산하고 초·밀리초를 0으로 맞춘다. 반복 밀리초 24시간을 더하지 않는다. 재부팅·시각/시간대 변경·앱 업데이트 receiver는 이전에 켠 설정만 복구한다. 정확한 알람 권한은 요청하지 않는다.

알림은 선택 시각 이후 기기 절전 정책에 따라 지연될 수 있다. 분 단위 정시 배송, 강제 종료 중 배송 또는 모든 제조사의 백그라운드 동작을 보장하지 않는다. Android API 35 에뮬레이터에서는 강제 종료 후 재진입 시 기존 예약 복구를 별도 회귀 검사했다. 이 검사는 기존 구성에서도 통과해 불필요한 복구 코드를 추가하지 않았다.

알림 본문은 공통 문구이며 개인 기록은 표시하지 않는다. `한 번 미리 보기`는 실제 시스템 알림을 게시한다. 웹은 탭 종료 후 매일 배송을 보장할 수 없어 가짜 활성 상태를 만들지 않는다.

## 검증과 설치

- 공유 7개 테스트: 진입 시 권한 비요청, 거부, 시간 검증, 늦은 허용, 마지막 선택, 저장 중 삭제, 삭제 영수증 재사용 방어.
- JVM 6개: 기기 시간대·정확히 같은 분·연말·서머타임 시작/종료·잘못된 시간. `:app:testReleaseUnitTest` 통과.
- API 35 별도 패키지 `com.yeoun.app.p1verify`: 기본 꺼짐, OS 거부 시 예약 0, 허용 시 1개, 시간 변경 후 1개, 미리 보기의 시스템 알림, 끄기 후 예약 0 확인.
- 기존 `com.yeoun.app` 데이터는 지우지 않았다. 재진입 검증은 `python tools/verify-reminder-resume.py`로 재현하며 별도 테스트 앱에서 직접 켠 알림만 대상으로 한다.
- RN 1.3.0 / Android versionCode 4. 네이티브 모듈과 권한 추가는 새 APK가 필요하다. OTA만으로 설치되지 않는다. 이전 기본 앱에서는 기능 미지원 안내로 안전하게 제한한다.

참고: [Android alarms](https://developer.android.com/develop/background-work/services/alarms), [Notification runtime permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission), [Local JVM tests](https://developer.android.com/training/testing/local-tests).
