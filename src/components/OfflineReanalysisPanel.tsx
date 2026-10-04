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
// 보여주고, 다른 값이 없을 때만 「제한 대조 풀기」를 열어 준다 — 다르면 어느 쪽이
// 맞는지 앱이 알 수 없으므로 제한 대조 결과를 유지하거나 다시 찍게 한다.
// 취소하면 AI 값은 버리고 제한 대조 결과가 그대로 남는다.
//
// 전환을 막는 것은 네 묶음이다.
//
//   회전속도·지름       — AI가 읽지 못한 것도 같다고 보지 않는다. 서버라는 두 번째
//                         눈이 이 값을 확인해 줘야 제한이 풀린다.
//   용도·유효기한·종류  — 양쪽 다 값이 있고 다를 때만 막는다. 한쪽에 견줄 값이
//                         없으면 기권이다(confirm.ts의 confirmedValueAgreement).
//                         처음부터 온라인이었다면 AI 값이 확인 화면의 기본값이었고
//                         작업자가 보면서 고쳐야 바뀌었다 — 여기에는 그 장치가 없다.
//   라벨 원본 표기      — 작업자가 확정한 값이 아니라, 확정할 때의 판독이 확정값에
//                         실어 둔 표기다. 서버가 같은 칸을 다르게 읽었으면 막고, 그
//                         칸만 따로 보인다(confirm.ts의 markingConflicts). 빈 자리만
//                         채우는 규칙으로는 앞선 표기가 조용히 이긴다. 그 판독이 기기
//                         안 OCR이었다고 까닭에 남아 있을 때만 「기기 판독」이라 적고,
//                         아니면 「앞선 판독」이라 적는다 — 까닭을 단정하지 않는다.
//   낮은 신뢰도         — 서버가 그 사진을 낮은 신뢰도로 읽었으면 값이 같아도 막는다.
//                         신뢰도는 모델이 주는 유일한 자기 경고다(safety-critical.md
//                         4번). 처음부터 온라인이었다면 작업자가 그 경고를 보면서 직접
//                         확인해야 풀렸다 — 여기서 한 직접 확인은 그 경고보다 먼저다.
//
// 버리지 않는 것이 하나 있다. AI가 숫돌 사진에서 본 **외관 의심**은 견줄 값이 아니라
// 그 사진에 대해 앱이 올린 경고라, 결과가 도착하는 대로 남긴다(onAnalyzed) — 값이
// 달라 전환이 막혀도, 취소해도 사라지지 않는다. 그리고 의심이 올라온 숫돌을 온라인
// 대조로 바꾸려면 손상 항목을 다시 받는다. 숫돌 상태 확인에서 한 답은 이 경고를
// 보기 전의 것이다 — 처음부터 온라인으로 읽었다면 작업자는 경고를 보면서 답했다.
// AI가 답을 대신 만들지는 않는다. 묻기만 한다.

import { useState } from 'react';

import { WheelConditionQuestion } from '@/components/WheelConditionGate';
import { useLocale, type MessageKey } from '@/lib/i18n';
import {
  WHEEL_PURPOSE_LABEL,
  WHEEL_TYPE_LABEL,
  labelOf,
} from '@/lib/i18n/checkText';
import { limitCauseLines } from '@/lib/i18n/limitCause';
import {
  confirmedValueAgreement,
  markingConflicts,
  type NumericMarkingKey,
  type ReanalysisAgreement,
} from '@/lib/ocr/confirm';
import { getExtractor } from '@/lib/ocr/extractor';
import { useOnlineStatus } from '@/lib/pwa/onlineStatus';
import { formatExpiry } from '@/lib/rules/engine';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';
import {
  limitCausesOf,
  type OfflineSlots,
  type ReanalysisInput,
} from '@/lib/state/inspection';

type Phase = 'idle' | 'analyzing' | 'compare' | 'failed';

/** 비교표의 한 줄. 값은 화면에 보일 글자로 들고 있다 */
interface CompareRow {
  key: string;
  label: string;
  worker: string;
  ai: string;
  status: ReanalysisAgreement;
}

const rpm = (value: number) => `${value}rpm`;
const mm = (value: number) => `Φ${value}mm`;
const mps = (value: number) => `${value}m/s`;

/** 값이 없는 자리. 비워 두면 빠뜨린 것인지 없는 것인지 알 수 없다 */
const NONE = '—';

const STATUS_KEY: Record<ReanalysisAgreement, MessageKey> = {
  same: 'offline.compareSame',
  differs: 'offline.compareDiffers',
  abstained: 'offline.compareAbstained',
};

