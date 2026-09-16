'use client';

// 저장된 사진 Blob을 화면에 띄우는 공용 조각.
//
// 이력 상세와 다각도 확인 카드가 같은 방식으로 사진을 그린다. 두 곳에 따로
// 쓰면 한쪽만 고쳐져 object URL이 새는 쪽이 생긴다.

import { useCallback, useState } from 'react';

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
  return <img ref={attach} alt={alt} className={className} />;
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

  return (
    <figure className={`flex flex-col gap-1 ${className ?? ''}`}>
      <button
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-0 z-50 flex flex-col gap-3 bg-slate-950/95 px-4 py-4"
        >
          <BlobImage
            blob={blob}
            alt={label}
            className="min-h-0 flex-1 object-contain"
          />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="min-h-14 shrink-0 rounded-lg border border-slate-500 text-lg font-semibold text-slate-100 active:bg-slate-800"
          >
            {t('photo.zoomClose')}
          </button>
        </div>
      )}
    </figure>
  );
}
