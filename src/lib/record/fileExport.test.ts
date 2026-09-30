import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveOrShareFile } from './fileExport';

const originalShare = navigator.share;
const originalCanShare = navigator.canShare;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });
  URL.createObjectURL = vi.fn(() => 'blob:report');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  Object.assign(navigator, {
    share: originalShare,
    canShare: originalCanShare,
  });
  vi.restoreAllMocks();
});

function file() {
  return new File(['<html></html>'], 'wheelmatch-record.html', {
    type: 'text/html',
  });
}

describe('saveOrShareFile — 폰에 파일 넘기기', () => {
  it('공유 창을 쓸 수 있으면 공유 창으로 넘긴다', async () => {
    const share = vi.fn(async () => undefined);
    Object.assign(navigator, { share, canShare: () => true });
    await expect(saveOrShareFile(file(), '점검 기록')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('사용자가 공유 창을 닫으면 다운로드로 몰래 넘어가지 않는다', async () => {
    const abort = new Error('cancel');
    abort.name = 'AbortError';
    Object.assign(navigator, {
      share: vi.fn(async () => Promise.reject(abort)),
      canShare: () => true,
    });
    await expect(saveOrShareFile(file(), '점검 기록')).resolves.toBe(
      'cancelled',
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('공유를 못 쓰면 문서에 붙인 링크로 내려받고, 파일 주소는 바로 지우지 않는다', async () => {
    Object.assign(navigator, { share: undefined, canShare: undefined });
    const clicked: Array<{ inDocument: boolean; download: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({
        inDocument: document.body.contains(this),
        download: this.download,
      });
    });

    await expect(saveOrShareFile(file(), '점검 기록')).resolves.toBe(
      'downloaded',
    );
    expect(clicked).toEqual([
      { inDocument: true, download: 'wheelmatch-record.html' },
    ]);
    // 누른 직후에는 지우지 않는다 — 폰에서 다운로드가 시작 전에 취소된다.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });
});
