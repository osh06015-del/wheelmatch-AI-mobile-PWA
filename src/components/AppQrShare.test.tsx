import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_QR_PATH, APP_SHARE_URL, AppQrShare } from './AppQrShare';

const share = vi.fn();
const canShare = vi.fn();
const fetchQr = vi.fn();
const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share');
const originalCanShare = Object.getOwnPropertyDescriptor(navigator, 'canShare');

beforeEach(() => {
  share.mockReset().mockResolvedValue(undefined);
  canShare.mockReset().mockReturnValue(true);
  fetchQr.mockReset().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['qr-only'], { type: 'image/png' }),
  });
  vi.stubGlobal('fetch', fetchQr);
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: share,
  });
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: canShare,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalShare) Object.defineProperty(navigator, 'share', originalShare);
  else Reflect.deleteProperty(navigator, 'share');
  if (originalCanShare)
    Object.defineProperty(navigator, 'canShare', originalCanShare);
  else Reflect.deleteProperty(navigator, 'canShare');
});

async function openQr() {
  const user = userEvent.setup();
  render(<AppQrShare />);
  const opener = screen.getByRole('button', { name: 'QR코드 공유' });
  await user.click(opener);
  return { user, opener, dialog: screen.getByRole('dialog') };
}

describe('AppQrShare', () => {
  it('운영 주소와 동일한 PNG 경로만 표시하고 명시적 클릭 전에는 공유하지 않는다', async () => {
    await openQr();
    expect(screen.getByRole('img')).toHaveAttribute('src', APP_QR_PATH);
    expect(screen.getByRole('link', { name: APP_SHARE_URL })).toHaveAttribute(
      'href',
      APP_SHARE_URL,
    );
    const download = screen.getByRole('link', { name: 'PNG 저장' });
    expect(download).toHaveAttribute('href', APP_QR_PATH);
    expect(download).toHaveAttribute('download', 'WheelMatch_AI_QR.png');
    expect(share).not.toHaveBeenCalled();
    expect(fetchQr).toHaveBeenCalledWith(APP_QR_PATH, {
      signal: expect.any(AbortSignal),
    });
  });

  it('닫기와 Escape는 초점·스크롤을 복원하고 진행 중 이미지 요청을 취소한다', async () => {
    const overflow = document.body.style.overflow;
    const { user, opener, dialog } = await openQr();
    expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    const signal = fetchQr.mock.calls[0][1].signal as AbortSignal;
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(signal.aborted).toBe(true);
    expect(document.body.style.overflow).toBe(overflow);
    await user.click(opener);
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(opener).toHaveFocus();
  });

  it('준비된 QR 파일만 공유하고 중복 클릭을 막는다', async () => {
    let resolveShare!: () => void;
    share.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveShare = resolve;
        }),
    );
    await openQr();
    const button = await screen.findByRole('button', {
      name: 'QR 이미지 공유',
    });
    act(() => {
      button.click();
      button.click();
    });
    expect(share).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    const payload = share.mock.calls[0][0] as ShareData;
    expect(Object.keys(payload).sort()).toEqual(['files', 'title']);
    expect(payload.files).toHaveLength(1);
    expect(payload.files![0].name).toBe('WheelMatch_AI_QR.png');
    expect(payload.files![0].type).toBe('image/png');
    expect(await payload.files![0].text()).toBe('qr-only');
    await act(async () => resolveShare());
    expect(button).toBeEnabled();
  });

  it('파일 공유를 지원하지 않으면 저장·복사만 제공한다', async () => {
    canShare.mockReturnValue(false);
    await openQr();
    await waitFor(() => expect(canShare).toHaveBeenCalled());
    expect(
      screen.queryByRole('button', { name: 'QR 이미지 공유' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PNG 저장' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '링크 복사' })).toBeEnabled();
  });

  it('공유 API가 없어도 대화상자와 다운로드가 작동한다', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    await openQr();
    expect(fetchQr).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'PNG 저장' })).toBeInTheDocument();
  });

  it('이미지 준비 실패는 복사·저장을 막지 않는다', async () => {
    fetchQr.mockRejectedValue(new Error('offline'));
    await openQr();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '공유용 이미지를 준비하지 못했습니다',
      ),
    );
    expect(screen.getByRole('button', { name: '링크 복사' })).toBeEnabled();
  });

  it('공유 취소는 조용히 끝내고 실제 실패만 알린다', async () => {
    share.mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'));
    const { user } = await openQr();
    const button = await screen.findByRole('button', {
      name: 'QR 이미지 공유',
    });
    await user.click(button);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    share.mockRejectedValueOnce(new Error('denied'));
    await user.click(button);
    expect(screen.getByRole('status')).toHaveTextContent('공유하지 못했습니다');
  });

  it('운영 링크 복사 성공·실패를 구분한다', async () => {
    const { user } = await openQr();
    const copy = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);
    await user.click(screen.getByRole('button', { name: '링크 복사' }));
    expect(copy).toHaveBeenCalledWith(APP_SHARE_URL);
    expect(screen.getByRole('status')).toHaveTextContent(
      '링크를 복사했습니다.',
    );
    copy.mockRejectedValueOnce(new Error('denied'));
    await user.click(screen.getByRole('button', { name: '링크 복사' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      '복사하지 못했습니다.',
    );
  });
});
