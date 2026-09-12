'use client';

// 규격 대조 결과 + 안전 체크리스트 + 저장.
//
// 판정은 여기서 계산하지 않는다. matchSpecs()가 낸 결과를 그대로 보여줄 뿐이다.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ActionGuide } from '@/components/ActionGuide';
import {
  CHECKLIST_ITEMS,
  ChecklistForm,
  EMPTY_CHECKLIST,
  PRE_WORK_REMINDER_KEY,
  isChecklistComplete,
} from '@/components/ChecklistForm';
import { Disclaimer } from '@/components/Disclaimer';
import { HazardList } from '@/components/HazardList';
import { LanguagePicker } from '@/components/LanguagePicker';
import { NotVerifiablePanel } from '@/components/NotVerifiablePanel';
import { ResultCard } from '@/components/ResultCard';
import { RuleVersionNote } from '@/components/RuleVersionNote';
import { TrialRunPanel, TrialRunStopNotice } from '@/components/TrialRunPanel';
import { useLocale } from '@/lib/i18n';
import { saveInspection } from '@/lib/db';
import { elapsedSince } from '@/lib/record/elapsed';
import { matchSpecs, toDateOnly } from '@/lib/rules/engine';
import { RULESET_VERSION } from '@/lib/rules/version';
import { isGrinderConditionComplete } from '@/lib/safety/grinderCondition';
import {
  canStartTrialRun,
  completeTrialRun,
  isTrialRunStopped,
  startTrialRun,
} from '@/lib/safety/trialRun';
import { isWheelConditionComplete } from '@/lib/safety/wheelCondition';
import { useInspection } from '@/lib/state/inspection';
import type {
  SafetyChecklist,
  TrialRun,
  TrialRunFinding,
  TrialRunOutcome,
} from '@/lib/rules/types';

