'use client';

// 방호장비 수동 안전 체크리스트.
//
// 규격 대조만으로는 안전을 보증할 수 없다. 카메라로 확인할 수 없는 항목은
// 작업자가 직접 눈으로 보고 체크하게 한다. 전부 체크해야 저장이 열린다.

import type { SafetyChecklist } from '@/lib/rules/types';

export const CHECKLIST_ITEMS: Array<{
  key: keyof SafetyChecklist;
  label: string;
  hint: string;
}> = [
  {
    key: 'guardCover',
    label: '방호덮개 장착',
    hint: '숫돌 노출 각도가 규정대로 덮여 있는지 확인',
  },
  {
    key: 'auxiliaryHandle',
    label: '보조손잡이 장착',
    hint: '반동에 대비해 양손으로 잡을 수 있는지 확인',
  },
  {
    key: 'wheelDamage',
    label: '숫돌 손상 없음',
    hint: '균열·깨짐·변형이 없는지 확인 (있으면 즉시 교체)',
  },
  {
    key: 'sparkDirection',
    label: '불꽃 방향 확인',
    hint: '사람·가연물 쪽으로 불꽃이 향하지 않는지 확인',
  },
  {
    key: 'ppe',
    label: '보호구 착용',
    hint: '보안경·장갑·안면보호구 착용 여부 확인',
  },
];

export const EMPTY_CHECKLIST: SafetyChecklist = {
  guardCover: null,
  auxiliaryHandle: null,
  wheelDamage: null,
  sparkDirection: null,
  ppe: null,
};

/** 모든 항목이 true여야 점검 완료로 본다. */
export function isChecklistComplete(checklist: SafetyChecklist): boolean {
  return CHECKLIST_ITEMS.every((item) => checklist[item.key] === true);
}

interface ChecklistFormProps {
  checklist: SafetyChecklist;
  onToggle: (key: keyof SafetyChecklist, checked: boolean) => void;
}

export function ChecklistForm({ checklist, onToggle }: ChecklistFormProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-slate-100">안전 체크리스트</h2>
      <p className="text-base leading-relaxed text-slate-400">
        규격 대조와 별개로 직접 확인해야 하는 항목입니다.
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
                    {item.label}
                  </span>
                  <span className="text-base leading-relaxed text-slate-400">
                    {item.hint}
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
