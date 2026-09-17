'use client';

// 오프라인 제한 대조 결과의 안내와, 연결이 돌아왔을 때의 서버 재분석.
//
// 재분석은 작업자가 버튼을 눌러야만 시작한다(자동으로 서버를 부르지 않는다).
// 재분석 결과는 작업자가 넣은 최종값을 **덮어쓰지 않는다.** 두 값을 나란히
// 보여주고, RPM·지름이 모두 같을 때만 "온라인 대조로 전환"을 열어 준다 — 다르면
// 어느 쪽이 맞는지 앱이 알 수 없으므로 오프라인 결과를 유지하거나 다시 찍게 한다.
// 취소하면 AI 값은 버리고 오프라인 결과가 그대로 남는다.

import { useState } from 'react';

import { useLocale } from '@/lib/i18n';
import { getExtractor } from '@/lib/ocr/extractor';
import { useOnlineStatus } from '@/lib/pwa/onlineStatus';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';
import type { OfflineSlots, ReanalysisInput } from '@/lib/state/inspection';

type Phase = 'idle' | 'analyzing' | 'compare' | 'failed';

interface CompareRow {
  key: string;
  label: string;
  worker: number | null;
  ai: number | null;
  format: (value: number) => string;
}

const rpm = (value: number) => `${value}rpm`;
const mm = (value: number) => `Φ${value}mm`;

export function OfflineReanalysisPanel({
  grinder,
  wheel,
  offlineSlots,
  grinderImage,
  wheelImage,
  onAccept,
}: {
  grinder: GrinderSpec;
  wheel: WheelSpec;
  offlineSlots: OfflineSlots;
  grinderImage: Blob | null;
  wheelImage: Blob | null;
  onAccept: (input: ReanalysisInput) => void;
}) {
  const { t } = useLocale();
  const online = useOnlineStatus();
  const [phase, setPhase] = useState<Phase>('idle');
  const [ai, setAi] = useState<ReanalysisInput | null>(null);

  // 오프라인으로 넣은 단계의 사진만 다시 보낸다. 사진이 없으면 다시 분석할 근거가 없다.
  const photosReady =
    (!offlineSlots.grinder || grinderImage !== null) &&
    (!offlineSlots.wheel || wheelImage !== null);

  async function reanalyze() {
    setPhase('analyzing');
    setAi(null);
    try {
      // 오프라인/로컬 OCR 제한을 풀 수 있는 유일한 경로는 서버(Claude) 대조다.
      // 빌드가 tesseract 모드여도 재분석만큼은 getExtractor()의 기본값을 따르지
      // 않고 명시적으로 claude를 부른다 — 안 그러면 다시 로컬로 읽어 제한이 풀리지 않는다.
      const extractor = getExtractor('claude');
      const next: ReanalysisInput = {};
      if (offlineSlots.grinder && grinderImage) {
        next.grinderOcr = await extractor.extractGrinder(grinderImage);
        next.grinderOcrTelemetry = extractor.getLastTelemetry?.() ?? null;
      }
      if (offlineSlots.wheel && wheelImage) {
        next.wheelOcr = await extractor.extractWheel(wheelImage);
        next.wheelOcrTelemetry = extractor.getLastTelemetry?.() ?? null;
      }
      setAi(next);
      setPhase('compare');
    } catch {
      // 실패를 값으로 꾸미지 않는다. 오프라인 결과가 그대로 남는다.
      setPhase('failed');
    }
  }

  function cancel() {
    setAi(null);
    setPhase('idle');
  }

  const rows: CompareRow[] = [
    ...(ai?.grinderOcr
      ? [
          {
            key: 'noLoadRPM',
            label: t('field.noLoadRPM'),
            worker: grinder.noLoadRPM,
            ai: ai.grinderOcr.noLoadRPM,
            format: rpm,
          },
          {
            key: 'maxWheelDiameter',
            label: t('field.maxWheelDiameter'),
            worker: grinder.maxWheelDiameter,
            ai: ai.grinderOcr.maxWheelDiameter,
            format: mm,
          },
        ]
      : []),
    ...(ai?.wheelOcr
      ? [
          {
            key: 'maxRPM',
            label: t('field.maxRPM'),
            worker: wheel.maxRPM,
            ai: ai.wheelOcr.maxRPM,
            format: rpm,
          },
          {
            key: 'diameter',
            label: t('field.diameter'),
            worker: wheel.diameter,
            ai: ai.wheelOcr.diameter,
            format: mm,
          },
        ]
      : []),
  ];
  // AI가 읽지 못한 값(null)도 같다고 보지 않는다.
  const allSame =
    rows.length > 0 &&
    rows.every((row) => row.ai !== null && row.ai === row.worker);
  const show = (value: number | null, format: (value: number) => string) =>
    value === null ? '—' : format(value);

  return (
    <section
      aria-labelledby="offline-title"
      className="flex flex-col gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-4"
    >
      <h2 id="offline-title" className="text-lg font-bold text-yellow-100">
        ⚠ {t('rule.offlineLimited')}
      </h2>
      <p className="text-base leading-relaxed text-yellow-100">
        {t('offline.limit')}
      </p>

      {phase === 'compare' ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-bold text-slate-100">
            {t('offline.compareTitle')}
          </h3>
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li
                key={row.key}
                className="rounded-lg bg-slate-800 px-3 py-2 text-base text-slate-100"
              >
                {t('offline.compareRow', {
                  field: row.label,
                  worker: show(row.worker, row.format),
                  ai: show(row.ai, row.format),
                })}{' '}
                ·{' '}
                {row.ai !== null && row.ai === row.worker
                  ? t('offline.compareSame')
                  : t('offline.compareDiffers')}
              </li>
            ))}
          </ul>
          {!allSame && (
            <p
              role="alert"
              className="text-base leading-relaxed text-yellow-100"
            >
              {t('offline.mismatch')}
            </p>
          )}
          <button
            type="button"
            onClick={() => ai && onAccept(ai)}
            disabled={!allSame}
            className="min-h-14 rounded-lg bg-slate-100 text-lg font-bold text-slate-900 active:bg-white disabled:bg-slate-700 disabled:text-slate-400"
          >
            {t('offline.accept')}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="min-h-14 rounded-lg border border-slate-500 text-lg font-semibold text-slate-100 active:bg-slate-800"
          >
            {t('offline.cancel')}
          </button>
        </div>
      ) : !photosReady ? (
        <p className="text-base text-slate-300">{t('offline.noPhotos')}</p>
      ) : !online ? (
        <p className="text-base text-slate-300">{t('offline.stillOffline')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-base leading-relaxed text-slate-200">
            {t('offline.reanalyzeHint')}
          </p>
          {phase === 'failed' && (
            <p role="alert" className="text-base text-red-300">
              {t('offline.failed')}
            </p>
          )}
          <button
            type="button"
            onClick={() => void reanalyze()}
            disabled={phase === 'analyzing'}
            className="min-h-14 rounded-lg border border-yellow-500/60 text-lg font-semibold text-yellow-100 active:bg-yellow-500/20 disabled:opacity-60"
          >
            {phase === 'analyzing'
              ? t('offline.analyzing')
              : t('offline.reanalyze')}
          </button>
        </div>
      )}
    </section>
  );
}
