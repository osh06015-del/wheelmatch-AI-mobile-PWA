---
paths:
  - '**/*.test.ts'
  - '**/*.test.tsx'
  - 'vitest.config.mts'
---

# 테스트 규칙

## 러너

Vitest + happy-dom + React Testing Library. 설정은 `vitest.config.mts`.
`.mts` 확장자는 의도적이다 (`.ts`면 Vite가 CJS로 읽어 경고를 낸다).

```bash
npm test          # 1회 실행
npm run test:watch
```

현재 **76개**가 통과한다. 이 숫자는 줄면 안 된다.

수집 대상은 `src/**/*.test.{ts,tsx}` 다. **`.tsx`를 빼지 마라.**
예전에 `.ts`만 수집하도록 돼 있어서, 컴포넌트 테스트를 써도 조용히 실행되지
않고 "다 통과"로 보이는 상태였다.

환경은 `happy-dom` 하나로 통일했다. 전체 스위트 실측: node 0.8초 /
happy-dom 5.4초 / jsdom 7.8초. jsdom은 설치하지 않는다.

## 규칙엔진 테스트가 최우선

`src/lib/rules/engine.test.ts`는 사양서의 20개 시나리오를 그대로 담고 있다.
적합 4 / 부적합 5 / 판정불가 6 / 용도 2 / 복합 3 + 형식 검증.

- 판정 로직을 바꾸면 **먼저 이 파일을 확인한다.**
- 테스트를 통과시키려고 기대값을 낮추지 않는다. 코드를 고친다.
- 경계값 테스트(같은 rpm은 적합, 1rpm 부족은 부적합)는 삭제하지 않는다.

## 작성 방식

- 기본값 빌더(`grinder()`, `wheel()`)를 두고 시나리오마다 필요한 필드만 덮어쓴다.
  전체 객체를 매번 쓰지 않는다.
- 테스트 이름은 한국어로, 입력과 기대 결과를 함께 적는다.
  예: `'5. 숫돌 8500rpm < 그라인더 11000rpm → INCOMPATIBLE (RPM 위반)'`
- 사용자에게 보이는 한국어 문구를 검증할 때는 문자열 전체를 `toBe`로 고정한다.
  문구가 조용히 바뀌는 것을 막기 위해서다.
- 날짜가 들어가면 `matchSpecs(g, w, new Date('...'))`처럼 시각을 주입한다.
  `new Date()`에 의존하지 않는다.
- 숫자 포맷에 `toLocaleString`을 쓰지 않는다. 실행 환경의 ICU 설정에 따라 깨진다.

## 새 테스트를 어디에 둘까

- 순수 로직 → 해당 모듈 옆에 `*.test.ts`
- 정규식 파서 → `src/lib/ocr/parser.test.ts`에 케이스 추가
- 컴포넌트 → 컴포넌트 옆에 `*.test.tsx`
- 실제 브라우저 동작(카메라, 라우팅, IndexedDB) → Browser pane으로 확인한다.
  Playwright는 설치하지 않았다.

## 컴포넌트 테스트

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

- 요소는 사용자가 보는 방식으로 찾는다. `getByRole('checkbox', { name: /방호덮개/ })`
  가 `container.querySelector('.foo')` 보다 낫다. class를 바꿔도 안 깨진다.
- 클릭·입력은 `userEvent`를 쓴다. `fireEvent`보다 실제 동작에 가깝다.
- `cleanup()`은 `src/test/setup.ts`가 자동으로 해준다. 각 테스트에서 부를 필요 없다.
- **판정 표시 테스트는 지우지 마라.** `ResultCard.test.tsx`는 부적합이 "적합"으로
  보이는 사고를 막는 마지막 방어선이다.
