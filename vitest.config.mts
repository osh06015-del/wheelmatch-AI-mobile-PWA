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
  },
});
