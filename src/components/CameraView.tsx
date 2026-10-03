'use client';

// 카메라 프리뷰 + 촬영 버튼 + 갤러리 업로드.
//
// 현장에서 그 자리에 없는 장비를 점검하거나, 미리 찍어둔 사진으로 확인하는
// 경우가 많다. 그래서 촬영과 갤러리 선택을 같은 비중으로 노출한다.
// 장갑 낀 손을 전제로 모든 터치 타겟은 최소 48px, 촬영 버튼은 72px이다.
//
// 배치 — 작업자가 틀에 맞춘 명판이 어디에도 가려지면 안 된다.
//   · 영상은 촬영 영역을 **빈틈없이 채운다**(absolute + object-cover). 영상을
//     문서 흐름에 두면 높이가 카메라가 주는 화면 비율대로 정해져, 가로로 넓은
//     영상에서는 아래가 검게 비고 세로로 긴 영상에서는 촬영 버튼이 화면 밖으로
//     밀려났다. 틀은 촬영 영역 가운데에 그려지므로 그 검은 부분 위에 걸쳤다.
//   · 틀은 버튼 줄을 뺀 나머지 공간 한가운데에 둔다. 버튼과 겹치지 않는다.
//   · 틀 안에는 아무것도 그리지 않는다. 안내 문구는 틀 위에 둔다.
//   · 영상 위를 어둡게 덮는 띠를 두지 않는다. 버튼은 각자 테두리로 구분한다.
//
// 영상이 영역을 채우느라 가장자리가 잘려 보여도, 저장되는 사진은 카메라가 준
// 화면 전체다(useCamera의 capturePhoto). 화면에 보인 것은 사진에 모두 들어간다.

import {
  useCamera,
  type CameraError,
  type CameraErrorCode,
} from '@/lib/camera/useCamera';
import { useLocale, type MessageKey, type Translate } from '@/lib/i18n';

interface CameraViewProps {
  /** 가이드 오버레이 안에 띄울 안내 문구. 고른 언어로 이미 바꾼 문장이다 */
  guideLabel: string;
  onCapture: (photo: Blob) => void;
  /** 갤러리·파일에서 고른 사진 */
  onPickFile: (file: File) => void;
  disabled?: boolean;
}

const CAMERA_ERROR_MESSAGE: Record<CameraErrorCode, MessageKey> = {
  unsupported: 'camera.error.unsupported',
  permission: 'camera.error.permission',
  notFound: 'camera.error.notFound',
  inUse: 'camera.error.inUse',
  failed: 'camera.error.failed',
};

/** 분류하지 못한 실패는 브라우저가 준 오류 이름을 함께 보여 원인을 되짚게 한다. */
function cameraErrorText(error: CameraError | null, t: Translate): string {
  if (!error) return t('camera.error.failed');
  if (error.code === 'failed' && error.name) {
    return t('camera.error.failedNamed', { name: error.name });
  }
  return t(CAMERA_ERROR_MESSAGE[error.code]);
}

/**
 * 갤러리에서 사진을 고르는 입력.
 *
 * capture 속성을 일부러 붙이지 않는다. capture를 붙이면 모바일에서
 * 카메라가 곧바로 열려 갤러리를 고를 수 없다. 촬영은 위의 셔터 버튼이 맡는다.
 */
function GalleryInput({
  onPickFile,
  children,
  className,
}: {
  onPickFile: (file: File) => void;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <label className={className}>
      {children}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPickFile(file);
          // 같은 파일을 다시 고를 수 있도록 값을 비운다.
          // 비우지 않으면 재선택 시 change 이벤트가 오지 않는다.
          event.target.value = '';
        }}
      />
    </label>
  );
}

