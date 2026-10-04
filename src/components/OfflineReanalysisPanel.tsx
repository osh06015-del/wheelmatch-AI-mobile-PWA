'use client';

// 제한 대조 결과의 안내와, 기기가 온라인일 때의 서버 재분석.
//
// 연결이 끊겼다 돌아온 점검만 이 패널을 보는 것이 아니다. 끊긴 적 없이 제한 대조가
// 된 점검(로컬 OCR로 읽었거나, 확인 화면 draft의 판독을 통째로 버렸거나, 판독 경로
// 표시를 읽지 못한 경우)도 본다 — 그래서 안내 문구는 기기가 오프라인이었다거나
// 연결이 돌아왔다고 말하지 않고, 값을 작업자가 입력했다고도 말하지 않는다. 왜
// 제한됐는지는 확인 화면이 남긴 까닭을 그대로 한 줄씩 적는다. 푸는 방법은 까닭과
// 무관하게 같아(서버 재분석·다시 촬영) 안내는 까닭별로 나누지 않는다.
//
// 재분석은 작업자가 버튼을 눌러야만 시작한다(자동으로 서버를 부르지 않는다).
// 재분석 결과는 작업자가 확정한 최종값을 **덮어쓰지 않는다.** 두 값을 나란히
// 보여주고, RPM·지름이 모두 같을 때만 「제한 대조 풀기」를 열어 준다 — 다르면
// 어느 쪽이 맞는지 앱이 알 수 없으므로 제한 대조 결과를 유지하거나 다시 찍게 한다.
// 취소하면 AI 값은 버리고 제한 대조 결과가 그대로 남는다.
//
// 버리지 않는 것이 하나 있다. AI가 숫돌 사진에서 본 **외관 의심**은 견줄 값이 아니라
// 그 사진에 대해 앱이 올린 경고라, 결과가 도착하는 대로 남긴다(onAnalyzed) — 값이
// 달라 전환이 막혀도, 취소해도 사라지지 않는다. 그리고 의심이 올라온 숫돌을 온라인
// 대조로 바꾸려면 손상 항목을 다시 받는다. 숫돌 상태 확인에서 한 답은 이 경고를
// 보기 전의 것이다 — 처음부터 온라인으로 읽었다면 작업자는 경고를 보면서 답했다.
// AI가 답을 대신 만들지는 않는다. 묻기만 한다.

import { useState } from 'react';

