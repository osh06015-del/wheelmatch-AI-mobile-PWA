// 서버 재분석 판독(InspectionRecord.reanalyses)을 고른 언어의 문장으로 만든다.
//
// 화면(결과·이력)과 기록 문서가 같은 문장을 쓰도록 여기 한 곳에서 만든다. 따로
// 만들면 한쪽만 고쳐져 화면과 문서가 같은 기록을 두고 다른 말을 한다.
//
// 이 문장들이 있는 이유. 재분석을 받았어도 받아들이지 않은 점검의 판정 사유는 여전히
// 「확정한 값을 뒷받침하는 서버 판독이 확인되지 않아 작업자가 확인한 값으로만
// 대조했습니다」다 — 대조는 실제로 그 값으로만 했으므로 그 문장은 사실이고, 엔진이
// 낸 문장이라 고치지 않는다. 다만 그 문장은 서버가 이 사진을 다시 읽었는지를 말하지
// 않는다. 그래서 받았다는 사실, 받아들였는지, 결과에 반영한 것(외관 의심)을 덧붙여
// 말한다.
//
// 판정을 하지 않는다. 저장된 판독을 그대로 옮겨 말할 뿐이다. OCR 원문(rawText)은
// 어느 문장에도 넣지 않는다 — 사업장을 식별할 정보가 섞일 수 있다.

import type { Locale, MessageKey, Translate } from '@/lib/i18n';
import {
  WHEEL_PURPOSE_LABEL,
  WHEEL_TYPE_LABEL,
  labelOf,
} from '@/lib/i18n/checkText';
import {
  confirmedValueAgreement,
  markingConflicts,
  type MarkingConflict,
  type NumericMarkingKey,
  type ReanalysisAgreement,
} from '@/lib/ocr/confirm';
import { formatDateTime } from '@/lib/record/datetime';
import {
  compareReanalysis,
  sameValue,
  summarizeReanalyses,
  type ReanalysisComparison,
  type ReanalysisReading,
} from '@/lib/record/reanalysis';
import { formatExpiry } from '@/lib/rules/engine';
import type {
  GrinderSpec,
  ReanalysisRecord,
  VisibleDamage,
  WheelSpec,
} from '@/lib/rules/types';

const FIELD_LABEL: Record<ReanalysisComparison['field'], MessageKey> = {
  noLoadRPM: 'field.noLoadRPM',
  maxWheelDiameter: 'field.maxWheelDiameter',
  maxRPM: 'field.maxRPM',
  diameter: 'field.diameter',
};

const rpm = (value: number) => `${value}rpm`;
const mm = (value: number) => `Φ${value}mm`;
const mps = (value: number) => `${value}m/s`;

/** 라벨 원본 표기 칸의 이름과 단위 */
const MARKING: Record<
  NumericMarkingKey,
  { labelKey: MessageKey; format: (value: number) => string }
> = {
  labeledRPM: { labelKey: 'marking.labeledRPM', format: rpm },
  peripheralSpeedMps: { labelKey: 'marking.peripheralSpeedMps', format: mps },
  boreDiameter: { labelKey: 'marking.boreDiameter', format: mm },
};

const FIELD_FORMAT: Record<
  ReanalysisComparison['field'],
  (value: number) => string
> = {
  noLoadRPM: rpm,
  maxWheelDiameter: mm,
  maxRPM: rpm,
  diameter: mm,
};

/**
 * AI의 외관 판독을 말하는 문장. 'none_visible'은 「사진에서 찾지 못했다」이지 손상이
 * 없다는 뜻이 아니다 — 그렇게 적는다(types.ts의 VisibleDamage).
 */
const DAMAGE_TEXT: Record<VisibleDamage, MessageKey> = {
  suspected: 'reanalysis.item.damageSuspected',
  none_visible: 'reanalysis.item.damageNotSeen',
  unknown: 'reanalysis.item.damageUnknown',
};

/** 손상 항목의 답은 숫돌 상태 확인의 버튼과 같은 말로 적는다 */
function answerText(damageFree: boolean, t: Translate): string {
  return t(damageFree ? 'wheelCondition.confirmed' : 'wheelCondition.issue');
}

