'use client';

// 카메라 프리뷰 + 촬영 버튼 + 갤러리 업로드.
//
// 현장에서 그 자리에 없는 장비를 점검하거나, 미리 찍어둔 사진으로 확인하는
// 경우가 많다. 그래서 촬영과 갤러리 선택을 같은 비중으로 노출한다.
// 장갑 낀 손을 전제로 모든 터치 타겟은 최소 48px, 촬영 버튼은 72px이다.

import { useCamera } from '@/lib/camera/useCamera';

interface CameraViewProps {
  /** 가이드 오버레이 안에 띄울 안내 문구 */
  guideLabel: string;
  onCapture: (photo: Blob) => void;
  /** 갤러리·파일에서 고른 사진 */
  onPickFile: (file: File) => void;
  disabled?: boolean;
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
    <div className="relative flex-1 overflow-hidden bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* 명판 위치를 잡아주는 점선 가이드 */}
      {status === 'ready' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6">
          <div className="flex aspect-[3/2] w-full max-w-md items-center justify-center rounded-xl border-2 border-dashed border-white/80">
            <span className="rounded-md bg-black/60 px-3 py-2 text-center text-base font-medium text-white">
              {guideLabel}
            </span>
          </div>
        </div>
      )}

      {/* 셔터 효과 */}
      {flashing && <div className="absolute inset-0 bg-white" />}

      {status === 'starting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-slate-900/90 px-6">
          <p className="text-lg text-slate-100">카메라를 여는 중입니다...</p>
          {/* 카메라가 느리거나 열리지 않아도 갤러리로 진행할 수 있게 한다. */}
          <GalleryInput
            onPickFile={onPickFile}
            className="flex min-h-14 cursor-pointer items-center justify-center rounded-lg border border-slate-600 px-6 text-lg font-semibold text-slate-200 active:bg-slate-800"
          >
            갤러리에서 선택
          </GalleryInput>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/95 px-6 text-center">
          <p className="text-lg leading-relaxed text-slate-100">{error}</p>

          {/* 카메라가 안 되는 상황이므로 갤러리를 주 동작으로 올린다. */}
          <GalleryInput
            onPickFile={onPickFile}
            className="flex min-h-14 w-full max-w-xs cursor-pointer items-center justify-center rounded-lg bg-green-500 text-lg font-bold text-slate-950 active:bg-green-400"
          >
            갤러리에서 사진 선택
          </GalleryInput>

          <button
            type="button"
            onClick={restart}
            className="min-h-14 w-full max-w-xs rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
          >
            카메라 다시 시도
          </button>
        </div>
      )}

      {status === 'ready' && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent pb-8 pt-12">
          <div className="flex items-center justify-between px-6">
            <GalleryInput
              onPickFile={onPickFile}
              className="flex min-h-14 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-slate-800/90 py-2 active:bg-slate-700"
            >
              <span aria-hidden className="text-2xl leading-none">
                🖼
              </span>
              <span className="text-sm font-medium text-white">갤러리</span>
            </GalleryInput>

            <button
              type="button"
              onClick={handleCapture}
              disabled={disabled}
              aria-label="촬영"
              className="h-[72px] w-[72px] rounded-full border-4 border-white bg-white/30 active:bg-white/60 disabled:opacity-40"
            />

            {/* 셔터를 화면 가운데에 두기 위한 대칭용 여백 */}
            <div className="w-24" aria-hidden />
          </div>
        </div>
      )}
    </div>
  );
}
