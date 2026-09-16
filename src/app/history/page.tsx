'use client';

// 점검 이력. IndexedDB에서 최근 50건을 읽어 보여준다.
//
// useLiveQuery는 Dexie가 제공하는 구독형 훅이다. 삭제 후 목록을 수동으로
// 다시 읽을 필요 없이 IndexedDB 변경을 그대로 반영한다.

import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { HistoryFilters } from '@/components/HistoryFilters';
import { HistoryList } from '@/components/HistoryList';
import { ResearchPanel } from '@/components/ResearchPanel';
import { clearInspections, listInspections } from '@/lib/db';
import { useLocale } from '@/lib/i18n';
import {
  EMPTY_HISTORY_FILTER,
  filterRecords,
  type HistoryFilterState,
} from '@/lib/record/historyFilter';
import { researchToolsEnabled } from '@/lib/record/researchMode';

export default function HistoryPage() {
  const { t } = useLocale();
  const records = useLiveQuery(() => listInspections(50), []);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [filter, setFilter] =
    useState<HistoryFilterState>(EMPTY_HISTORY_FILTER);

  // 필터는 이미 읽어 온 배열만 걸러 보여준다. IndexedDB에는 손대지 않는다.
  const filteredRecords = useMemo(
    () => (records === undefined ? undefined : filterRecords(records, filter)),
    [records, filter],
  );

  async function handleClear() {
    await clearInspections();
    setConfirmingClear(false);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label={t('common.home')}
          className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl text-slate-300 active:bg-slate-800"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-slate-100">
          {t('history.title')}
        </h1>
      </header>

      {records === undefined ? (
        <p className="text-lg text-slate-400">{t('history.loading')}</p>
      ) : (
        <>
          {records.length > 0 && (
            <HistoryFilters
              filter={filter}
              onChange={setFilter}
              total={records.length}
              count={filteredRecords?.length ?? 0}
            />
          )}
          {/* 저장된 기록 자체가 없는 것과 필터에 걸리는 기록이 없는 것은 다른
              안내다. 앞은 history.empty, 뒤는 history.filter.noResults가 맡는다 —
              HistoryList의 빈 상태에 필터로 줄어든 배열을 그대로 넘기면 두 경우가
              섞여 "저장된 기록이 없다"로 잘못 읽힌다. */}
          {records.length > 0 && filteredRecords?.length === 0 ? (
            <p className="rounded-lg bg-slate-800 px-4 py-8 text-center text-base leading-relaxed text-slate-400">
              {t('history.filter.noResults')}
            </p>
          ) : (
            <HistoryList records={filteredRecords ?? records} />
          )}
        </>
      )}

      {records !== undefined && records.length > 0 && (
        <div className="flex flex-col gap-3">
          {confirmingClear ? (
            <div className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-4">
              <p className="text-lg leading-relaxed text-red-100">
                {t('history.clearConfirm', { count: records.length })}
              </p>
              <button
                type="button"
                onClick={() => void handleClear()}
                className="min-h-14 rounded-lg bg-red-500 text-lg font-bold text-white active:bg-red-400"
              >
                {t('history.clearConfirmButton')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
              >
                {t('history.cancel')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-300 active:bg-slate-800"
            >
              {t('history.clearAll')}
            </button>
          )}
        </div>
      )}

      {/* 연구 도구는 검증 빌드에서만 그린다. CSS로 숨기지 않고 문서에서 뺀다 —
          숨긴 요소는 스크린리더와 인쇄로 새어 나온다. */}
      {researchToolsEnabled() && records !== undefined && (
        <ResearchPanel records={records} />
      )}

      <Link
        href="/scan/grinder"
        className="flex min-h-14 items-center justify-center rounded-lg bg-slate-800 text-lg font-semibold text-slate-100 active:bg-slate-700"
      >
        {t('history.newInspection')}
      </Link>
    </main>
  );
}
