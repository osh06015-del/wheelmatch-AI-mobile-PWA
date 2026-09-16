'use client';

// 1단계 — 그라인더 명판 촬영과 값 확인.

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ZoomablePhoto } from '@/components/BlobPhoto';
import { CameraView } from '@/components/CameraView';
import { CaptureQualityNotice } from '@/components/CaptureQualityNotice';
import {
  FieldConfirm,
  fromNumber,
  toNumberOrNull,
  toTextOrNull,
  type FieldSpec,
} from '@/components/FieldConfirm';
import { GrinderConditionGate } from '@/components/GrinderConditionGate';
import {
  GrinderMountingInputs,
  UNKNOWN_GRINDER_MOUNTING,
  type GrinderMountingValue,
} from '@/components/GrinderMountingInputs';
import { ManualConfirmToggle } from '@/components/ManualConfirmToggle';
import { ScanHeader } from '@/components/ScanHeader';
import { GRINDER_FIELD_GUIDE } from '@/lib/guide/fieldGuide';
import { useLocale } from '@/lib/i18n';
import { analysisErrorText } from '@/lib/i18n/errors';
import {
  captureReviewSettled,
  nextCaptureReview,
  prepareCapture,
  toCaptureQualityCheck,
  type CaptureReview,
} from '@/lib/image/captureCheck';
import { getExtractor } from '@/lib/ocr/extractor';
import {
  EMPTY_GRINDER_CONDITION,
  isGrinderConditionComplete,
} from '@/lib/safety/grinderCondition';
import { useInspection } from '@/lib/state/inspection';
import type {
  CaptureQualityMetrics,
  GrinderCondition,
  GrinderSpec,
  OcrTelemetry,
} from '@/lib/rules/types';

/** review: 사진 상태 경고가 있거나 사진을 열지 못해 서버로 보내기 전에 멈춘 상태 */
type Phase = 'capture' | 'analyzing' | 'review' | 'confirm' | 'error';

interface FormState {
  model: string;
  noLoadRPM: string;
  maxWheelDiameter: string;
}

