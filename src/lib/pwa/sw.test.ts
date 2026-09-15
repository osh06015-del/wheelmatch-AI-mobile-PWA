// public/sw.js는 브라우저 서비스 워커 환경(self, caches, clients)에서만 돌아
// happy-dom에서 실행할 수 없다. 여기서는 그 대신, 안전에 직결되는 불변조건
// 몇 가지를 파일 내용으로 고정한다 — 실수로 되돌아가면 곧바로 걸린다.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf-8');

/**
 * `//` 줄 주석을 뺀 코드만 남긴다.
 *
 * 이 파일의 install 리스너 옆에는 "여기서 skipWaiting을 부르지 않는다"는
 * 설명 주석이 있다 — 주석까지 그대로 검색하면 그 설명 문장 자체가
 * skipWaiting 문자열을 담고 있어 오탐이 난다. 실제 호출만 봐야 한다.
 */
function withoutLineComments(text: string): string {
  return text.replace(/\/\/[^\n]*/g, '');
}

/** install 이벤트 리스너 콜백 하나만 잘라낸다. 그 안에서만 자동 skipWaiting을 금지한다. */
function installHandlerBody(): string {
  const start = source.indexOf("addEventListener('install'");
  const end = source.indexOf("addEventListener('message'");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      'install 또는 message 리스너를 찾지 못했다 — 테스트를 다시 봐야 한다',
    );
  }
  return withoutLineComments(source.slice(start, end));
}

describe('public/sw.js — 업데이트 불변조건', () => {
  it('install에서 self.skipWaiting()을 자동으로 부르지 않는다', () => {
    // 자동으로 넘기면 점검·시험운전 중에도 화면이 예고 없이 갈아끼워진다.
    // 사용자의 클릭(SKIP_WAITING 메시지)이 있을 때만 넘어가야 한다.
    expect(installHandlerBody()).not.toMatch(/skipWaiting/);
  });

  it('SKIP_WAITING 메시지를 받아야만 넘어간다', () => {
    expect(source).toMatch(/message/);
    expect(source).toMatch(/SKIP_WAITING/);
  });

  it('메시지 리스너 안에서만 skipWaiting을 부른다', () => {
    const messageHandlerStart = source.indexOf("addEventListener('message'");
    const activateStart = source.indexOf("addEventListener('activate'");
    const messageHandlerBody = source.slice(messageHandlerStart, activateStart);
    expect(messageHandlerBody).toMatch(/self\.skipWaiting\(\)/);
  });

  it('IndexedDB나 localStorage는 건드리지 않는다 — Cache Storage만 다룬다', () => {
    // 저장 기록(IndexedDB)과 언어·연구모드 설정(localStorage)은 업데이트와
    // 무관하게 그대로 남아야 한다.
    expect(source).not.toMatch(/indexedDB|localStorage|sessionStorage/);
  });

  it('OCR API는 캐시하지 않는다', () => {
    expect(source).toMatch(/\/api\//);
  });
});
