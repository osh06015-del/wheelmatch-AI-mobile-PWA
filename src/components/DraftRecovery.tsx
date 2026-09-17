'use client';

// 진행 중 점검 복구.
//
// 페이지를 새로 불러왔을 때(새로고침·PWA 업데이트·앱 재실행) 저장된 draft가
// 있으면 작업자에게 묻는다 — "이어하기" 또는 "삭제하고 새로 시작". 앱이 알아서
// 이어가거나 지우지 않는다.
//
// 묻는 동안에는 자동 저장을 멈춘다. 멈추지 않으면 새로 불러온 빈 상태가 답하기도
// 전에 draft를 덮어써, 이어할 것이 사라진다.
//
// draft를 지우는 곳은 두 군데뿐이다 — 여기서 작업자가 삭제를 고를 때, 결과 화면에서
// 최종 기록 저장이 성공했을 때(result/page.tsx).

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useLocale, type MessageKey } from '@/lib/i18n';
import {
  buildDraft,
  hasInspectionInProgress,
  recoverDraft,
  resumePathFor,
  type DraftRecovery as Recovery,
  type DraftWarning,
} from '@/lib/draft/draftModel';
import {
  draftStore,
  formDraftStore,
  type DraftSaveResult,
} from '@/lib/draft/draftStore';
import { formatDateTime } from '@/lib/record/datetime';
import { useInspection, useInspectionState } from '@/lib/state/inspection';

/** 자동 저장 간격. 입력 한 번마다 사진까지 다시 쓰지 않게 모아서 저장한다 */
export const DRAFT_SAVE_DELAY_MS = 1000;

const WARNING_TEXT: Readonly<Record<DraftWarning, MessageKey>> = {
  schema: 'draft.warn.schema',
  photos: 'draft.warn.photos',
  exam: 'draft.warn.exam',
  trialRun: 'draft.warn.trialRun',
  unreadable: 'draft.warn.unreadable',
};

type Status = 'checking' | 'prompt' | 'ready';

export function DraftRecovery() {
  const router = useRouter();
  const { t } = useLocale();
  const { restore, reset } = useInspection();

  const [status, setStatus] = useState<Status>('checking');
  const [pending, setPending] = useState<Recovery | null>(null);
  const [restoredWarnings, setRestoredWarnings] = useState<DraftWarning[]>([]);
  const [saveResult, setSaveResult] = useState<DraftSaveResult | null>(null);
  const [discardFailed, setDiscardFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // 페이지를 불러온 뒤 한 번만 draft를 찾는다.
  useEffect(() => {
    let cancelled = false;
    void draftStore.load().then((result) => {
      if (cancelled) return;
      if (result.status === 'found') {
        setPending(recoverDraft(result.draft));
        setStatus('prompt');
      } else {
        // 읽기에 실패해도 지금 점검은 막지 않는다. draft는 저장소에 그대로 남는다.
        setStatus('ready');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 자동 저장. 묻는 중이거나 점검이 진행 중이 아니면 저장하지 않는다 —
  // 빈 상태로 draft를 덮어쓰지도, 지우지도 않는다. 상태 참조는 값이 바뀔 때만
  // 바뀌므로, 바뀔 때마다 이전 예약을 지우고 다시 모아 저장한다(debounce).
  const state = useInspectionState();

  useEffect(() => {
    if (status !== 'ready' || !state.hydrated) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 화면 상태(hydrated)를 draft에서 빼는 구조분해다.
    const { hydrated, ...snapshot } = state;
    if (!hasInspectionInProgress(snapshot)) return;
    const timer = window.setTimeout(() => {
      void draftStore
        .save(buildDraft(snapshot, new Date()))
        .then((result) => setSaveResult(result));
    }, DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, state]);

  async function resume() {
    if (!pending?.snapshot || !pending.resumable) return;
    restore(pending.snapshot);
    setRestoredWarnings(pending.warnings);
    setPending(null);
    setStatus('ready');
    router.push(resumePathFor(pending.snapshot));
  }

  async function discard() {
    setBusy(true);
    setDiscardFailed(false);
    const removed = await draftStore.remove();
    setBusy(false);
    if (!removed) {
      // 지우지 못했으면 묻는 창을 닫지 않는다 — 닫으면 다음 자동 저장이 남은
      // draft를 덮어써 "지웠다"고 믿게 된다.
      setDiscardFailed(true);
      return;
    }
    reset();
    // 진행 중 점검 draft를 지우면서, 확인 화면에 남아 있을 수 있는 입력 draft도
    // 함께 지운다 — 명시적 삭제 트리거이므로 같이 정리한다.
    void formDraftStore.remove('grinder');
    void formDraftStore.remove('wheel');
    setPending(null);
    setStatus('ready');
    router.push('/');
  }

  const inProgress = state.declaredPurpose !== null;

  return (
    <>
      {status === 'prompt' && pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="draft-title"
            aria-describedby="draft-body"
            className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-slate-600 bg-slate-900 px-5 py-5"
          >
            <h2 id="draft-title" className="text-xl font-bold text-slate-100">
              {t('draft.title')}
            </h2>
            <p
              id="draft-body"
              className="text-base leading-relaxed text-slate-300"
            >
              {t('draft.body')}
            </p>
            {pending.savedAt && (
              <p className="text-sm text-slate-400">
                {t('draft.savedAt', { time: formatDateTime(pending.savedAt) })}
              </p>
            )}
            {pending.warnings.length > 0 && (
              <ul className="flex flex-col gap-2">
                {pending.warnings.map((warning) => (
                  <li
                    key={warning}
                    className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm leading-relaxed text-yellow-100"
                  >
                    ⚠ {t(WARNING_TEXT[warning])}
                  </li>
                ))}
              </ul>
            )}
            {discardFailed && (
              <p role="alert" className="text-base text-red-300">
                {t('draft.discardFailed')}
              </p>
            )}
            <button
              type="button"
              onClick={() => void resume()}
              disabled={!pending.resumable || busy}
              className="min-h-14 rounded-lg bg-slate-100 text-lg font-bold text-slate-900 active:bg-white disabled:bg-slate-700 disabled:text-slate-400"
            >
              {t('draft.resume')}
            </button>
            <button
              type="button"
              onClick={() => void discard()}
              disabled={busy}
              className="min-h-14 rounded-lg border border-red-400 text-lg font-semibold text-red-100 active:bg-red-500/20 disabled:opacity-60"
            >
              {t('draft.discard')}
            </button>
          </div>
        </div>
      )}

      {restoredWarnings.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-2 border-b border-yellow-500/40 bg-yellow-500/10 px-4 py-3"
        >
          {restoredWarnings.map((warning) => (
            <p
              key={warning}
              className="text-sm leading-relaxed text-yellow-100"
            >
              ⚠ {t(WARNING_TEXT[warning])}
            </p>
          ))}
          <button
            type="button"
            onClick={() => setRestoredWarnings([])}
            className="min-h-10 self-start rounded-md border border-yellow-500/60 px-3 text-sm font-semibold text-yellow-100"
          >
            {t('draft.dismiss')}
          </button>
        </div>
      )}

      {inProgress &&
        (saveResult === 'failed' || saveResult === 'savedWithoutPhotos') && (
          <p
            role="status"
            className="border-b border-slate-600 bg-slate-800 px-4 py-2 text-center text-sm text-slate-200"
          >
            {t(
              saveResult === 'failed'
                ? 'draft.saveFailed'
                : 'draft.photosOmitted',
            )}
          </p>
        )}
    </>
  );
}
