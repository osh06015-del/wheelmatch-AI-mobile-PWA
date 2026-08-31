'use client';

// "라벨을 직접 보고 확인했다"는 사용자 확인 토글.
//
// OCR 신뢰도가 낮으면 규칙엔진은 판정불가를 낸다. 그 상태를 푸는 방법은
// 값을 지어내는 것이 아니라, 사람이 라벨을 직접 보고 값을 확정하는 것뿐이다.
// 값을 한 글자라도 고치면 확인은 자동으로 풀린다. 다시 확인해야 한다.

interface ManualConfirmToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ManualConfirmToggle({
  checked,
  onChange,
}: ManualConfirmToggleProps) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-4 rounded-lg border border-slate-600 bg-slate-800 px-4 py-4 active:bg-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-6 w-6 shrink-0 accent-green-500"
      />
      <span className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-slate-100">
          라벨을 직접 보고 위 값을 확인했습니다
        </span>
        <span className="text-base leading-relaxed text-slate-400">
          체크하면 인식 신뢰도 대신 사용자가 확인한 값으로 판정합니다.
        </span>
      </span>
    </label>
  );
}
