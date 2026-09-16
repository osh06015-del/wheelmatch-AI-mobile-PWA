'use client';

// 다각도 외관 확인 근거 카드. 결과 화면과 이력 상세가 같은 카드를 쓴다.
//
// 이 카드가 지키는 것 세 가지.
//   1. **not_observed를 통과로 그리지 않는다.** "정상"·"안전"·"검사 통과"에
//      해당하는 말을 쓰지 않고, 찾지 못했다는 사실과 직접 확인하라는 요구를
//      함께 적는다.
//   2. **작업자 확인 항목 수에 섞이지 않는다.** 체크리스트·상태 Gate의 확인
//      개수는 사람이 누른 것만 센다. 이 카드는 AI가 본 것이고, 그렇다고 적는다.
//   3. **확인하지 못한 경우를 결과로 바꾸지 않는다.** 실행되지 않았으면
//      실행되지 않았다고만 적는다(WheelExamNotRun).
//
// 사진이 없는 옛 기록도 그대로 열려야 한다. 없는 것은 없다고 적을 뿐 오류를
// 내지 않는다.

import { ZoomablePhoto } from './BlobPhoto';
import { WheelExamFindings } from './WheelExamFindings';

import { useLocale } from '@/lib/i18n';
import {
  EXAM_ISSUE_LABEL,
  EXAM_NOT_RUN_LABEL,
  EXAM_STATUS_LABEL,
  EXAM_VIEW_LABEL,
} from '@/lib/i18n/examLabels';
import { formatDateTime } from '@/lib/record/datetime';
import type {
  WheelExamNotRun,
  WheelExamResult,
  WheelExamStatus,
  WheelExamView,
} from '@/lib/rules/types';

/** 결론 줄의 색. not_observed에도 초록(통과)을 쓰지 않는다. */
const STATUS_STYLE: Readonly<Record<WheelExamStatus, string>> = {
  suspected: 'border-yellow-500 bg-yellow-500/15 text-yellow-100',
  not_observed: 'border-slate-500 bg-slate-800 text-slate-100',
  unassessable: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-100',
};

export interface WheelExamEvidenceProps {
  exam?: WheelExamResult | null;
  /** 확인하지 못한 채 진행한 경우의 사유. exam과 둘 중 하나만 있다 */
  notRun?: WheelExamNotRun | null;
  acknowledged?: boolean;
  /** 저장된 사진. 옛 기록에는 없을 수 있다 */
  photos?: Partial<Record<WheelExamView, Blob | null | undefined>>;
}

export function WheelExamEvidence({
  exam,
  notRun,
  acknowledged,
  photos,
}: WheelExamEvidenceProps) {
  const { t } = useLocale();

  // 이 기능 도입 전 기록이거나 요구되지 않는 종류다. 빈 카드를 만들지 않는다.
  if (!exam && !notRun) return null;

  const views: WheelExamView[] = ['front', 'back', 'edge', 'bore'];
  const shown = views.filter((view) => photos?.[view]);
  const unreadable =
    exam?.photoQuality.filter((photo) => !photo.readable) ?? [];

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-4"
      aria-labelledby="wheel-exam-evidence-title"
    >
      <h3
        id="wheel-exam-evidence-title"
        className="text-lg font-bold text-slate-100"
      >
        {t('exam.evidence.title')}
      </h3>

      {exam ? (
        <p
          className={`rounded-lg border px-4 py-3 text-base font-bold leading-relaxed ${STATUS_STYLE[exam.status]}`}
        >
          {t(EXAM_STATUS_LABEL[exam.status])}
        </p>
      ) : (
        notRun && (
          <div className="flex flex-col gap-1 rounded-lg border border-slate-500 bg-slate-800 px-4 py-3">
            <p className="text-base font-bold leading-relaxed text-slate-100">
              {t('exam.evidence.notRun')}
            </p>
            <p className="text-base leading-relaxed text-slate-300">
              {t(EXAM_NOT_RUN_LABEL[notRun.reason])}
            </p>
            <p className="text-sm text-slate-400">
              {t('exam.evidence.notRunAt', {
                time: formatDateTime(notRun.acknowledgedAt),
              })}
            </p>
          </div>
        )
      )}

      {/* AI가 본 것이라는 사실을 결과와 같은 자리에서 적는다. 아래 작업자 확인
          항목 수에 섞이지 않는다는 것을 여기서 말해두지 않으면, 카드가 하나 더
          "확인됨"으로 읽힌다. */}
      <p className="text-base leading-relaxed text-slate-400">
        {t('exam.evidence.notCounted')}
      </p>

      {exam && exam.findings.length > 0 && (
        <WheelExamFindings findings={exam.findings} />
      )}

      {exam && exam.status === 'suspected' && exam.findings.length === 0 && (
        <p className="text-base leading-relaxed text-slate-300">
          {t('exam.evidence.noFindings')}
        </p>
      )}

      {unreadable.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-yellow-100">
            {t('exam.evidence.unreadablePhotos')}
          </p>
          <ul className="flex flex-col gap-1">
            {unreadable.map((photo) => (
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

      {acknowledged && (
        <p className="text-base leading-relaxed text-slate-300">
          {t('exam.evidence.acknowledged')}
        </p>
      )}

      {shown.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3">
          {shown.map((view) => (
            <li key={view} className="flex">
              <ZoomablePhoto
                blob={photos?.[view] as Blob}
                label={t(EXAM_VIEW_LABEL[view])}
                className="flex-1"
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base leading-relaxed text-slate-400">
          {t('exam.evidence.photosMissing')}
        </p>
      )}

      {exam && (
        <p className="text-sm leading-relaxed text-slate-500">
          {t('exam.evidence.meta', {
            time: formatDateTime(exam.analyzedAt),
            model: exam.model ?? t('evidence.notRecorded'),
            version: exam.promptVersion,
          })}
        </p>
      )}
    </section>
  );
}
