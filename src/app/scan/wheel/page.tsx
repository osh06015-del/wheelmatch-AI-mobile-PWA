'use client';

// 2단계 — 숫돌 라벨 촬영과 값 확인. 확인이 끝나면 규칙엔진이 대조한다.

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ZoomablePhoto } from '@/components/BlobPhoto';
import { CameraView } from '@/components/CameraView';
import { CaptureQualityNotice } from '@/components/CaptureQualityNotice';
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
import {
  WheelExamPanel,
  type ExtraExamView,
} from '@/components/WheelExamPanel';
import { WheelTypeConfirm } from '@/components/WheelTypeConfirm';
import { formDraftStore } from '@/lib/draft/draftStore';
import {
  FORM_DRAFT_SAVE_DELAY_MS,
  FORM_DRAFT_SCHEMA_VERSION,
  recoverWheelFormDraft,
} from '@/lib/draft/formDraftModel';
import { WHEEL_FIELD_GUIDE } from '@/lib/guide/fieldGuide';
import { useLocale, type MessageKey } from '@/lib/i18n';
import { analysisErrorText } from '@/lib/i18n/errors';
import {
  captureReviewSettled,
  nextCaptureReview,
  prepareCapture,
  toCaptureQualityCheck,
  type CaptureReview,
} from '@/lib/image/captureCheck';
import { conditionItemsFor } from '@/lib/rules/profiles';
import { getWheelExaminer } from '@/lib/vision/wheelExam';
import {
  EXTRA_EXAM_VIEWS,
  examVisibleDamage,
  notRunReasonFrom,
  wheelExamBlock,
  wheelExamRequired,
  type WheelExamBlock,
} from '@/lib/vision/wheelExamSafety';
import {
  confirmedWheelSpec,
  wheelTypeDiffersFromSuggestion,
} from '@/lib/ocr/confirm';
import { isNetworkFailure } from '@/lib/ocr/errors';
import { getExtractor } from '@/lib/ocr/extractor';
import { normalizeExpiry } from '@/lib/ocr/parser';
import { isGrinderConditionComplete } from '@/lib/safety/grinderCondition';
import {
  EMPTY_WHEEL_CONDITION,
  isWheelConditionComplete,
  pickWheelCondition,
} from '@/lib/safety/wheelCondition';
import { useInspection } from '@/lib/state/inspection';
import type {
  CaptureQualityMetrics,
  OcrTelemetry,
  WheelCondition,
  WheelExamNotRunReason,
  WheelExamResult,
  WheelPurpose,
  WheelSpec,
  WheelType,
} from '@/lib/rules/types';

/** review: 사진 상태 경고가 있거나 사진을 열지 못해 서버로 보내기 전에 멈춘 상태 */
type Phase = 'capture' | 'analyzing' | 'review' | 'confirm' | 'error';

/** 다각도 확인이 진행을 막는 이유별 안내 문구. */
const EXAM_BLOCK_MESSAGE: Readonly<Record<WheelExamBlock, MessageKey>> = {
  photosMissing: 'exam.block.photosMissing',
  notAnalyzed: 'exam.block.notAnalyzed',
  retakeRequired: 'exam.block.retakeRequired',
  needsAcknowledge: 'exam.block.needsAcknowledge',
  needsManualContinue: 'exam.block.needsManualContinue',
  captureReview: 'exam.block.captureReview',
};

const EMPTY_EXAM_SLOTS = { back: null, edge: null, bore: null } as const;

interface FormState {
  maxRPM: string;
  diameter: string;
  thickness: string;
  purpose: string;
  /** 라벨의 유효기한 표기. 정규화는 confirmedWheelSpec이 한다. */
  expiry: string;
  /** 작업자가 실물을 보고 고른 종류. 처음에는 AI 제안값이 들어간다. */
  wheelType: WheelType;
  /** 부속품 이름(선택). 종류를 특정하지 못했을 때(other·unknown)만 보여준다. */
  accessoryName: string;
}

