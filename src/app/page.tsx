'use client';

// 메인 화면. 점검을 새로 시작하는 곳이다.

import Link from 'next/link';
import { useEffect } from 'react';
import { useInspection } from '@/lib/state/inspection';
import { Disclaimer } from '@/components/Disclaimer';

export default function Home() {
  const { reset } = useInspection();

  // 메인으로 돌아오면 이전 점검 값을 비운다.
  // 지난 촬영 값이 남아 다음 점검에 섞여 들어가면 안 된다.
  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <main className="flex flex-1 flex-col justify-between gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-100">WheelMatch AI</h1>
        <p className="text-lg text-slate-400">그라인더·숫돌 규격 대조</p>
      </header>

      <div className="flex flex-col gap-4">
        <Link
          href="/scan/grinder"
          className="flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-2xl bg-slate-800 px-6 py-8 text-center active:bg-slate-700"
        >
          <span aria-hidden className="text-5xl">
            🛠️
          </span>
          <span className="text-2xl font-bold text-slate-100">
            명판 촬영 시작
          </span>
          <span className="text-base text-slate-400">
            그라인더 명판 → 숫돌 라벨 순서로 촬영합니다
          </span>
        </Link>

        <Link
          href="/history"
          className="flex min-h-12 items-center justify-center rounded-lg px-6 py-4 text-lg text-slate-300 underline underline-offset-4 active:text-slate-100"
        >
          점검 이력 보기 →
        </Link>
      </div>

      <Disclaimer />
    </main>
  );
}
