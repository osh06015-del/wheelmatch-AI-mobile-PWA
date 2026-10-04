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
import { BuildInfo } from '@/components/BuildInfo';
import { Disclaimer } from '@/components/Disclaimer';
import { EvidencePanel } from '@/components/EvidencePanel';
import { HazardList } from '@/components/HazardList';
import { LanguagePicker } from '@/components/LanguagePicker';
import { NotVerifiablePanel } from '@/components/NotVerifiablePanel';
import { OfflineReanalysisPanel } from '@/components/OfflineReanalysisPanel';
import { ProfileConditionsPanel } from '@/components/ProfileConditionsPanel';
import { ReanalysisNote } from '@/components/ReanalysisNote';
import { ResultCard } from '@/components/ResultCard';
import { RuleVersionNote } from '@/components/RuleVersionNote';
import { TrialRunPanel, TrialRunStopNotice } from '@/components/TrialRunPanel';
import { useLocale } from '@/lib/i18n';
import { isQuotaExceededError, saveInspection } from '@/lib/db';
import { draftStore } from '@/lib/draft/draftStore';
import { elapsedSince, preTrialElapsed } from '@/lib/record/elapsed';
import { RULE, matchSpecs, toDateOnly } from '@/lib/rules/engine';
import {
  conditionItemsFor,
  profileConditions,
  profileFor,
  profileRef,
} from '@/lib/rules/profiles';
import { RULESET_VERSION } from '@/lib/rules/version';
import { isGrinderConditionComplete } from '@/lib/safety/grinderCondition';
import { canSaveInspection } from '@/lib/safety/saveGuard';
import {
  canStartTrialRun,
  completeTrialRun,
  isTrialRunStopped,
  startTrialRun,
} from '@/lib/safety/trialRun';
import { isWheelConditionComplete } from '@/lib/safety/wheelCondition';
import {
  limitCausesOf,
  useInspection,
  type ReanalysisInput,
} from '@/lib/state/inspection';
import type {
  SafetyChecklist,
  TrialRunFinding,
  TrialRunOutcome,
} from '@/lib/rules/types';

/**
 * 저장 오류의 이름. Dexie는 브라우저 오류를 감싸므로(inner) 둘 다 본다.
 * 값을 지어내지 않는다 — 이름이 없으면 null이다.
 */
function errorCode(error: unknown): string | null {
  const nameOf = (value: unknown): string | null => {
    if (typeof value !== 'object' || value === null) return null;
    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' && name ? name : null;
  };
  const outer = nameOf(error);
  const inner = nameOf((error as { inner?: unknown } | null)?.inner);
  const names = [outer, inner].filter(
    (name, index, all): name is string =>
      name !== null && all.indexOf(name) === index,
  );
  return names.length > 0 ? names.join(' / ') : null;
}

