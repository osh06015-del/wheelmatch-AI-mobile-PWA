'use client';

// 다각도 외관 이상 징후 확인 화면.
//
// 앞면(라벨 사진)에 뒷면·가장자리·중심구멍 세 장을 더해 한 번에 살펴본다.
//
// **이 화면은 "손상 없음"을 말하지 않는다.** AI가 찾지 못한 경우에도 작업자가
// 실물을 직접 보라고 안내할 뿐이고, 아래 작업자 확인 Gate(WheelConditionGate)를
// 대신 눌러주지 않는다. 경계 문구는 결과와 무관하게 항상 띄운다.

import { ZoomablePhoto } from './BlobPhoto';
import { WheelExamFindings } from './WheelExamFindings';

import { useLocale, type MessageKey, type Translate } from '@/lib/i18n';
import { EXAM_ISSUE_LABEL, EXAM_VIEW_LABEL } from '@/lib/i18n/examLabels';
import {
  EXTRA_EXAM_VIEWS,
  viewsNeedingRetake,
} from '@/lib/vision/wheelExamSafety';
import type { WheelExamResult } from '@/lib/rules/types';

export type ExtraExamView = (typeof EXTRA_EXAM_VIEWS)[number];

const VIEW_HINT: Readonly<Record<ExtraExamView, MessageKey>> = {
  back: 'exam.view.backHint',
  edge: 'exam.view.edgeHint',
  bore: 'exam.view.boreHint',
};

/**
 * 사진 한 장을 넣는 자리.
 *
 * 촬영과 갤러리를 모두 연다. capture 속성을 붙인 입력은 휴대폰에서 카메라를
 * 바로 열고, 붙이지 않은 입력은 갤러리를 연다 — CameraView와 같은 이유로
 * 둘을 함께 둔다(현장에서 미리 찍어둔 사진을 쓰는 경우가 많다).
 *
 * 넣은 사진은 그 자리에서 미리 보여주고 눌러서 크게 볼 수 있게 한다. 무엇을
 * 넣었는지 보지 못하면 엉뚱한 사진을 넣고도 확인했다고 넘어가게 된다.
 * 버튼은 자리마다 따로 있어 한 장만 다시 넣을 수 있다 — 세 장을 한꺼번에 다시
 * 받게 하면 현장에서는 아무도 다시 찍지 않는다.
 */
