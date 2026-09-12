'use client';

// 2단계 — 숫돌 라벨 촬영과 값 확인. 확인이 끝나면 규칙엔진이 대조한다.

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CameraView } from '@/components/CameraView';
import {
  FieldConfirm,
  fromNumber,
  toNumberOrNull,
  type FieldSpec,
} from '@/components/FieldConfirm';
import { ManualConfirmToggle } from '@/components/ManualConfirmToggle';
import { RequirementBanner } from '@/components/RequirementBanner';
import { ScanHeader } from '@/components/ScanHeader';
import { WheelConditionGate } from '@/components/WheelConditionGate';
import { WHEEL_FIELD_GUIDE } from '@/lib/guide/fieldGuide';
import { optimizeForUpload } from '@/lib/image/optimize';
import { confirmedWheelSpec } from '@/lib/ocr/confirm';
import { getExtractor } from '@/lib/ocr/extractor';
import { normalizeExpiry } from '@/lib/ocr/parser';
import {
  EMPTY_WHEEL_CONDITION,
  isWheelConditionComplete,
} from '@/lib/safety/wheelCondition';
import { useInspection } from '@/lib/state/inspection';
import type {
  WheelCondition,
  WheelPurpose,
  WheelSpec,
} from '@/lib/rules/types';

type Phase = 'capture' | 'analyzing' | 'confirm' | 'error';

interface FormState {
  maxRPM: string;
  diameter: string;
  thickness: string;
  purpose: string;
  /** 라벨의 유효기한 표기. 정규화는 confirmedWheelSpec이 한다. */
  expiry: string;
}

