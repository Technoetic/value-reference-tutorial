# REF / LEDGER 설계 요약

## 1. 도메인 추상화 범위
- 마틴 파울러 카탈로그의 `Order` / `Customer` / `repositoryData` 예제를 카페 단골 스탬프 원장으로 각색한 교육용 모델입니다.
- `C1`·`C2`·`R1`은 참조 연결을 눈으로 확인하기 위한 `WeakMap` 기반 실험 이름표이며 실제 메모리 주소가 아닙니다.
- 학습 기록(`ref-ledger.progress.v1`)은 현재 브라우저의 `localStorage`에만 저장되며 외부 서버 전송이나 계정 연동은 없습니다.

## 2. 배포 캐시와 GitHub Pages 경계
- 로컬 정적 서버(`scripts/server.mjs`)는 `index.html`·`version.json`·`data/*.json`에 `Cache-Control: no-store`, 해시된 `assets/*`에 `immutable`을 부여합니다.
- GitHub Pages 운영 환경은 플랫폼 정책상 `max-age=600` 응답 헤더를 사용하므로, `version.json` 고유 쿼리 조회(`cache: 'no-store'`), 해시된 자산 파일명(`.vr-<12hex>.js`), 이전 배포의 검증된 불변 자산 보존(`scripts/retain-assets.mjs`), 최초 진입 1회 전환(`EntryService`, 반복 루프 방지 포함)으로 보완합니다.