/**
 * 받아들인 판독이 다시 읽은 단계의 이름. 이력 화면이 두 사진에 붙이는 이름
 * (그라인더 명판·숫돌 라벨)을 그대로 쓴다 — 서버가 다시 읽은 것이 그 사진이다.
 */
function acceptedStepsText(
  steps: { grinder: boolean; wheel: boolean },
  t: Translate,
): string {
  const grinder = t('history.grinderPhoto');
  const wheel = t('history.wheelPhoto');
  if (steps.grinder && steps.wheel) {
    return t('reanalysis.steps.both', { first: grinder, second: wheel });
  }
  return steps.grinder ? grinder : wheel;
}

/** 값이 없는 자리. 비워 두면 빠뜨린 것인지 없는 것인지 알 수 없다 */
const NONE = '—';

const STATUS_KEY: Record<ReanalysisAgreement, MessageKey> = {
  same: 'offline.compareSame',
  differs: 'offline.compareDiffers',
  abstained: 'offline.compareAbstained',
};

/** 비교표의 한 줄. 값은 화면에 보일 글자로 들고 있다 */
export interface ReanalysisCompareRow {
  key: ReanalysisComparison['field'] | 'purpose' | 'expiry' | 'wheelType';
  label: string;
  /** 작업자가 확정한 값 */
  worker: string;
  /** 서버가 다시 읽은 값 */
  ai: string;
  status: ReanalysisAgreement;
}

/**
 * 판독 하나를 확정값과 견준 비교표. 다시 읽은 단계의 줄만 만든다 — 명판이 먼저다.
 *
 * 결과 화면이 제한 대조를 풀지 정할 때(OfflineReanalysisPanel)와 기록이 그 판독을
 * 다시 보여줄 때 이 함수 하나를 쓴다. 따로 만들면 한쪽만 고쳐졌을 때 기록이 화면과
 * 다른 말을 한다.
 *
 *   회전속도·지름       — AI가 읽지 못한 값(null)도 같다고 보지 않는다(sameValue).
 *                         기권으로 넘기면 서버가 확인해 주지 않은 값으로 제한이 풀린다.
 *   용도·유효기한·종류  — 숫돌 라벨을 다시 읽은 판독에만 있다. 양쪽 다 값이 있고
 *                         다를 때만 다름이고, 한쪽에 견줄 값이 없으면 기권이다
 *                         (confirm.ts의 confirmedValueAgreement).
 *
 * 견주기만 한다. 판정을 하지 않고, 확정값을 AI 값으로 바꾸지도 않는다.
 */
export function reanalysisCompareRows(
  reading: ReanalysisReading | ReanalysisRecord,
  grinder: GrinderSpec,
  wheel: WheelSpec,
  t: Translate,
  locale: Locale,
): ReanalysisCompareRow[] {
  const rows: ReanalysisCompareRow[] = compareReanalysis(
    reading,
    grinder,
    wheel,
  ).map((row) => {
    const show = (value: number | null) =>
      value === null ? NONE : FIELD_FORMAT[row.field](value);
    return {
      key: row.field,
      label: t(FIELD_LABEL[row.field]),
      worker: show(row.worker),
      ai: show(row.ai),
      status: sameValue(row) ? 'same' : 'differs',
    };
  });

  const wheelAi = reading.wheelOcr;
  if (!wheelAi) return rows;

  const agreement = confirmedValueAgreement(wheel, wheelAi);
  // 작업자가 확정한 유효기한. 날짜가 없으면 작업자가 고른 답을 그대로 보인다 —
  // 「표시를 찾지 못함」은 빈 값이 아니라 AI가 읽은 날짜와 견줄 답이다.
  const confirmedExpiry = wheel.expiry
    ? formatExpiry(wheel.expiry)
    : wheel.expiryReview === 'not_found'
      ? t('expiryReview.not_found')
      : wheel.expiryReview === 'unreadable'
        ? t('expiryReview.unreadable')
        : NONE;
  rows.push(
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
  );
  return rows;
}

/**
 * 비교표에 다른 값이 하나도 없는가. 견줄 값이 없는 줄(기권)은 다름이 아니다.
 *
 * 견줄 줄이 하나도 없으면 같다고 하지 않는다 — 아무것도 확인하지 않고 제한 대조가
 * 풀리면 안 된다. 제한 대조를 풀려면 이것 말고도 표기 충돌과 낮은 신뢰도가 없어야
 * 한다(OfflineReanalysisPanel).
 */
