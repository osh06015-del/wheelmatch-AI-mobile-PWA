// 촬영 화면 테스트.
//
// 데스크톱 브라우저나 카메라 권한이 거부된 환경에서도 사진을 넣을 길이
// 반드시 남아 있어야 한다. 갤러리 입력이 사라지면 그 환경에서는 앱을
// 아예 쓸 수 없게 된다.
//
// 테스트 환경(happy-dom)에는 navigator.mediaDevices가 없으므로
// useCamera가 error 상태로 떨어진다. 실제 데스크톱과 같은 경로다.

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CameraView } from './CameraView';

function renderCamera(onPickFile = vi.fn()) {
  render(
    <CameraView
      guideLabel="명판을 사각형 안에 맞추세요"
      onCapture={vi.fn()}
      onPickFile={onPickFile}
    />,
  );
  return { onPickFile };
}

describe('CameraView — 카메라를 쓸 수 없을 때', () => {
  it('갤러리 선택 경로를 제공한다', async () => {
    renderCamera();

    expect(await screen.findByText(/갤러리에서 사진 선택/)).toBeInTheDocument();
  });

  it('카메라 재시도 버튼도 함께 둔다', async () => {
    renderCamera();

    expect(
      await screen.findByRole('button', { name: /카메라 다시 시도/ }),
    ).toBeInTheDocument();
  });

  it('파일 입력은 이미지만 받고 카메라를 강제로 열지 않는다', async () => {
    const { container } = render(
      <CameraView
        guideLabel="테스트"
        onCapture={vi.fn()}
        onPickFile={vi.fn()}
      />,
    );
    await screen.findByText(/갤러리에서 사진 선택/);

    const input = container.querySelector('input[type=file]');
    expect(input).not.toBeNull();
    expect(input).toHaveAttribute('accept', 'image/*');
    // capture가 붙어 있으면 모바일에서 갤러리 대신 카메라가 열려버린다.
    expect(input).not.toHaveAttribute('capture');
  });

  it('사진을 고르면 onPickFile로 전달한다', async () => {
    const onPickFile = vi.fn();
    const { container } = render(
      <CameraView
        guideLabel="테스트"
        onCapture={vi.fn()}
        onPickFile={onPickFile}
      />,
    );
    await screen.findByText(/갤러리에서 사진 선택/);

    const input =
      container.querySelector<HTMLInputElement>('input[type=file]')!;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    // happy-dom에서는 DataTransfer 대신 files를 직접 정의한다.
    Object.defineProperty(input, 'files', { value: [file], writable: false });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onPickFile).toHaveBeenCalledWith(file);
  });
});