export default function ResultPage() {
  const router = useRouter();
  const { t } = useLocale();
  const {
    declaredPurpose,
    startedAt,
    grinder,
    wheel,
    grinderOcr,
    wheelOcr,
    grinderCondition,
    wheelCondition,
    trialRun,
    setTrialRun,
    grinderImage,
    wheelImage,
    hydrating,
    reset,
  } = useInspection();

  const [checklist, setChecklist] = useState<SafetyChecklist>(EMPTY_CHECKLIST);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [findings, setFindings] = useState<TrialRunFinding[]>([]);
  const [trialRunRecord, setTrialRunRecord] = useState<TrialRun | null>(null);

  // 규격과 작업자 직접 상태 확인이 모두 없으면 대조 결과를 보여주지 않는다.
  //
  // 저장 직후에는 이 가드를 건너뛴다. 저장하면서 값을 비우는데,
  // 그 때문에 이력 화면으로 가기도 전에 메인으로 튕겨 나가면 안 된다.
  useEffect(() => {
    if (saved) return;
    if (hydrating) return;
    if (!grinder) router.replace('/');
    else if (!isGrinderConditionComplete(grinderCondition)) {
      // 장비 상태를 확인하지 않았으면 숫돌이 아니라 1단계로 되돌린다.
      router.replace('/scan/grinder');
    } else if (!wheel || !isWheelConditionComplete(wheelCondition)) {
      router.replace('/scan/wheel');
    }
  }, [
    saved,
    hydrating,
    grinder,
    wheel,
    grinderCondition,
    wheelCondition,
    router,
  ]);

  // 유효기한 만료 판정의 기준일. 엔진은 시계를 읽지 않으므로 여기서 넣는다.
  // 로컬 날짜를 쓴다 — UTC로 바꾸면 오전 9시 이전에 하루가 어긋난다.
  // 이 화면이 열려 있는 동안 기준일이 바뀌지 않도록 한 번만 계산한다.
  const today = useMemo(() => toDateOnly(new Date()), []);

  const result = useMemo(
    () =>
      grinder && wheel
        ? matchSpecs(grinder, wheel, { declaredPurpose, today })
        : null,
    [grinder, wheel, declaredPurpose, today],
  );

  if (
    !grinder ||
    !wheel ||
    !result ||
    !isGrinderConditionComplete(grinderCondition) ||
    !isWheelConditionComplete(wheelCondition)
  ) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-lg text-slate-400">{t('result.loading')}</p>
      </main>
    );
  }

  const failures = result.checks.filter((check) => check.passed === false);
  const complete = isChecklistComplete(checklist);

  // 시험운전은 규격이 맞는 조합에서만, 그리고 체크리스트까지 끝난 뒤에만 연다.
  // 부적합·판정불가 조합의 시험운전을 앱이 유도하면 그 자체가 사고 경로다.
  const trialRunAllowed = canStartTrialRun({
    verdict: result.verdict,
    grinderConditionComplete: isGrinderConditionComplete(grinderCondition),
    wheelConditionComplete: isWheelConditionComplete(wheelCondition),
    checklistComplete: complete,
  });
  const stopped = isTrialRunStopped(trialRunRecord);
  // 시험운전을 해야 하는 조합이면 작업자가 답하기 전에는 저장할 수 없다.
  const trialRunSettled =
    result.verdict !== 'COMPATIBLE' || trialRunRecord !== null;
  const canSave = complete && trialRunSettled && !saving;

  function resolveTrialRun(outcome: TrialRunOutcome) {
    const record = completeTrialRun(trialRun, new Date(), outcome, findings);
    // 시간이 남았거나 답이 서로 어긋나면 null이다. 화면 버튼과 별개로 여기서도 막는다.
    if (!record) return;
    setTrialRunRecord(record);
    setTrialRun(null);
  }

  async function save() {
    if (
      !grinder ||
      !wheel ||
      !result ||
      !isGrinderConditionComplete(grinderCondition) ||
      !isWheelConditionComplete(wheelCondition)
    ) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveInspection({
        grinder,
        wheel,
        grinderCondition,
        wheelCondition,
        // 하지 않은 절차를 한 것처럼 남기지 않는다. 없으면 없는 채로 둔다.
        trialRun: trialRunRecord ?? undefined,
        result,
        checklist,
        declaredPurpose,
        // 저장 버튼을 누른 순간이 점검의 끝이다.
        elapsedMs: elapsedSince(startedAt) ?? undefined,
        grinderOcr: grinderOcr ?? undefined,
        wheelOcr: wheelOcr ?? undefined,
        grinderImage: grinderImage ?? undefined,
        wheelImage: wheelImage ?? undefined,
        ruleVersion: RULESET_VERSION,
        createdAt: new Date().toISOString(),
      });
      setSaved(true);
      reset();
      router.push('/history');
    } catch {
      setSaveError(t('result.saveError'));
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label={t('common.home')}
          className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl text-slate-300 active:bg-slate-800"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-slate-100">
          {t('result.title')}
        </h1>
      </header>

      <ResultCard result={result} grinder={grinder} wheel={wheel} />

      <ActionGuide failures={failures} />

      {result.verdict === 'UNDETERMINED' && (
        <div className="flex flex-col gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-4">
          <p className="text-lg leading-relaxed text-yellow-100">
            {t('result.undetermined.help')}
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/scan/grinder"
              className="flex min-h-14 items-center justify-center rounded-lg bg-yellow-500 text-lg font-bold text-slate-950 active:bg-yellow-400"
            >
              {t('result.retakeGrinder')}
            </Link>
            <Link
              href="/scan/wheel"
              className="flex min-h-14 items-center justify-center rounded-lg border border-yellow-500/60 text-lg font-semibold text-yellow-100 active:bg-yellow-500/20"
            >
              {t('result.retakeWheel')}
            </Link>
          </div>
        </div>
      )}

      <RuleVersionNote />

      <NotVerifiablePanel />

      <HazardList purpose={declaredPurpose} />

      <ChecklistForm
        checklist={checklist}
        onToggle={(key, checked) =>
          setChecklist((current) => ({ ...current, [key]: checked }))
        }
      />

      {trialRunAllowed && !trialRunRecord && (
        <TrialRunPanel
          progress={trialRun}
          findings={findings}
          onStart={(wheelReplaced) =>
            setTrialRun(startTrialRun(wheelReplaced, new Date()))
          }
          onToggleFinding={(finding) =>
            setFindings((current) =>
              current.includes(finding)
                ? current.filter((item) => item !== finding)
                : [...current, finding],
            )
          }
          onResolve={resolveTrialRun}
        />
      )}

      {stopped && <TrialRunStopNotice />}

      <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-4 text-base leading-relaxed text-yellow-100">
        ⚠ {t(PRE_WORK_REMINDER_KEY)}
      </p>

      {saveError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-4 text-base leading-relaxed text-red-200">
          {saveError}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave}
          className="min-h-14 rounded-lg bg-green-500 text-lg font-bold text-slate-950 active:bg-green-400 disabled:bg-slate-700 disabled:text-slate-400"
        >
          {saving
            ? t('result.saving')
            : stopped
              ? t('result.saveStopped')
              : t('result.save')}
        </button>
        {!complete && (
          <p className="text-base text-slate-400">
            {t('checklist.incomplete', { count: CHECKLIST_ITEMS.length })}
          </p>
        )}
        {complete && !trialRunSettled && (
          <p className="text-base text-slate-400">{t('trialRun.required')}</p>
        )}
        <Link
          href="/"
          className="flex min-h-14 items-center justify-center rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
        >
          {t('common.home')}
        </Link>
      </div>

      <LanguagePicker />

      <Disclaimer />
    </main>
  );
}