/** 라벨 원본 표기 칸의 이름과 단위 */
const MARKING: Record<
  NumericMarkingKey,
  { labelKey: MessageKey; format: (value: number) => string }
> = {
  labeledRPM: { labelKey: 'marking.labeledRPM', format: rpm },
  peripheralSpeedMps: { labelKey: 'marking.peripheralSpeedMps', format: mps },
  boreDiameter: { labelKey: 'marking.boreDiameter', format: mm },
};

/**
 * AI가 반드시 읽어 줘야 하는 값(회전속도·지름)의 한 줄.
 *
 * AI가 읽지 못한 값(null)도 같다고 보지 않는다 — 기권으로 넘기면 서버가 확인해
 * 주지 않은 값으로 제한 대조가 풀린다.
 */
function requiredRow(
  key: string,
  label: string,
  worker: number | null,
  ai: number | null,
  format: (value: number) => string,
): CompareRow {
  return {
    key,
    label,
    worker: worker === null ? NONE : format(worker),
    ai: ai === null ? NONE : format(ai),
    status: ai !== null && ai === worker ? 'same' : 'differs',
  };
}

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
  const { t, locale } = useLocale();
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

  const wheelAi = ai?.wheelOcr;
  // 작업자가 확정한 유효기한. 날짜가 없으면 작업자가 고른 답을 그대로 보인다 —
  // 「표시를 찾지 못함」은 빈 값이 아니라 AI가 읽은 날짜와 견줄 답이다.
  const confirmedExpiry = wheel.expiry
    ? formatExpiry(wheel.expiry)
    : wheel.expiryReview === 'not_found'
      ? t('expiryReview.not_found')
      : wheel.expiryReview === 'unreadable'
        ? t('expiryReview.unreadable')
        : NONE;
  const agreement = wheelAi ? confirmedValueAgreement(wheel, wheelAi) : null;

  const rows: CompareRow[] = [
    ...(ai?.grinderOcr
      ? [
          requiredRow(
            'noLoadRPM',
            t('field.noLoadRPM'),
            grinder.noLoadRPM,
            ai.grinderOcr.noLoadRPM,
            rpm,
          ),
          requiredRow(
            'maxWheelDiameter',
            t('field.maxWheelDiameter'),
            grinder.maxWheelDiameter,
            ai.grinderOcr.maxWheelDiameter,
            mm,
          ),
        ]
      : []),
    ...(wheelAi && agreement
      ? [
          requiredRow(
            'maxRPM',
            t('field.maxRPM'),
            wheel.maxRPM,
            wheelAi.maxRPM,
            rpm,
          ),
          requiredRow(
            'diameter',
            t('field.diameter'),
            wheel.diameter,
            wheelAi.diameter,
            mm,
          ),
          {
            key: 'purpose',
            label: t('field.purpose'),
            worker: labelOf(WHEEL_PURPOSE_LABEL, wheel.purpose, locale) ?? NONE,
            ai: labelOf(WHEEL_PURPOSE_LABEL, wheelAi.purpose, locale) ?? NONE,
            status: agreement.purpose,
          },
          {
            key: 'expiry',
            label: t('field.expiry'),
            worker: confirmedExpiry,
            ai: wheelAi.expiry ? formatExpiry(wheelAi.expiry) : NONE,
            status: agreement.expiry,
          },
          {
            key: 'wheelType',
            label: t('field.wheelType'),
            worker: labelOf(WHEEL_TYPE_LABEL, wheel.wheelType, locale) ?? NONE,
            ai: labelOf(WHEEL_TYPE_LABEL, wheelAi.wheelType, locale) ?? NONE,
            status: agreement.wheelType,
          },
        ]
      : []),
  ];
  // 다른 값이 하나도 없어야 한다. 견줄 값이 없는 줄(기권)은 다름이 아니다.
  const valuesAgree =
    rows.length > 0 && rows.every((row) => row.status !== 'differs');
  // 확정값에 실려 있던 표기와 AI가 읽은 표기가 같은 칸에서 다른 곳. 작업자가
  // 확정한 값이 아니라서 위 비교표에 섞지 않고 따로 보인다.
  const conflicts = wheelAi ? markingConflicts(wheel, wheelAi) : [];
  // 그 표기를 무엇이 읽었는가. 확인 화면이 「기기 안 OCR」이라고 남겼을 때만 기기
  // 판독이라고 적는다. 까닭이 남지 않은 값은 서버가 읽은 것일 수도 있다(읽을 때
  // 기기가 오프라인으로 보고됐을 뿐인 판독 — docs/safety-boundaries.md 「제한 대조의
  // 이름과 까닭」). 모르는 것을 기기가 읽었다고 적지 않는다.
  const markingRowKey: MessageKey =
    limitCausesOf(offlineSlots).wheel === 'local_ocr'
      ? 'offline.compareMarkingRow'
      : 'offline.compareMarkingRowUnknown';
  // 서버가 낮은 신뢰도로 읽은 사진. 값이 같아도 그 판독으로는 제한을 풀지 않는다.
  // 직접 확인을 여기서 다시 받지는 않는다 — 다시 촬영하면 확인 화면이 낮은 신뢰도
  // 경고와 직접 확인을 그대로 낸다. 보통(medium)은 규칙엔진도 막지 않으므로 두지 않는다.
  const lowConfidencePhotos: MessageKey[] = [
    ...(ai?.grinderOcr?.confidence === 'low'
      ? ['history.grinderPhoto' as const]
      : []),
    ...(wheelAi?.confidence === 'low' ? ['history.wheelPhoto' as const] : []),
  ];
  const convertible =
    valuesAgree && conflicts.length === 0 && lowConfidencePhotos.length === 0;
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
  const canAccept = convertible && (!damageSuspected || damageRecheck === true);

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
                // 줄이 늘어 다른 줄을 찾으려면 끝까지 읽어야 한다. 전환을 막는 줄에만
                // 테두리를 둔다 — 「다름」이라는 글자는 그대로 있고, 색은 보조다.
                className={`rounded-lg bg-slate-800 px-3 py-2 text-base text-slate-100 ${
                  row.status === 'differs' ? 'border border-yellow-500/50' : ''
                }`}
              >
                {t('offline.compareRow', {
                  field: row.label,
                  worker: row.worker,
                  ai: row.ai,
                })}{' '}
                · {t(STATUS_KEY[row.status])}
              </li>
            ))}
          </ul>
          {!convertible && (
            // 전환할 수 없는 까닭은 여럿일 수 있다(값의 차이·표기 충돌·낮은 신뢰도).
            // 알림은 하나로 묶는다 — 따로 두면 화면 낭독기가 같은 결론을 거듭 읽는다.
            <div role="alert" className="flex flex-col gap-3">
              {!valuesAgree && (
                <p className="text-base leading-relaxed text-yellow-100">
                  {t('offline.mismatch')}
                </p>
              )}
              {conflicts.length > 0 && (
                <>
                  {/* 위 비교표와 같은 목록으로 읽히지 않게 테두리를 둔다. 이 줄들은
                      작업자가 확정한 값이 아니라 앞선 판독이 읽은 표기다. */}
                  <ul className="flex flex-col gap-2">
                    {conflicts.map((conflict) => (
                      <li
                        key={conflict.key}
                        className="rounded-lg border border-yellow-500/50 bg-slate-800 px-3 py-2 text-base text-slate-100"
                      >
                        {t(markingRowKey, {
                          field: t(MARKING[conflict.key].labelKey),
                          local: MARKING[conflict.key].format(
                            conflict.confirmed,
                          ),
                          ai: MARKING[conflict.key].format(conflict.reanalyzed),
                        })}{' '}
                        · {t('offline.compareDiffers')}
                      </li>
                    ))}
                  </ul>
                  <p className="text-base leading-relaxed text-yellow-100">
                    {t('offline.markingConflict')}
                  </p>
                </>
              )}
              {lowConfidencePhotos.length > 0 && (
                <>
                  <ul className="flex flex-col gap-2">
                    {lowConfidencePhotos.map((photoKey) => (
                      <li
                        key={photoKey}
                        className="rounded-lg border border-yellow-500/50 bg-slate-800 px-3 py-2 text-base text-slate-100"
                      >
                        {t('offline.lowConfidenceRow', { photo: t(photoKey) })}
                      </li>
                    ))}
                  </ul>
                  <p className="text-base leading-relaxed text-yellow-100">
                    {t('offline.lowConfidence')}
                  </p>
                </>
              )}
            </div>
          )}
          {/* 값이 달라 전환할 수 없으면 물어도 달라지는 것이 없다. 그때는 경고만
              알리고, 전환할 수 있을 때만 손상 항목을 다시 받는다. */}
          {damageSuspected && convertible && (
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
          {damageSuspected && convertible && (
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
