// 촬영 화면 테스트 — 카메라가 열려 있을 때의 배치와 촬영.
//
// 현장에서 실제로 나온 불편이다: 명판을 점선 틀에 맞추려고 하면 아래쪽이 검은
// 바탕에 가려 보이지 않았다. 영상이 촬영 영역을 다 채우지 못해 아래가 검게
// 비었고, 틀은 그 검은 부분 위에 걸쳐 있었다. 틀 한가운데의 안내 글상자도
// 맞춘 명판을 가렸다.
//
// happy-dom은 배치를 계산하지 않는다. 실제 화면(영상 비율 4가지 × 세로·가로)은
// Browser pane에서 확인했고, 여기서는 그 배치를 만드는 약속을 고정한다 —
// 누군가 영상을 다시 문서 흐름에 넣거나 틀 안에 글상자를 되돌리면 알린다.

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capturePhoto, restart } = vi.hoisted(() => ({
  capturePhoto: vi.fn(),
  restart: vi.fn(),
}));

// 카메라가 열린 상태를 만든다. 테스트 환경에는 카메라가 없다.
vi.mock('@/lib/camera/useCamera', () => ({
  useCamera: () => ({
    videoRef: { current: null },
    canvasRef: { current: null },
    status: 'ready',
    error: null,
    flashing: false,
    capturePhoto,
    restart,
  }),
}));

import { CameraView } from './CameraView';

const GUIDE = '명판을 사각형 안에 맞추세요';

function renderCamera(
  props: Partial<React.ComponentProps<typeof CameraView>> = {},
) {
  const onCapture = vi.fn();
  const onPickFile = vi.fn();
  const view = render(
    <CameraView
      guideLabel={GUIDE}
      onCapture={onCapture}
      onPickFile={onPickFile}
      {...props}
    />,
  );
  return { ...view, onCapture, onPickFile };
}

const classes = (element: Element | null) =>
  (element?.getAttribute('class') ?? '').split(/\s+/);

beforeEach(() => {
  capturePhoto.mockReset();
  restart.mockReset();
});

describe('CameraView — 틀에 맞춘 명판이 가려지지 않는다', () => {
  it('틀 안에는 아무것도 그리지 않는다 — 안내 문구는 틀 밖에 둔다', () => {
    renderCamera();

    const frame = screen.getByTestId('capture-guide-frame');
    expect(frame).toBeEmptyDOMElement();
    // 안내 문구는 그대로 보이되 틀의 자손이 아니다.
    const guide = screen.getByText(GUIDE);
    expect(frame.contains(guide)).toBe(false);
  });

  it('영상은 촬영 영역을 빈틈없이 채운다 — 영상 비율이 영역의 높이를 정하지 않는다', () => {
    // 영상을 문서 흐름에 두면 높이가 카메라가 준 화면 비율대로 정해진다. 가로로
    // 넓은 영상은 아래가 검게 비고, 세로로 긴 영상은 촬영 버튼을 화면 밖으로 민다.
    const { container } = renderCamera();
    const video = container.querySelector('video');

    expect(classes(video)).toEqual(
      expect.arrayContaining(['absolute', 'inset-0', 'object-cover']),
    );
  });

  it('틀과 버튼 줄은 같은 줄 세우기 안의 형제다 — 버튼이 틀 위에 겹쳐 놓이지 않는다', () => {
    renderCamera();

    const frameArea = screen.getByTestId('capture-guide-frame').parentElement;
    const controls = screen.getByTestId('capture-controls');
    expect(frameArea?.parentElement).toBe(controls.parentElement);
    expect(classes(controls.parentElement)).toContain('flex');
    // 버튼 줄은 흐름 안에서 제 자리를 차지한다(틀 영역이 그만큼 줄어든다).
    expect(classes(controls)).not.toContain('absolute');
  });

  it('영상 위를 어둡게 덮는 띠를 두지 않는다', () => {
    renderCamera();

    const controls = screen.getByTestId('capture-controls');
    const band = classes(controls).filter(
      (name) => name.startsWith('bg-') || name.startsWith('from-'),
    );
    expect(band).toEqual([]);
  });
});

describe('CameraView — 촬영과 갤러리', () => {
  it('촬영 버튼을 누르면 찍은 사진을 넘긴다', async () => {
    const photo = new Blob(['frame'], { type: 'image/jpeg' });
    capturePhoto.mockResolvedValue(photo);
    const { onCapture } = renderCamera();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '촬영' }));
    });

    expect(capturePhoto).toHaveBeenCalledTimes(1);
    expect(onCapture).toHaveBeenCalledWith(photo);
  });

  it('사진을 얻지 못하면 아무것도 넘기지 않는다 — 빈 사진으로 진행하지 않는다', async () => {
    capturePhoto.mockResolvedValue(null);
    const { onCapture } = renderCamera();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '촬영' }));
    });

    expect(onCapture).not.toHaveBeenCalled();
  });

  it('disabled면 촬영 버튼을 누를 수 없다', () => {
    renderCamera({ disabled: true });

    expect(screen.getByRole('button', { name: '촬영' })).toBeDisabled();
  });

  it('카메라가 열려 있어도 갤러리에서 고를 수 있다', () => {
    const { container, onPickFile } = renderCamera();
    expect(screen.getByText('갤러리')).toBeInTheDocument();

    const input =
      container.querySelector<HTMLInputElement>('input[type=file]')!;
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(input).not.toHaveAttribute('capture');

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [file], writable: false });
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onPickFile).toHaveBeenCalledWith(file);
  });
});
