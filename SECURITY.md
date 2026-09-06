# 보안

연구용 프로토타입이다. 공개 저장소이고 Vercel에 배포된다.

---

## 이 앱이 다루는 데이터

| 데이터                | 어디에 있나           | 서버로 가나                       |
| --------------------- | --------------------- | --------------------------------- |
| 촬영 사진             | 기기의 IndexedDB      | 분석 요청 시에만 전송, 저장 안 함 |
| 점검 기록 (규격·판정) | 기기의 IndexedDB      | ❌ 나가지 않는다                  |
| 언어·연구모드 설정    | 기기의 localStorage   | ❌                                |
| 화면 간 임시 값       | 기기의 sessionStorage | ❌                                |

**계정도, 서버 DB도, 파일 저장소도 없다.** 기록은 기기 안에만 남는다.
사용자가 이력 화면에서 전체 삭제할 수 있다.

사진은 `/api/extract`를 거쳐 Anthropic API로 **분석 요청 시에만** 전송되고,
이 앱은 그것을 저장하지 않는다. 로그에도 남기지 않는다.

---

## 비밀값

### 어디에 있나

| 값                     | 위치                                  | 성격                      |
| ---------------------- | ------------------------------------- | ------------------------- |
| `ANTHROPIC_API_KEY`    | `.env.local` (로컬) / Vercel 환경변수 | **비밀**                  |
| `ANTHROPIC_MODEL`      | 같음                                  | 비밀 아님                 |
| `NEXT_PUBLIC_OCR_MODE` | 같음                                  | 비밀 아님 (브라우저로 감) |

### 규칙

- `ANTHROPIC_API_KEY`는 **`src/app/api/extract/route.ts`에서만** 읽는다.
- 어떤 비밀값에도 **`NEXT_PUBLIC_` 접두사를 붙이지 않는다.** 이 접두사가 붙으면
  브라우저 번들에 그대로 들어간다.
- 키가 없으면 에러를 그대로 반환한다. 조용히 우회하지 않는다.
- `.env*`는 `.gitignore` 대상이다. `.env.example`만 커밋한다.
  `.env.example`에는 **키 값을 넣지 않는다.**

### 코드로 막아둔 것

- `eslint.config.mjs`의 `boundary/no-server-code-in-client` — 클라이언트 코드가
  `@anthropic-ai/sdk`나 `next/server`를 import하면 lint가 막는다.
- `.claude/settings.json`의 `permissions.deny` — 에이전트가 `.env*`,
  인증서, 개인키, credential 파일을 **읽지 못하게** 막는다.

---

## 키가 노출되었을 때

키가 채팅·스크린샷·커밋·로그 등 어디로든 새어 나갔다면 **즉시 교체한다.**
"아마 괜찮을 것"으로 넘기지 않는다. 노출된 키는 노출된 것이다.

1. <https://console.anthropic.com> → API Keys → 해당 키 **폐기(revoke)**
2. 새 키 발급
3. 로컬 `.env.local` 갱신
4. Vercel → 프로젝트 → Settings → Environment Variables 갱신
5. **재배포한다.** 환경변수만 바꾸면 기존 배포에는 적용되지 않는다
6. 사용량(Usage)에서 폐기 전 비정상 호출이 있었는지 확인

커밋에 키가 들어갔다면 교체가 **먼저**다. 히스토리 정리는 그다음이다.
히스토리를 지워도 이미 공개된 키는 회수되지 않는다.

---

## 의존성

- `npm ci`로 lockfile 그대로 설치한다. CI도 같다.
- 새 의존성은 이유를 밝히고 승인을 받는다 (`CLAUDE.md`).
- 정기 점검: `npm audit`, `npm outdated`.
  메이저 업데이트는 코드 동결 전에는 올리지 않는다.

---

## 취약점 제보

연구용 프로토타입이라 정식 제보 창구를 두지 않는다.
문제를 발견하면 저장소 이슈로 알려주되, **키나 개인정보가 포함된 내용은
이슈에 그대로 붙여넣지 말고** 그런 값이 있다는 사실만 적어주기 바란다.

<https://github.com/osh06015-del/wheelmatch-AI-mobile-PWA/issues>

---

## 안전(safety)과 보안(security)은 다르다

이 문서는 **보안**을 다룬다. 잘못된 판정이 사람을 다치게 하는 문제는
[docs/safety-boundaries.md](docs/safety-boundaries.md)와
`.claude/rules/safety-critical.md`에 있다. 둘을 섞지 않는다.