export default function WheelScanPage() {
  const router = useRouter();
  const { declaredPurpose, grinder, hydrating, setWheel, setWheelCondition } =
    useInspection();

  const [phase, setPhase] = useState<Phase>('capture');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [ocr, setOcr] = useState<WheelSpec | null>(null);
  const [form, setForm] = useState<FormState>({
    maxRPM: '',
    diameter: '',
    thickness: '',
    purpose: 'unknown',
    expiry: '',
  });
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [condition, setCondition] = useState<WheelCondition>({
    ...EMPTY_WHEEL_CONDITION,
  });
  const [error, setError] = useState<string | null>(null);

  // 그라인더를 먼저 찍지 않고 들어온 경우 1단계로 되돌린다.
  useEffect(() => {
    if (!hydrating && !grinder) router.replace('/scan/grinder');
  }, [hydrating, grinder, router]);

  async function analyze(source: Blob) {
    setPhase('analyzing');
    setError(null);
    try {
      // 원본 사진은 Vercel 함수의 4.5MB 요청 한도를 넘길 수 있다. 먼저 줄인다.
      const blob = await optimizeForUpload(source);
      setPhoto(blob);
      const spec = await getExtractor().extractWheel(blob);
      setOcr(spec);
      setForm({
        maxRPM: fromNumber(spec.maxRPM),
        diameter: fromNumber(spec.diameter),
        thickness: fromNumber(spec.thickness),
        purpose: spec.purpose,
        // 모델이 읽은 문자열을 그대로 보여준다. 정규화한 값을 되돌려 보여주면
        // 라벨에 무엇이 찍혀 있었는지 사용자가 대조할 수 없다.
        expiry: spec.markings?.expiryRaw ?? '',
      });
      setUserConfirmed(false);
      // 새 사진은 새 숫돌일 수 있다. 이전 숫돌의 직접 확인을 이어 쓰지 않는다.
      setCondition({ ...EMPTY_WHEEL_CONDITION });
      setPhase('confirm');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '라벨 분석에 실패했습니다.',
      );
      setPhase('error');
    }
  }

  function updateField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setUserConfirmed(false);
    // 값을 고친 뒤에는 관련 직접 확인도 다시 받아야 한다.
    setCondition((current) => ({
      ...current,
      ...(key === 'expiry' ? { expiryValid: null } : { labelLegible: null }),
    }));
  }

  function proceed() {
    if (!isWheelConditionComplete(condition)) return;
    // 화면이 가진 값만 넘기고, OCR 원본에서 무엇을 이어갈지는 confirmedWheelSpec이
    // 정한다. 여기서 필드를 하나하나 옮겨 적으면 선택 필드(markings·rpmSource)가
    // 조용히 빠진다 — 실제로 그렇게 빠져서 표기 일치 검사가 돌지 않았다.
    const spec = confirmedWheelSpec(ocr, {
      maxRPM: toNumberOrNull(form.maxRPM),
      diameter: toNumberOrNull(form.diameter),
      thickness: toNumberOrNull(form.thickness),
      purpose: form.purpose as WheelPurpose,
      expiryText: form.expiry,
      userConfirmed,
    });
    setWheel(spec, photo, ocr);
    setWheelCondition(condition);
    router.push('/result');
  }

  const labelNeedsReview =
    form.maxRPM.trim() === '' ||
    form.diameter.trim() === '' ||
    form.purpose === 'unknown' ||
    (ocr?.confidence === 'low' && !userConfirmed);
  const expiryNeedsReview =
    normalizeExpiry(form.expiry.trim() === '' ? null : form.expiry) === null;

  const fields: FieldSpec[] = [
    {
      key: 'maxRPM',
      label: '최고사용회전속도',
      unit: 'rpm',
      kind: 'number',
      value: form.maxRPM,
      guide: WHEEL_FIELD_GUIDE.maxRPM,
    },
    {
      key: 'diameter',
      label: '지름',
      unit: 'mm',
      kind: 'number',
      value: form.diameter,
      guide: WHEEL_FIELD_GUIDE.diameter,
    },
    {
      key: 'thickness',
      label: '두께',
      unit: 'mm',
      kind: 'number',
      value: form.thickness,
      guide: WHEEL_FIELD_GUIDE.thickness,
    },
    {
      key: 'purpose',
      label: '용도',
      kind: 'purpose',
      value: form.purpose,
      guide: WHEEL_FIELD_GUIDE.purpose,
    },
    {
      key: 'expiry',
      label: '유효기한',
      unit: 'MM/YYYY',
      kind: 'text',
      value: form.expiry,
      guide: WHEEL_FIELD_GUIDE.expiry,
    },
  ];

  if (phase === 'capture') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="2 / 2" title="숫돌 라벨 촬영" />
        {/* 찍기 전에 무엇을 골라야 하는지 먼저 알려준다.
            숫돌 걸이 앞에서 바로 쓰이는 정보다. */}
        {grinder && (
          <RequirementBanner
            grinder={grinder}
            declaredPurpose={declaredPurpose}
            compact
          />
        )}
        <CameraView
          guideLabel="라벨을 사각형 안에 맞추세요"
          onCapture={(blob) => void analyze(blob)}
          onPickFile={(file) => void analyze(file)}
        />
      </main>
    );
  }

  if (phase === 'analyzing') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="2 / 2" title="숫돌 라벨 촬영" />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <div
            aria-hidden
            className="h-14 w-14 animate-spin rounded-full border-4 border-slate-700 border-t-slate-200"
          />
          <p className="text-lg text-slate-300">라벨을 분석하고 있습니다...</p>
        </div>
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="2 / 2" title="숫돌 라벨 촬영" />
        <div className="flex flex-1 flex-col justify-center gap-4 px-6">
          <p className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-4 text-lg leading-relaxed text-red-200">
            {error}
          </p>
          <button
            type="button"
            onClick={() => photo && void analyze(photo)}
            className="min-h-14 rounded-lg bg-slate-700 text-lg font-semibold text-white active:bg-slate-600"
          >
            같은 사진으로 다시 분석
          </button>
          <button
            type="button"
            onClick={() => setPhase('capture')}
            className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
          >
            재촬영
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-6">
      <ScanHeader step="2 / 2" title="숫돌 라벨 촬영" bare />
      {grinder && (
        <RequirementBanner
          grinder={grinder}
          declaredPurpose={declaredPurpose}
        />
      )}
      <FieldConfirm
        title="읽어낸 값을 확인하세요"
        fields={fields}
        confidence={ocr?.confidence ?? 'low'}
        rawText={ocr?.rawText ?? ''}
        onChange={updateField}
      />
      <ManualConfirmToggle
        checked={userConfirmed}
        onChange={setUserConfirmed}
      />
      <WheelConditionGate
        condition={condition}
        visibleDamage={ocr?.visibleDamage ?? 'unknown'}
        labelNeedsReview={labelNeedsReview}
        expiryNeedsReview={expiryNeedsReview}
        onChange={(key, value) =>
          setCondition((current) => ({ ...current, [key]: value }))
        }
      />
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={proceed}
          disabled={!isWheelConditionComplete(condition)}
          className="min-h-14 rounded-lg bg-green-500 text-lg font-bold text-slate-950 active:bg-green-400 disabled:bg-slate-700 disabled:text-slate-400"
        >
          확인 후 규격 대조
        </button>
        <button
          type="button"
          onClick={() => setPhase('capture')}
          className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
        >
          재촬영
        </button>
      </div>
    </main>
  );
}