function ViewSlot({
  view,
  photo,
  needsRetake,
  onPick,
  t,
}: {
  view: ExtraExamView;
  photo: Blob | null;
  needsRetake: boolean;
  onPick: (view: ExtraExamView, file: File) => void;
  t: Translate;
}) {
  const label = t(EXAM_VIEW_LABEL[view]);

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl px-4 py-4 ${
        needsRetake
          ? 'border border-yellow-500/50 bg-yellow-500/10'
          : 'bg-slate-800'
      }`}
    >
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-slate-100">{label}</p>
        <p className="text-base leading-relaxed text-slate-400">
          {t(VIEW_HINT[view])}
        </p>
        <p
          className={`text-base font-semibold ${
            photo ? 'text-slate-200' : 'text-slate-500'
          }`}
        >
          {photo ? t('exam.photoReady') : t('exam.photoMissing')}
        </p>
      </div>

      {photo && (
        <ZoomablePhoto blob={photo} label={label} className="max-w-40" />
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-slate-600 bg-slate-900 text-base font-bold text-slate-200 active:bg-slate-700">
          {photo ? t('exam.retakeView', { view: label }) : t('exam.capture')}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            // 자리마다 같은 버튼이 셋씩 있다. 이름이 모두 '촬영'이면 화면을
            // 보지 않는 작업자는 어느 자리의 촬영인지 알 수 없다.
            aria-label={t('exam.captureView', { view: label })}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPick(view, file);
              event.target.value = '';
            }}
          />
        </label>
        <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-slate-600 bg-slate-900 text-base font-bold text-slate-200 active:bg-slate-700">
          {t('exam.gallery')}
          <input
            type="file"
            accept="image/*"
            aria-label={t('exam.galleryView', { view: label })}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPick(view, file);
              event.target.value = '';
            }}
          />
        </label>
      </div>
    </li>
  );
}

export interface WheelExamPanelProps {
  photos: Record<ExtraExamView, Blob | null>;
  onPick: (view: ExtraExamView, file: File) => void;
  onAnalyze: () => void;
  analyzing: boolean;
  exam: WheelExamResult | null;
  /** 분석이 서버·네트워크 오류로 실패했는가. 문장은 화면이 고른다 */
  failureText: string | null;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
  /** AI 확인 없이 작업자 직접점검으로 진행하겠다고 확인했는가 */
  manualContinue: boolean;
  onManualContinue: (value: boolean) => void;
}

export function WheelExamPanel({
  photos,
  onPick,
  onAnalyze,
  analyzing,
  exam,
  failureText,
  acknowledged,
  onAcknowledge,
  manualContinue,
  onManualContinue,
}: WheelExamPanelProps) {
  const { t } = useLocale();
  const retakeViews = viewsNeedingRetake(exam);
  const ready = EXTRA_EXAM_VIEWS.filter((view) => photos[view] !== null);
  const photosReady = ready.length === EXTRA_EXAM_VIEWS.length;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="wheel-exam-title">
      <div className="flex flex-col gap-2">
        <h2 id="wheel-exam-title" className="text-xl font-bold text-slate-100">
          {t('exam.title')}
        </h2>
        {/* 결과와 무관하게 항상 띄우는 경계 문구. 접거나 숨기지 않는다. */}
        <p className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-base leading-relaxed text-slate-300">
          {t('exam.boundary')}
        </p>
        <p className="text-base leading-relaxed text-slate-400">
          {t('exam.microCrack')}
        </p>
        <p className="text-base leading-relaxed text-slate-400">
          {t('exam.frontReused')}
        </p>
      </div>

      {/* 몇 장을 넣었는지 한눈에 보인다. 세 자리를 위아래로 훑어야 알 수 있으면
          한 장을 빠뜨린 채 확인 버튼만 계속 누르게 된다. */}
      <p
        role="status"
        className="text-base font-semibold leading-relaxed text-slate-300"
      >
        {t('exam.progress', {
          done: ready.length,
          total: EXTRA_EXAM_VIEWS.length,
        })}
      </p>

      <ul className="flex flex-col gap-3">
        {EXTRA_EXAM_VIEWS.map((view) => (
          <ViewSlot
            key={view}
            view={view}
            photo={photos[view]}
            needsRetake={retakeViews.includes(view)}
            onPick={onPick}
            t={t}
          />
        ))}
      </ul>

      <p className="text-base leading-relaxed text-slate-400">
        {t('exam.replaceNote')}
      </p>

      {!photosReady && (
        <p className="text-base leading-relaxed text-slate-400">
          {t('exam.missing')}
        </p>
      )}

      <button
        type="button"
        onClick={onAnalyze}
        disabled={!photosReady || analyzing}
        className="min-h-14 rounded-lg bg-slate-700 text-lg font-semibold text-slate-100 active:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
      >
        {analyzing ? t('exam.analyzing') : t('exam.analyze')}
      </button>

      {/* AI가 확인하지 못한 경우. 결과를 지어내지 않고, 조용히 넘어가지도
          않는다 — 작업자가 직접점검으로 진행하겠다고 명시적으로 확인해야
          다음으로 갈 수 있다(wheelExamBlock의 needsManualContinue). */}
      {failureText && (
        <div className="flex flex-col gap-3">
          <p
            role="alert"
            className="rounded-lg border border-slate-500 bg-slate-800 px-4 py-4 text-base leading-relaxed text-slate-200"
          >
            {failureText}
          </p>
          <label className="flex min-h-12 cursor-pointer items-start gap-4 rounded-lg bg-slate-800 px-4 py-4 active:bg-slate-700">
            <input
              type="checkbox"
              checked={manualContinue}
              onChange={(event) => onManualContinue(event.target.checked)}
              className="mt-1 h-6 w-6 shrink-0 accent-yellow-500"
            />
            <span className="text-base leading-relaxed text-slate-100">
              {t('exam.manualContinue')}
            </span>
          </label>
          <p className="text-base leading-relaxed text-slate-400">
            {t('exam.manualContinueHint')}
          </p>
        </div>
      )}

      {exam && exam.status === 'suspected' && (
        <div className="flex flex-col gap-3">
          <p
            role="alert"
            className="rounded-lg border-2 border-yellow-500 bg-yellow-500/15 px-4 py-4 text-lg font-bold leading-relaxed text-yellow-100"
          >
            ⚠ {t('exam.status.suspected')}
          </p>
          <WheelExamFindings findings={exam.findings} />
          <label className="flex min-h-12 cursor-pointer items-start gap-4 rounded-lg bg-slate-800 px-4 py-4 active:bg-slate-700">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => onAcknowledge(event.target.checked)}
              className="mt-1 h-6 w-6 shrink-0 accent-yellow-500"
            />
            <span className="text-base leading-relaxed text-slate-100">
              {t('exam.acknowledge')}
            </span>
          </label>
          {!acknowledged && (
            <p className="text-base text-yellow-200">{t('exam.blocked')}</p>
          )}
        </div>
      )}

      {exam && exam.status === 'not_observed' && (
        <p className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-4 text-base leading-relaxed text-slate-200">
          {t('exam.status.notObserved')}
        </p>
      )}

      {exam && exam.status === 'unassessable' && (
        <p
          role="alert"
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-4 text-base leading-relaxed text-yellow-100"
        >
          {t('exam.status.unassessable')}
        </p>
      )}

      {retakeViews.length > 0 && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-4 py-4"
        >
          <p className="text-base font-bold leading-relaxed text-yellow-100">
            {t('exam.retakeRequired')}
          </p>
          <ul className="flex flex-col gap-1">
            {exam?.photoQuality
              .filter((photo) => !photo.readable)
              .map((photo) => (
                <li
                  key={photo.view}
                  className="text-base leading-relaxed text-yellow-100"
                >
                  {t(EXAM_VIEW_LABEL[photo.view])}
                  {photo.issues.length > 0 &&
                    ` — ${photo.issues
                      .map((issue) => t(EXAM_ISSUE_LABEL[issue]))
                      .join(', ')}`}
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}