export function reanalysisValuesAgree(
  rows: readonly ReanalysisCompareRow[],
): boolean {
  return rows.length > 0 && rows.every((row) => row.status !== 'differs');
}

/** 비교표 한 줄의 글 — 「용도: 확정한 값 절단용 / AI 값 연삭용 · 다름」 */
export function reanalysisCompareRowText(
  row: ReanalysisCompareRow,
  t: Translate,
): string {
  const compared = t('offline.compareRow', {
    field: row.label,
    worker: row.worker,
    ai: row.ai,
  });
  return `${compared} · ${t(STATUS_KEY[row.status])}`;
}

/**
 * 두 판독이 다르게 읽은 라벨 표기 한 줄 — 「회전속도 표기: 앞선 판독 12200rpm / AI 값
 * 13300rpm · 다름」.
 *
 * @param rowKey 그 표기를 기기 안 OCR이 읽었다고 **남아 있을 때만**
 *   'offline.compareMarkingRow'(「기기 판독」)를 쓴다. 모르면 「앞선 판독」이다.
 */
export function markingConflictRowText(
  conflict: MarkingConflict,
  rowKey: 'offline.compareMarkingRow' | 'offline.compareMarkingRowUnknown',
  t: Translate,
): string {
  const { labelKey, format } = MARKING[conflict.key];
  const compared = t(rowKey, {
    field: t(labelKey),
    local: format(conflict.confirmed),
    ai: format(conflict.reanalyzed),
  });
  return `${compared} · ${t('offline.compareDiffers')}`;
}

/**
 * 서버가 낮은 신뢰도로 읽은 사진의 이름(문구 키). 명판이 먼저다.
 *
 * 신뢰도는 판독 자체의 성질이라 확정값과 견주지 않는다. 낮음만 본다 — 보통(medium)은
 * 규칙엔진도 막지 않는다.
 */
export function lowConfidencePhotoKeys(
  reading: ReanalysisReading | ReanalysisRecord,
): MessageKey[] {
  return [
    ...(reading.grinderOcr?.confidence === 'low'
      ? ['history.grinderPhoto' as const]
      : []),
    ...(reading.wheelOcr?.confidence === 'low'
      ? ['history.wheelPhoto' as const]
      : []),
  ];
}

/**
 * 한눈에 보이는 요약. 재분석이 없거나(빈 목록) 알 수 없는 기록(칸 없음)에는 아무
 * 말도 하지 않는다.
 */
export function reanalysisSummaryText(
  list: readonly ReanalysisRecord[] | null | undefined,
  t: Translate,
): string[] {
  const summary = summarizeReanalyses(list);
  if (!summary) return [];
  // 받은 수와 받아들인 수를 따로 말하고, 받아들인 것은 **어느 단계의 판독인지**로
  // 말한다. 「이 점검을 온라인 대조로 바꿨다」고 말하지 않는다 — 명판·숫돌을 함께
  // 받아들인 뒤 숫돌만 서버 판독 없이 다시 확정한 점검은 다시 제한 대조이고, 그런
  // 기록에 그 문장이 붙으면 실제보다 검증된 것처럼 읽힌다. 점검 전체의 판독 경로는
  // 판정 사유와 제한 대조 안내가 말한다.
  const lines = [
    summary.accepted > 0
      ? t('reanalysis.summary.accepted', {
          count: summary.count,
          accepted: summary.accepted,
          steps: acceptedStepsText(summary.acceptedSteps, t),
        })
      : t('reanalysis.summary.notAccepted', { count: summary.count }),
  ];
  if (summary.damageSuspected) {
    lines.push(t('reanalysis.summary.damageSuspected'));
  }
  if (summary.damageRecheck !== null) {
    lines.push(
      t('reanalysis.summary.recheck', {
        answer: answerText(summary.damageRecheck, t),
      }),
    );
  }
  return lines;
}

/** 판독 하나의 내역. 제목 한 줄과 그 아래 줄들 */
export interface ReanalysisDetail {
  heading: string;
  lines: string[];
}

