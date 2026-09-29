'use client';

// 저장된 사진 Blob을 화면에 띄우는 공용 조각.
//
// 이력 상세와 다각도 확인 카드가 같은 방식으로 사진을 그린다. 두 곳에 따로
// 쓰면 한쪽만 고쳐져 object URL이 새는 쪽이 생긴다.

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useLocale } from '@/lib/i18n';

/**
 * object URL의 수명을 <img> 엘리먼트에 그대로 묶는다.
 *
 * useMemo로 만들고 useEffect 정리에서 해제하면, StrictMode가 마운트를 두 번
 * 시뮬레이션할 때 첫 정리에서 URL이 이미 해제된 뒤 같은 URL을 다시 쓰게 되어
 * 사진이 뜨지 않는다(실제로 그렇게 만들었다가 빈 사진을 봤다).
 * ref 콜백은 엘리먼트가 붙을 때마다 새로 만들고 떨어질 때 해제하므로 어긋나지
 * 않고, 해제를 빠뜨려 사진이 메모리에 쌓이는 일도 없다.
 */
export function BlobImage({
  blob,
  alt,
  className,
}: {
  blob: Blob;
  alt: string;
  className?: string;
}) {
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      const url = URL.createObjectURL(blob);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [blob],
  );

  // next/image는 크기를 미리 알아야 하는데 object URL은 알 수 없다.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={attach} alt={alt} className={className} draggable={false} />;
}

function PhotoViewer({
  blob,
  label,
  onDismiss,
}: {
  blob: Blob;
  label: string;
  onDismiss: () => void;
}) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const [zoom, setZoom] = useState(1);
  const previousZoom = useRef(1);

  useLayoutEffect(() => {
    // 배율을 바꿔도 읽던 부분이 화면 밖으로 밀려나지 않도록 중심을 유지한다.
    const viewport = viewportRef.current;
    if (viewport) {
      const ratio = zoom / previousZoom.current;
      viewport.scrollLeft = Math.max(
        0,
        (viewport.scrollLeft + viewport.clientWidth / 2) * ratio -
          viewport.clientWidth / 2,
      );
      viewport.scrollTop = Math.max(
        0,
        (viewport.scrollTop + viewport.clientHeight / 2) * ratio -
          viewport.clientHeight / 2,
      );
    }
    previousZoom.current = zoom;
  }, [zoom]);

  useEffect(() => {
    // 브라우저의 모달 기능으로 배경 입력과 모달 밖으로의 포커스 이동을 막는다.
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function resetZoom() {
    setZoom(1);
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
      viewportRef.current.scrollLeft = 0;
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-slate-950 p-4 text-slate-100 backdrop:bg-slate-950/95"
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <p className="min-w-0 font-semibold">{label}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onDismiss}
            className="min-h-12 shrink-0 rounded-lg border border-slate-500 px-3 font-semibold active:bg-slate-800"
          >
            {t('photo.zoomClose')}
          </button>
        </div>
        <div
          ref={viewportRef}
          role="region"
          aria-label={t('photo.zoomViewport')}
          aria-describedby={hintId}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border border-slate-700 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
            <BlobImage
              blob={blob}
              alt={label}
              className="h-full w-full max-w-none object-contain"
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={zoom === 1}
            onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
            className="min-h-12 rounded-lg border border-slate-500 px-3 disabled:opacity-40"
          >
            {t('photo.zoomOut')}
          </button>
          <output
            aria-live="polite"
            className="min-w-14 text-center tabular-nums"
          >
            {zoom * 100}%
          </output>
          <button
            type="button"
            disabled={zoom === 4}
            onClick={() => setZoom((value) => Math.min(4, value + 0.5))}
            className="min-h-12 rounded-lg border border-slate-500 px-3 disabled:opacity-40"
          >
            {t('photo.zoomIn')}
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="min-h-12 rounded-lg border border-slate-500 px-3"
          >
            {t('photo.zoomReset')}
          </button>
        </div>
        <p id={hintId} className="shrink-0 text-sm text-slate-300">
          {t('photo.zoomHint')}
        </p>
      </div>
    </dialog>
  );
}

/**
 * 눌러서 크게 볼 수 있는 사진.
 *
 * 현장에서 보는 화면은 작고 밝다. 가장자리 균열 자국을 썸네일로 판단하라고
 * 두면 아무것도 확인하지 못한 채 넘어가게 된다. 확대는 사진을 다시 보는
 * 수단일 뿐이고, 판단은 여전히 실물을 보고 사람이 한다.
 */
export function ZoomablePhoto({
  blob,
  label,
  className,
}: {
  blob: Blob;
  label: string;
  className?: string;
}) {
  const { t } = useLocale();
  const [zoomed, setZoomed] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    // 모달이 DOM에서 빠져 배경의 inert 상태가 풀린 뒤에 초점을 돌려준다.
    if (wasOpen.current && !zoomed) openerRef.current?.focus();
    wasOpen.current = zoomed;
  }, [zoomed]);

  return (
    <figure className={`flex flex-col gap-1 ${className ?? ''}`}>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={t('photo.zoomOpen', { label })}
        className="min-h-12 overflow-hidden rounded-lg active:opacity-80"
      >
        <BlobImage
          blob={blob}
          alt={label}
          className="aspect-square w-full rounded-lg object-cover"
        />
      </button>
      <figcaption className="text-sm text-slate-400">{label}</figcaption>

      {zoomed && (
        <PhotoViewer
          blob={blob}
          label={label}
          onDismiss={() => {
            setZoomed(false);
          }}
        />
      )}
    </figure>
  );
}
