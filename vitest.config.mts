import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  test: {
    // 컴포넌트 테스트를 위해 DOM이 필요하다. 순수 로직 테스트도 여기서 그대로
    // 돌아가므로 환경을 하나로 통일했다. 판정 엔진의 순수성은 환경이 아니라
    // eslint.config.mjs의 import 경계 규칙이 보장한다.
    //
    // 전체 스위트 실측: node 0.8초 / happy-dom 5.4초 / jsdom 7.8초.
    // 더 빠른 happy-dom을 골랐다. jsdom은 설치하지 않는다.
    environment: 'happy-dom',

    // .tsx가 빠져 있으면 컴포넌트 테스트가 조용히 수집되지 않는다.
    // 통과 개수만 보고 "다 통과했다"고 착각하게 되므로 반드시 둘 다 넣는다.
    include: ['src/**/*.test.{ts,tsx}'],

    // toBeInTheDocument 같은 DOM matcher 등록
    setupFiles: ['./src/test/setup.ts'],

    coverage: {
      provider: 'v8',
      // json-summary는 사람이 아니라 스크립트가 읽는다. 논문에 넣을 수치를
      // 화면에서 옮겨 적지 않고 coverage/coverage-summary.json에서 뽑기 위해서다.
      reporter: ['text-summary', 'text', 'html', 'json-summary'],

      // 로직 계층만 잰다. UI는 재지 않는다.
      //
      // 화면까지 재기 시작하면 숫자를 올리려고 의미 없는 렌더 테스트를 쓰게 된다.
      // 이 앱에서 커버리지가 뜻이 있는 곳은 "판정이 지나가는 길"이다.
      // 컴포넌트 테스트를 쓰지 말라는 뜻이 아니다 — ResultCard.test.tsx처럼
      // 오표시를 막는 테스트는 계속 쓴다. 숫자로 관리하지 않을 뿐이다.
      include: ['src/lib/**/*.ts'],

      // 임계값은 판정 엔진에만 건다.
      //
      // 전체 목표치를 두면 숫자를 맞추려고 브라우저 API 감싸는 코드에
      // 억지 테스트를 쓰게 된다. 그런 테스트는 회귀를 못 잡으면서 통과만 한다.
      // 반면 판정 엔진은 분기 하나가 곧 "적합이냐 부적합이냐"라서
      // 100%가 실제로 의미가 있고, 실제로 도달해 있다.
      //
      // 나머지 파일 수치는 참고용으로 출력만 한다. 목표치가 아니다.
      thresholds: {
        'src/lib/rules/**': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});