/**
 * 판독마다의 내역 — 도착 시각·모델, AI 값과 확정값의 비교표, 표기 충돌, 낮은 신뢰도,
 * 외관 판독, 받아들였는지, 다시 받은 손상 답. 받은 순서대로다.
 *
 * 비교표는 결과 화면의 재분석 패널이 그때 보여 준 것과 같다(reanalysisCompareRows).
 * 회전속도·지름이 모두 같은데도 풀지 않은 판독은 용도·유효기한·종류가 달랐거나,
 * 표기가 충돌했거나, 낮은 신뢰도로 읽혔을 수 있다 — 그 줄이 없으면 기록에서 까닭을
 * 볼 수 없다.
 *
 * 라벨 원본 표기의 충돌(confirm.ts의 markingConflicts)은 **기록의 OCR 원본과**
 * 견줘 적는다. 그때 견준 상대는 확정값에 실려 있던 표기인데, 뒤에 다른 판독을
 * 받아들이면 그 표기의 빈 자리가 채워져 저장된 확정값으로는 그때의 충돌을 되짚을 수
 * 없다(없던 충돌이 생겨 보인다). OCR 원본은 다르다 — 확인 화면은 그 판독의 표기를
 * 사본으로 확정값에 실었고(confirmedWheelSpec) 재분석은 원본 자리를 건드리지 않으므로,
 * 원본의 표기가 곧 그때 견준 상대다. 무엇이 읽었는지는 풀린 뒤 까닭이 지워져 알 수
 * 없으므로 「앞선 판독」이라고만 적는다.
 *
 * OCR 원본을 남기지 않은 기록(직접 입력, 버린 판독, 일부 값만 모름으로 읽은 판독)은
 * 견줄 원본이 없어 이 줄을 만들지 않는다. 직접 입력에는 표기가 없어 충돌도 없었다.
 * 틀릴 수 있는 줄을 만들지 않는다 — 판독이 읽은 표기 자체는 기록에 남아 있다.
 *
 * @param grinder 기록의 확정값. 「같음/다름」은 이 값과 견준 것이다. 확정값은 그
 *   단계를 다시 확정하지 않는 한 바뀌지 않고, 다시 확정하면 그 단계의 판독이
 *   지워지므로(reanalysis.ts) 저장된 확정값은 견주던 때의 값과 같다. 재분석을
 *   받아들여도 작업자가 확정한 용도·유효기한·종류는 바뀌지 않는다.
 * @param wheelOcr 기록의 숫돌 OCR 원본. 없으면 표기 충돌 줄을 만들지 않는다.
 */
export function reanalysisDetailText(
  list: readonly ReanalysisRecord[] | null | undefined,
  grinder: GrinderSpec,
  wheel: WheelSpec,
  t: Translate,
  locale: Locale,
  wheelOcr?: WheelSpec | null,
): ReanalysisDetail[] {
  if (!list) return [];
  return list.map((record, index) => {
    const model =
      record.wheelOcrTelemetry?.model ??
      record.grinderOcrTelemetry?.model ??
      t('evidence.notRecorded');
    const lines = reanalysisCompareRows(record, grinder, wheel, t, locale).map(
      (row) => reanalysisCompareRowText(row, t),
    );
    if (wheelOcr && record.wheelOcr) {
      for (const conflict of markingConflicts(wheelOcr, record.wheelOcr)) {
        lines.push(
          markingConflictRowText(
            conflict,
            'offline.compareMarkingRowUnknown',
            t,
          ),
        );
      }
    }
    for (const photoKey of lowConfidencePhotoKeys(record)) {
      lines.push(t('offline.lowConfidenceRow', { photo: t(photoKey) }));
    }
    if (record.wheelOcr) {
      lines.push(t(DAMAGE_TEXT[record.wheelOcr.visibleDamage]));
    }
    lines.push(
      record.acceptedAt === null
        ? t('reanalysis.item.notAccepted')
        : t('reanalysis.item.accepted', {
            time: formatDateTime(record.acceptedAt),
          }),
    );
    if (record.damageRecheck) {
      lines.push(
        t('reanalysis.item.recheck', {
          answer: answerText(record.damageRecheck.damageFree, t),
          time: formatDateTime(record.damageRecheck.answeredAt),
        }),
      );
    }
    return {
      heading: t('reanalysis.item.heading', {
        index: index + 1,
        time: formatDateTime(record.analyzedAt),
        model,
      }),
      lines,
    };
  });
}
