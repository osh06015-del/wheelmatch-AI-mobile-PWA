'use client';

// "이 그라인더에 맞는 숫돌 조건" 안내.
//
// 숫돌을 촬영하기 **전에** 보여준다. 숫돌 걸이 앞에서 무엇을 골라야 하는지
// 알려주는 것이 목적이다. 찍고 나서 부적합을 알려주는 것보다 한 걸음 빠르다.
//
// 제품을 추천하지 않는다. 명판 값에서 곧바로 따라 나오는 조건만 적는다.

import { grinderSummary, wheelRequirements } from '@/lib/rules/requirement';
import type { GrinderSpec, WorkPurpose } from '@/lib/rules/types';

interface RequirementBannerProps {
  grinder: GrinderSpec;
  declaredPurpose: WorkPurpose | null;
  /** 촬영 화면처럼 자리가 좁은 곳에서는 한 줄로 줄인다. */
  compact?: boolean;
}

export function RequirementBanner({
  grinder,
  declaredPurpose,
  compact = false,
}: RequirementBannerProps) {
  const requirements = wheelRequirements(grinder, declaredPurpose);
  const known = requirements.filter((item) => item.condition !== null);
  const unknown = requirements.filter((item) => item.condition === null);

  if (compact) {
    return (
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-3">
        <p className="text-sm text-slate-400">필요한 숫돌</p>
        <p className="text-base font-bold leading-relaxed text-slate-100">
          {known.length > 0
            ? known.map((item) => item.condition).join(' · ')
            : '명판 값을 읽지 못해 조건을 세울 수 없습니다'}
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-slate-100">필요한 숫돌 조건</h2>
        <p className="text-base text-slate-400">{grinderSummary(grinder)}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {requirements.map((item) => (
          <li key={item.label} className="flex items-baseline gap-3">
            <span className="w-32 shrink-0 text-base text-slate-400">
              {item.label}
            </span>
            {item.condition ? (
              <span className="text-lg font-bold text-slate-100">
                {item.condition}
              </span>
            ) : (
              <span className="text-base text-yellow-200">
                {item.unknownReason}
              </span>
            )}
          </li>
        ))}
      </ul>

      {unknown.length > 0 && (
        <p className="text-base leading-relaxed text-yellow-200">
          ⚠ 조건을 다 세우지 못했습니다. 빠진 값은 명판에서 직접 확인하세요.
        </p>
      )}

      <p className="text-sm leading-relaxed text-slate-500">
        제품을 추천하는 것이 아니라, 명판에 적힌 값에서 따라 나오는 조건입니다.
      </p>
    </section>
  );
}
