---
paths:
  - 'src/app/**'
  - 'src/components/**'
  - 'src/lib/state/**'
  - 'src/lib/camera/**'
---

# Next 16 / React 19 UI 규칙

## 버전 확인부터

이 프로젝트는 **Next 16.3.3 + React 19.2.8**이다. 학습 데이터의 Next 13~14 관행이
그대로 통하지 않는다. App Router API가 헷갈리면 추측하지 말고 로컬 문서를 읽는다.

```
node_modules/next/dist/docs/01-app/
```

외부 문서 검색보다 이쪽이 정확하고 빠르다. 설치된 버전의 문서이기 때문이다.

## 이미 밟은 함정

- **`react-hooks/set-state-in-effect`** — effect 안에서 setState를 동기 호출하면
  lint가 막는다. 억제하지 말고 패턴을 바꾼다. 브라우저 저장소를 읽어야 하면
  `useSyncExternalStore`(`src/lib/state/inspection.tsx` 참고), IndexedDB는
  `useLiveQuery`(dexie-react-hooks)를 쓴다.
- **page 파일에서 컴포넌트를 named export 하지 말 것** — App Router 타입 검사에
  걸린다. 공용 컴포넌트는 `src/components/`로 뺀다.
- **`next dev`가 `AGENTS.md`를 다시 쓴다.** 그 파일은 편집하지 않는다.
  Claude용 내용은 `CLAUDE.md`에 쓴다 (AGENTS.md가 관리 블록을 갖고 있는 한
  next는 CLAUDE.md를 건드리지 않는다).

## 상태 전달

화면 간 규격 값은 `src/lib/state/inspection.tsx`의 모듈 저장소를 거친다.
React Context가 아니라 `useSyncExternalStore` + sessionStorage다.
서버 스냅샷은 항상 `hydrated: false`이므로, 리다이렉트 가드는 반드시
`hydrating`을 먼저 확인해야 한다. 안 그러면 hydration 렌더에서 잘못 튕긴다.

## 현장 UI 제약

작업자가 장갑 낀 손으로 야외에서 쓰는 화면이다.

- 모든 터치 타겟 **최소 48px** (`min-h-12`, 촬영 버튼은 72px)
- 본문 최소 16px (`text-base`), 판정 숫자는 크게
- 배경은 어두운 톤 고정. 라이트 모드로 전환하지 않는다 (`globals.css`)
- 판정 색: 적합 `green-500` / 부적합 `red-500` / 판정불가 `yellow-500`
- UI 문구는 한국어

## 검증

UI를 고쳤으면 브라우저에서 실제로 확인한다. Playwright는 설치하지 않았다.
Claude Code의 Browser pane 도구를 쓴다.

```
preview_start({ name: "wheelmatch-dev" })  → read_page / computer / read_console_messages
```

카메라(`getUserMedia`)는 HTTPS나 localhost에서만 동작하고 Browser pane에서는
차단된다. 촬영 경로는 실기기로만 검증할 수 있다. 페인에서는 파일 선택 경로로
같은 흐름을 태울 수 있다.
