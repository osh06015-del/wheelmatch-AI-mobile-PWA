'use client';

// 판정 근거 화면. 결과·이력 상세에서 접어 둔다.
//
// 여기서 보여주는 것: 규칙명과 결과, 그라인더·숫돌 입력값과 단위, OCR
// 원본·정규화값·작업자 최종값, 값 출처(AI/환산/사용자), 계산식과 차이,
// 근거 문서와 적용 한계.
//
// 여기서 하지 않는 것: 시스템 프롬프트·API 원문·비밀값 표시. 판정을 다시
// 계산하거나 바꾸는 일. 이 컴포넌트는 이미 나온 result.checks를 그대로
// 옮겨 보여줄 뿐이다 — engine.ts만이 판정한다(safety-invariants.md 1번).
//
// 「적합」이 승인이 되지 않도록 문구를 반드시 함께 둔다(evidence.disclaimer).
// 사진에서 손상이 안 보인다고 「손상 없음」이라 적지 않는다
// (docs/safety-boundaries.md) — visibleDamage 행은 항상 advisory 문구만 쓴다.

import { useState } from 'react';

import { EVIDENCE_SOURCE } from '@/lib/guide/evidenceSources';
import { useLocale, type Locale, type Translate } from '@/lib/i18n';
import {
  WHEEL_PURPOSE_LABEL,
  WHEEL_TYPE_LABEL,
  checkReasonText,
  checkValueText,
  labelOf,
} from '@/lib/i18n/checkText';
import { formatMargin } from '@/lib/i18n/format';
import { ruleLabelText } from '@/lib/i18n/ruleLabel';
import { RULE, formatExpiry } from '@/lib/rules/engine';
import { margins } from '@/lib/rules/requirement';
import type {
  CheckItem,
  GrinderSpec,
  MatchResult,
  WheelSpec,
} from '@/lib/rules/types';

type ValueSource = 'ai' | 'converted' | 'user' | 'unrecorded';

const SOURCE_LABEL_KEY: Record<
  ValueSource,
  | 'evidence.source.ai'
  | 'evidence.source.converted'
  | 'evidence.source.user'
  | 'evidence.notRecorded'
> = {
  ai: 'evidence.source.ai',
  converted: 'evidence.source.converted',
  user: 'evidence.source.user',
  unrecorded: 'evidence.notRecorded',
};

const rpmText = (value: number | null): string | null =>
  value === null ? null : `${value}rpm`;
const diameterText = (value: number | null): string | null =>
  value === null ? null : `Φ${value}mm`;
const mpsText = (value: number | null): string | null =>
  value === null ? null : `${value}m/s`;

/** OCR 원본이 아예 없는(이 기능 도입 전 기록) 값은 '미기록'. 있지만 못 읽은 값은 '—'. */
function rawCell(
  ocrPresent: boolean,
  text: string | null,
  t: Translate,
): string {
  if (!ocrPresent) return t('evidence.notRecorded');
  return text ?? '—';
}

function finalCell(text: string | null): string {
  return text ?? '—';
}

/** OCR 원본과 최종값을 비교해 출처를 정한다. OCR 자체가 없으면(구기록) 비교할 수 없다. */
function sourceOf<T>(
  ocrPresent: boolean,
  ocrValue: T,
  finalValue: T,
): ValueSource {
  if (!ocrPresent) return 'unrecorded';
  return ocrValue === finalValue ? 'ai' : 'user';
}

/** 최고사용회전속도만 label/converted/user 세 갈래다 — confirm.ts가 이미 정해 둔 값을 그대로 읽는다. */
function rpmValueSource(
  wheelOcrPresent: boolean,
  rpmSource: WheelSpec['rpmSource'],
): ValueSource {
  if (rpmSource === 'user') return 'user';
  if (rpmSource === 'converted') return 'converted';
  if (rpmSource === 'label') return 'ai';
  return wheelOcrPresent ? 'ai' : 'unrecorded';
}

interface FieldRowData {
  key: string;
  label: string;
  raw: string;
  normalized: string;
  final: string;
  source: ValueSource;
}

function FieldRow({ row, t }: { row: FieldRowData; t: Translate }) {
  return (
    <li className="flex flex-col gap-1 rounded-lg bg-slate-800 px-4 py-3">
      <span className="text-base font-semibold text-slate-100">
        {row.label}
      </span>
      <span className="text-sm text-slate-400">
        {t('evidence.fields.raw')} {row.raw} · {t('evidence.fields.normalized')}{' '}
        {row.normalized} · {t('evidence.fields.final')} {row.final}
      </span>
      <span className="text-sm text-slate-500">
        {t('evidence.fields.source')} {t(SOURCE_LABEL_KEY[row.source])}
      </span>
    </li>
  );
}

