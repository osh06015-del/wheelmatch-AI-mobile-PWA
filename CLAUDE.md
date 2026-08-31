@AGENTS.md

# WheelMatch AI

그라인더 명판과 숫돌 라벨을 촬영해 **규격 호환성**을 사전점검하는 모바일 PWA.
연구용 프로토타입이며 작업 안전성을 보증하지 않는다.

## 명령어

패키지 매니저는 **npm**이다. yarn/pnpm/bun을 쓰지 않는다.

| 목적          | 명령                                         |
| ------------- | -------------------------------------------- |
| 개발 서버     | `npm run dev`                                |
| 빌드          | `npm run build`                              |
| 테스트        | `npm test` (Vitest + happy-dom, 76개 통과)   |
| 타입 검사     | `npm run typecheck`                          |
| lint          | `npm run lint` (ESLint 9 flat config)        |
| 포맷          | `npm run format` / `npm run format:check`    |
| **전체 검증** | `npm run verify` ← 작업을 끝냈다고 말하기 전 |

`npm run verify` = format:check → lint → typecheck → test. 약 40초 걸린다.

Node는 `.nvmrc`로 24에 맞춰져 있다 (`engines`: >=20.9.0).

## 핵심 원칙

**AI는 라벨을 읽기만 하고, 적합 판정은 반드시 규칙엔진이 한다.**

```
촬영 → OCR(값 추출만) → 사용자 확인 → 규칙엔진 → 적합/부적합/판정불가
                                      (src/lib/rules/engine.ts)
```

읽지 못한 값은 `null`로 남기고, `null`은 통과가 아니라 판정불가다.
자세한 불변조건은 `src/lib/rules/`, `src/lib/ocr/`, `src/app/api/`를 열면
`.claude/rules/safety-invariants.md`가 자동으로 로드된다.

## 구조

```
src/lib/rules/engine.ts   ★ 판정 로직. 여기서만 판정한다. 순수 함수 유지
src/lib/ocr/              OCR 추출기(Claude/Tesseract 교체 가능) + 정규식 파서
src/lib/state/            화면 간 값 전달 (useSyncExternalStore + sessionStorage)
src/lib/db/               IndexedDB (Dexie). 기록은 기기 안에만 남는다
src/app/api/extract/      서버 전용 OCR 라우트. API 키는 여기서만 읽는다
src/components/           UI. page 파일에서 컴포넌트를 export 하지 않는다
```

### 경계는 lint가 강제한다

`eslint.config.mjs`에 import 경계가 들어 있다. 어기면 `npm run lint`가 막는다.

- `src/lib/rules/**` → 상대 경로만. 패키지·alias import 금지 (엔진 순수성)
- 클라이언트 코드 → `@anthropic-ai/sdk`, `next/server` 금지 (키 유출 방지)
- `src/lib/**` → `@/components`, `@/app` 금지 (레이어 역전 방지)

우회하지 말고 설계를 고친다. 엔진에 외부 값이 필요하면 인자로 받는다.

## 코딩 규칙

- **기존 구조를 존중한다.** 요청하지 않은 대규모 refactor는 하지 않는다.
- **새 dependency를 함부로 추가하지 않는다.** 기존 것으로 되면 그걸 쓴다.
  추가가 꼭 필요하면 먼저 이유를 말하고 승인을 받는다.
- 불필요한 추상화를 만들지 않는다. 레이어를 늘리기 전에 함수 하나로 되는지 본다.
- 주석은 한국어. **무엇을 하는지가 아니라 왜 그런지**를 적는다.
  특히 안전 관련 결정(경계값 처리, 내림 처리 등)에는 이유를 남긴다.
- 사용자에게 보이는 문구는 한국어. 조사(을/를)는 `withParticle()`을 쓴다.
- TypeScript strict. `any`와 `@ts-ignore`를 쓰지 않는다.
- 값이 없을 수 있으면 `null`로 표현한다. 빈 문자열이나 0으로 얼버무리지 않는다.

## 편집하면 안 되는 파일

- `AGENTS.md` — `next dev`가 자동 생성·갱신한다. 고쳐도 되돌아간다.
- `.env.local` — 실제 API 키가 들어 있다. 읽기도 차단해 두었다.
- `package-lock.json` — npm이 관리한다. 직접 고치지 않는다.
- `.next/`, `tsconfig.tsbuildinfo` — 빌드 산출물.

## 작업 방식

1. 필요한 파일만 읽는다. 저장소 전체를 훑지 않는다.
2. 고친다. 저장하면 Prettier hook이 자동으로 포맷한다(0.5초).
3. 끝났다고 말하기 전에 `npm run verify`를 돌린다.
4. UI를 고쳤으면 Browser pane으로 실제 화면을 확인한다
   (`preview_start({ name: "wheelmatch-dev" })`). Playwright는 쓰지 않는다.
5. commit은 사용자가 요청할 때만 한다. push는 절대 임의로 하지 않는다.
   commit 시 `.githooks/pre-commit`이 `npm run verify`를 다시 돌린다.

## 검증 없이 단정하지 않기

- 실기기 카메라, Vercel 배포, 실제 라벨 인식률은 **직접 확인한 것만** 확인했다고 말한다.
- Next 16 API가 헷갈리면 추측하지 말고 `node_modules/next/dist/docs/01-app/`을 읽는다.
  설치된 버전의 실제 문서라 웹 검색보다 정확하다.
