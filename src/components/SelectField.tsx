'use client';

// 라벨이 붙은 선택 상자. 작업 조건·그라인더 장착 입력이 같이 쓴다.
//
// 선택지 문구는 호출하는 쪽이 고른 언어로 넘긴다. 이 조각은 값을 모른다.

import { useId } from 'react';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-base font-semibold text-slate-200">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="min-h-12 rounded-lg border border-slate-600 bg-slate-900 px-3 text-lg text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
