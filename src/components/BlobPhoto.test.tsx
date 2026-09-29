import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ZoomablePhoto } from './BlobPhoto';

const photo = new Blob(['photo'], { type: 'image/png' });

async function openPhoto() {
  const user = userEvent.setup();
  render(<ZoomablePhoto blob={photo} label="명판" />);
  const opener = screen.getByRole('button', { name: '명판 크게 보기' });
  await user.click(opener);
  return { user, opener, dialog: screen.getByRole('dialog', { name: '명판' }) };
}

describe('ZoomablePhoto', () => {
  it('확대 배율을 바꿀 때 보고 있던 영역의 중심을 유지한다', async () => {
    const { user, dialog } = await openPhoto();
    const viewport = within(dialog).getByRole('region');
    Object.defineProperty(viewport, 'clientWidth', { value: 320 });
    Object.defineProperty(viewport, 'clientHeight', { value: 500 });
    const plus = within(dialog).getByRole('button', {
      name: '확대',
    });
    await user.click(plus);
    expect(viewport.scrollLeft).toBe(80);
    expect(viewport.scrollTop).toBe(125);
    await user.click(plus);
    expect(viewport.scrollLeft).toBeCloseTo(160);
    expect(viewport.scrollTop).toBeCloseTo(250);
  });

  it('100~400% 확대·축소와 화면 맞춤을 제공한다', async () => {
    const { user, dialog } = await openPhoto();
    const view = within(dialog);
    const minus = view.getByRole('button', { name: '축소' });
    const plus = view.getByRole('button', { name: '확대' });
    const viewport = view.getByRole('region', { name: '확대 사진 이동 영역' });
    expect(view.getByRole('status')).toHaveTextContent('100%');
    expect(minus).toBeDisabled();
    for (let i = 0; i < 6; i++) await user.click(plus);
    expect(view.getByRole('status')).toHaveTextContent('400%');
    expect(plus).toBeDisabled();
    expect(viewport.firstElementChild).toHaveStyle({
      width: '400%',
      height: '400%',
    });
    await user.click(minus);
    expect(view.getByRole('status')).toHaveTextContent('350%');
    viewport.scrollTop = 150;
    viewport.scrollLeft = 90;
    await user.click(view.getByRole('button', { name: '화면 맞춤' }));
    expect(view.getByRole('status')).toHaveTextContent('100%');
    expect(viewport.scrollTop).toBe(0);
    expect(viewport.scrollLeft).toBe(0);
  });

  it('열면 닫기에 초점을 두고 닫으면 원래 사진 버튼으로 돌아간다', async () => {
    const previous = document.body.style.overflow;
    const { user, opener, dialog } = await openPhoto();
    const close = within(dialog).getByRole('button', {
      name: '크게 보기 닫기',
    });
    expect(dialog).toHaveAttribute('open');
    expect(close).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    await user.click(close);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe(previous);
  });

  it('브라우저 취소 이벤트로 닫고 다시 열면 확대를 초기화한다', async () => {
    const { user, opener, dialog } = await openPhoto();
    await user.click(within(dialog).getByRole('button', { name: '확대' }));
    fireEvent(
      dialog,
      new Event('cancel', { cancelable: true, bubbles: false }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(opener);
    expect(
      within(screen.getByRole('dialog')).getByRole('status'),
    ).toHaveTextContent('100%');
  });

  it('사진이 교체되면 확대 화면도 새 Blob을 표시한다', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ZoomablePhoto blob={photo} label="명판" />);
    await user.click(screen.getByRole('button', { name: '명판 크게 보기' }));
    const originalUrl = within(screen.getByRole('dialog'))
      .getByRole('img')
      .getAttribute('src');
    rerender(
      <ZoomablePhoto
        blob={new Blob(['replacement'], { type: 'image/png' })}
        label="명판"
      />,
    );
    expect(
      within(screen.getByRole('dialog')).getByRole('img').getAttribute('src'),
    ).not.toBe(originalUrl);
  });
});
