'use client';

// 숫돌 종류 직접 확인.
//
// 종류는 라벨 글자가 아니라 숫돌의 생김새로 정한다. AI가 사진으로 본 종류는 초기
// 제안값일 뿐이고, 최종값은 작업자가 실물을 보고 고른다. 이 앱의 회전속도·지름
// 규칙은 일반 결합숫돌에만 성립하므로, 여기서 고른 값이 규격을 대조할 수 있는지를
// 정한다(engine.ts의 checkWheelType).
//
// AI 제안과 선택이 다르면 숨기지 않는다. 둘 중 하나가 틀렸다는 뜻이다. 작업자가
// 실물을 다시 보고 직접 확인을 체크해야 넘어간다(src/app/scan/wheel/page.tsx).

import { useLocale, type MessageKey } from '@/lib/i18n';
import type { WheelType } from '@/lib/rules/types';

/** 선택지. WheelType과 하나씩 대응한다 — 빠진 종류가 있으면 고를 수 없다. */
export const WHEEL_TYPE_OPTIONS: ReadonlyArray<{
  value: WheelType;
  labelKey: MessageKey;
}> = [
  { value: 'bonded_abrasive', labelKey: 'wheelType.bonded_abrasive' },
  { value: 'flap_disc', labelKey: 'wheelType.flap_disc' },
  { value: 'cup_wheel', labelKey: 'wheelType.cup_wheel' },
  { value: 'diamond', labelKey: 'wheelType.diamond' },
  { value: 'wire_brush', labelKey: 'wheelType.wire_brush' },
  { value: 'other', labelKey: 'wheelType.other' },
  { value: 'unknown', labelKey: 'wheelType.unknown' },
];

/** 이름은 선택지 목록 한 곳에서만 찾는다. 두 곳에 두면 갈라진다. */
function labelKeyOf(type: WheelType): MessageKey {
  return (
    WHEEL_TYPE_OPTIONS.find((option) => option.value === type)?.labelKey ??
    'wheelType.unknown'
  );
}

interface WheelTypeConfirmProps {
  /** 작업자가 지금 고른 종류 */
  value: WheelType;
  /** AI가 사진으로 본 종류. 초기 제안값이다. */
  suggested: WheelType;
  onChange: (value: WheelType) => void;
}

export function WheelTypeConfirm({
  value,
  suggested,
  onChange,
}: WheelTypeConfirmProps) {
  const { t } = useLocale();
  const differs = value !== suggested;

  // 일반 결합숫돌로 확인한 경우만 규격 대조 대상이다. 나머지는 판정불가로
  // 끝난다는 것을 고르는 순간 보여준다 — 결과 화면에서 처음 알면 늦다.
  const status: MessageKey =
    value === 'bonded_abrasive'
      ? 'wheelTypeConfirm.supported'
      : value === 'unknown'
        ? 'wheelTypeConfirm.unknown'
        : 'wheelTypeConfirm.unsupported';

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="wheel-type"
        className="text-base font-medium text-slate-300"
      >
        {t('wheelTypeConfirm.label')}
      </label>
      <p className="text-base leading-relaxed text-slate-400">
        {t('wheelTypeConfirm.hint')}
      </p>
      <p className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-300">
        {t('wheelTypeConfirm.aiSuggestion', { type: t(labelKeyOf(suggested)) })}
      </p>
      <select
        id="wheel-type"
        value={value}
        onChange={(event) => {
          const next = WHEEL_TYPE_OPTIONS.find(
            (option) => option.value === event.target.value,
          );
          if (next) onChange(next.value);
        }}
        className="min-h-12 rounded-lg border border-slate-600 bg-slate-800 px-4 text-lg text-slate-100"
      >
        {WHEEL_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
      {/* 판정 3색 중 초록은 쓰지 않는다. 대조 대상이라는 것이 적합이라는 뜻은 아니다. */}
      <p
        className={
          value === 'bonded_abrasive'
            ? 'text-base leading-relaxed text-slate-300'
            : 'rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-base leading-relaxed text-yellow-100'
        }
      >
        {t(status)}
      </p>
      {differs && (
        <p
          role="alert"
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-4 text-base font-semibold leading-relaxed text-yellow-100"
        >
          ⚠{' '}
          {t('wheelTypeConfirm.differs', {
            ai: t(labelKeyOf(suggested)),
            selected: t(labelKeyOf(value)),
          })}
        </p>
      )}
    </div>
  );
}
