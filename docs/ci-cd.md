# 웹 CI/CD

`push`·PR → `npm ci` → 타입 검사 → 기존 동작 테스트 → Vite 빌드.

`main`에서 위 검증이 모두 통과하면 같은 빌드 결과를 SHA-256과 함께 GitHub Release로 게시한다. 여운 전용 서버가 1분 간격으로 릴리스를 확인하고 웹 파일을 교체한다. Actions는 서버에 해당 릴리스가 반영되고 웹·API health가 통과해야 성공 처리한다.

- [공개 앱](https://yeoun-43-201-209-249.sslip.io/)
- [배포 상태](https://yeoun-43-201-209-249.sslip.io/deployment-status.json)
- [실행 기록](https://github.com/tarobo22/taro-raect/actions/workflows/checks.yml)
- [서버 설치·복구 절차](https://github.com/tarobo22/taro-back/blob/main/docs/deployment/ci-cd.md)

작업 브랜치/PR은 운영 배포를 실행하지 않는다. 배포에는 내장 `GITHUB_TOKEN`의 릴리스 쓰기 권한만 사용한다. GPT·DB·SSH·AWS 키를 웹 빌드나 GitHub Secret에 넣지 않는다. 앱 화면과 기존 테스트는 변경하지 않았다.

릴리스 업로드에 실패하면 draft 상태로 남고 서버에는 반영되지 않는다. 서버 검사 실패 또는 10분 내 미반영은 Actions 실패로 표시한다. 기존 웹 파일과 해시 에셋을 보존하며 이력을 강제 변경하거나 DB를 지우지 않는다. 수정 후 `main`에 새 커밋을 push하거나 Actions의 수동 실행을 사용할 수 있다.
