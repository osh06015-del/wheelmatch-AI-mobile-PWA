'use client';

// 부속품 Profile과 작업·그라인더 입력을 맞춰 본 표.
//
// **규격 판정이 아니다.** 여기 항목은 verdict에 들어가지 않고, "맞다"는 상태도
// 없다. 모름·직접 확인·어긋남 셋만 보인다. 어긋남은 가장 먼저, 눈에 띄게 보인다.
//
// 결과 화면은 방금 계산한 값을, 이력은 저장 당시의 값을 넘긴다 — 이력에서
// 지금 Profile로 다시 계산하면 그때 무엇을 보았는지 거짓으로 적게 된다.

import { useLocale } from '@/lib/i18n';
import { WHEEL_TYPE_LABEL } from '@/lib/i18n/checkText';
import {
  CONDITION_CODE_TEXT,
  CONDITION_KEY_LABEL,
  CONDITION_STATUS_LABEL,
} from '@/lib/i18n/profileLabels';
import type { AccessoryProfileRef, ProfileCondition } from '@/lib/rules/types';

const STATUS_STYLE: Readonly<Record<ProfileCondition['status'], string>> = {
  conflict: 'border-red-500/60 bg-red-500/15 text-red-100',
  manual_check: 'border-slate-600 bg-slate-800 text-slate-100',
  unknown: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100',
};

/** 어긋남 → 모름 → 직접 확인 순. 작업을 멈춰야 할 것부터 보인다 */
const STATUS_ORDER: Readonly<Record<ProfileCondition['status'], number>> = {
  conflict: 0,
  unknown: 1,
  manual_check: 2,
};

export function ProfileConditionsPanel({
  profile,
  conditions,
}: {
  /** 적용한 Profile. 없으면 이 종류에는 조건표가 없다는 안내만 한다 */
  profile: AccessoryProfileRef | null;
  conditions: readonly ProfileCondition[] | null;
}) {
  const { t } = useLocale();
  const sorted = [...(conditions ?? [])].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );

  return (
    <section
      aria-labelledby="profile-conditions-title"
      className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-4"
    >
      <h2
        id="profile-conditions-title"
        className="text-lg font-bold text-slate-100"
      >
        {t('profile.title')}
      </h2>
      <p className="text-base leading-relaxed text-slate-400">
        {t('profile.note')}
      </p>

      {profile === null ? (
        <p className="text-base leading-relaxed text-slate-300">
          {t('profile.none')}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {sorted.map((condition) => (
              <li
                key={condition.key}
                className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${STATUS_STYLE[condition.status]}`}
              >
                <p className="text-base font-bold">
                  {condition.status === 'conflict' ? '⚠ ' : ''}
                  {t(CONDITION_KEY_LABEL[condition.key])} ·{' '}
                  {t(CONDITION_STATUS_LABEL[condition.status])}
                </p>
                <p className="text-base leading-relaxed">
                  {t(CONDITION_CODE_TEXT[condition.code])}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-500">
            {t('profile.version', {
              type: t(WHEEL_TYPE_LABEL[profile.type]),
              version: profile.version,
            })}
          </p>
        </>
      )}
    </section>
  );
}