export function CameraView({
  guideLabel,
  onCapture,
  onPickFile,
  disabled = false,
}: CameraViewProps) {
  const { t } = useLocale();
  const {
    videoRef,
    canvasRef,
    status,
    error,
    flashing,
    capturePhoto,
    restart,
  } = useCamera();

  async function handleCapture() {
    const photo = await capturePhoto();
    if (photo) onCapture(photo);
  }

  return (
    // 영상이 흐름 밖(absolute)에 있어 이 상자의 높이는 화면에 남은 공간으로만
    // 정해진다. 화면이 아주 낮을 때(가로로 든 휴대폰)도 버튼 세 자리가 들어가도록
    // 최소 높이를 둔다 — 그보다 낮으면 화면이 조금 스크롤된다.
    <div className="relative min-h-56 flex-1 overflow-hidden bg-slate-950">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* 셔터 효과 */}
      {flashing && <div className="absolute inset-0 bg-white" />}

      {status === 'starting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-slate-900/90 px-6">
          <p className="text-lg text-slate-100">{t('camera.starting')}</p>
          {/* 카메라가 느리거나 열리지 않아도 갤러리로 진행할 수 있게 한다. */}
          <GalleryInput
            onPickFile={onPickFile}
            className="flex min-h-14 cursor-pointer items-center justify-center rounded-lg border border-slate-600 px-6 text-lg font-semibold text-slate-200 active:bg-slate-800"
          >
            {t('camera.pickFromGallery')}
          </GalleryInput>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/95 px-6 text-center">
          <p className="text-lg leading-relaxed text-slate-100">
            {cameraErrorText(error, t)}
          </p>

          {/* 카메라가 안 되는 상황이므로 갤러리를 주 동작으로 올린다. */}
          <GalleryInput
            onPickFile={onPickFile}
            className="flex min-h-14 w-full max-w-xs cursor-pointer items-center justify-center rounded-lg bg-green-500 text-lg font-bold text-slate-950 active:bg-green-400"
          >
            {t('camera.pickPhoto')}
          </GalleryInput>

          <button
            type="button"
            onClick={restart}
            className="min-h-14 w-full max-w-xs rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
          >
            {t('camera.retry')}
          </button>
        </div>
      )}

      {/* 세로 화면은 [틀 영역 / 버튼 줄], 가로 화면은 [틀 영역 | 버튼 줄]로 나눈다.
          가로로 든 휴대폰은 높이가 모자라 버튼을 아래에 두면 틀이 들어갈 자리가 없다. */}
      {status === 'ready' && (
        <div className="absolute inset-0 flex flex-col landscape:flex-row">
          <div className="pointer-events-none flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-4">
            <p className="shrink-0 rounded-md bg-black/60 px-3 py-1.5 text-center text-base font-medium text-white">
              {guideLabel}
            </p>
            {/* 명판·라벨 위치를 잡아주는 점선 틀. 안은 비워 둔다 — 맞춘 글자를 가리지 않게.
                세로 화면은 너비에서, 가로 화면은 남은 높이에서 3:2 크기를 정한다.
                밝은 배경에서도 보이도록 흰 점선 바깥에 어두운 선을 한 줄 두른다. */}
            <div
              aria-hidden
              data-testid="capture-guide-frame"
              className="aspect-[3/2] min-h-0 w-full max-w-md shrink rounded-xl border-2 border-dashed border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] landscape:w-auto landscape:max-w-full landscape:flex-1"
            />
          </div>

          {/* 버튼 줄. 영상 위를 덮는 어두운 띠 없이 버튼만 띄운다 — 띠가 틀과 겹치면
              맞춘 명판의 아래쪽이 어두워져 보이지 않는다. */}
          <div
            data-testid="capture-controls"
            className="flex shrink-0 items-center justify-between px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2 landscape:flex-col landscape:justify-center landscape:gap-4 landscape:py-4 landscape:pl-2 landscape:pr-[calc(1rem+env(safe-area-inset-right))]"
          >
            <GalleryInput
              onPickFile={onPickFile}
              className="flex min-h-14 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/80 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.3)] active:bg-slate-700"
            >
              <span aria-hidden className="text-2xl leading-none">
                🖼
              </span>
              <span className="text-sm font-medium text-white">
                {t('camera.gallery')}
              </span>
            </GalleryInput>

            {/* 흰 테두리만으로는 밝은 배경(흰 벽·금속면)에서 버튼이 사라진다.
                바깥에 어두운 선을 둘러 어떤 배경에서도 보이게 한다. */}
            <button
              type="button"
              onClick={handleCapture}
              disabled={disabled}
              aria-label={t('camera.shutter')}
              className="h-[72px] w-[72px] shrink-0 rounded-full border-4 border-white bg-white/30 shadow-[0_0_0_3px_rgba(0,0,0,0.45)] active:bg-white/60 disabled:opacity-40"
            />

            {/* 세로 화면에서 셔터를 가운데에 두기 위한 대칭용 여백(갤러리 버튼과 같은
                너비). 가로 화면은 높이가 모자라 두 버튼만 가운데에 모은다. */}
            <div className="w-24 landscape:hidden" aria-hidden />
          </div>
        </div>
      )}
    </div>
  );
}
