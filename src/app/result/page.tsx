'use client';

// 규격 대조 결과 + 안전 체크리스트 + 저장.
//
// 판정은 여기서 계산하지 않는다. matchSpecs()가 낸 결과를 그대로 보여줄 뿐이다.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  ChecklistForm,
  EMPTY_CHECKLIST,
  isChecklistComplete,
} from '@/components/ChecklistForm';
import { Disclaimer } from '@/components/Disclaimer';
import { ResultCard } from '@/components/ResultCard';
import { saveInspection } from '@/lib/db';
import { failureReasons, matchSpecs } from '@/lib/rules/engine';
import { useInspection } from '@/lib/state/inspection';
import type { SafetyChecklist } from '@/lib/rules/types';

export default function ResultPage() {
  const router = useRouter();
  const { grinder, wheel, grinderImage, wheelImage, hydrating, reset } =
    useInspection();

  const [checklist, setChecklist] = useState<SafetyChecklist>(EMPTY_CHECKLIST);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 두 값이 모두 없으면 대조할 것이 없다. 처음으로 돌린다.
  //
  // 저장 직후에는 이 가드를 건너뛴다. 저장하면서 값을 비우는데,
  // 그 때문에 이력 화면으로 가기도 전에 메인으로 튕겨 나가면 안 된다.
  useEffect(() => {
    if (saved) return;
    if (!hydrating && (!grinder || !wheel)) router.replace('/');
  }, [saved, hydrating, grinder, wheel, router]);

  const result = useMemo(
    () => (grinder && wheel ? matchSpecs(grinder, wheel) : null),
    [grinder, wheel],
  );

  if (!grinder || !wheel || !result) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-lg text-slate-400">결과를 불러오는 중입니다...</p>
      </main>
    );
  }

  const failures = failureReasons(result);
  const complete = isChecklistComplete(checklist);

  async function save() {
    if (!grinder || !wheel || !result) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveInspection({
        grinder,
        wheel,
        result,
        checklist,
        grinderImage: grinderImage ?? undefined,
        wheelImage: wheelImage ?? undefined,
        createdAt: new Date().toISOString(),
      });
      setSaved(true);
      reset();
      router.push('/history');
    } catch {
      setSaveError('저장에 실패했습니다. 저장 공간을 확인한 뒤 다시 시도하세요.');
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="처음으로"
          className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl text-slate-300 active:bg-slate-800"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-slate-100">규격 대조 결과</h1>
      </header>

      <ResultCard result={result} />

      {failures.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-4">
          <h2 className="text-xl font-bold text-red-200">부적합 원인</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {failures.map((reason) => (
              <li
                key={reason}
                className="text-lg font-bold leading-relaxed text-red-100"
              >
                {reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.verdict === 'UNDETERMINED' && (
        <div className="flex flex-col gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-4">
          <p className="text-lg leading-relaxed text-yellow-100">
            값이 부족하거나 인식 신뢰도가 낮습니다. 다시 촬영하거나 값을 직접
            입력하면 판정할 수 있습니다.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/scan/grinder"
              className="flex min-h-14 items-center justify-center rounded-lg bg-yellow-500 text-lg font-bold text-slate-950 active:bg-yellow-400"
            >
              그라인더부터 다시 확인
            </Link>
            <Link
              href="/scan/wheel"
              className="flex min-h-14 items-center justify-center rounded-lg border border-yellow-500/60 text-lg font-semibold text-yellow-100 active:bg-yellow-500/20"
            >
              숫돌만 다시 확인
            </Link>
          </div>
        </div>
      )}

      <ChecklistForm
        checklist={checklist}
        onToggle={(key, checked) =>
          setChecklist((current) => ({ ...current, [key]: checked }))
        }
      />

      {saveError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-4 text-base leading-relaxed text-red-200">
          {saveError}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!complete || saving}
          className="min-h-14 rounded-lg bg-green-500 text-lg font-bold text-slate-950 active:bg-green-400 disabled:bg-slate-700 disabled:text-slate-400"
        >
          {saving ? '저장 중...' : '점검 완료 및 저장'}
        </button>
        {!complete && (
          <p className="text-base text-slate-400">
            안전 체크리스트 5개 항목을 모두 확인해야 저장할 수 있습니다.
          </p>
        )}
        <Link
          href="/"
          className="flex min-h-14 items-center justify-center rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
        >
          처음으로
        </Link>
      </div>

      <Disclaimer />
    </main>
  );
}
