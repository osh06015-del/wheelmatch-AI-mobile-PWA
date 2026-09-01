'use client';

// 방호장비 수동 안전 체크리스트.
//
// 규격 대조만으로는 안전을 보증할 수 없다. 카메라로 확인할 수 없는 항목은
// 작업자가 직접 눈으로 보고 체크하게 한다. 전부 체크해야 저장이 열린다.

import { useLocale, type MessageKey } from '@/lib/i18n';
import type { SafetyChecklist } from '@/lib/rules/types';

// 문구 자체가 아니라 문구 키를 들고 있다. 언어를 바꾸면 같은 항목이
// 그 언어로 나온다. 항목 순서와 개수는 언어와 무관하게 같아야 한다.
export const CHECKLIST_ITEMS: Array<{
  key: keyof SafetyChecklist;
  labelKey: MessageKey;
  hintKey: MessageKey;
}> = [
  {
    key: 'guardCover',
    labelKey: 'checklist.guardCover',
    hintKey: 'checklist.guardCoverHint',
  },
  {
    key: 'auxiliaryHandle',
    labelKey: 'checklist.auxiliaryHandle',
    hintKey: 'checklist.auxiliaryHandleHint',
  },
  {
    key: 'wheelDamage',
    labelKey: 'checklist.wheelDamage',
    hintKey: 'checklist.wheelDamageHint',
  },
  {
    key: 'ppe',
    labelKey: 'checklist.ppe',
    hintKey: 'checklist.ppeHint',
  },
];

export const EMPTY_CHECKLIST: SafetyChecklist = {
  guardCover: null,
  auxiliaryHandle: null,
  wheelDamage: null,
  ppe: null,
};

/**
 * 불꽃 방향은 체크박스에서 뺐다.
 *
 * 장착 전에 예/아니오로 답할 수 있는 상태가 아니다. 작업 자세와 주변 상황에
 * 따라 매 순간 달라지므로, 미리 체크해두면 "확인했다"는 착각만 남는다.
 * 대신 점검을 마친 뒤 작업 직전 안내로 띄운다.
 */
export const PRE_WORK_REMINDER_KEY: MessageKey = 'checklist.preWork';

/** 모든 항목이 true여야 점검 완료로 본다. */
export function isChecklistComplete(checklist: SafetyChecklist): boolean {
  return CHECKLIST_ITEMS.every((item) => checklist[item.key] === true);
}

interface ChecklistFormProps {
  checklist: SafetyChecklist;
  onToggle: (key: keyof SafetyChecklist, checked: boolean) => void;
}

export function ChecklistForm({ checklist, onToggle }: ChecklistFormProps) {
  const { t } = useLocale();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-slate-100">
        {t('checklist.title')}
      </h2>
      <p className="text-base leading-relaxed text-slate-400">
        {t('checklist.note')}
      </p>

      <ul className="flex flex-col gap-3">
        {CHECKLIST_ITEMS.map((item) => {
          const checked = checklist[item.key] === true;
          return (
            <li key={item.key}>
              <label className="flex min-h-12 cursor-pointer items-start gap-4 rounded-lg bg-slate-800 px-4 py-4 active:bg-slate-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onToggle(item.key, event.target.checked)}
                  className="mt-1 h-6 w-6 shrink-0 accent-green-500"
                />
                <span className="flex flex-col gap-1">
                  <span className="text-lg font-semibold text-slate-100">
                    {t(item.labelKey)}
                  </span>
                  <span className="text-base leading-relaxed text-slate-400">
                    {t(item.hintKey)}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