export default function GrinderScanPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { setGrinder, setGrinderCondition, setCaptureCheck } = useInspection();

  const [phase, setPhase] = useState<Phase>('capture');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [ocr, setOcr] = useState<GrinderSpec | null>(null);
  const [captureMetrics, setCaptureMetrics] =
    useState<CaptureQualityMetrics | null>(null);
  const [ocrTelemetry, setOcrTelemetry] = useState<OcrTelemetry | null>(null);
  const [form, setForm] = useState<FormState>({
    model: '',
    noLoadRPM: '',
    maxWheelDiameter: '',
  });
  const [userConfirmed, setUserConfirmed] = useState(false);
  // 스핀들·덮개. 명판에 거의 없어 OCR이 채우지 않는다. 기본값은 모름이다.
  const [mounting, setMounting] = useState<GrinderMountingValue>(
    UNKNOWN_GRINDER_MOUNTING,
  );
  const [condition, setCondition] = useState<GrinderCondition>({
    ...EMPTY_GRINDER_CONDITION,
  });
  // 문장이 아니라 오류 자체를 둔다. 문장은 그릴 때 작업자가 고른 언어로 만든다.
  const [error, setError] = useState<unknown>(null);
  // 사진 상태 경고와 이 자리에서 사진을 넣은 횟수. 명판 사진 한 자리에 대한 것이다.
  const [review, setReview] = useState<CaptureReview | null>(null);

  /**
   * 새 사진을 받는다.
   *
   * 서버로 보내기 전에 사진 상태를 본다(prepareCapture). 경고가 있으면 멈추고
   * 작업자가 다시 찍기와 그래도 사용 중에서 고른다. 열 수 없는 사진은 보내지
   * 않는다. 경고가 없으면 곧바로 판독으로 넘어간다 — 경고가 없다는 것이 사진이
   * 좋다는 뜻은 아니므로 "좋은 사진" 같은 안내는 띄우지 않는다.
   */
  async function analyze(source: Blob) {
    setPhase('analyzing');
    setError(null);
    // 새 사진이다. 이전 사진으로 읽은 값과 그 값을 보고 한 확인은 버린다.
    setPhoto(null);
    setOcr(null);
    setOcrTelemetry(null);
    setCaptureMetrics(null);
    setUserConfirmed(false);
    try {
      // 원본 사진은 Vercel 함수의 4.5MB 요청 한도를 넘길 수 있다. 먼저 줄인다.
      const prepared = await prepareCapture(source);
      const next = nextCaptureReview(review, prepared);
      setReview(next);
      if (prepared.status === 'decode_failed') {
        setPhase('review');
        return;
      }
      setPhoto(prepared.blob);
      // 검증용 원시 측정값. 실패해도 null로만 남고 분석은 그대로 진행된다.
      setCaptureMetrics(prepared.metrics);
      if (!captureReviewSettled(next)) {
        setPhase('review');
        return;
      }
      await extract(prepared.blob);
    } catch (caught) {
      setError(caught);
      setPhase('error');
    }
  }

  /** 준비된 사진을 판독한다. 같은 사진으로 다시 시도할 때도 이 함수만 부른다. */
  async function extract(blob: Blob) {
    setPhase('analyzing');
    setError(null);
    try {
      const extractor = getExtractor();
      const spec = await extractor.extractGrinder(blob);
      setOcr(spec);
      setOcrTelemetry(extractor.getLastTelemetry?.() ?? null);
      setForm({
        model: spec.model ?? '',
        noLoadRPM: fromNumber(spec.noLoadRPM),
        maxWheelDiameter: fromNumber(spec.maxWheelDiameter),
      });
      setUserConfirmed(false);
      // 새 사진은 다른 기계일 수 있다. 이전 기계의 직접 확인을 이어 쓰지 않는다.
      setCondition({ ...EMPTY_GRINDER_CONDITION });
      // 축·덮개도 그 기계를 보고 고른 값이다. 같은 이유로 버린다.
      setMounting(UNKNOWN_GRINDER_MOUNTING);
      setPhase('confirm');
    } catch (caught) {
      setError(caught);
      setPhase('error');
    }
  }

  /** 경고를 보고도 이 사진을 쓴다. 열지 못한 사진에는 이 길이 없다. */
  function acceptWarnedPhoto() {
    if (!photo || !review || review.decodeFailed) return;
    setReview({ ...review, usedDespiteWarning: true });
    void extract(photo);
  }

  function updateField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    // 값이 바뀌면 사용자 확인은 무효가 된다.
    setUserConfirmed(false);
    // 장비 상태 확인은 지우지 않는다.
    //
    // 다섯 항목은 전원선·본체·덮개·손잡이·스핀들, 즉 **기계의 물리 상태**를
    // 묻는다. 명판에 적힌 모델명·회전속도·최대지름을 고쳐도 작업자가 방금
    // 눈으로 본 기계는 그대로다. 지우면 안전상 얻는 것 없이 다시 누르게만
    // 만든다. 숫돌 쪽과 다른 이유는 그쪽 4·5번이 라벨 자체를 묻기 때문이다.
  }

  function proceed() {
    if (!isGrinderConditionComplete(condition)) return;
    const spec: GrinderSpec = {
      model: toTextOrNull(form.model),
      noLoadRPM: toNumberOrNull(form.noLoadRPM),
      maxWheelDiameter: toNumberOrNull(form.maxWheelDiameter),
      // 모르면 unknown·null로 남긴다. 흔한 값으로 채우지 않는다.
      spindleThread: mounting.spindleThread,
      guardType: mounting.guardType,
      guardSize: toNumberOrNull(mounting.guardSize),
      rawText: ocr?.rawText ?? '',
      // 사용자가 직접 확인했으면 그 확인을 신뢰한다. 아니면 OCR 신뢰도를 그대로 쓴다.
      confidence: userConfirmed ? 'high' : (ocr?.confidence ?? 'low'),
    };
    // setGrinder가 이전 장비 상태·숫돌 값을 모두 지운다. 그 뒤에 이번 확인을 넣는다.
    setGrinder(spec, photo, ocr, captureMetrics, ocrTelemetry);
    setGrinderCondition(condition);
    setCaptureCheck('grinder', toCaptureQualityCheck(review));
    router.push('/scan/wheel');
  }

  const fields: FieldSpec[] = [
    {
      key: 'model',
      label: t('field.model'),
      kind: 'text',
      value: form.model,
      guide: GRINDER_FIELD_GUIDE.model,
    },
    {
      key: 'noLoadRPM',
      label: t('field.noLoadRPM'),
      unit: 'rpm',
      kind: 'number',
      value: form.noLoadRPM,
      guide: GRINDER_FIELD_GUIDE.noLoadRPM,
    },
    {
      key: 'maxWheelDiameter',
      label: t('field.maxWheelDiameter'),
      unit: 'mm',
      kind: 'number',
      value: form.maxWheelDiameter,
      guide: GRINDER_FIELD_GUIDE.maxWheelDiameter,
    },
  ];

  if (phase === 'capture') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="1 / 2" title={t('scan.grinder.title')} />
        <CameraView
          guideLabel={t('scan.grinder.guide')}
          onCapture={(blob) => void analyze(blob)}
          onPickFile={(file) => void analyze(file)}
        />
      </main>
    );
  }

  if (phase === 'review') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="1 / 2" title={t('scan.grinder.title')} />
        <div className="flex flex-1 flex-col justify-center gap-4 px-6 py-6">
          {photo && (
            <ZoomablePhoto
              blob={photo}
              label={t('history.grinderPhoto')}
              className="mx-auto w-full max-w-xs"
            />
          )}
          <CaptureQualityNotice
            review={review}
            onRetake={() => setPhase('capture')}
            onUseAnyway={acceptWarnedPhoto}
          />
        </div>
      </main>
    );
  }

  if (phase === 'analyzing') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="1 / 2" title={t('scan.grinder.title')} />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <div
            aria-hidden
            className="h-14 w-14 animate-spin rounded-full border-4 border-slate-700 border-t-slate-200"
          />
          <p className="text-lg text-slate-300">
            {t('scan.grinder.analyzing')}
          </p>
        </div>
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="1 / 2" title={t('scan.grinder.title')} />
        <div className="flex flex-1 flex-col justify-center gap-4 px-6">
          <p
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-4 text-lg leading-relaxed text-red-200"
          >
            {analysisErrorText(error, 'scan.grinder.failed', t)}
          </p>
          <button
            type="button"
            onClick={() => photo && void extract(photo)}
            className="min-h-14 rounded-lg bg-slate-700 text-lg font-semibold text-white active:bg-slate-600"
          >
            {t('scan.retryAnalysis')}
          </button>
          <button
            type="button"
            onClick={() => setPhase('capture')}
            className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
          >
            {t('scan.retake')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-6">
      <ScanHeader step="1 / 2" title={t('scan.grinder.title')} bare />
      <FieldConfirm
        title={t('scan.confirmTitle')}
        fields={fields}
        confidence={ocr?.confidence ?? 'low'}
        rawText={ocr?.rawText ?? ''}
        onChange={updateField}
      />
      <ManualConfirmToggle
        checked={userConfirmed}
        onChange={setUserConfirmed}
      />
      <GrinderMountingInputs value={mounting} onChange={setMounting} />
      <GrinderConditionGate
        condition={condition}
        onChange={(key, value) =>
          setCondition((current) => ({ ...current, [key]: value }))
        }
      />
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={proceed}
          disabled={!isGrinderConditionComplete(condition)}
          className="min-h-14 rounded-lg bg-green-500 text-lg font-bold text-slate-950 active:bg-green-400 disabled:bg-slate-700 disabled:text-slate-400"
        >
          {t('scan.grinder.proceed')}
        </button>
        <button
          type="button"
          onClick={() => setPhase('capture')}
          className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
        >
          {t('scan.retake')}
        </button>
      </div>
    </main>
  );
}
