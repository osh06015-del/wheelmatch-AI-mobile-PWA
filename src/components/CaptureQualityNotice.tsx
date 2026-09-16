'use client';

// 촬영 직후 사진 상태 경고. 그라인더 명판·숫돌 라벨·다각도 확인 사진이 함께 쓴다.
//
// 경고는 **사진**에 대한 것이다. 명판·숫돌의 상태나 사용 안전을 말하지 않고,
// 경고가 없다고 "좋은 사진"이라고도 말하지 않는다(경고가 없으면 아무것도
// 그리지 않는다). 경계값이 검증되지 않았다는 사실을 경고와 같은 자리에 적는다.
//
// 열 수 없는 사진만 막는다. 나머지 경고는 "그래도 이 사진 사용"으로 넘길 수 있다.

import { useLocale, type MessageKey } from '@/lib/i18n';
import type { CaptureReview } from '@/lib/image/captureCheck';
import type { CaptureQualityWarning } from '@/lib/rules/types';

const WARNING_TEXT: Readonly<Record<CaptureQualityWarning, MessageKey>> = {
  low_resolution: 'captureCheck.warning.lowResolution',
  blur: 'captureCheck.warning.blur',
  too_dark: 'captureCheck.warning.tooDark',
  overexposed: 'captureCheck.warning.overexposed',
};

/** 무엇을 바꿔 다시 찍으면 되는지. 경고만 하고 방법을 안 주면 같은 사진이 또 나온다 */
const WARNING_HINT: Readonly<Record<CaptureQualityWarning, MessageKey>> = {
  low_resolution: 'captureCheck.hint.lowResolution',
  blur: 'captureCheck.hint.blur',
  too_dark: 'captureCheck.hint.tooDark',
  overexposed: 'captureCheck.hint.overexposed',
};

export interface CaptureQualityNoticeProps {
  review: CaptureReview | null;
  /** 경고를 보고도 이 사진을 쓴다 */
  onUseAnyway: () => void;
  /**
   * 다시 찍기. 넘기지 않으면 버튼을 그리지 않는다 — 다각도 확인 자리처럼
   * 바로 위에 자리별 촬영 버튼이 이미 있는 곳에서는 같은 버튼을 두 번 두지 않는다.
   */
  onRetake?: () => void;
  /** 이 경고가 어느 사진에 대한 것인지. 한 화면에 여러 장이 있을 때 붙인다 */
  subject?: string;
}

export function CaptureQualityNotice({
  review,
  onUseAnyway,
  onRetake,
  subject,
}: CaptureQualityNoticeProps) {
  const { t } = useLocale();
  if (!review) return null;

  const title = subject
    ? t('captureCheck.titleFor', { subject })
    : t('captureCheck.title');

  if (review.decodeFailed) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-4">
        <p
          role="alert"
          className="text-base font-semibold leading-relaxed text-red-100"
        >
          {subject ? `${subject} — ` : ''}
          {t('error.imageDecode')}
        </p>
        <p className="text-base leading-relaxed text-red-100">
          {t('captureCheck.decodeBlocked')}
        </p>
        {onRetake && (
          <button
            type="button"
            onClick={onRetake}
            className="min-h-14 rounded-lg bg-slate-700 text-lg font-semibold text-white active:bg-slate-600"
          >
            {t('captureCheck.retake')}
          </button>
        )}
      </div>
    );
  }

  if (review.warnings.length === 0) return null;

  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-4"
    >
      <p className="text-base font-bold leading-relaxed text-yellow-100">
        {title}
      </p>
      {/* 경고 목록은 한 번에 읽힌다. 그래도 사용을 고른 뒤에는 조용히 남긴다. */}
      <ul
        role={review.usedDespiteWarning ? undefined : 'alert'}
        className="flex flex-col gap-2"
      >
        {review.warnings.map((warning) => (
          <li key={warning} className="flex flex-col gap-1">
            <span className="text-base font-semibold leading-relaxed text-yellow-100">
              ⚠ {t(WARNING_TEXT[warning])}
            </span>
            <span className="text-base leading-relaxed text-yellow-100/90">
              {t(WARNING_HINT[warning])}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm leading-relaxed text-yellow-200/80">
        {t('captureCheck.provisional')}
      </p>
      <p className="text-sm leading-relaxed text-yellow-200/80">
        {t('captureCheck.boundary')}
      </p>

      {review.usedDespiteWarning ? (
        <p role="status" className="text-base leading-relaxed text-slate-200">
          {t('captureCheck.usedAnyway')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {onRetake && (
            <button
              type="button"
              onClick={onRetake}
              className="min-h-14 rounded-lg bg-slate-700 text-lg font-semibold text-white active:bg-slate-600"
            >
              {t('captureCheck.retake')}
            </button>
          )}
          <button
            type="button"
            onClick={onUseAnyway}
            aria-label={
              subject
                ? t('captureCheck.useAnywayFor', { subject })
                : t('captureCheck.useAnyway')
            }
            className="min-h-14 rounded-lg border border-yellow-500/60 text-lg font-semibold text-yellow-100 active:bg-yellow-500/20"
          >
            {t('captureCheck.useAnyway')}
          </button>
        </div>
      )}
    </section>
  );
}
