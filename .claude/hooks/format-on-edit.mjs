#!/usr/bin/env node
// PostToolUse hook — Claude가 파일을 고친 직후 실행되는 "빠른 검사".
//
// 여기서는 prettier 포맷만 한다. 이 프로젝트에서 실측한 값:
//
//   prettier  0.5초   ← 매 편집마다 돌려도 부담 없음
//   eslint   12.2초   ← eslint-config-next의 타입 인식 설정 때문
//   tsc      12.0초
//
// eslint와 tsc는 파일 하나 고칠 때마다 돌리기엔 너무 느리다. 그래서 역할을 나눈다.
//
//   이 hook               = 즉시 피드백 (포맷)
//   npm run verify        = 작업 단위 검증 (format/lint/typecheck/test)
//   .githooks/pre-commit  = 최종 게이트 (commit 직전 verify)
//
// 포맷을 자동으로 맞춰두면 diff에 공백·줄바꿈 잡음이 사라져서
// 이후 리뷰와 컨텍스트가 그만큼 가벼워진다.
//
// prettier를 자식 프로세스로 띄우지 않고 Node API로 직접 부른다.
// Windows에서 .cmd 셸 경유가 없어 더 빠르고 이식성도 좋다.
//
// 실패해도 절대 작업을 막지 않는다. 문제가 생기면 조용히 exit 0 한다.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** stdin의 hook 입력 JSON을 읽는다. */
async function readHookInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

async function main() {
  const input = await readHookInput();
  const filePath = input?.tool_input?.file_path;
  if (typeof filePath !== 'string' || filePath.length === 0) return;

  // 작업 디렉터리 밖의 파일은 건드리지 않는다.
  const absolute = path.resolve(filePath);
  const relative = path.relative(process.cwd(), absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return;

  const prettier = await import('prettier');

  // .prettierignore에 걸리거나 prettier가 모르는 확장자면 넘어간다.
  const info = await prettier.getFileInfo(absolute, {
    ignorePath: '.prettierignore',
  });
  if (info.ignored || !info.inferredParser) return;

  const source = await readFile(absolute, 'utf8');
  const config = await prettier.resolveConfig(absolute);
  const formatted = await prettier.format(source, {
    ...config,
    filepath: absolute,
  });

  if (formatted !== source) await writeFile(absolute, formatted, 'utf8');
}

main().catch(() => {
  // hook 자체 오류로 작업 흐름을 막지 않는다.
  process.exit(0);
});
