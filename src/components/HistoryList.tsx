'use client';

// 점검 이력 목록. 항목을 누르면 촬영 사진과 검사 항목별 결과가 펼쳐진다.
//
// 사진을 함께 남기는 이유: 나중에 "그때 그 숫돌이 뭐였지"를 되짚을 수 있어야
// 기록이 증빙이 된다. 사진은 IndexedDB 안, 즉 이 기기에만 있다.

import { useState } from 'react';
import { ZoomablePhoto } from './BlobPhoto';
import { EvidencePanel } from './EvidencePanel';
import { ProfileConditionsPanel } from './ProfileConditionsPanel';
import { RuleVersionNote } from './RuleVersionNote';
import { WheelExamEvidence } from './WheelExamEvidence';

import { useLocale, type MessageKey, type Translate } from '@/lib/i18n';
import { checkReasonText } from '@/lib/i18n/checkText';
import { ruleLabelText } from '@/lib/i18n/ruleLabel';
import { formatDateTime } from '@/lib/record/datetime';
import { formatElapsed } from '@/lib/record/elapsed';
import type { InspectionRecord, Verdict, WorkPurpose } from '@/lib/rules/types';

const BADGE_TEXT: Record<Verdict, MessageKey> = {
  COMPATIBLE: 'verdict.compatible',
  INCOMPATIBLE: 'verdict.incompatible',
  UNDETERMINED: 'verdict.undetermined',
};

const BADGE_STYLE: Record<Verdict, string> = {
  COMPATIBLE: 'bg-green-500 text-slate-950',
  INCOMPATIBLE: 'bg-red-500 text-white',
  UNDETERMINED: 'bg-yellow-500 text-slate-950',
};

/** 메인 화면에서 고른 작업 이름과 같은 말을 쓴다. */
const PURPOSE_TEXT: Record<WorkPurpose, MessageKey> = {
  cutting: 'home.cutting',
  grinding: 'home.grinding',
};

function summarize(record: InspectionRecord, t: Translate): string {
  const model = record.grinder.model ?? t('history.unknownModel');
  const grinderRpm =
    record.grinder.noLoadRPM === null ? '—' : `${record.grinder.noLoadRPM}rpm`;
  const wheelDiameter =
    record.wheel.diameter === null
      ? t('history.unknownDiameter')
      : `Φ${record.wheel.diameter}mm`;
  const wheelRpm =
    record.wheel.maxRPM === null ? '—' : `${record.wheel.maxRPM}rpm`;
  return t('history.summary', { model, grinderRpm, wheelDiameter, wheelRpm });
}

