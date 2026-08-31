import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// 아키텍처 경계.
//
// CLAUDE.md에 "engine.ts는 순수 함수로 유지" 라고 적어두는 것만으로는
// 지켜지길 바라는 것에 그친다. 여기에 쓰면 어겼을 때 lint가 막는다.
// 시간이 지나며 레이어가 뭉개지는 것을 자동으로 방지하는 것이 목적이다.
const architectureBoundaries = defineConfig([
  {
    // 판정 엔진은 외부 의존성 없는 순수 함수여야 한다.
    // 상대 경로(./types)만 쓰고 패키지·alias import는 막는다.
    //
    // "상대 경로 외 전부 금지"를 한 줄로 쓰고 싶지만, no-restricted-imports의
    // group은 부정 패턴(!./*)을 지원하지 않는다. 실제로 시도했더니 정상적인
    // './types' 까지 막혔다. 그래서 차단 목록을 명시한다.
    // 새 dependency를 추가하면 이 목록에도 추가해야 한다.
    name: 'boundary/rules-engine-purity',
    files: ['src/lib/rules/**/*.ts'],
    ignores: ['src/lib/rules/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/**', // 프로젝트 내부 alias
                'node:**', // node 내장 모듈
                'next',
                'next/**',
                'react',
                'react-dom',
                'react/**',
                'react-dom/**',
                'zod',
                'dexie',
                'dexie-react-hooks',
                'tesseract.js',
                '@anthropic-ai/**',
              ],
              message:
                '판정 엔진(src/lib/rules)은 순수 함수로 유지합니다. 같은 폴더의 상대 경로만 import하세요. 외부 값이 필요하면 인자로 받으세요.',
            },
          ],
        },
      ],
    },
  },
  {
    // 서버 전용 코드가 클라이언트 번들로 새어 들어가는 것을 막는다.
    // API 키를 다루는 SDK가 브라우저로 가면 안 된다.
    name: 'boundary/no-server-code-in-client',
    files: ['src/components/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    ignores: ['src/app/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@anthropic-ai/sdk',
              message:
                'Anthropic SDK는 서버 전용입니다. src/app/api/ 안에서만 사용하세요. 클라이언트에서는 /api/extract를 fetch 하세요.',
            },
            {
              name: 'next/server',
              message:
                'next/server는 서버 전용입니다. src/app/api/ 안에서만 사용하세요.',
            },
          ],
        },
      ],
    },
  },
  {
    // 레이어 역전 방지. lib은 UI를 몰라야 한다.
    //
    // src/lib/rules는 제외한다. flat config에서는 뒤에 오는 블록이 같은 규칙을
    // 통째로 덮어쓴다. 여기서 제외하지 않으면 위의 엔진 순수성 규칙이 무효가 된다.
    // (실제로 한 번 그렇게 무효화됐다.)
    name: 'boundary/no-ui-imports-in-lib',
    files: ['src/lib/**/*.{ts,tsx}'],
    ignores: ['src/lib/rules/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/*', '@/app/*'],
              message:
                'lib은 UI를 import하지 않습니다. 방향은 항상 UI → lib 입니다.',
            },
          ],
        },
      ],
    },
  },
]);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...architectureBoundaries,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
