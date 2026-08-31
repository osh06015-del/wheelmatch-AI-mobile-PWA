# WheelMatch AI

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

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | 규칙엔진·파서 단위 테스트 |
| `npm run test:watch` | 테스트 watch 모드 |
| `npm run typecheck` | TypeScript strict 검사 |
| `npm run lint` | ESLint |
| `node scripts/generate-icons.mjs` | PWA 아이콘 재생성 |

---

## 판정 규칙

`src/lib/rules/engine.ts`에 5개 규칙이 순서대로 들어 있다.

| # | 규칙 | 내용 | 위반 시 |
| --- | --- | --- | --- |
| 1 | 필수값 존재 | 그라인더 `noLoadRPM`, 숫돌 `maxRPM`이 둘 다 있어야 한다 | 판정불가 |
| 2 | RPM 안전 | 숫돌 `maxRPM` ≥ 그라인더 `noLoadRPM` | **부적합** |
| 3 | 지름 호환 | 숫돌 `diameter` ≤ 그라인더 `maxWheelDiameter` | **부적합** |
| 4 | 용도 확인 | 절단/연삭을 인식했는가 (경고 수준) | 경고만, 판정은 유지 |
| 5 | 신뢰도 검증 | 어느 한쪽이라도 `confidence === 'low'`인가 | 판정불가 |

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

| 세트 | 그라인더 | 숫돌 | 예상 결과 |
| --- | --- | --- | --- |
| 1 — 적합 | GWS 750-125 / 11000rpm / Φ125mm | 12200rpm / Φ125×1.6mm / 절단용 | `COMPATIBLE` |
| 2 — 부적합 (RPM) | GWS 750-125 / 11000rpm / Φ125mm | 8500rpm / Φ125×6.0mm / 연삭용 | `INCOMPATIBLE` — RPM 위반 |
| 3 — 부적합 (지름) | GWS 750-100 / 11000rpm / Φ100mm | 12200rpm / Φ125×1.6mm / 절단용 | `INCOMPATIBLE` — 지름 위반 |
| 4 — 판정불가 | 모델명만 보이고 RPM 판독 불가 | 정상 | `UNDETERMINED` |
| 5 — 수동 보정 | RPM 오인식 → 사용자가 수정 → 확인 체크 | 정상 | `COMPATIBLE` |

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

| Phase | 구현 | 동작 | 전환 방법 |
| --- | --- | --- | --- |
| 1 | `ClaudeExtractor` | `/api/extract` → Claude 이미지 분석 | 기본값 |
| 2 | `TesseractExtractor` | 브라우저에서 Tesseract.js + `parser.ts` | `NEXT_PUBLIC_OCR_MODE=tesseract` |

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

## 배포 (Vercel)

```bash
git add . && git commit -m "feat: WheelMatch AI v0.1"
# GitHub 리포지토리 생성 후 push
```

1. vercel.com에서 Import
2. Environment Variables에 `ANTHROPIC_API_KEY` 설정
3. 배포 후 HTTPS URL을 휴대폰에서 열고 **홈 화면에 추가**로 PWA 설치

`NEXT_PUBLIC_*` 변수는 빌드 시점에 번들에 새겨진다. 값을 바꾸면 **반드시 재배포**해야 한다.
