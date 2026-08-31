'use client';

// 1단계 — 그라인더 명판 촬영과 값 확인.

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CameraView } from '@/components/CameraView';
import {
  FieldConfirm,
  fromNumber,
  toNumberOrNull,
  toTextOrNull,
  type FieldSpec,
} from '@/components/FieldConfirm';
import { ManualConfirmToggle } from '@/components/ManualConfirmToggle';
import { ScanHeader } from '@/components/ScanHeader';
import { optimizeForUpload } from '@/lib/image/optimize';
import { getExtractor } from '@/lib/ocr/extractor';
import { useInspection } from '@/lib/state/inspection';
import type { GrinderSpec } from '@/lib/rules/types';

type Phase = 'capture' | 'analyzing' | 'confirm' | 'error';

interface FormState {
  model: string;
  noLoadRPM: string;
  maxWheelDiameter: string;
}

export default function GrinderScanPage() {
  const router = useRouter();
  const { setGrinder } = useInspection();

  const [phase, setPhase] = useState<Phase>('capture');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [ocr, setOcr] = useState<GrinderSpec | null>(null);
  const [form, setForm] = useState<FormState>({
    model: '',
    noLoadRPM: '',
    maxWheelDiameter: '',
  });
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(source: Blob) {
    setPhase('analyzing');
    setError(null);
    try {
      // 원본 사진은 Vercel 함수의 4.5MB 요청 한도를 넘길 수 있다. 먼저 줄인다.
      const blob = await optimizeForUpload(source);
      setPhoto(blob);
      const spec = await getExtractor().extractGrinder(blob);
      setOcr(spec);
      setForm({
        model: spec.model ?? '',
        noLoadRPM: fromNumber(spec.noLoadRPM),
        maxWheelDiameter: fromNumber(spec.maxWheelDiameter),
      });
      setUserConfirmed(false);
      setPhase('confirm');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '명판 분석에 실패했습니다.',
      );
      setPhase('error');
    }
  }

  function updateField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    // 값이 바뀌면 사용자 확인은 무효가 된다.
    setUserConfirmed(false);
  }

  function proceed() {
    const spec: GrinderSpec = {
      model: toTextOrNull(form.model),
      noLoadRPM: toNumberOrNull(form.noLoadRPM),
      maxWheelDiameter: toNumberOrNull(form.maxWheelDiameter),
      rawText: ocr?.rawText ?? '',
      // 사용자가 직접 확인했으면 그 확인을 신뢰한다. 아니면 OCR 신뢰도를 그대로 쓴다.
      confidence: userConfirmed ? 'high' : (ocr?.confidence ?? 'low'),
    };
    setGrinder(spec, photo);
    router.push('/scan/wheel');
  }

  const fields: FieldSpec[] = [
    { key: 'model', label: '모델명', kind: 'text', value: form.model },
    {
      key: 'noLoadRPM',
      label: '무부하 회전속도',
      unit: 'rpm',
      kind: 'number',
      value: form.noLoadRPM,
    },
    {
      key: 'maxWheelDiameter',
      label: '허용 숫돌 최대 지름',
      unit: 'mm',
      kind: 'number',
      value: form.maxWheelDiameter,
    },
  ];

  if (phase === 'capture') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="1 / 2" title="그라인더 명판 촬영" />
        <CameraView
          guideLabel="명판을 사각형 안에 맞추세요"
          onCapture={(blob) => void analyze(blob)}
          onPickFile={(file) => void analyze(file)}
        />
      </main>
    );
  }

  if (phase === 'analyzing') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="1 / 2" title="그라인더 명판 촬영" />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <div
            aria-hidden
            className="h-14 w-14 animate-spin rounded-full border-4 border-slate-700 border-t-slate-200"
          />
          <p className="text-lg text-slate-300">명판을 분석하고 있습니다...</p>
        </div>
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="1 / 2" title="그라인더 명판 촬영" />
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
      <ScanHeader step="1 / 2" title="그라인더 명판 촬영" bare />
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
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={proceed}
          className="min-h-14 rounded-lg bg-green-500 text-lg font-bold text-slate-950 active:bg-green-400"
        >
          확인 후 숫돌 촬영
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
