# WheelMatch AI

[![CI](https://github.com/osh06015-del/wheelmatch-AI-mobile-PWA/actions/workflows/ci.yml/badge.svg)](https://github.com/osh06015-del/wheelmatch-AI-mobile-PWA/actions/workflows/ci.yml)

휴대용 그라인더 명판과 연삭·절단 숫돌 라벨을 촬영해 **규격 호환성을 사전점검**하는 모바일 PWA.

> ⚠ 이 앱은 라벨에 표시된 규격의 대조 결과만 제공합니다. 작업 안전성을 보증하지 않으며,
> 제조사 취급설명서와 사업장 안전수칙을 대체할 수 없습니다.

---

## 핵심 원칙

**AI는 라벨을 읽기만 하고, 적합 판정은 반드시 규칙엔진이 한다.**

```
그라인더 명판 촬영 ──┐
                     ├─→ OCR (값 추출만) ─→ 사용자 확인/보정 ─→ 규칙엔진 ─→ 적합/부적합/판정불가
숫돌 라벨 촬영 ──────┘                                          (순수 TS)
```

OCR이 값을 읽지 못하면 절대 추측하지 않고 `null`로 남긴다. 규칙엔진은 `null`을
통과가 아니라 **판정불가**로 처리한다. 값을 채워 넣어 판정을 통과시키는 경로는 없다.

---

## 실행

```bash
npm install
```

`.env.example`을 복사해 `.env.local`을 만들고 API 키를 채운다.

```bash
cp .env.example .env.local
```

```dotenv
ANTHROPIC_API_KEY=sk-ant-...   # 서버 전용. 절대 커밋하지 않는다.
ANTHROPIC_MODEL=claude-sonnet-5
NEXT_PUBLIC_OCR_MODE=claude    # claude | tesseract
```

```bash
npm run dev
```

카메라(`getUserMedia`)는 **HTTPS 또는 localhost에서만** 동작한다. 휴대폰 실기기로
테스트하려면 Vercel 배포 URL을 쓰거나 HTTPS 터널을 써야 한다.

### 명령어

| 명령                              | 설명                        |
| --------------------------------- | --------------------------- |
| `npm run dev`                     | 개발 서버                   |
| `npm run build`                   | 프로덕션 빌드               |
| `npm test`                        | 단위·컴포넌트 테스트 (76개) |
| `npm run test:watch`              | 테스트 watch 모드           |
| `npm run typecheck`               | TypeScript strict 검사      |
| `npm run lint`                    | ESLint                      |
| `node scripts/generate-icons.mjs` | PWA 아이콘 재생성           |

---

## 판정 규칙

`src/lib/rules/engine.ts`에 5개 규칙이 순서대로 들어 있다.

| #   | 규칙        | 내용                                                    | 위반 시             |
| --- | ----------- | ------------------------------------------------------- | ------------------- |
| 1   | 필수값 존재 | 그라인더 `noLoadRPM`, 숫돌 `maxRPM`이 둘 다 있어야 한다 | 판정불가            |
| 2   | RPM 안전    | 숫돌 `maxRPM` ≥ 그라인더 `noLoadRPM`                    | **부적합**          |
| 3   | 지름 호환   | 숫돌 `diameter` ≤ 그라인더 `maxWheelDiameter`           | **부적합**          |
| 4   | 용도 확인   | 절단/연삭을 인식했는가 (경고 수준)                      | 경고만, 판정은 유지 |
| 5   | 신뢰도 검증 | 어느 한쪽이라도 `confidence === 'low'`인가              | 판정불가            |

최종 판정:

1. 하나라도 `passed === false` → **INCOMPATIBLE**
2. 경고 규칙(4번)이 아닌 항목이 하나라도 `passed === null` → **UNDETERMINED**
3. 나머지 → **COMPATIBLE**

경계값은 통과로 본다 (12000rpm 숫돌 + 12000rpm 그라인더 = 적합).
1rpm이라도 모자라면 부적합이다. 여유를 임의로 주지 않는다.

### 판정불가를 푸는 방법

값을 지어내는 것이 아니라, **사람이 라벨을 직접 보고 확정**하는 것뿐이다.
확인 화면의 `라벨을 직접 보고 위 값을 확인했습니다` 체크박스를 켜면 신뢰도가
`high`로 올라간다. 값을 한 글자라도 고치면 체크는 자동으로 풀린다.

---

## 시연용 테스트 조합 5세트

| 세트              | 그라인더                               | 숫돌                           | 예상 결과                  |
| ----------------- | -------------------------------------- | ------------------------------ | -------------------------- |
| 1 — 적합          | GWS 750-125 / 11000rpm / Φ125mm        | 12200rpm / Φ125×1.6mm / 절단용 | `COMPATIBLE`               |
| 2 — 부적합 (RPM)  | GWS 750-125 / 11000rpm / Φ125mm        | 8500rpm / Φ125×6.0mm / 연삭용  | `INCOMPATIBLE` — RPM 위반  |
| 3 — 부적합 (지름) | GWS 750-100 / 11000rpm / Φ100mm        | 12200rpm / Φ125×1.6mm / 절단용 | `INCOMPATIBLE` — 지름 위반 |
| 4 — 판정불가      | 모델명만 보이고 RPM 판독 불가          | 정상                           | `UNDETERMINED`             |
| 5 — 수동 보정     | RPM 오인식 → 사용자가 수정 → 확인 체크 | 정상                           | `COMPATIBLE`               |

세트 4·5는 앱의 핵심을 보여준다. **값을 못 읽었을 때 대충 판정하지 않고 멈춘 뒤,
사람이 확인해야만 다시 진행된다.**

---

## 실물 테스트 방법

1. 그라인더 명판 사진을 준비한다 (실습실 장비 또는 인쇄물).
2. 숫돌 라벨 사진을 준비한다 (인쇄해도 된다).
3. 앱에서 명판 → 라벨 순서로 촬영한다.
4. OCR 결과가 부정확하면 확인 화면에서 직접 고친 뒤 확인 체크박스를 켠다.
5. 적합 / 부적합 / 판정불가 결과와 검사 항목별 사유를 확인한다.
6. 안전 체크리스트 5개를 모두 확인하고 저장한다.
7. 이력 화면에서 기록을 확인한다.

카메라가 열리지 않는 환경(데스크톱 브라우저 등)에서는 촬영 화면의 `파일` 버튼으로
사진 파일을 골라 같은 흐름을 시험할 수 있다.

---

## 구조

```
src/
├── app/
│   ├── layout.tsx              PWA 메타, 다크 팔레트 고정
│   ├── page.tsx                메인 (촬영 시작 / 이력)
│   ├── scan/grinder/page.tsx   1단계 — 명판 촬영·확인
│   ├── scan/wheel/page.tsx     2단계 — 라벨 촬영·확인
│   ├── result/page.tsx         대조 결과 + 안전 체크리스트 + 저장
│   ├── history/page.tsx        점검 이력
│   └── api/extract/route.ts    OCR API (서버 전용, 키 노출 없음)
├── lib/
│   ├── rules/
│   │   ├── engine.ts           ★ 규칙엔진 — 모든 판정이 여기서만 일어난다
│   │   ├── types.ts            타입 정의
│   │   └── engine.test.ts      20개 시나리오 단위 테스트
│   ├── ocr/
│   │   ├── extractor.ts        OCRExtractor 인터페이스 + 엔진 선택
│   │   ├── schema.ts           Structured Output 스키마 + 시스템 프롬프트
│   │   ├── tesseract.ts        Phase 2 독립형 추출기
│   │   ├── parser.ts           정규식 필드 파서 + m/s → rpm 환산
│   │   └── parser.test.ts      파서 단위 테스트
│   ├── camera/useCamera.ts     후면 카메라 훅
│   ├── db/index.ts             IndexedDB (Dexie)
│   └── state/inspection.tsx    화면 간 값 전달 (useSyncExternalStore)
└── components/                 CameraView, FieldConfirm, ResultCard,
                                ChecklistForm, HistoryList, ...
```

---

## OCR 엔진 교체 (Phase 1 → Phase 2)

화면 코드는 `OCRExtractor` 인터페이스만 알고 있다. 엔진을 바꿔도 UI는 건드리지 않는다.

```ts
interface OCRExtractor {
  extractGrinder(imageBlob: Blob): Promise<GrinderSpec>;
  extractWheel(imageBlob: Blob): Promise<WheelSpec>;
}
```

| Phase | 구현                 | 동작                                    | 전환 방법                        |
| ----- | -------------------- | --------------------------------------- | -------------------------------- |
| 1     | `ClaudeExtractor`    | `/api/extract` → Claude 이미지 분석     | 기본값                           |
| 2     | `TesseractExtractor` | 브라우저에서 Tesseract.js + `parser.ts` | `NEXT_PUBLIC_OCR_MODE=tesseract` |

Tesseract 경로는 외부 API 호출이 없어 오프라인에서도 동작하지만 인식 정확도가 낮다.
따라서 값을 읽지 못하면 `null`로 남기고 신뢰도를 낮춰, 규칙엔진이 판정불가를 내게 한다.

### m/s → rpm 환산

라벨에 rpm 대신 원주속도만 적힌 경우가 흔하다. 환산은 모델이 아니라
`parser.ts`의 검증된 순수 함수가 한다.

```
rpm = (v[m/s] × 60) / (π × d[m])

예: 80m/s, Φ125mm → 12223rpm
```

**안전 방향으로 내림한다.** 올림하면 실제보다 높은 정격을 주장하게 되어
부적합한 조합을 적합으로 판정할 수 있다.

---

## 보안

- `ANTHROPIC_API_KEY`는 서버 전용이다. `NEXT_PUBLIC_` 접두사를 붙이지 않는다.
- 촬영 이미지와 점검 기록은 IndexedDB에 **기기 안에만** 저장된다. 서버로 올리지 않는다.
- 서비스 워커는 `/api/*`를 캐시하지 않는다. 지난 사진의 분석 결과가 다음 점검에
  재사용되면 안 되기 때문이다.
- 라벨 사진 속 문구는 데이터로만 다룬다. 이미지 안에 명령문이 있어도 따르지 않도록
  시스템 프롬프트에 명시했다.

---

## Claude Code 작업 환경

이 저장소는 Claude Code로 개발하도록 설정돼 있다.

```
CLAUDE.md                          항상 로드되는 핵심 규칙 (약 90줄)
.claude/rules/safety-invariants.md src/lib/rules · ocr · api 를 열 때만 로드
.claude/rules/nextjs-react.md      src/app · components 를 열 때만 로드
.claude/rules/testing.md           *.test.ts 를 열 때만 로드
.claude/settings.json              접근 제한 + PostToolUse hook
.claude/hooks/format-on-edit.mjs   파일 수정 직후 Prettier 자동 실행 (0.5초)
.githooks/pre-commit               commit 직전 최종 게이트
```

규칙을 경로별로 쪼갠 이유는 컨텍스트 절약이다. 안전 불변조건은 판정 코드를
건드릴 때만 필요하지, UI를 고칠 때는 필요 없다.

### 검증 단계

| 시점              | 실행되는 것            | 소요     |
| ----------------- | ---------------------- | -------- |
| 파일 저장 직후    | Prettier (자동)        | 0.5초    |
| 작업 단위 완료    | `npm run verify`       | 약 40초  |
| `git commit` 직전 | pre-commit hook (자동) | 약 55초  |
| `git push` 이후   | GitHub Actions (자동)  | 약 2~3분 |

pre-commit은 `src/**/*.ts(x)`가 staged일 때만 무거운 검사를 돌린다.
문서만 고친 commit은 5초로 끝난다. 급하면 `git commit --no-verify`로 건너뛴다.

**CI는 건너뛸 수 없다.** `--no-verify`로 밀어 넣은 코드도 push하면 Actions에서
잡힌다. README 맨 위 배지가 빨간색이면 `main`이 깨진 것이다.

새로 clone 받았을 때는 `npm install`이 `prepare` 스크립트로 git hook을 자동 연결한다.

### 읽기가 차단된 경로

`.env*`(비밀값), `package-lock.json`, `.next/`, 빌드 산출물. 컨텍스트 낭비와
키 노출을 막기 위한 것이다. `node_modules`는 **일부러 열어 두었다** —
Next 16 문서가 `node_modules/next/dist/docs/`에 있기 때문이다.

### 알아두면 좋은 명령

| 명령                 | 용도                                       |
| -------------------- | ------------------------------------------ |
| `/context`           | 지금 컨텍스트를 무엇이 차지하는지 확인     |
| `/compact`           | 대화가 길어졌을 때 수동으로 압축           |
| `/memory`            | CLAUDE.md·규칙 파일 열기, 자동 메모리 확인 |
| `/doctor`            | 설정이 제대로 로드됐는지 진단              |
| `/mcp`               | 연결된 MCP 서버 확인                       |
| `/statusline`        | 상태줄 설정                                |
| `npx ccusage@latest` | 토큰 사용량·비용 확인 (설치 불필요)        |

`/context`를 실행하면 **Memory files** 항목에 `CLAUDE.md`가 보여야 정상이다.

## 배포 (Vercel)

저장소: <https://github.com/osh06015-del/wheelmatch-AI-mobile-PWA>

### 1. 프로젝트 Import

1. <https://vercel.com/new> 접속 → GitHub 계정 연결
2. `wheelmatch-AI-mobile-PWA` 선택 → **Import**
3. Framework Preset이 **Next.js**로 자동 인식되는지 확인. 나머지 빌드 설정은
   건드리지 않는다 (zero-config로 동작한다)

### 2. 환경변수

Import 화면의 **Environment Variables**에 아래 하나만 넣는다.

| Name                | Value          | 환경          |
| ------------------- | -------------- | ------------- |
| `ANTHROPIC_API_KEY` | 발급받은 새 키 | 3개 모두 체크 |

- `ANTHROPIC_MODEL`은 넣지 않으면 `claude-sonnet-5`를 쓴다.
- `NEXT_PUBLIC_OCR_MODE`도 넣지 않으면 `claude`를 쓴다.
- **키를 채팅이나 이슈에 붙여넣지 않는다.** Vercel 입력창에 직접 입력한다.

빌드에는 키가 필요 없다. 키는 요청이 들어올 때만 읽으므로, 키를 나중에
넣어도 배포 자체는 성공한다.

### 3. Deploy → 확인

1. **Deploy** 클릭 후 완료를 기다린다 (약 2~3분)
2. 발급된 HTTPS URL을 **휴대폰에서** 연다
3. 그라인더 명판 → 숫돌 라벨 순서로 촬영해 결과까지 확인
4. 브라우저 메뉴에서 **홈 화면에 추가**로 PWA 설치

카메라(`getUserMedia`)는 HTTPS에서만 열린다. Vercel URL은 HTTPS이므로 동작한다.
로컬 `http://` 주소를 휴대폰에서 직접 열면 카메라가 열리지 않는다.

### Vercel 한도와 이 앱

| 한도                | 값                 | 이 앱                                                            |
| ------------------- | ------------------ | ---------------------------------------------------------------- |
| 함수 요청 본문      | 4.5 MB             | 업로드 전 이미지를 2.5MB 이하로 줄인다 (`lib/image/optimize.ts`) |
| 함수 최대 실행 시간 | 300초 (Hobby)      | 라우트에서 60초로 제한. OCR 1회는 약 10초                        |
| Node 버전           | 24.x / 22.x / 20.x | `engines.node`의 `>=20.9.0` → 최신 24.x                          |

원본 휴대폰 사진(12MP)은 base64로 감싸면 10MB가 넘어 4.5MB 한도에 걸린다.
그래서 업로드 전에 긴 변 2048px로 줄인다. 이 축소를 제거하면 갤러리에서 고른
사진이 배포 환경에서만 413으로 실패한다.

### 환경변수를 바꿨을 때 — 반드시 재배포

**추가하거나 바꾼 환경변수는 이미 배포된 것에 반영되지 않는다.**
서버 전용 변수(`ANTHROPIC_API_KEY`)도 예외가 아니다.

> Any change you make to environment variables are not applied to previous
> deployments, they only apply to new deployments. — [Vercel 문서](https://vercel.com/docs/environment-variables)

키를 넣었는데도 `ANTHROPIC_API_KEY가 설정되지 않았습니다` 오류가 난다면
재배포를 하지 않은 것이다.

재배포 방법: Vercel 대시보드 → **Deployments** → 최신 배포의 **⋯** →
**Redeploy**. (또는 아무 커밋이나 push)

### 배포 후 점검

```bash
U=https://wheelmatch-oh-sehyuhn-s-projects.vercel.app

# 1) 앱이 공개되어 있는가 (302면 Deployment Protection이 켜진 것)
curl -sI "$U/" | head -1

# 2) API 키가 들어갔는가 — Claude를 호출하지 않으므로 비용 0
#    400이면 키 있음 / 500이면 키 없음
curl -s -X POST "$U/api/extract" \
  -H "Content-Type: application/json" -d '{"type":"grinder"}'
```

`/api/extract`는 키 확인을 가장 먼저 하고 그 다음에 `image` 필드를 검사한다.
그래서 image 없이 보내면 API 호출 없이 키 설정 여부만 알 수 있다.
