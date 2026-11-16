# REF / LEDGER — 값에서 참조로 (Change Value to Reference)

마틴 파울러(*Refactoring, 2nd Edition*)의 **Change Value to Reference** 기법을 카페 단골 손님 원장(`Order` · `Customer` · `CustomerRepository`) 비유로 직접 조작하며 배우는 한국어 인터랙티브 튜토리얼입니다.

- **실행 주소:** https://technoetic.github.io/value-reference-tutorial/
- **반대 기법 짝꿍 튜토리얼:** [VALUE / SHIFT — Change Reference to Value](https://technoetic.github.io/reference-value-tutorial/)
- **원전 카탈로그:** https://refactoring.com/catalog/changeValueToReference.html

## 학습 단계 (6개 해시 화면)

1. `#/` **시작** — 왜 한 명의 단골이 주문서마다 갈라지는가
2. `#/copies` **복사의 어긋남 (Before)** — `new Customer('C-104')` 복사본 `C1`·`C2`에서 스탬프·등급·메모가 어긋나는 현상 실험
3. `#/reference` **보관소와 참조 (After)** — `CustomerRepository` 단일 참조 `R1`로 모든 주문이 최신 상태를 공유하는 과정 실험
4. `#/repository` **보관소 실험실** — 같은 ID 대 다른 ID, `{ ...customer }` 얕은 복사 실수 재현과 `===` 동일성 검증
5. `#/practice` **여섯 문제** — 개념 확인 6문항 및 브라우저 로컬 메모 저장
6. `#/code` **코드와 정리** — 전후 코드 비교, `CustomerRepository` 최소 구현, 값(Value) 대 참조(Reference) 경계 체크리스트

## 아키텍처 (Webapp 6원칙 적용 · 외부 런타임 의존성 0)

- **모듈 분리 (`src/`):** 진입점(`main.js`), 도메인(`domain/customer-ledger.js`), 6개 화면 클래스(`screens/*.js`), 5개 서비스 클래스(`services/*.js`), 공통 유틸(`shared/*.js`)
- **계층형 스타일 (`src/styles/`):** `tokens.css` · `base.css` · `components.css`
- **비동기·경합 제어:** `AbortController` 취소·타임아웃·재시도, 요청 시퀀스 비교로 늦은 이전 응답 차단, 저장 중 추가 입력의 `dirty` 보존
- **단일 진입점과 라우팅:** 6개 해시 URL 직접 진입·새로고침·뒤로/앞으로 지원, 없는 정적 자산·경로는 실제 HTTP `404` 반환
- **무중단 배포 갱신:** HTML 내장 `app-build`와 `version.json` 동일성(`!==`) 비교(업그레이드·롤백 모두 감지), 열린 탭 편집·저장 보호 후 다음 안전한 이동에서 `_vr` 쿼리로 전체 문서 자동 전환, 최초 진입 `EntryService` 1회 갱신 및 CDN 캐시 불일치 반복 루프 차단, 이전 불변 자산 해시 검증 보존(`scripts/retain-assets.mjs`)

## 로컬 실행 및 시험 (Node.js >= 22)

```bash
npm test
npm run build
npm start
```