/** RPM 안전·지름 호환의 여유율, 표기 일치의 환산 차이, 유효기한의 날짜 대조. 없으면 null. */
function differenceText(
  check: CheckItem,
  gap: { rpm: number | null; diameter: number | null } | null,
  t: Translate,
): string | null {
  if (check.rule === RULE.RPM_SAFETY) return formatMargin(gap?.rpm ?? null, t);
  if (check.rule === RULE.DIAMETER_FIT) {
    return formatMargin(gap?.diameter ?? null, t);
  }

  const params = check.detail?.params;
  if (!params) return null;

  if (check.rule === RULE.UNIT_CONSISTENCY) {
    const computed = params.computed;
    const labeled = params.labeled;
    if (
      typeof computed === 'number' &&
      typeof labeled === 'number' &&
      labeled !== 0
    ) {
      const percent =
        Math.round((Math.abs(computed - labeled) / labeled) * 1000) / 10;
      return t('evidence.rules.gapPercent', { percent });
    }
    return null;
  }

  if (check.rule === RULE.EXPIRY) {
    const lastValid = params.lastValid;
    const today = params.today;
    if (typeof lastValid === 'string' && typeof today === 'string') {
      return t('evidence.rules.expiryCompare', { lastValid, today });
    }
  }

  return null;
}

function RuleEvidenceRow({
  check,
  gap,
  t,
  locale,
}: {
  check: CheckItem;
  gap: { rpm: number | null; diameter: number | null } | null;
  t: Translate;
  locale: Locale;
}) {
  const source = EVIDENCE_SOURCE[check.rule];
  const values = checkValueText(check, locale);
  const difference = differenceText(check, gap, t);

  return (
    <li className="flex flex-col gap-1 rounded-lg bg-slate-800 px-4 py-3">
      <span className="text-base font-semibold text-slate-100">
        {ruleLabelText(check.rule, t)}
      </span>
      {(values.grinder || values.wheel) && (
        <span className="text-sm text-slate-300">
          {t('common.grinder')} {values.grinder ?? '—'} / {t('common.wheel')}{' '}
          {values.wheel ?? '—'}
        </span>
      )}
      <span className="text-sm leading-relaxed text-slate-400">
        {checkReasonText(check, locale)}
      </span>
      {source?.formulaKey && (
        <span className="text-sm text-slate-500">
          {t('evidence.rules.formula')} {t(source.formulaKey)}
        </span>
      )}
      {difference && (
        <span className="text-sm text-slate-500">
          {t('evidence.rules.difference')} {difference}
        </span>
      )}
      {source && (
        <span className="text-sm text-slate-500">
          {t('evidence.rules.doc')} {t(source.docKey)}
          <br />
          {t('evidence.rules.limit')} {t(source.limitKey)}
        </span>
      )}
    </li>
  );
}

export interface EvidencePanelProps {
  grinder: GrinderSpec;
  wheel: WheelSpec;
  result: MatchResult;
  /** 사용자가 손대기 전의 OCR 원본. 이 기능 도입 전 기록에는 없다(undefined). */
  grinderOcr?: GrinderSpec;
  wheelOcr?: WheelSpec;
}

