'use client';

// 1단계 — 그라인더 명판 촬영과 값 확인.

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

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
import { SavedGrinderPanel } from '@/components/SavedGrinderPanel';
import { ScanHeader } from '@/components/ScanHeader';
import { formDraftStore } from '@/lib/draft/draftStore';
import type { SavedGrinderFields } from '@/lib/db/savedGrinderModel';
import {
  FORM_DRAFT_SAVE_DELAY_MS,
  FORM_DRAFT_SCHEMA_VERSION,
  recoverGrinderFormDraft,
} from '@/lib/draft/formDraftModel';
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
import { isNetworkFailure } from '@/lib/ocr/errors';
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
  const {
    declaredPurpose,
    hydrating,
    setGrinder,
    setGrinderCondition,
    setCaptureCheck,
    setOfflineSlot,
  } = useInspection();

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
  // 서버에 닿지 못해 작업자가 값을 직접 넣는 중인가(오프라인 제한 대조).
  // 이 명판 값으로 대조한 결과는 적합이 될 수 없다(engine.ts의 checkAnalysisMode).
  const [offline, setOffline] = useState(false);
  // 서버 분석이 아니라 로컬 OCR(tesseract)로 읽었거나 기기가 오프라인이었는가.
  // 값은 있지만(직접 입력이 아니다) 두 번째 눈(서버 대조) 없이 읽은 값이라
  // offline과 같은 제한 판정으로 취급한다(setOfflineSlot에서 합친다).
  const [localOnly, setLocalOnly] = useState(false);
  // 복원한 draft의 OCR을 읽을 수 없어 버린 경우의 흔적. 버렸다고 알린다 — 조용히
  // 버리면 신뢰도가 왜 낮음으로 떨어졌는지 화면이 말하지 않는다. 이대로 확정한 값은
  // 제한 대조로 나간다(ocrDropped). 그 명판 사진의 판독에 대한 것이라 새 사진을
  // 찍으면 지운다.
  const [droppedOcr, setDroppedOcr] = useState<'dropped' | null>(null);
  // 새로고침 경합 방지: 사용자가 이미 새 사진을 찍거나 직접 입력을 골랐으면
  // 뒤늦게 도착한 draft 복원을 적용하지 않는다.
  const actedRef = useRef(false);

  const purposeReady = declaredPurpose !== null;
  useEffect(() => {
    if (!hydrating && !purposeReady) router.replace('/');
  }, [hydrating, purposeReady, router]);

  // 확인 화면에서 수정 중인 입력값을 새로고침 넘어 복원한다. "다음"을 누르기
  // 전까지는 이 저장소에만 남는다 — 진행 중 점검 복구(draft)는 proceed() 이후의
  // 확정값만 다룬다. 복원해도 userConfirmed·Gate는 다시 받는다(자동 완료 금지).
  useEffect(() => {
    let cancelled = false;
    void formDraftStore.load('grinder').then((result) => {
      if (cancelled || actedRef.current || result.status !== 'found') return;
      const recovered = recoverGrinderFormDraft(result.draft);
      if (!recovered) return;
      const { spindleThread, guardType, guardSize, ...fields } =
        recovered.fields;
      setForm(fields);
      setMounting({ spindleThread, guardType, guardSize });
      setOcr(recovered.ocr);
      setDroppedOcr(recovered.droppedOcr);
      // 저장된 출처를 화면의 두 상태(직접 입력·로컬 OCR)로 다시 나눈다 —
      // 배지 문구가 서로 다르므로 하나의 불리언으로 합쳐 두지 않는다.
      setOffline(recovered.analysisSource === 'manual');
      setLocalOnly(recovered.analysisSource === 'local_ocr');
      if (recovered.photo) {
        setPhoto(recovered.photo);
        setPhase('confirm');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 확인 화면에 있는 동안 입력을 모아 저장한다(debounce). "다음"을 누르기 전에
  // 새로고침해도 입력칸이 비지 않게 하기 위해서다. DraftRecovery의 진행 중 점검
  // 저장과 같은 간격을 쓴다.
  useEffect(() => {
    if (phase !== 'confirm') return;
    const timer = window.setTimeout(() => {
      void formDraftStore.save({
        slot: 'grinder',
        schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        fields: { ...form, ...mounting },
        photo,
        ocr,
        // 버린 OCR의 흔적을 다시 저장한다. 여기 저장되는 ocr은 null이라, 빠뜨리면
        // 새로고침 한 번에 처음부터 OCR이 없던 draft와 구분할 수 없게 된다.
        ...(droppedOcr ? { droppedOcr } : {}),
        // offline·localOnly를 하나의 출처 값으로 남긴다 — 복구할 때 배지 문구를
        // (직접 입력 vs 로컬 OCR) 그대로 되살리기 위해서다.
        analysisSource: offline ? 'manual' : localOnly ? 'local_ocr' : 'server',
      });
    }, FORM_DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase, form, mounting, photo, ocr, droppedOcr, offline, localOnly]);

  /**
   * 새 사진을 받는다.
   *
   * 서버로 보내기 전에 사진 상태를 본다(prepareCapture). 경고가 있으면 멈추고
   * 작업자가 다시 찍기와 그래도 사용 중에서 고른다. 열 수 없는 사진은 보내지
   * 않는다. 경고가 없으면 곧바로 판독으로 넘어간다 — 경고가 없다는 것이 사진이
   * 좋다는 뜻은 아니므로 "좋은 사진" 같은 안내는 띄우지 않는다.
   */
  async function analyze(source: Blob) {
    // 새로고침 복원보다 사용자의 새 촬영이 우선한다. 뒤늦게 도착한 복원을 막는다.
    actedRef.current = true;
    setPhase('analyzing');
    setError(null);
    // 새 사진이다. 이전 사진으로 읽은 값과 그 값을 보고 한 확인은 버린다.
    setPhoto(null);
    setOcr(null);
    setOcrTelemetry(null);
    setCaptureMetrics(null);
    setUserConfirmed(false);
    setOffline(false);
    setLocalOnly(false);
    setDroppedOcr(null);
    // 이전 사진에 대한 확인 화면 draft는 이제 근거가 없다.
    void formDraftStore.remove('grinder');
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
      const telemetry = extractor.getLastTelemetry?.() ?? null;
      setOcr(spec);
      setOcrTelemetry(telemetry);
      setOffline(false);
      // 서버 분석이 아니라 로컬 OCR로 읽었거나(엔진이 tesseract) 기기가
      // 오프라인이면, 값은 있어도 서버라는 두 번째 눈이 없었던 것이다.
      // 직접 입력(offline)과 같은 제한 판정으로 남긴다.
      setLocalOnly(telemetry?.engine === 'tesseract' || !navigator.onLine);
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

  /**
   * 서버에 닿지 못했을 때 작업자가 명판을 직접 보고 값을 넣는다.
   *
   * 값을 지어내지 않는다 — 입력칸은 비어 있고 신뢰도는 낮음에서 시작한다. 사진은
   * 남겨 둔다. 연결이 돌아오면 결과 화면에서 작업자가 서버 재분석을 고를 수 있다.
   */
  function continueOffline() {
    actedRef.current = true;
    setOffline(true);
    setLocalOnly(false);
    setOcr(null);
    setOcrTelemetry(null);
    setForm({ model: '', noLoadRPM: '', maxWheelDiameter: '' });
    setUserConfirmed(false);
    setCondition({ ...EMPTY_GRINDER_CONDITION });
    setMounting(UNKNOWN_GRINDER_MOUNTING);
    setError(null);
    setPhase('confirm');
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

  /**
   * 저장해 둔 그라인더를 골라 입력칸만 채운다.
   *
   * "저장된 이름을 골랐다"는 "지금 이 기계를 확인했다"는 뜻이 아니다 — 값을
   * 읽었을 때와 똑같이 확인(userConfirmed)과 장비 상태 Gate를 다시 받는다.
   */
  function applySavedGrinder(fields: SavedGrinderFields) {
    setForm({
      model: fields.model,
      noLoadRPM: fields.noLoadRPM,
      maxWheelDiameter: fields.maxWheelDiameter,
    });
    setMounting({
      spindleThread: fields.spindleThread,
      guardType: fields.guardType,
      guardSize: fields.guardSize,
    });
    setUserConfirmed(false);
    setCondition({ ...EMPTY_GRINDER_CONDITION });
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
    // setGrinder가 오프라인 표시를 지운다. 그 뒤에 이번 명판의 판독 경로를 넣는다.
    // 직접 입력(offline)과 로컬 OCR(localOnly) 모두 서버 대조 없이 읽은 값이다.
    // 저장된 판독을 통째로 버린 경우(ocrDropped)도 제한 대조로 남긴다. 서버 분석을
    // 거쳤더라도 지금 내놓을 판독이 없고, 여기서 확정하는 값은 직접 입력과 내용이
    // 같다 — draft에 남은 출처만 믿고 온라인으로 내보내면 작업자의 확인만으로
    // 적합까지 간다.
    setOfflineSlot('grinder', offline || localOnly || ocrDropped);
    // 확정됐다. 확인 화면 draft는 더 이상 필요 없다 — 진행 중 점검 복구가 이 값을 대신 지킨다.
    void formDraftStore.remove('grinder');
    router.push('/scan/wheel');
  }

  // 저장된 AI 판독을 통째로 버려 화면에 판독이 없는가. 버렸다는 안내와 제한 대조가
  // 이 한 조건을 함께 본다 — 알리지 않은 채 적합만 막거나, 복구하지 못했다고
  // 알리면서 온라인 대조로 내보내지 않기 위해서다(숫돌 확인 화면과 같다).
  const ocrDropped = droppedOcr !== null && ocr === null;

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

  // 작업(절단/연삭)을 고르지 않았으면 작업 선택 화면으로 되돌린다. 이력 화면의
  // "새 점검 시작"이나 주소 직접 입력으로 들어오면 작업 목적 대조 없이 규격이
  // 대조됐다 — 같은 절단날이 연삭 작업에서는 부적합인데 작업 미선택이면 적합이었다.
  // 리다이렉트가 걸리는 동안에도 촬영 화면을 열지 않는다(숫돌 화면과 같은 이유).
  if (!purposeReady) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-lg text-slate-400">{t('scan.purposeFirst')}</p>
      </main>
    );
  }

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
          {isNetworkFailure(error) && (
            <div className="flex flex-col gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
              <p className="text-base leading-relaxed text-yellow-100">
                {t('scan.offline.continueHint')}
              </p>
              <button
                type="button"
                onClick={continueOffline}
                className="min-h-14 rounded-lg border border-yellow-500/60 text-lg font-semibold text-yellow-100 active:bg-yellow-500/20"
              >
                {t('scan.offline.continue')}
              </button>
            </div>
          )}
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
      {/* 판독값을 사진과 같은 화면에서 대조한다. 「읽어낸 원문」은 AI가 읽은
          글자라 오독을 잡는 근거가 되지 못한다 — 사진이 유일한 독립 근거다. */}
      {photo && (
        <div className="flex flex-col gap-2">
          <ZoomablePhoto
            blob={photo}
            label={t('history.grinderPhoto')}
            className="mx-auto w-full max-w-xs"
          />
          <p className="text-base leading-relaxed text-slate-400">
            {t('scan.photoCompareHint')}
          </p>
        </div>
      )}
      {offline && (
        <p
          role="status"
          className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-base leading-relaxed text-yellow-100"
        >
          ⚠ {t('scan.offline.notice')}
        </p>
      )}
      {localOnly && !offline && (
        <p
          role="status"
          className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-base leading-relaxed text-yellow-100"
        >
          ⚠ {t('scan.localOcr.notice')}
        </p>
      )}
      {/* 저장된 AI 판독을 읽을 수 없어 버렸다는 안내(숫돌 확인 화면과 같은 문구).
          이대로 확정하면 제한 대조가 되므로 적합이 나오지 않는다는 것과 푸는 길도
          여기서 알린다. */}
      {ocrDropped && (
        <p
          role="status"
          className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-base leading-relaxed text-yellow-100"
        >
          ⚠ {t('draft.warn.ocr')}
        </p>
      )}
      <SavedGrinderPanel
        currentFields={{
          model: form.model,
          noLoadRPM: form.noLoadRPM,
          maxWheelDiameter: form.maxWheelDiameter,
          spindleThread: mounting.spindleThread,
          guardType: mounting.guardType,
          guardSize: mounting.guardSize,
        }}
        onApply={applySavedGrinder}
      />
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
