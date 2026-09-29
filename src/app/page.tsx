'use client';

// 메인 화면 — 오늘 할 작업을 고르는 것으로 점검이 시작된다.
//
// "시작" 버튼을 따로 두지 않는다. 작업을 고르는 행위가 곧 시작이다.
// 현장에서는 화면을 한 번이라도 덜 넘기는 쪽이 낫다.
//
// 작업을 먼저 선언받는 이유: 숫돌 라벨의 용도(절단/연삭)와 대조하기 위해서다.
// 연삭 작업에 절단날을 쓰면 측면 하중으로 숫돌이 깨진다. 규칙엔진이 이를 잡는다.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { BuildInfo } from '@/components/BuildInfo';
import { AppQrShare } from '@/components/AppQrShare';
import { Disclaimer } from '@/components/Disclaimer';
import { LanguagePicker } from '@/components/LanguagePicker';
import { WorkConditionsPicker } from '@/components/WorkConditionsPicker';
import { formDraftStore } from '@/lib/draft/draftStore';
import { useLocale, type MessageKey } from '@/lib/i18n';
import { useInspection } from '@/lib/state/inspection';
import { UNKNOWN_WORK_CONDITIONS } from '@/lib/rules/profiles';
import type { WorkConditions, WorkPurpose } from '@/lib/rules/types';

const CHOICES: Array<{
  value: WorkPurpose;
  labelKey: MessageKey;
  hintKey: MessageKey;
  icon: string;
}> = [
  {
    value: 'cutting',
    labelKey: 'home.cutting',
    hintKey: 'home.cuttingHint',
    icon: '✂',
  },
  {
    value: 'grinding',
    labelKey: 'home.grinding',
    hintKey: 'home.grindingHint',
    icon: '🛠',
  },
];

export default function Home() {
  const router = useRouter();
  const { reset, setPurpose } = useInspection();
  const { t } = useLocale();
  // 재료·건식/습식. 작업을 고르기 전에 정해 두면 작업을 누를 때 함께 넘어간다.
  // 기본값은 모름이다 — 고르지 않아도 시작할 수 있다.
  const [conditions, setConditions] = useState<WorkConditions>(
    UNKNOWN_WORK_CONDITIONS,
  );
  const [starting, setStarting] = useState(false);
  // 준비(이전 입력 draft 삭제)에 실패한 작업. 다시 시도는 이 작업으로 같은 경로를 탄다.
  const [failedPurpose, setFailedPurpose] = useState<WorkPurpose | null>(null);
  // 상태(starting)는 다음 렌더에서야 바뀐다. 같은 틱의 연속 클릭을 막으려면 ref로 잠근다.
  const startingRef = useRef(false);

  // 메인으로 돌아오면 이전 점검 값을 비운다.
  // 지난 촬영 값이 남아 다음 점검에 섞여 들어가면 안 된다.
  // 입력 draft는 아직 지우지 않는다. 앱 재실행 시 같은 홈 위에서 이어하기를
  // 묻기 때문에, 여기서 지우면 사용자가 답하기 전에 미확정 입력을 잃는다.
  useEffect(() => {
    reset();
  }, [reset]);

  async function start(purpose: WorkPurpose) {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setFailedPurpose(null);
    try {
      // 새 작업을 명시적으로 고른 때만 입력 draft를 버린다. 삭제가 끝나기 전에
      // 촬영 화면을 열면 이전 입력 복원이 삭제와 경쟁해 새 점검에 섞일 수 있다.
      const removed = await Promise.all([
        formDraftStore.remove('grinder'),
        formDraftStore.remove('wheel'),
      ]);
      // 준비에 실패하면 시작하지 않는다. 점검 상태 초기화·작업 확정·화면 이동은
      // 모두 준비가 끝난 뒤에만 한다.
      if (!removed.every(Boolean)) {
        setFailedPurpose(purpose);
        return;
      }
      reset();
      setPurpose(purpose, conditions);
      router.push('/scan/grinder');
    } catch {
      setFailedPurpose(purpose);
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-between gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-100">
          {t('home.title')}
        </h1>
        <p className="text-lg text-slate-400">{t('home.subtitle')}</p>
      </header>

      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-slate-100">
          {t('home.question')}
        </h2>

        <WorkConditionsPicker value={conditions} onChange={setConditions} />

        <div className="grid grid-cols-2 gap-4">
          {CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              disabled={starting}
              onClick={() => start(choice.value)}
              className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl bg-slate-800 px-4 py-6 active:bg-slate-700 disabled:opacity-50"
            >
              <span aria-hidden className="text-5xl">
                {choice.icon}
              </span>
              <span className="text-3xl font-black text-slate-100">
                {t(choice.labelKey)}
              </span>
              <span className="text-base text-slate-400">
                {t(choice.hintKey)}
              </span>
            </button>
          ))}
        </div>

        {failedPurpose && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-4"
          >
            <p className="text-base leading-relaxed text-red-200">
              {t('home.startPrepFailed')}
            </p>
            <button
              type="button"
              disabled={starting}
              onClick={() => void start(failedPurpose)}
              className="min-h-14 rounded-lg border border-red-400 text-lg font-semibold text-red-100 active:bg-red-500/20 disabled:opacity-50"
            >
              {t('home.startRetry', {
                work: t(
                  failedPurpose === 'cutting'
                    ? 'home.cutting'
                    : 'home.grinding',
                ),
              })}
            </button>
          </div>
        )}

        <p className="text-base leading-relaxed text-slate-400">
          {t('home.afterChoice')}
        </p>

        <Link
          href="/history"
          className="flex min-h-12 items-center justify-center rounded-lg px-6 py-4 text-lg text-slate-300 underline underline-offset-4 active:text-slate-100"
        >
          {t('home.history')}
        </Link>
        <AppQrShare />
      </div>

      <LanguagePicker />

      <Disclaimer />
      <BuildInfo />
    </main>
  );
}
