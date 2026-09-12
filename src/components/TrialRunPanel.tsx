'use client';

// 시험운전 — 산업안전보건기준에 관한 규칙 제122조 ②.
//
// 작업 시작 전 1분 이상, 숫돌 교체 후 3분 이상. 이 앱은 시간을 재고 작업자의
// 답을 남길 뿐이다. 절차를 대신하지도, 시간을 줄여주지도 않는다.
//
// 남은 시간은 절대 종료시각에서 계산한다. 틱을 세면 탭이 백그라운드로
// 내려간 만큼 시간이 짧아진다 — 법이 정한 시간을 앱이 마음대로 줄이는 셈이다.
// 화면 갱신용 타이머가 멈춰도 다시 그릴 때 정확한 남은 시간이 나온다.

import { useEffect, useState } from 'react';

import { useLocale, type MessageKey } from '@/lib/i18n';
import {
  TRIAL_RUN_FINDING_KEYS,
  formatRemaining,
  isTrialRunElapsed,
  remainingSeconds,
  requiredTrialRunSeconds,
  type TrialRunProgress,
} from '@/lib/safety/trialRun';
import type { TrialRunFinding, TrialRunOutcome } from '@/lib/rules/types';

const FINDING_LABEL: Record<TrialRunFinding, MessageKey> = {
  vibration: 'trialRun.finding.vibration',
  noise: 'trialRun.finding.noise',
  wobble: 'trialRun.finding.wobble',
  wheelDamage: 'trialRun.finding.wheelDamage',
  equipment: 'trialRun.finding.equipment',
};

interface TrialRunPanelProps {
  progress: TrialRunProgress | null;
  findings: TrialRunFinding[];
  onStart: (wheelReplaced: boolean) => void;
  onToggleFinding: (finding: TrialRunFinding) => void;
  onResolve: (outcome: TrialRunOutcome) => void;
}

export function TrialRunPanel({
  progress,
  findings,
  onStart,
  onToggleFinding,
  onResolve,
}: TrialRunPanelProps) {
  const { t } = useLocale();

  // 화면 갱신만을 위한 틱. 남은 시간은 여기서 세지 않고 매번 다시 계산한다.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!progress) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, [progress]);

  const now = new Date();
  const left = remainingSeconds(progress, now);
  const elapsed = isTrialRunElapsed(progress, now);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="trial-run-title">
      <div className="flex flex-col gap-2">
        <h2 id="trial-run-title" className="text-xl font-bold text-slate-100">
          {t('trialRun.title')}
        </h2>
        <p className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-300">
          {t('trialRun.legalBasis')}
        </p>
        <p
          role="note"
          className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-base font-semibold leading-relaxed text-yellow-100"
        >
          ⚠ {t('trialRun.standClear')}
        </p>
      </div>

      {!progress ? (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold text-slate-100">
            {t('trialRun.replacedQuestion')}
          </p>
          <button
            type="button"
            onClick={() => onStart(true)}
            className="min-h-14 rounded-lg bg-slate-700 px-4 text-lg font-bold text-white active:bg-slate-600"
          >
            {t('trialRun.startReplaced', {
              seconds: requiredTrialRunSeconds(true),
            })}
          </button>
          <button
            type="button"
            onClick={() => onStart(false)}
            className="min-h-14 rounded-lg border border-slate-600 px-4 text-lg font-semibold text-slate-200 active:bg-slate-800"
          >
            {t('trialRun.startBeforeWork', {
              seconds: requiredTrialRunSeconds(false),
            })}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-800 px-4 py-6">
            <span className="text-base text-slate-400">
              {progress.wheelReplaced
                ? t('trialRun.modeReplaced')
                : t('trialRun.modeBeforeWork')}
            </span>
            <span
              aria-live="polite"
              className={`text-5xl font-black tabular-nums ${
                elapsed ? 'text-green-300' : 'text-slate-100'
              }`}
            >
              {formatRemaining(left)}
            </span>
            <span className="text-base text-slate-400">
              {elapsed
                ? t('trialRun.elapsed')
                : t('trialRun.running', { seconds: progress.requiredSeconds })}
            </span>
          </div>

          <fieldset className="rounded-xl bg-slate-800 px-4 py-4">
            <legend className="sr-only">{t('trialRun.findingsTitle')}</legend>
            <p className="text-lg font-semibold text-slate-100">
              {t('trialRun.findingsTitle')}
            </p>
            <p className="mt-1 text-base leading-relaxed text-slate-400">
              {t('trialRun.findingsHint')}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {TRIAL_RUN_FINDING_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex min-h-12 items-center gap-3 rounded-lg bg-slate-900 px-3"
                >
                  <input
                    type="checkbox"
                    checked={findings.includes(key)}
                    disabled={!elapsed}
                    onChange={() => onToggleFinding(key)}
                    className="h-6 w-6 accent-red-500"
                  />
                  <span className="text-base text-slate-200">
                    {t(FINDING_LABEL[key])}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              // 타이머가 남았거나 이상 항목이 골라져 있으면 "이상 없음"을 누를 수 없다.
              disabled={!elapsed || findings.length > 0}
              onClick={() => onResolve('normal')}
              className="min-h-14 rounded-lg bg-green-500 text-lg font-bold text-slate-950 active:bg-green-400 disabled:bg-slate-700 disabled:text-slate-400"
            >
              {t('trialRun.confirmNormal')}
            </button>
            <button
              type="button"
              disabled={!elapsed}
              onClick={() => onResolve('abnormal')}
              className="min-h-14 rounded-lg border-2 border-red-500 text-lg font-bold text-red-200 active:bg-red-500/20 disabled:border-slate-600 disabled:text-slate-400"
            >
              {t('trialRun.reportAbnormal')}
            </button>
            {!elapsed && (
              <p className="text-base text-slate-400">
                {t('trialRun.waitNotice')}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** 이상이 확인됐을 때의 작업 중지 안내. 결과 화면이 직접 띄운다. */
export function TrialRunStopNotice() {
  const { t } = useLocale();
  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-red-500 bg-red-500/15 px-4 py-5"
    >
      <h3 className="text-xl font-black text-red-100">
        {t('trialRun.stopTitle')}
      </h3>
      <p className="mt-2 text-base leading-relaxed text-red-100">
        {t('trialRun.stopBody')}
      </p>
    </div>
  );
}