export function EvidencePanel({
  grinder,
  wheel,
  result,
  grinderOcr,
  wheelOcr,
}: EvidencePanelProps) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);

  const grinderOcrPresent = grinderOcr !== undefined;
  const wheelOcrPresent = wheelOcr !== undefined;
  const gap = margins(grinder, wheel);

  const grinderRows: FieldRowData[] = [
    {
      key: 'model',
      label: t('field.model'),
      raw: rawCell(grinderOcrPresent, grinderOcr?.model ?? null, t),
      normalized: rawCell(grinderOcrPresent, grinderOcr?.model ?? null, t),
      final: finalCell(grinder.model),
      source: sourceOf(grinderOcrPresent, grinderOcr?.model, grinder.model),
    },
    {
      key: 'noLoadRPM',
      label: t('field.noLoadRPM'),
      raw: rawCell(
        grinderOcrPresent,
        rpmText(grinderOcr?.noLoadRPM ?? null),
        t,
      ),
      normalized: rawCell(
        grinderOcrPresent,
        rpmText(grinderOcr?.noLoadRPM ?? null),
        t,
      ),
      final: finalCell(rpmText(grinder.noLoadRPM)),
      source: sourceOf(
        grinderOcrPresent,
        grinderOcr?.noLoadRPM,
        grinder.noLoadRPM,
      ),
    },
    {
      key: 'maxWheelDiameter',
      label: t('field.maxWheelDiameter'),
      raw: rawCell(
        grinderOcrPresent,
        diameterText(grinderOcr?.maxWheelDiameter ?? null),
        t,
      ),
      normalized: rawCell(
        grinderOcrPresent,
        diameterText(grinderOcr?.maxWheelDiameter ?? null),
        t,
      ),
      final: finalCell(diameterText(grinder.maxWheelDiameter)),
      source: sourceOf(
        grinderOcrPresent,
        grinderOcr?.maxWheelDiameter,
        grinder.maxWheelDiameter,
      ),
    },
  ];

  // 최고사용회전속도만 라벨 표기(rpm 또는 m/s)와 정규화된 rpm이 다를 수 있다.
  const markings = wheelOcr?.markings;
  const rpmRaw =
    markings?.labeledRPM != null
      ? rpmText(markings.labeledRPM)
      : markings?.peripheralSpeedMps != null
        ? mpsText(markings.peripheralSpeedMps)
        : null;

  const wheelRows: FieldRowData[] = [
    {
      key: 'maxRPM',
      label: t('field.maxRPM'),
      raw: rawCell(wheelOcrPresent, rpmRaw, t),
      normalized: rawCell(
        wheelOcrPresent,
        rpmText(wheelOcr?.maxRPM ?? null),
        t,
      ),
      final: finalCell(rpmText(wheel.maxRPM)),
      source: rpmValueSource(wheelOcrPresent, wheel.rpmSource),
    },
    {
      key: 'diameter',
      label: t('field.diameter'),
      raw: rawCell(
        wheelOcrPresent,
        diameterText(wheelOcr?.diameter ?? null),
        t,
      ),
      normalized: rawCell(
        wheelOcrPresent,
        diameterText(wheelOcr?.diameter ?? null),
        t,
      ),
      final: finalCell(diameterText(wheel.diameter)),
      source: sourceOf(wheelOcrPresent, wheelOcr?.diameter, wheel.diameter),
    },
    {
      key: 'thickness',
      label: t('field.thickness'),
      raw: rawCell(
        wheelOcrPresent,
        wheelOcr?.thickness != null ? `${wheelOcr.thickness}mm` : null,
        t,
      ),
      normalized: rawCell(
        wheelOcrPresent,
        wheelOcr?.thickness != null ? `${wheelOcr.thickness}mm` : null,
        t,
      ),
      final: finalCell(wheel.thickness != null ? `${wheel.thickness}mm` : null),
      source: sourceOf(wheelOcrPresent, wheelOcr?.thickness, wheel.thickness),
    },
    {
      key: 'purpose',
      label: t('field.purpose'),
      raw: rawCell(
        wheelOcrPresent,
        wheelOcr
          ? labelOf(WHEEL_PURPOSE_LABEL, wheelOcr.purpose, locale)
          : null,
        t,
      ),
      normalized: rawCell(
        wheelOcrPresent,
        wheelOcr
          ? labelOf(WHEEL_PURPOSE_LABEL, wheelOcr.purpose, locale)
          : null,
        t,
      ),
      final: finalCell(labelOf(WHEEL_PURPOSE_LABEL, wheel.purpose, locale)),
      source: sourceOf(wheelOcrPresent, wheelOcr?.purpose, wheel.purpose),
    },
    {
      key: 'wheelType',
      label: t('field.wheelType'),
      raw: rawCell(
        wheelOcrPresent,
        wheelOcr ? labelOf(WHEEL_TYPE_LABEL, wheelOcr.wheelType, locale) : null,
        t,
      ),
      normalized: rawCell(
        wheelOcrPresent,
        wheelOcr ? labelOf(WHEEL_TYPE_LABEL, wheelOcr.wheelType, locale) : null,
        t,
      ),
      final: finalCell(labelOf(WHEEL_TYPE_LABEL, wheel.wheelType, locale)),
      // 종류는 항상 작업자가 실물을 보고 고른다(confirm.ts) — AI 제안은 초기값일 뿐이다.
      source: sourceOf(wheelOcrPresent, wheelOcr?.wheelType, wheel.wheelType),
    },
    {
      key: 'expiry',
      label: t('field.expiry'),
      raw: rawCell(wheelOcrPresent, markings?.expiryRaw ?? null, t),
      normalized: rawCell(
        wheelOcrPresent,
        wheelOcr?.expiry ? formatExpiry(wheelOcr.expiry) : null,
        t,
      ),
      final: finalCell(wheel.expiry ? formatExpiry(wheel.expiry) : null),
      source: sourceOf(
        wheelOcrPresent,
        wheelOcr?.expiry ? formatExpiry(wheelOcr.expiry) : null,
        wheel.expiry ? formatExpiry(wheel.expiry) : null,
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between rounded-lg border border-slate-600 px-4 py-3 text-left text-base font-semibold text-slate-200 active:bg-slate-800"
      >
        {t(open ? 'evidence.toggleHide' : 'evidence.toggleShow')}
        <span aria-hidden className="text-slate-400">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-4">
          <p className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm leading-relaxed text-slate-400">
            ⚠ {t('evidence.disclaimer')}
          </p>

          <section className="flex flex-col gap-2">
            <h3 className="text-base font-bold text-slate-100">
              {t('evidence.fields.title')}
            </h3>
            <p className="text-sm leading-relaxed text-slate-400">
              {t('evidence.fields.note')}
            </p>
            <ul className="flex flex-col gap-2">
              {grinderRows.map((row) => (
                <FieldRow key={`grinder-${row.key}`} row={row} t={t} />
              ))}
              {wheelRows.map((row) => (
                <FieldRow key={`wheel-${row.key}`} row={row} t={t} />
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-base font-bold text-slate-100">
              {t('evidence.rules.title')}
            </h3>
            <ul className="flex flex-col gap-2">
              {result.checks.map((check) => (
                <RuleEvidenceRow
                  key={check.rule}
                  check={check}
                  gap={gap}
                  t={t}
                  locale={locale}
                />
              ))}
            </ul>
          </section>
        </div>
      )}
    </section>
  );
}
