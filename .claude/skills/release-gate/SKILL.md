---
name: release-gate
description: 여러 구현자의 편집이 모두 끝난 통합 시점에 리드가 실행하는 검증 절차. 어떤 검사를 어떤 순서로 돌리고 무엇을 중복 실행하지 않을지 정한다. 작업을 끝났다고 보고하기 전에 사용한다.
---

# 통합 검증 게이트

**리드가 통합 시점에 한 번 돌린다.** 구현자가 각자 돌리는 검사와 다르다.

## 언제 쓰는가

- 배정한 작업의 편집이 **전부** 끝났을 때
- "끝났다"고 보고하기 전
- 커밋을 사용자에게 제안하기 전

편집 중간에는 돌리지 않는다. 파일이 계속 바뀌는 동안 돌리면 결과가 무의미하다.

## 실제로 존재하는 명령

`package.json`에 있는 것만 쓴다. 없는 명령을 지어내지 않는다.

| 명령                    | 내용                                       |
| ----------------------- | ------------------------------------------ |
| `npm run lint`          | `eslint`                                   |
| `npm run format:check`  | `prettier --check .`                       |
| `npm run typecheck`     | `next typegen && tsc --noEmit`             |
| `npm test`              | `vitest run` (watch 아님)                  |
| `npm run test:coverage` | `vitest run --coverage` + 임계값           |
| `npm run verify`        | **format:check → lint → typecheck → test** |
| `npm run build`         | `next build`                               |

## 중복 실행 방지 — 이것이 이 스킬의 핵심

**`npm run verify`가 앞의 네 검사를 이미 묶는다.**

```
verify = format:check && lint && typecheck && test
```

그러므로:

- ✅ `npm run verify` 하나만 돌린다
- ❌ `verify`를 돌린 뒤 `lint`·`typecheck`·`test`를 **또** 돌리지 않는다
- ❌ 네 개를 개별로 돌린 뒤 `verify`를 **또** 돌리지 않는다

같은 검사를 두 번 돌리면 시간만 배로 들고 얻는 정보가 없다.

## 기본 절차

```
npm run verify
```

이것으로 끝이다. 통과하면 통합 검증 완료다.

## 언제 더 돌리는가

`verify`만으로 부족한 경우가 있다. **작업 영향에 따라** 판단한다.

| 추가 검사               | 언제                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run test:coverage` | `src/lib/rules/**`(판정 엔진)를 건드렸을 때. 100% 임계값을 강제한다                                              |
| `npm run build`         | 라우트·페이지·`next.config.ts`를 건드렸을 때. `verify`가 못 잡는 Next 고유 오류(라우트 타입, 정적 생성)를 잡는다 |
| 미리보기 확인           | UI를 바꿨을 때. `preview_start({ name: "wheelmatch-dev" })` → 포트 3100                                          |

**아무것도 안 건드렸으면 추가 검사도 하지 않는다.** 문서만 고친 작업에
`build`를 돌릴 이유가 없다.

## E2E

**이 프로젝트에 E2E 프레임워크가 없다.** Playwright·Cypress 모두 미설치이며
의도적인 결정이다(`.claude/rules/testing.md`).

실제 브라우저 동작은 Browser pane으로 확인한다. 카메라(`getUserMedia`)는
pane에서 차단되므로 **촬영 경로는 실기기로만 확인할 수 있다.**
확인하지 못한 것을 확인했다고 보고하지 않는다.

## 기존 hook과의 관계

이 스킬은 **기존 hook을 대체하지 않는다.** 세 계층이 각자 다른 시점을 맡는다.

| 계층                        | 시점        | 내용                                             |
| --------------------------- | ----------- | ------------------------------------------------ |
| `PostToolUse` (Edit\|Write) | 편집 직후   | prettier 포맷만 (0.5초)                          |
| **이 스킬**                 | 통합 시점   | `npm run verify`                                 |
| `.githooks/pre-commit`      | commit 직전 | format:check + (src 변경 시) lint·typecheck·test |

- **`PostToolUse`에 포맷 작업을 다시 등록하지 않는다.** 이미 있다.
- **다른 Git hook 관리자를 설치하지 않는다.** `.githooks`가 이미 있다.
- **Stop / TaskCompleted / TeammateIdle 완료 차단 hook을 만들지 않는다.**
  통합 검증은 리드가 이 스킬로 직접 실행한다.

## 실패했을 때

- 실패한 테스트를 **삭제하거나 기대값을 낮춰 통과시키지 않는다.**
- 어느 단계에서 깨졌는지 그대로 보고한다.
- **기존부터 있던 실패**와 **이번 변경으로 생긴 실패**를 구분한다.
  구분하려면 변경 전 상태를 알아야 한다. 모르면 모른다고 적는다.

## 하지 않는다

- commit, push, staging을 실행하지 않는다. 사용자가 요청할 때만 한다.
- `npm run format`(자동 수정)을 통합 검증에 넣지 않는다.
  대규모 일괄 포맷팅은 diff를 더럽힌다. `format:check`로 확인만 한다.
- watch 모드(`npm run test:watch`)를 쓰지 않는다. 종료되지 않는다.
- dependency를 재설치하지 않는다.