export default function ResultPage() {
  const router = useRouter();
  const { t } = useLocale();
  const {
    declaredPurpose,
    startedAt,
    workConditions,
    grinder,
    wheel,
    grinderOcr,
    wheelOcr,
    grinderCaptureMetrics,
    wheelCaptureMetrics,
    grinderOcrTelemetry,
    wheelOcrTelemetry,
    grinderCondition,
    wheelCondition,
    setWheelCondition,
    trialRun,
    setTrialRun,
    grinderImage,
    wheelImage,
    captureChecks,
    analysisMode,
    offlineSlots,
    reanalyses,
    recordReanalysis,
    recordDamageRecheck,
    applyReanalysis,
    checklist: storedChecklist,
    setChecklist: storeChecklist,
    trialRunRecord,
    setTrialRunRecord,
    hydrating,
    reset,
  } = useInspection();
  // 체크리스트와 마친 시험운전은 저장소에 둔다 — 진행 중 점검 복구(draft)가
  // "이어하기"를 고른 경우 되살릴 수 있게 하기 위해서다.
  const checklist: SafetyChecklist = storedChecklist ?? EMPTY_CHECKLIST;
  const setChecklist = (
    update: (current: SafetyChecklist) => SafetyChecklist,
  ) => storeChecklist(update(checklist));

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 저장 공간이 모자랐는가. 사진을 뺀 저장을 제안할지 정한다 — 제안일 뿐이고
  // 사진을 앱이 알아서 지우지는 않는다.
  const [quotaHit, setQuotaHit] = useState(false);
  // 실패한 오류의 이름. 현장 폰에서만 나는 저장 실패를 원인별로 가려내려면
  // 작업자가 화면의 코드를 그대로 전할 수 있어야 한다.
  const [saveErrorCode, setSaveErrorCode] = useState<string | null>(null);
  const [findings, setFindings] = useState<TrialRunFinding[]>([]);
  // 방금 이 화면에서 작업자가 숫돌 손상을 「문제 있음」으로 답했는가(재분석 뒤 다시
  // 물은 항목). 답은 저장소의 숫돌 상태에 남기고, 이 표시는 정지 안내를 한 번
  // 보여주는 데만 쓴다 — 새로고침하면 사라지고 아래 가드가 평소대로 되돌린다.
  const [damageReported, setDamageReported] = useState(false);

  // 규격과 작업자 직접 상태 확인이 모두 없으면 대조 결과를 보여주지 않는다.
  //
  // 저장 직후에는 이 가드를 건너뛴다. 저장하면서 값을 비우는데,
  // 그 때문에 이력 화면으로 가기도 전에 메인으로 튕겨 나가면 안 된다.
  useEffect(() => {
    if (saved) return;
    if (hydrating) return;
    // 작업을 고르지 않은 점검은 결과를 보여주지 않고 작업 선택으로 되돌린다.
    // 엔진도 판정불가로 막지만(workPurpose.notDeclared), 화면에서 먼저 막는다.
    if (declaredPurpose === null || !grinder) router.replace('/');
    else if (!isGrinderConditionComplete(grinderCondition)) {
      // 장비 상태를 확인하지 않았으면 숫돌이 아니라 1단계로 되돌린다.
      router.replace('/scan/grinder');
    } else if (
      !wheel ||
      !isWheelConditionComplete(
        wheelCondition,
        conditionItemsFor(wheel.wheelType),
      )
    ) {
      // 방금 이 화면에서 손상을 신고했다면 곧바로 촬영 화면으로 보내지 않는다.
      // 그러면 "이 숫돌을 사용하지 마십시오"를 한 번도 보지 못한 채 카메라가 뜬다.
      // 정지 안내를 먼저 보이고(아래), 작업자가 눌러서 숫돌 확인으로 간다.
      if (damageReported) return;
      router.replace('/scan/wheel');
    }
  }, [
    saved,
    hydrating,
    declaredPurpose,
    grinder,
    wheel,
    grinderCondition,
    wheelCondition,
    damageReported,
    router,
  ]);

  // 유효기한 만료 판정의 기준일. 엔진은 시계를 읽지 않으므로 여기서 넣는다.
  // 로컬 날짜를 쓴다 — UTC로 바꾸면 오전 9시 이전에 하루가 어긋난다.
  // 이 화면이 열려 있는 동안 기준일이 바뀌지 않도록 한 번만 계산한다.
  const today = useMemo(() => toDateOnly(new Date()), []);

  const result = useMemo(
    () =>
      grinder && wheel
        ? matchSpecs(grinder, wheel, {
            // 종류에 맞는 Profile을 찾아 넘긴다. 없으면 null — 엔진이
            // 판정불가로 막는다. 조건 표도 같은 Profile로 계산한다.
            profile: profileFor(wheel.wheelType),
            declaredPurpose,
            today,
            // 제한 대조로 확정한 단계가 있으면 적합을 내지 않는다.
            analysisMode,
          })
        : null,
    [grinder, wheel, declaredPurpose, today, analysisMode],
  );

  // 재분석 뒤 다시 물은 손상 항목에 「문제 있음」으로 답한 직후. 대조 결과도 저장
  // 버튼도 보이지 않는다 — 숫돌 상태에 문제가 있으면 규격이 맞아도 진행하지 못한다.
  // 숫돌 확인 화면의 Gate가 같은 답에 보이는 것과 같은 정지 안내를 보인다.
  if (damageReported) {
    return (
      <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-6">
        <div
          role="alert"
          className="rounded-xl border-2 border-red-500 bg-red-500/15 px-4 py-5"
        >
          <h1 className="text-xl font-black text-red-100">
            {t('wheelCondition.stopTitle')}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-red-100">
            {t('wheelCondition.stopBody')}
          </p>
        </div>
        <Link
          href="/scan/wheel"
          className="flex min-h-14 items-center justify-center rounded-lg bg-yellow-500 text-lg font-bold text-slate-950 active:bg-yellow-400"
        >
          {t('result.retakeWheel')}
        </Link>
        <Link
          href="/"
          className="flex min-h-14 items-center justify-center rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
        >
          {t('common.home')}
        </Link>
      </main>
    );
  }

  if (
    declaredPurpose === null ||
    !grinder ||
    !wheel ||
    !result ||
    !isGrinderConditionComplete(grinderCondition) ||
    !isWheelConditionComplete(
      wheelCondition,
      conditionItemsFor(wheel.wheelType),
    )
  ) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-lg text-slate-400">{t('result.loading')}</p>
      </main>
    );
  }

  const failures = result.checks.filter((check) => check.passed === false);
  // 덮개 조건이 판정불가의 원인이면 일반 안내 대신 원인별 문장과, 상태를
  // 자동으로 고치지 않는 이동 버튼(명판 확인 화면 재입력)만 보인다.
  const guardCode = result.checks.find((check) => check.rule === RULE.GUARD)
    ?.detail?.code;
  const guardBlocking =
    guardCode === 'guard.missing' || guardCode === 'guard.smallerThanWheel'
      ? guardCode
      : null;
  // 판정 범위가 제한적이라 판정불가인가(profiles.ts의 scope='limited').
  // 덮개처럼 구체적인 원인이 없을 때만 이 문장으로 이유를 알린다 — 둘 다
  // 있으면 덮개 문장이 더 구체적이라 그것을 먼저 보인다.
  const scopeLimited = result.checks.some(
    (check) => check.detail?.code === 'profileScope.limited',
  );
  // 제한 대조라 판정불가인가. 부속품 범위보다 먼저 알린다 — 작업자가 직접 풀 수
  // 있는(서버 재분석·다시 촬영) 원인이기 때문이다.
  const offlineLimited = analysisMode === 'offline_limited';
  // 부속품 Profile과 입력을 맞춰 본다. 판정(result)과 따로다 — 여기 결과는
  // verdict를 바꾸지 않는다. Profile이 없는 종류는 조건표가 없다고만 알린다.
  const profile = profileFor(wheel.wheelType);
  const conditions = profile
    ? profileConditions(profile, workConditions ?? undefined, grinder, wheel)
    : null;
  const complete = isChecklistComplete(checklist);
  const conditionKeys = conditionItemsFor(wheel.wheelType);
  // 시험운전 근거(제122조 ②)가 확인된 종류에만 시험운전을 열고 요구한다.
  // Profile이 없는 종류는 어차피 판정불가라 열리지 않는다.
  // 제한 대조에서는 판정이 적합이 될 수 없지만, 시험운전 진입도 따로 막는다 —
  // 규칙이 바뀌어도 이 경로로 시험운전이 열리지 않게 한다.
  const trialRunPolicyVerified =
    profile?.trialRunPolicy === 'kr_osh_122' && !offlineLimited;

  // 시험운전은 규격이 맞는 조합에서만, 그리고 체크리스트까지 끝난 뒤에만 연다.
  // 부적합·판정불가 조합의 시험운전을 앱이 유도하면 그 자체가 사고 경로다.
  const trialRunAllowed = canStartTrialRun({
    verdict: result.verdict,
    grinderConditionComplete: isGrinderConditionComplete(grinderCondition),
    wheelConditionComplete: isWheelConditionComplete(
      wheelCondition,
      conditionKeys,
    ),
    checklistComplete: complete,
    policyVerified: trialRunPolicyVerified,
  });
  const stopped = isTrialRunStopped(trialRunRecord);
  // 시험운전을 해야 하는 조합이면 작업자가 답하기 전에는 저장할 수 없다.
  const trialRunSettled =
    !trialRunPolicyVerified ||
    result.verdict !== 'COMPATIBLE' ||
    trialRunRecord !== null;
  // 버튼 활성화와 저장 함수 내부 재검사가 같은 함수(canSaveInspection)를 쓴다.
  // 따로 계산하면 한쪽만 고쳤을 때 조용히 어긋날 수 있다.
  const canSave =
    canSaveInspection({
      grinderConditionComplete: isGrinderConditionComplete(grinderCondition),
      wheelConditionComplete: isWheelConditionComplete(
        wheelCondition,
        conditionKeys,
      ),
      checklistComplete: complete,
      verdict: result.verdict,
      trialRunRecord,
      trialRunPolicyVerified,
    }) && !saving;

  function resolveTrialRun(outcome: TrialRunOutcome) {
    const record = completeTrialRun(trialRun, new Date(), outcome, findings);
    // 시간 미충족의 정상 완료나 모순된 답은 막고, 이상 보고는 즉시 받는다.
    if (!record) return;
    setTrialRunRecord(record);
    setTrialRun(null);
  }

  /**
   * 재분석이 손상을 의심해 다시 물은 항목에 작업자가 「문제 있음」으로 답했다.
   *
   * 답을 숫돌 상태에 그대로 남긴다(다른 항목의 답은 건드리지 않는다). 그 순간부터
   * 이 점검은 결과 화면에 들어올 수 없다 — 새로고침하거나 주소로 다시 와도 맨 위의
   * 가드가 숫돌 확인으로 돌려보낸다. 이 화면에서는 정지 안내를 먼저 보인다.
   *
   * 숫돌 확인으로 돌아가면 그 화면의 규칙대로 처음부터 다시 한다. 새 사진은 새
   * 숫돌일 수 있어, 이 답과 이 사진의 의심은 다음 사진으로 이어지지 않는다.
   */
  function reportWheelDamage() {
    if (!wheelCondition) return;
    setDamageReported(true);
    setWheelCondition({ ...wheelCondition, damageFree: false });
  }

  /**
   * 재분석이 손상을 의심해 다시 물은 항목에 작업자가 답했다.
   *
   * 답은 어느 쪽이든 그 재분석 판독의 기록에 남긴다. 숫돌 상태 확인의 답은 AI 경고를
   * 보기 전의 것이라, 「확인함」을 따로 남기지 않으면 다시 물었다는 사실이 기록에서
   * 보이지 않는다 — 나중에 이 재확인이 빠지거나 조건이 느슨해져도 기록으로 알 수 없다.
   * 「문제 있음」은 거기에 더해 숫돌 상태에도 남기고 결과 화면을 닫는다.
   */
  function answerDamageRecheck(input: ReanalysisInput, damageFree: boolean) {
    recordDamageRecheck(input, damageFree);
    if (!damageFree) reportWheelDamage();
  }

  /**
   * 기록을 저장한다.
   *
   * @param withPhotos 사진을 함께 저장할지. 저장 공간이 모자라 실패했을 때
   *   작업자가 "사진을 빼고 결과만 저장"을 고르면 false로 다시 부른다. 앱이
   *   알아서 사진을 버리지 않는다 — 사진은 나중에 "그때 그 숫돌이 뭐였지"를
   *   되짚는 유일한 증빙이라, 없애는 판단을 사람이 해야 한다.
   */
  async function save(withPhotos = true) {
    if (
      !grinder ||
      !wheel ||
      !result ||
      !isGrinderConditionComplete(grinderCondition) ||
      !isWheelConditionComplete(wheelCondition, conditionKeys)
    ) {
      return;
    }
    // 버튼이 disabled로 막아도, 저장 함수 자체가 체크리스트·시험운전을 한 번 더
    // 확인한다 — canSave와 같은 함수(canSaveInspection)를 쓴다. 버튼의 disabled
    // 계산과 이 확인이 어긋나면(코드 변경으로 한쪽만 고쳐지는 경우 등) 조건
    // 미충족 기록이 그대로 저장될 수 있다. saveInspection은 이 확인을 통과했을
    // 때만 부른다. 두 Condition은 위에서 이미 좁혀졌으므로 true를 넘긴다.
    if (
      !canSaveInspection({
        grinderConditionComplete: true,
        wheelConditionComplete: true,
        checklistComplete: isChecklistComplete(checklist),
        verdict: result.verdict,
        trialRunRecord,
        trialRunPolicyVerified,
      })
    ) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    setQuotaHit(false);
    setSaveErrorCode(null);
    try {
      // 두 시간이 같은 끝 시각을 쓰게 한다. 따로 읽으면 몇 ms씩 어긋난다.
      const savedAt = Date.now();
      const limitCauses = limitCausesOf(offlineSlots);
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
        // 고르지 않았으면 남기지 않는다. 구기록과 같은 모양이 된다.
        workConditions: workConditions ?? undefined,
        accessoryProfile: profileRef(wheel.wheelType) ?? undefined,
        profileConditions: conditions ?? undefined,
        // 저장 버튼을 누른 순간이 전체 흐름의 끝이다. 법정 시험운전이 들어 있다.
        elapsedMs: elapsedSince(startedAt, savedAt) ?? undefined,
        // 「30초 사전점검」 목표는 이 값으로 잰다. 시험운전을 했으면 시작 직전에서,
        // 열리지 않았으면(부적합·판정불가) 저장 순간에서 끝난다.
        preTrialElapsedMs:
          preTrialElapsed(
            startedAt,
            trialRunRecord?.startedAt ?? null,
            savedAt,
          ) ?? undefined,
        grinderOcr: grinderOcr ?? undefined,
        wheelOcr: wheelOcr ?? undefined,
        grinderCaptureMetrics: grinderCaptureMetrics ?? undefined,
        wheelCaptureMetrics: wheelCaptureMetrics ?? undefined,
        grinderOcrTelemetry: grinderOcrTelemetry ?? undefined,
        wheelOcrTelemetry: wheelOcrTelemetry ?? undefined,
        // 결과 화면에서 받은 서버 재분석 판독. 받아들이지 않은 것도 그대로 남긴다.
        // 재분석을 하지 않았으면 빈 목록이다 — 빼지 않는다. 빈 목록은 「하지
        // 않았다」, 칸 없음은 「알 수 없다」(이 값을 남기지 않던 버전에서 시작한
        // 점검)라서, 모르는 경우에만 칸을 남기지 않는다.
        reanalyses: reanalyses ?? undefined,
        // 사진 상태 경고와 재촬영 여부. 사진을 빼고 저장해도 이 기록은 남긴다 —
        // 사진이 아니라 촬영 과정에 대한 측정값이다. 한 번도 찍지 않은 자리는
        // 없는 채로 둔다.
        captureChecks:
          Object.keys(captureChecks).length > 0 ? captureChecks : undefined,
        grinderImage: (withPhotos ? grinderImage : null) ?? undefined,
        wheelImage: (withPhotos ? wheelImage : null) ?? undefined,
        ruleVersion: RULESET_VERSION,
        analysisMode,
        // 제한된 단계와 그 까닭. 제한 대조가 아니면 남기지 않는다 — 빈 객체로도
        // 두지 않아, 온라인 기록의 모양이 이 값을 적기 전과 같다.
        ...(Object.keys(limitCauses).length > 0
          ? { analysisLimitCauses: limitCauses }
          : {}),
        createdAt: new Date().toISOString(),
      });
      setSaved(true);
      reset();
      // 최종 기록이 저장된 뒤에만 진행 중 점검을 지운다. 지우기에 실패해도 기록은
      // 이미 저장됐다 — 다음에 열 때 이어하기·삭제를 다시 묻게 된다.
      void draftStore.remove();
      router.push('/history');
    } catch (error) {
      // 저장 공간이 가득 찬 경우는 원인이 다르고 조치도 다르다 — "다시
      // 시도하라"가 아니라 공간을 비우라고 안내해야 한다. 어느 쪽이든
      // 기록이 저장되지 않았다는 것은 명확히 알린다.
      const quota = isQuotaExceededError(error);
      setSaveError(quota ? t('result.saveErrorQuota') : t('result.saveError'));
      setSaveErrorCode(errorCode(error));
      // 사진 없이 저장하고도 공간이 모자랐다면 사진을 빼는 제안은 소용이 없다.
      setQuotaHit(quota && withPhotos);
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

      <EvidencePanel
        grinder={grinder}
        wheel={wheel}
        result={result}
        grinderOcr={grinderOcr ?? undefined}
        wheelOcr={wheelOcr ?? undefined}
        reanalyses={reanalyses ?? undefined}
      />

      {offlineLimited && (
        <OfflineReanalysisPanel
          grinder={grinder}
          wheel={wheel}
          offlineSlots={offlineSlots}
          grinderImage={grinderImage}
          wheelImage={wheelImage}
          reanalyses={reanalyses}
          onAnalyzed={recordReanalysis}
          onAccept={applyReanalysis}
          onDamageRecheck={answerDamageRecheck}
        />
      )}

      {/* 재분석으로 온라인 대조가 된 점검. 위 패널은 사라졌지만, 이 결과가 재분석으로
          온라인이 됐다는 것과 그때 다시 받은 답은 남긴다. 제한 대조인 동안에는 위
          패널이 같은 기록을 보인다(값을 견주는 중에는 숨긴다). */}
      {!offlineLimited && (
        <ReanalysisNote reanalyses={reanalyses} heading="h2" />
      )}

      <ProfileConditionsPanel
        profile={profileRef(wheel.wheelType)}
        conditions={conditions}
      />

      <ActionGuide failures={failures} />

      {result.verdict === 'UNDETERMINED' && (
        <div className="flex flex-col gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-4">
          <p className="text-lg leading-relaxed text-yellow-100">
            {guardBlocking === 'guard.missing'
              ? t('result.undetermined.guardMissing')
              : guardBlocking === 'guard.smallerThanWheel'
                ? t('result.undetermined.guardSize')
                : offlineLimited
                  ? t('result.undetermined.offlineLimited')
                  : scopeLimited
                    ? t('result.undetermined.limitedScope')
                    : t('result.undetermined.help')}
          </p>
          <div className="flex flex-col gap-3">
            {guardBlocking ? (
              // 명판 확인 화면으로 보내 작업자가 직접 덮개 입력을 다시 고르게
              // 한다. 여기서 값을 대신 고치거나 지우지 않는다.
              <Link
                href="/scan/grinder"
                className="flex min-h-14 items-center justify-center rounded-lg bg-yellow-500 text-lg font-bold text-slate-950 active:bg-yellow-400"
              >
                {t('result.recheckGuard')}
              </Link>
            ) : (
              <>
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
              </>
            )}
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

      {/* 규격이 맞아도 시험운전 근거가 없는 종류는 앱이 시간·문구를 지어내지
          않는다. 대신 무엇을 따라야 하는지 알린다. */}
      {result.verdict === 'COMPATIBLE' && !trialRunPolicyVerified && (
        <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-4 text-base leading-relaxed text-yellow-100">
          {t('trialRun.noPolicy')}
        </p>
      )}

      <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-4 text-base leading-relaxed text-yellow-100">
        ⚠ {t(PRE_WORK_REMINDER_KEY)}
      </p>

      {saveError && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-4">
          <p className="text-base leading-relaxed text-red-200">{saveError}</p>
          {saveErrorCode && (
            <p className="text-sm text-red-300">
              {t('result.saveErrorCode', { code: saveErrorCode })}
            </p>
          )}
          {/* 공간이 모자랄 때만 나온다. 고르는 것은 작업자다 — 사진을 앱이
              알아서 지우거나 조용히 빼고 저장하지 않는다. */}
          {quotaHit && (
            <>
              <p className="text-base leading-relaxed text-red-200">
                {t('result.saveWithoutPhotosHint')}
              </p>
              <button
                type="button"
                onClick={() => void save(false)}
                disabled={saving}
                className="min-h-14 rounded-lg border border-red-400 text-lg font-semibold text-red-100 active:bg-red-500/20 disabled:text-red-300/50"
              >
                {t('result.saveWithoutPhotos')}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void save(true)}
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
      <BuildInfo />
    </main>
  );
}