export default function WheelScanPage() {
  const router = useRouter();
  const { t } = useLocale();
  const {
    declaredPurpose,
    grinder,
    grinderCondition,
    hydrating,
    setWheel,
    setWheelCondition,
    setWheelExam,
    setCaptureCheck,
    setOfflineSlot,
  } = useInspection();

  const [phase, setPhase] = useState<Phase>('capture');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [ocr, setOcr] = useState<WheelSpec | null>(null);
  const [captureMetrics, setCaptureMetrics] =
    useState<CaptureQualityMetrics | null>(null);
  const [ocrTelemetry, setOcrTelemetry] = useState<OcrTelemetry | null>(null);
  const [form, setForm] = useState<FormState>({
    maxRPM: '',
    diameter: '',
    thickness: '',
    purpose: 'unknown',
    expiry: '',
    wheelType: 'unknown',
    accessoryName: '',
  });
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [condition, setCondition] = useState<WheelCondition>({
    ...EMPTY_WHEEL_CONDITION,
  });
  // 문장이 아니라 오류 자체를 둔다. 문장은 그릴 때 작업자가 고른 언어로 만든다.
  const [error, setError] = useState<unknown>(null);
  // 라벨 사진 한 자리의 사진 상태 경고와 넣은 횟수.
  const [labelReview, setLabelReview] = useState<CaptureReview | null>(null);
  // 서버에 닿지 못해 작업자가 라벨 값을 직접 넣는 중인가(오프라인 제한 대조).
  const [offline, setOffline] = useState(false);
  // 서버 분석이 아니라 로컬 OCR(tesseract)로 읽었거나 기기가 오프라인이었는가.
  // 값은 있지만 서버라는 두 번째 눈이 없었던 것이라 offline과 같은 제한 판정으로 남긴다.
  const [localOnly, setLocalOnly] = useState(false);
  // 새로고침 경합 방지: 사용자가 이미 새 사진을 찍거나 직접 입력을 골랐으면
  // 뒤늦게 도착한 draft 복원을 적용하지 않는다.
  const actedRef = useRef(false);

  // ── 다각도 외관 확인 ──
  // 사진은 이 화면이 들고 있다가 proceed()에서 한 번에 저장소로 넘긴다
  // (라벨 사진·OCR 결과와 같은 방식).
  const [examPhotos, setExamPhotos] = useState<
    Record<ExtraExamView, Blob | null>
  >({ back: null, edge: null, bore: null });
  const [exam, setExam] = useState<WheelExamResult | null>(null);
  const [examAnalyzing, setExamAnalyzing] = useState(false);
  const [examError, setExamError] = useState<unknown>(null);
  const [examAcknowledged, setExamAcknowledged] = useState(false);
  // 실패했을 때 무엇 때문이었는지. 실패한 그 순간에 정해둔다 — 나중에 다시
  // 판단하면 그 사이에 기기가 온라인으로 돌아와 원인이 바뀐다.
  const [examNotRunReason, setExamNotRunReason] =
    useState<WheelExamNotRunReason | null>(null);
  // AI가 확인하지 못한 채 작업자 직접점검으로 진행하겠다는 확인.
  const [examManualContinue, setExamManualContinue] = useState(false);
  // 추가 사진 자리별 사진 상태 경고와 원시 측정값. 사진과 수명을 같이 한다.
  const [examReviews, setExamReviews] =
    useState<Record<ExtraExamView, CaptureReview | null>>(EMPTY_EXAM_SLOTS);
  const [examMetrics, setExamMetrics] =
    useState<Record<ExtraExamView, CaptureQualityMetrics | null>>(
      EMPTY_EXAM_SLOTS,
    );

  // 확인 화면에서 수정 중인 입력값을 새로고침 넘어 복원한다. "다음"을 누르기
  // 전까지는 이 저장소에만 남는다. 복원해도 userConfirmed·Gate·다각도 확인은
  // 다시 받는다(자동 완료 금지) — 사진과 같은 수명이라 새로고침으로 어차피 사라진다.
  useEffect(() => {
    let cancelled = false;
    void formDraftStore.load('wheel').then((result) => {
      if (cancelled || actedRef.current || result.status !== 'found') return;
      const recovered = recoverWheelFormDraft(result.draft);
      if (!recovered) return;
      setForm({
        maxRPM: recovered.fields.maxRPM,
        diameter: recovered.fields.diameter,
        thickness: recovered.fields.thickness,
        purpose: recovered.fields.purpose,
        expiry: recovered.fields.expiry,
        wheelType: recovered.fields.wheelType as WheelType,
        accessoryName: recovered.fields.accessoryName,
      });
      setOcr(recovered.ocr);
      setOffline(recovered.offline);
      if (recovered.photo) {
        setPhoto(recovered.photo);
        setPhase('confirm');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 확인 화면에 있는 동안 입력을 모아 저장한다(debounce).
  useEffect(() => {
    if (phase !== 'confirm') return;
    const timer = window.setTimeout(() => {
      void formDraftStore.save({
        slot: 'wheel',
        schemaVersion: FORM_DRAFT_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        fields: form,
        photo,
        ocr,
        offline,
      });
    }, FORM_DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase, form, photo, ocr, offline]);

  // 그라인더를 찍지 않았거나 장비 상태를 직접 확인하지 않은 경우 1단계로 되돌린다.
  // 화면 이동으로 Gate를 건너뛸 수 있으면 Gate가 아니다.
  const grinderReady =
    grinder !== null && isGrinderConditionComplete(grinderCondition);
  useEffect(() => {
    if (!hydrating && !grinderReady) router.replace('/scan/grinder');
  }, [hydrating, grinderReady, router]);

  // AI가 본 종류와 작업자가 고른 종류가 다르면 둘 중 하나가 틀렸다. 어느 쪽인지
  // 앱은 모르므로, 작업자가 실물을 다시 보고 직접 확인을 체크해야 넘어간다.
  const typeNeedsConfirm =
    wheelTypeDiffersFromSuggestion(ocr, form.wheelType) && !userConfirmed;

  // 고른 종류에서 작업자가 답해야 하는 상태 항목(다이아몬드는 세그먼트, 플랩은
  // 날개·박리 등). 종류를 바꾸면 항목도 바뀐다 — 이전 답은 기록할 때 걸러낸다.
  const conditionKeys = conditionItemsFor(form.wheelType);

  /** 다각도 확인을 처음 상태로 되돌린다. 새 숫돌이면 이전 결과를 이어 쓰지 않는다. */
  const resetExam = () => {
    setExamPhotos({ back: null, edge: null, bore: null });
    setExam(null);
    setExamError(null);
    setExamAcknowledged(false);
    setExamNotRunReason(null);
    setExamManualContinue(false);
    setExamReviews(EMPTY_EXAM_SLOTS);
    setExamMetrics(EMPTY_EXAM_SLOTS);
  };

  /**
   * 새 라벨 사진을 받는다.
   *
   * 서버로 보내기 전에 사진 상태를 본다(prepareCapture). 경고가 있으면 멈추고
   * 작업자가 다시 찍기와 그래도 사용 중에서 고른다. 열 수 없는 사진은 보내지
   * 않는다. 경고가 없으면 곧바로 판독으로 넘어간다.
   */
  async function analyze(source: Blob) {
    // 새로고침 복원보다 사용자의 새 촬영이 우선한다. 뒤늦게 도착한 복원을 막는다.
    actedRef.current = true;
    setPhase('analyzing');
    setError(null);
    // 새 사진이다. 이전 사진으로 읽은 값과 확인은 버린다. 라벨 사진은 다각도
    // 확인의 앞면이기도 하므로 다각도 확인 결과도 함께 버린다.
    setPhoto(null);
    setOcr(null);
    setOcrTelemetry(null);
    setCaptureMetrics(null);
    setUserConfirmed(false);
    setOffline(false);
    setLocalOnly(false);
    resetExam();
    // 이전 사진에 대한 확인 화면 draft는 이제 근거가 없다.
    void formDraftStore.remove('wheel');
    try {
      // 원본 사진은 Vercel 함수의 4.5MB 요청 한도를 넘길 수 있다. 먼저 줄인다.
      const prepared = await prepareCapture(source);
      const next = nextCaptureReview(labelReview, prepared);
      setLabelReview(next);
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

  /** 준비된 라벨 사진을 판독한다. 같은 사진으로 다시 시도할 때도 이 함수만 부른다. */
  async function extract(blob: Blob) {
    setPhase('analyzing');
    setError(null);
    try {
      const extractor = getExtractor();
      const spec = await extractor.extractWheel(blob);
      const telemetry = extractor.getLastTelemetry?.() ?? null;
      setOcr(spec);
      setOcrTelemetry(telemetry);
      setOffline(false);
      // 서버 분석이 아니라 로컬 OCR로 읽었거나(엔진이 tesseract) 기기가
      // 오프라인이면 직접 입력(offline)과 같은 제한 판정으로 남긴다.
      setLocalOnly(telemetry?.engine === 'tesseract' || !navigator.onLine);
      setForm({
        maxRPM: fromNumber(spec.maxRPM),
        diameter: fromNumber(spec.diameter),
        thickness: fromNumber(spec.thickness),
        purpose: spec.purpose,
        // 모델이 읽은 문자열을 그대로 보여준다. 정규화한 값을 되돌려 보여주면
        // 라벨에 무엇이 찍혀 있었는지 사용자가 대조할 수 없다.
        expiry: spec.markings?.expiryRaw ?? '',
        // AI 판별은 초기 제안값으로만 넣는다. 최종값은 작업자가 고른다.
        wheelType: spec.wheelType,
        // 새 사진은 새 부속품일 수 있다. 이전 이름을 이어 쓰지 않는다.
        accessoryName: '',
      });
      setUserConfirmed(false);
      // 새 사진은 새 숫돌일 수 있다. 이전 숫돌의 직접 확인을 이어 쓰지 않는다.
      setCondition({ ...EMPTY_WHEEL_CONDITION });
      setPhase('confirm');
    } catch (caught) {
      setError(caught);
      setPhase('error');
    }
  }

  /**
   * 서버에 닿지 못했을 때 작업자가 라벨을 직접 보고 값을 넣는다.
   *
   * 값을 지어내지 않는다 — 입력칸과 종류는 비어 있고(모르겠음) 신뢰도는 낮음에서
   * 시작한다. 라벨 사진은 남겨 둔다(결과 화면의 서버 재분석에 쓴다).
   */
  function continueOffline() {
    actedRef.current = true;
    setOffline(true);
    setLocalOnly(false);
    setOcr(null);
    setOcrTelemetry(null);
    setForm({
      maxRPM: '',
      diameter: '',
      thickness: '',
      purpose: 'unknown',
      expiry: '',
      wheelType: 'unknown',
      accessoryName: '',
    });
    setUserConfirmed(false);
    setCondition({ ...EMPTY_WHEEL_CONDITION });
    setError(null);
    setPhase('confirm');
  }

  /** 경고를 보고도 이 라벨 사진을 쓴다. 열지 못한 사진에는 이 길이 없다. */
  function acceptWarnedLabel() {
    if (!photo || !labelReview || labelReview.decodeFailed) return;
    setLabelReview({ ...labelReview, usedDespiteWarning: true });
    void extract(photo);
  }

  /**
   * 추가 사진 한 장을 받는다.
   *
   * 라벨 사진과 같은 준비(prepareCapture: 축소·측정·경고)를 거친다 — 거치지
   * 않으면 휴대폰 원본이 그대로 올라가 요청 한도를 넘는다. 사진이 바뀌면 이전
   * 분석 결과는 그 사진을 보고 낸 것이 아니므로 함께 버린다. 작업자가 그 결과를
   * 보고 한 확인(이상 징후 확인·직접점검 진행)도 같이 버린다 — 다른 사진을 보고
   * 한 확인을 새 사진에 이어 쓰면 확인하지 않은 것을 확인한 것으로 남긴다.
   *
   * 열지 못한 사진은 자리에 넣지 않는다. 그 자리는 빈 채로 남아 진행이 막힌다
   * (AI 실패처럼 직접점검으로 넘어가는 길도 없다 — 사진 자체가 없기 때문이다).
   */
  async function pickExamPhoto(view: ExtraExamView, file: File) {
    setExam(null);
    setExamError(null);
    setExamAcknowledged(false);
    setExamNotRunReason(null);
    setExamManualContinue(false);
    const prepared = await prepareCapture(file);
    setExamReviews((current) => ({
      ...current,
      [view]: nextCaptureReview(current[view], prepared),
    }));
    setExamPhotos((current) => ({
      ...current,
      [view]: prepared.status === 'ready' ? prepared.blob : null,
    }));
    setExamMetrics((current) => ({
      ...current,
      [view]: prepared.status === 'ready' ? prepared.metrics : null,
    }));
  }

  /** 경고를 보고도 그 자리의 사진을 쓴다. */
  function acceptWarnedExamPhoto(view: ExtraExamView) {
    setExamReviews((current) => {
      const review = current[view];
      if (!review || review.decodeFailed) return current;
      return { ...current, [view]: { ...review, usedDespiteWarning: true } };
    });
  }

  /** 네 장을 한 번에 보내 살펴본다. 앞면은 라벨 사진을 그대로 쓴다. */
  async function runExam() {
    const { back, edge, bore } = examPhotos;
    if (!photo || !back || !edge || !bore) return;
    setExamAnalyzing(true);
    setExamError(null);
    setExamAcknowledged(false);
    // 다시 시도하는 것이므로 앞선 실패에 대한 확인은 지운다. 새 시도가 또
    // 실패하면 작업자는 다시 확인해야 한다.
    setExamNotRunReason(null);
    setExamManualContinue(false);
    try {
      const result = await getWheelExaminer().examine({
        front: photo,
        back,
        edge,
        bore,
      });
      setExam(result);
    } catch (caught) {
      // 실패를 결과로 꾸미지 않는다. 결과는 비워 두고 실패만 남긴다 —
      // 화면은 AI가 확인하지 못했다고 알리고, 작업자 확인 Gate는 그대로 남는다.
      setExam(null);
      setExamError(caught);
      // 실패를 not_observed·unassessable로 바꾸지 않는다. 실행되지 않았다는
      // 사실과 그 이유만 남긴다.
      setExamNotRunReason(notRunReasonFrom(caught, navigator.onLine));
    } finally {
      setExamAnalyzing(false);
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

  function updateWheelType(next: WheelType) {
    setForm((current) => ({
      ...current,
      wheelType: next,
      // 부속품 이름은 other·unknown에서만 보이는 입력이다. 종류를 바꾼 뒤에도
      // 남으면 이름이 다른 종류의 기록에 섞이거나(예: 결합숫돌로 바꿨는데
      // 예전 이름이 그대로 저장), 되돌아왔을 때 이전 부속품의 이름이 이번
      // 부속품 것처럼 보인다.
      accessoryName: '',
    }));
    // 앞서 한 직접 확인은 다른 종류를 두고 한 확인이었다. 다시 받는다.
    setUserConfirmed(false);
    // 종류마다 Wheel Condition Gate 항목 구성이 다르다(conditionItemsFor).
    // 초기화하지 않으면 이전 종류에서 확인한 damageFree 같은 공통 키가 새
    // 종류에서도 이미 확인된 것처럼 남는다 — 다시 누르지 않아도 통과한다.
    setCondition({ ...EMPTY_WHEEL_CONDITION });
    // 다각도 확인은 이전 종류를 보고 한 것이다. 새 종류가 요구하지 않아
    // 화면에서 사라져도 내부 상태가 남으면 proceed()가 그 결과를 그대로
    // 저장한다 — 평형 결합숫돌용 확인이 다른 종류의 기록에 섞인다.
    resetExam();
  }

  function proceed() {
    if (!isWheelConditionComplete(condition, conditionKeys)) return;
    // 버튼만 막으면 다른 경로로 불렸을 때 샌다. 여기서도 막는다.
    if (typeNeedsConfirm) return;
    if (examBlock !== null) return;
    // 화면이 가진 값만 넘기고, OCR 원본에서 무엇을 이어갈지는 confirmedWheelSpec이
    // 정한다. 여기서 필드를 하나하나 옮겨 적으면 선택 필드(markings·rpmSource)가
    // 조용히 빠진다 — 실제로 그렇게 빠져서 표기 일치 검사가 돌지 않았다.
    const spec = confirmedWheelSpec(ocr, {
      maxRPM: toNumberOrNull(form.maxRPM),
      diameter: toNumberOrNull(form.diameter),
      thickness: toNumberOrNull(form.thickness),
      purpose: form.purpose as WheelPurpose,
      wheelType: form.wheelType,
      expiryText: form.expiry,
      accessoryName: form.accessoryName,
      userConfirmed,
      // 다각도 확인은 의심을 더하는 방향으로만 반영된다(mergeVisibleDamage).
      examVisibleDamage: examVisibleDamage(exam),
    });
    // setWheel이 이전 숫돌의 다각도 확인을 지운다. 그 뒤에 이번 결과를 넣는다.
    setWheel(spec, photo, ocr, captureMetrics, ocrTelemetry);
    setCaptureCheck('wheel', toCaptureQualityCheck(labelReview));
    // setWheel이 숫돌 쪽 오프라인 표시를 지운다. 그 뒤에 이번 라벨의 판독 경로를 넣는다.
    // 직접 입력(offline)과 로컬 OCR(localOnly) 모두 서버 대조 없이 읽은 값이다.
    setOfflineSlot('wheel', offline || localOnly);
    // 확정됐다. 확인 화면 draft는 더 이상 필요 없다.
    void formDraftStore.remove('wheel');
    setWheelExam({
      exam,
      // 확인하지 못한 채 진행하는 경우에만 채운다. 결과와 둘 중 하나다 —
      // 둘 다 남기면 확인한 것인지 못 한 것인지 되짚을 수 없다.
      notRun:
        exam === null && examNotRunReason !== null
          ? {
              reason: examNotRunReason,
              acknowledgedAt: new Date().toISOString(),
            }
          : null,
      photos: examPhotos,
      acknowledged: examAcknowledged,
      captureChecks: {
        back: toCaptureQualityCheck(examReviews.back),
        edge: toCaptureQualityCheck(examReviews.edge),
        bore: toCaptureQualityCheck(examReviews.bore),
      },
      captureMetrics: examMetrics,
    });
    // 이 종류에서 물은 항목의 답만 남긴다. 다른 종류로 답한 항목이 섞이지 않게.
    setWheelCondition(pickWheelCondition(condition, conditionKeys));
    router.push('/result');
  }

  // 다각도 확인이 진행을 막는가. 막는 이유는 화면이 문구로 알린다.
  // Profile이 다각도 사진을 요구하는 종류(평형 결합숫돌)에만 요구한다 — 나머지 종류는
  // 규격 대조 자체가 판정불가로 끝나므로 사진을 더 받아도 결과가 달라지지 않는다.
  const examBlock = wheelExamBlock({
    required: wheelExamRequired(form.wheelType),
    photosReady: Object.values(examPhotos).every((photo) => photo !== null),
    captureReviewPending: EXTRA_EXAM_VIEWS.some(
      (view) =>
        examReviews[view] !== null && !captureReviewSettled(examReviews[view]),
    ),
    exam,
    acknowledged: examAcknowledged,
    analysisFailed: examError !== null,
    manualContinueAcknowledged: examManualContinue,
  });

  const labelNeedsReview =
    form.maxRPM.trim() === '' ||
    form.diameter.trim() === '' ||
    form.purpose === 'unknown' ||
    (ocr?.confidence === 'low' && !userConfirmed);
  // 유효기한을 묻지 않는 종류(근거 없음)에는 유효기한 경고도 띄우지 않는다.
  const expiryNeedsReview =
    conditionKeys.includes('expiryValid') &&
    normalizeExpiry(form.expiry.trim() === '' ? null : form.expiry) === null;

  const fields: FieldSpec[] = [
    {
      key: 'maxRPM',
      label: t('field.maxRPM'),
      unit: 'rpm',
      kind: 'number',
      value: form.maxRPM,
      guide: WHEEL_FIELD_GUIDE.maxRPM,
    },
    {
      key: 'diameter',
      label: t('field.diameter'),
      unit: 'mm',
      kind: 'number',
      value: form.diameter,
      guide: WHEEL_FIELD_GUIDE.diameter,
    },
    {
      key: 'thickness',
      label: t('field.thickness'),
      unit: 'mm',
      kind: 'number',
      value: form.thickness,
      guide: WHEEL_FIELD_GUIDE.thickness,
    },
    {
      key: 'purpose',
      label: t('field.purpose'),
      kind: 'purpose',
      value: form.purpose,
      guide: WHEEL_FIELD_GUIDE.purpose,
    },
    {
      key: 'expiry',
      label: t('field.expiry'),
      unit: 'MM/YYYY',
      kind: 'text',
      value: form.expiry,
      guide: WHEEL_FIELD_GUIDE.expiry,
    },
    // 종류를 특정하지 못했을 때만 보여준다. 이름이 있는 종류는 종류 자체가
    // 식별값이라 따로 물을 필요가 없다.
    ...(form.wheelType === 'other' || form.wheelType === 'unknown'
      ? [
          {
            key: 'accessoryName',
            label: t('field.accessoryName'),
            kind: 'text',
            value: form.accessoryName,
          } satisfies FieldSpec,
        ]
      : []),
  ];

  // 리다이렉트가 걸리는 동안에도 촬영 화면을 열어주지 않는다.
  // effect만 믿으면 한 프레임 동안 Gate 뒤가 보이고, 그 사이에 촬영이 시작된다.
  if (!grinderReady) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-lg text-slate-400">{t('scan.wheel.grinderFirst')}</p>
      </main>
    );
  }

  if (phase === 'capture') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="2 / 2" title={t('scan.wheel.title')} />
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
          guideLabel={t('scan.wheel.guide')}
          onCapture={(blob) => void analyze(blob)}
          onPickFile={(file) => void analyze(file)}
        />
      </main>
    );
  }

  if (phase === 'review') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="2 / 2" title={t('scan.wheel.title')} />
        <div className="flex flex-1 flex-col justify-center gap-4 px-6 py-6">
          {photo && (
            <ZoomablePhoto
              blob={photo}
              label={t('history.wheelPhoto')}
              className="mx-auto w-full max-w-xs"
            />
          )}
          <CaptureQualityNotice
            review={labelReview}
            onRetake={() => setPhase('capture')}
            onUseAnyway={acceptWarnedLabel}
          />
        </div>
      </main>
    );
  }

  if (phase === 'analyzing') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="2 / 2" title={t('scan.wheel.title')} />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <div
            aria-hidden
            className="h-14 w-14 animate-spin rounded-full border-4 border-slate-700 border-t-slate-200"
          />
          <p className="text-lg text-slate-300">{t('scan.wheel.analyzing')}</p>
        </div>
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main className="flex flex-1 flex-col">
        <ScanHeader step="2 / 2" title={t('scan.wheel.title')} />
        <div className="flex flex-1 flex-col justify-center gap-4 px-6">
          <p
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-4 text-lg leading-relaxed text-red-200"
          >
            {analysisErrorText(error, 'scan.wheel.failed', t)}
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
      <ScanHeader step="2 / 2" title={t('scan.wheel.title')} bare />
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
      {grinder && (
        <RequirementBanner
          grinder={grinder}
          declaredPurpose={declaredPurpose}
        />
      )}
      <FieldConfirm
        title={t('scan.confirmTitle')}
        fields={fields}
        confidence={ocr?.confidence ?? 'low'}
        rawText={ocr?.rawText ?? ''}
        onChange={updateField}
      />
      <WheelTypeConfirm
        value={form.wheelType}
        suggested={ocr?.wheelType ?? 'unknown'}
        onChange={updateWheelType}
      />
      <ManualConfirmToggle
        checked={userConfirmed}
        onChange={setUserConfirmed}
      />
      {/* 다각도 외관 확인은 작업자 확인 Gate **앞에** 둔다. AI가 본 것을 먼저
          보여주고, 그 다음에 사람이 실물을 보고 직접 누르는 순서다. */}
      {wheelExamRequired(form.wheelType) && (
        <WheelExamPanel
          photos={examPhotos}
          reviews={examReviews}
          onPick={(view, file) => void pickExamPhoto(view, file)}
          onUseAnyway={acceptWarnedExamPhoto}
          onAnalyze={() => void runExam()}
          analyzing={examAnalyzing}
          exam={exam}
          failureText={
            examError === null
              ? null
              : `${analysisErrorText(examError, 'exam.failed', t)} ${t('exam.failedFallback')}`
          }
          acknowledged={examAcknowledged}
          onAcknowledge={setExamAcknowledged}
          manualContinue={examManualContinue}
          onManualContinue={setExamManualContinue}
        />
      )}
      <WheelConditionGate
        condition={condition}
        keys={conditionKeys}
        visibleDamage={ocr?.visibleDamage ?? 'unknown'}
        labelNeedsReview={labelNeedsReview}
        expiryNeedsReview={expiryNeedsReview}
        onChange={(key, value) =>
          setCondition((current) => ({ ...current, [key]: value }))
        }
      />
      <div className="flex flex-col gap-3">
        {typeNeedsConfirm && (
          <p className="text-base leading-relaxed text-yellow-200">
            {t('wheelTypeConfirm.needsConfirm')}
          </p>
        )}
        {examBlock !== null && (
          <p className="text-base leading-relaxed text-yellow-200">
            {t(EXAM_BLOCK_MESSAGE[examBlock])}
          </p>
        )}
        <button
          type="button"
          onClick={proceed}
          disabled={
            !isWheelConditionComplete(condition, conditionKeys) ||
            typeNeedsConfirm ||
            examBlock !== null
          }
          className="min-h-14 rounded-lg bg-green-500 text-lg font-bold text-slate-950 active:bg-green-400 disabled:bg-slate-700 disabled:text-slate-400"
        >
          {t('scan.wheel.proceed')}
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
