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
import { useEffect } from 'react';

import { Disclaimer } from '@/components/Disclaimer';
import { LanguagePicker } from '@/components/LanguagePicker';
import { useLocale, type MessageKey } from '@/lib/i18n';
import { useInspection } from '@/lib/state/inspection';
import type { WorkPurpose } from '@/lib/rules/types';

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

  // 메인으로 돌아오면 이전 점검 값을 비운다.
  // 지난 촬영 값이 남아 다음 점검에 섞여 들어가면 안 된다.
  useEffect(() => {
    reset();
  }, [reset]);

  function start(purpose: WorkPurpose) {
    setPurpose(purpose);
    router.push('/scan/grinder');
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

        <div className="grid grid-cols-2 gap-4">
          {CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              onClick={() => start(choice.value)}
              className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl bg-slate-800 px-4 py-6 active:bg-slate-700"
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

        <p className="text-base leading-relaxed text-slate-400">
          {t('home.afterChoice')}
        </p>

        <Link
          href="/history"
          className="flex min-h-12 items-center justify-center rounded-lg px-6 py-4 text-lg text-slate-300 underline underline-offset-4 active:text-slate-100"
        >
          {t('home.history')}
        </Link>
      </div>

      <LanguagePicker />

      <Disclaimer />
    </main>
  );
}
