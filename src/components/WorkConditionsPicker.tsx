'use client';

// 작업 조건 입력 — 재료와 건식/습식.
//
// 기본값은 모름(unknown)이다. 고르지 않아도 점검을 시작할 수 있다 — 모르는 값은
// 맞는 것으로 추정하지 않고 결과 화면에서 직접 확인 항목으로 남는다.

import { SelectField } from './SelectField';

import { useLocale } from '@/lib/i18n';
import { COOLING_LABEL, MATERIAL_LABEL } from '@/lib/i18n/profileLabels';
import type {
  CoolingMode,
  WorkConditions,
  WorkMaterial,
} from '@/lib/rules/types';

/** 선택지 순서. 모름을 맨 앞에 둔다 — 기본값이 눈에 보이게 */
const MATERIALS: readonly WorkMaterial[] = [
  'unknown',
  'steel',
  'stainless',
  'non_ferrous',
  'stone_concrete',
  'other',
];
const COOLINGS: readonly CoolingMode[] = ['unknown', 'dry', 'wet'];

export function WorkConditionsPicker({
  value,
  onChange,
}: {
  value: WorkConditions;
  onChange: (next: WorkConditions) => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label={t('work.material.label')}
          value={value.material}
          options={MATERIALS.map((material) => ({
            value: material,
            label: t(MATERIAL_LABEL[material]),
          }))}
          onChange={(material) => onChange({ ...value, material })}
        />
        <SelectField
          label={t('work.cooling.label')}
          value={value.cooling}
          options={COOLINGS.map((cooling) => ({
            value: cooling,
            label: t(COOLING_LABEL[cooling]),
          }))}
          onChange={(cooling) => onChange({ ...value, cooling })}
        />
      </div>
      <p className="text-base leading-relaxed text-slate-400">
        {t('work.conditionsNote')}
      </p>
    </div>
  );
}
