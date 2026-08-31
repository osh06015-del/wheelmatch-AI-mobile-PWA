'use client';

// 카메라 프리뷰 + 촬영 버튼.
// 장갑 낀 손을 전제로 촬영 버튼은 72px 원형, 화면 하단 중앙에 고정한다.

import { useCamera } from '@/lib/camera/useCamera';

interface CameraViewProps {
  /** 가이드 오버레이 안에 띄울 안내 문구 */
  guideLabel: string;
  onCapture: (photo: Blob) => void;
  /** 파일 선택 대체 입력. 카메라를 못 쓰는 환경에서 쓴다. */
  onPickFile?: (file: File) => void;
  disabled?: boolean;
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
            <span className="rounded-md bg-black/60 px-3 py-2 text-base font-medium text-white">
              {guideLabel}
            </span>
          </div>
        </div>
      )}

      {/* 셔터 효과 */}
      {flashing && <div className="absolute inset-0 bg-white" />}

      {status === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-lg text-slate-100">
          카메라를 여는 중입니다...
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/95 px-6 text-center">
          <p className="text-lg leading-relaxed text-slate-100">{error}</p>
          <button
            type="button"
            onClick={restart}
            className="min-h-12 rounded-lg bg-slate-700 px-6 text-lg font-semibold text-white active:bg-slate-600"
          >
            다시 시도
          </button>
          {onPickFile && (
            <label className="flex min-h-12 cursor-pointer items-center rounded-lg bg-slate-600 px-6 text-lg font-semibold text-white active:bg-slate-500">
              사진 파일 선택
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onPickFile(file);
                }}
              />
            </label>
          )}
        </div>
      )}

      {status === 'ready' && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent pb-8 pt-12">
          {onPickFile && (
            <label className="flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-lg bg-slate-800/80 px-4 text-base font-medium text-white active:bg-slate-700">
              파일
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onPickFile(file);
                }}
              />
            </label>
          )}
          <button
            type="button"
            onClick={handleCapture}
            disabled={disabled}
            aria-label="촬영"
            className="h-[72px] w-[72px] rounded-full border-4 border-white bg-white/30 active:bg-white/60 disabled:opacity-40"
          />
          {onPickFile && <div className="min-w-12" aria-hidden />}
        </div>
      )}
    </div>
  );
}