import { WheelConditionQuestion } from '@/components/WheelConditionGate';
import { useLocale } from '@/lib/i18n';
import { limitCauseLines } from '@/lib/i18n/limitCause';
import { getExtractor } from '@/lib/ocr/extractor';
import { useOnlineStatus } from '@/lib/pwa/onlineStatus';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';
import {
  limitCausesOf,
  type OfflineSlots,
  type ReanalysisInput,
} from '@/lib/state/inspection';

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
  onAnalyzed,
  onAccept,
  onDamageIssue,
}: {
  grinder: GrinderSpec;
  wheel: WheelSpec;
  offlineSlots: OfflineSlots;
  grinderImage: Blob | null;
  wheelImage: Blob | null;
  /**
   * 재분석 결과가 도착했다. 전환과 무관하게 남길 것(외관 의심)을 남긴다.
   * 어느 라벨 사진을 보낸 결과인지 함께 넘긴다 — 받는 쪽이 그 사진의 숫돌이
   * 아직 확정값인지 확인한다.
   */
  onAnalyzed: (input: ReanalysisInput, analyzedWheelImage: Blob | null) => void;
  onAccept: (input: ReanalysisInput) => void;
  /** 다시 물은 손상 항목에 작업자가 「문제 있음」으로 답했다 */
  onDamageIssue: () => void;
}) {
  const { t } = useLocale();
  const online = useOnlineStatus();
  const [phase, setPhase] = useState<Phase>('idle');
  const [ai, setAi] = useState<ReanalysisInput | null>(null);
  // 다시 물은 손상 항목의 답. 재분석할 때마다 새로 받는다 — 이전 답을 이어 쓰면
  // 묻지 않고 통과시키는 것과 같다.
  const [damageRecheck, setDamageRecheck] = useState<boolean | null>(null);

  // 제한된 단계의 사진만 다시 보낸다. 사진이 없으면 다시 분석할 근거가 없다.
  const photosReady =
    (!offlineSlots.grinder || grinderImage !== null) &&
    (!offlineSlots.wheel || wheelImage !== null);

  async function reanalyze() {
    setPhase('analyzing');
    setAi(null);
    setDamageRecheck(null);
    try {
      // 제한 대조를 이 화면에서 풀 수 있는 유일한 경로는 서버(Claude) 대조다.
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
      // 아래 비교에서 값이 다르거나 작업자가 취소해도 AI가 올린 외관 의심은 남긴다.
      onAnalyzed(next, wheelImage);
      setAi(next);
      setPhase('compare');
    } catch {
      // 실패를 값으로 꾸미지 않는다. 제한 대조 결과가 그대로 남는다.
      setPhase('failed');
    }
  }

  function cancel() {
    setAi(null);
    setDamageRecheck(null);
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
  // 이번 재분석으로 온라인 대조로 바뀔 숫돌에 외관 의심이 올라와 있는가.
  //
  // 이번 판독만 보지 않고 확정값에 남아 있는 의심도 본다. 한 번 의심한 뒤 취소하고
  // 다시 분석했을 때 AI가 이번에는 의심하지 않더라도, 앞서 올린 의심은 그대로이고
  // 손상 항목의 답은 여전히 그 경고보다 먼저 한 것이다.
  // 명판만 다시 분석하는 경우(ai.wheelOcr 없음)에는 묻지 않는다 — 그 숫돌은 온라인으로
  // 읽었고, 의심이 있었다면 숫돌 상태 확인에서 이미 경고를 보며 답했다.
  const damageSuspected =
    ai?.wheelOcr !== undefined &&
    (wheel.visibleDamage === 'suspected' ||
      ai.wheelOcr.visibleDamage === 'suspected');
  const canAccept = allSame && (!damageSuspected || damageRecheck === true);
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
      {/* 왜 제한됐는지. 확인 화면이 확정할 때 남긴 까닭 그대로다 — 여기서 추정하지
          않고, 남아 있지 않으면 기록되지 않았다고 적는다. 제한된 단계만 적는다. */}
      <ul className="flex flex-col gap-1">
        {limitCauseLines(limitCausesOf(offlineSlots), t).map((line) => (
          <li
            key={line.step}
            className="text-base leading-relaxed text-yellow-100"
          >
            {line.text}
          </li>
        ))}
      </ul>

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
          {/* 값이 달라 전환할 수 없으면 물어도 달라지는 것이 없다. 그때는 경고만
              알리고, 전환할 수 있을 때만 손상 항목을 다시 받는다. */}
          {damageSuspected && allSame && (
            <p className="text-base leading-relaxed text-yellow-100">
              {t('offline.damageRecheck')}
            </p>
          )}
          {damageSuspected && (
            <p
              role="alert"
              className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-4 text-base font-semibold leading-relaxed text-yellow-100"
            >
              ⚠ {t('wheelCondition.aiDamageWarning')}
            </p>
          )}
          {damageSuspected && allSame && (
            // 숫돌 상태 확인과 같은 질문 요소를 쓴다. Gate를 통째로 쓰지 않는 이유:
            // Gate의 머리말과 "규격 대조로 진행" 안내는 이 자리에서 맞지 않는 말이다.
            <WheelConditionQuestion
              itemKey="damageFree"
              value={damageRecheck}
              onChange={(_key, value) => {
                setDamageRecheck(value);
                // 문제 있음은 곧바로 알린다. 여기에만 두면 화면 아래의 저장 버튼이
                // 「확인함」이던 이전 답으로 기록을 남길 수 있다.
                if (!value) onDamageIssue();
              }}
            />
          )}
          <button
            type="button"
            // 버튼만 막으면 다른 경로로 불렸을 때 샌다. 여기서도 막는다.
            onClick={() => ai && canAccept && onAccept(ai)}
            disabled={!canAccept}
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