export function HistoryList({
  records,
  onDelete,
}: {
  records: InspectionRecord[];
  /** 기록 하나를 지운다. 넘기지 않으면 삭제 버튼을 그리지 않는다 */
  onDelete?: (id: number) => void | Promise<void>;
}) {
  const { t, locale } = useLocale();
  const [openId, setOpenId] = useState<number | null>(null);
  // 지우기 전에 한 번 더 묻는다. 기록은 이 기기에만 있어 되살릴 수 없다.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
    null,
  );

  if (records.length === 0) {
    return (
      <p className="rounded-lg bg-slate-800 px-4 py-8 text-center text-base leading-relaxed text-slate-400">
        {t('history.empty')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 소요시간을 보는 기준을 한 번만 적는다. 기록마다 되풀이하면 읽지 않게 된다. */}
      <p className="text-sm leading-relaxed text-slate-400">
        {t('history.timeNote')}
      </p>
      <ul className="flex flex-col gap-3">
        {records.map((record) => {
          const open = openId === record.id;
          const purpose = record.declaredPurpose
            ? t(PURPOSE_TEXT[record.declaredPurpose])
            : null;
          const elapsed = formatElapsed(record.elapsedMs ?? null, t);
          const preTrial = formatElapsed(record.preTrialElapsedMs ?? null, t);
          const hasPhoto = Boolean(record.grinderImage ?? record.wheelImage);
          const confirmingDelete = confirmingDeleteId === record.id;

          return (
            <li key={record.id} className="rounded-lg bg-slate-800">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : (record.id ?? null))}
                aria-expanded={open}
                className="flex min-h-12 w-full items-start gap-3 px-4 py-4 text-left"
              >
                <span
                  className={`shrink-0 rounded-md px-3 py-1 text-base font-bold ${BADGE_STYLE[record.result.verdict]}`}
                >
                  {t(BADGE_TEXT[record.result.verdict])}
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  {/* 한 줄에 다 넣으면 좁은 화면에서 접혀 읽기 나빠진다.
                    작업 구분·시각 / 규격 / 소요시간 순으로 줄을 나눈다. */}
                  <span className="flex items-center gap-2">
                    {purpose && (
                      <span className="rounded border border-slate-600 px-2 py-0.5 text-sm font-semibold text-slate-200">
                        {purpose}
                      </span>
                    )}
                    <span className="text-base text-slate-300">
                      {formatDateTime(record.createdAt)}
                    </span>
                  </span>
                  <span className="text-base text-slate-100">
                    {summarize(record, t)}
                  </span>
                  {elapsed && (
                    <span className="text-sm text-slate-400">
                      {record.trialRun
                        ? t('history.elapsedWithTrial', { time: elapsed })
                        : t('history.elapsed', { time: elapsed })}
                    </span>
                  )}
                  {preTrial && (
                    <span className="text-sm text-slate-400">
                      {t('history.preTrial', { time: preTrial })}
                    </span>
                  )}
                </span>
                <span aria-hidden className="pt-1 text-slate-400">
                  {open ? '▲' : '▼'}
                </span>
              </button>

              {open && (
                <div className="flex flex-col gap-4 border-t border-slate-700 px-4 py-4">
                  {hasPhoto ? (
                    <div className="flex gap-3">
                      {record.grinderImage && (
                        <ZoomablePhoto
                          blob={record.grinderImage}
                          label={t('history.grinderPhoto')}
                          className="flex-1"
                        />
                      )}
                      {record.wheelImage && (
                        <ZoomablePhoto
                          blob={record.wheelImage}
                          label={t('history.wheelPhoto')}
                          className="flex-1"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-base text-slate-400">
                      {t('history.noPhoto')}
                    </p>
                  )}

                  <ul className="flex flex-col gap-3">
                    {record.result.checks.map((check) => (
                      <li key={check.rule} className="flex flex-col gap-1">
                        <span className="text-base font-semibold text-slate-200">
                          {check.passed === true
                            ? '✅'
                            : check.passed === false
                              ? '❌'
                              : '⚠'}{' '}
                          {ruleLabelText(check.rule, t)}
                        </span>
                        {/* 저장 당시 엔진이 남긴 사유 코드로 고른 언어의 문장을 만든다.
                          코드가 없는 옛 기록은 저장된 한국어 사유를 그대로 보인다. */}
                        <span className="text-base leading-relaxed text-slate-400">
                          {checkReasonText(check, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* AI가 사진에서 본 것. 위 검사 항목 목록과 따로 둔다 —
                      규칙엔진이 낸 판정 항목에 섞으면 AI 결과가 확인된 항목
                      하나로 읽힌다. 없는 기록에서는 아무것도 그리지 않는다. */}
                  <WheelExamEvidence
                    exam={record.wheelExam}
                    notRun={record.wheelExamNotRun}
                    acknowledged={record.wheelExamAcknowledged}
                    photos={{
                      front: record.wheelImage,
                      back: record.wheelBackImage,
                      edge: record.wheelEdgeImage,
                      bore: record.wheelBoreImage,
                    }}
                  />

                  {/* 저장 당시의 조건 표. 기능 도입 전 기록에는 그리지 않는다 —
                      없는 입력을 "모름" 목록으로 채우면 그때 물어본 것처럼 보인다. */}
                  {record.profileConditions && (
                    <ProfileConditionsPanel
                      profile={record.accessoryProfile ?? null}
                      conditions={record.profileConditions}
                    />
                  )}

                  <EvidencePanel
                    grinder={record.grinder}
                    wheel={record.wheel}
                    result={record.result}
                    grinderOcr={record.grinderOcr}
                    wheelOcr={record.wheelOcr}
                  />

                  {/* 저장 당시의 버전을 보여준다. 지금 버전으로 채우면
                    어느 규칙으로 나온 판정인지 거짓으로 적게 된다. */}
                  <RuleVersionNote version={record.ruleVersion ?? null} />

                  {onDelete && record.id !== undefined && (
                    <div className="flex flex-col gap-3 border-t border-slate-700 pt-4">
                      {confirmingDelete ? (
                        <>
                          <p className="text-base leading-relaxed text-red-100">
                            {t('history.deleteConfirm')}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingDeleteId(null);
                              void onDelete(record.id as number);
                            }}
                            className="min-h-14 rounded-lg bg-red-500 text-lg font-bold text-white active:bg-red-400"
                          >
                            {t('history.deleteConfirmButton')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-700"
                          >
                            {t('history.cancel')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmingDeleteId(record.id ?? null)
                          }
                          className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-300 active:bg-slate-700"
                        >
                          {t('history.deleteRecord')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
