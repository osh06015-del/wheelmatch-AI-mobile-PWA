'use client';

// 점검 이력.
//
// "최근 50건"이라는 상한을 두지 않는다. 필터와 전체 건수는 사진을 뺀 전체
// 기록(listAllInspectionsWithoutPhotos)을 기준으로 계산한다 — 오래된 기록이
// 상한 때문에 필터에서 조용히 빠지면 안 되기 때문이다. 화면에는 그중 일부만
// 사진과 함께 페이지 단위로 불러와 보여준다("더 보기"). 사진 Blob을 한 번에
// 전부 메모리에 올리지 않기 위해서다.
//
// useLiveQuery는 Dexie가 제공하는 구독형 훅이다. 삭제 후 목록을 수동으로
// 다시 읽을 필요 없이 IndexedDB 변경을 그대로 반영한다.

import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { HistoryFilters } from '@/components/HistoryFilters';
import { HistoryList } from '@/components/HistoryList';
import { ResearchPanel } from '@/components/ResearchPanel';
import {
  clearInspections,
  listAllInspectionsWithoutPhotos,
  listInspectionsByIds,
} from '@/lib/db';
import { useLocale } from '@/lib/i18n';
import {
  EMPTY_HISTORY_FILTER,
  filterRecords,
  type HistoryFilterState,
} from '@/lib/record/historyFilter';
import { researchToolsEnabled } from '@/lib/record/researchMode';

/** 한 번에 사진과 함께 불러오는 기록 수. "더 보기"를 누를 때마다 이만큼 늘어난다. */
const PAGE_SIZE = 20;

export default function HistoryPage() {
  const { t } = useLocale();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [filter, setFilter] =
    useState<HistoryFilterState>(EMPTY_HISTORY_FILTER);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // 필터가 바뀐 순간을 렌더 중에 감지해 페이지 크기를 되돌린다. 이펙트에서
  // setState를 부르면 한 번 더 그리는 것을 useEffect가 막는다(react-hooks/
  // set-state-in-effect) — React가 권하는 "렌더 중 상태 조정" 패턴을 쓴다.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [appliedFilter, setAppliedFilter] = useState(filter);
  if (filter !== appliedFilter) {
    setAppliedFilter(filter);
    setVisibleCount(PAGE_SIZE);
  }

  const allRecords = useLiveQuery(() => listAllInspectionsWithoutPhotos(), []);

  // 필터는 이미 읽어 온 전체 배열만 걸러 보여준다. IndexedDB에는 손대지 않는다.
  const filteredRecords = useMemo(
    () =>
      allRecords === undefined ? undefined : filterRecords(allRecords, filter),
    [allRecords, filter],
  );

  const visibleIds = useMemo(
    () =>
      (filteredRecords ?? []).slice(0, visibleCount).map((record) => record.id),
    [filteredRecords, visibleCount],
  );

  // 지금 화면에 보여줄 만큼만 사진을 포함해 다시 읽는다.
  const pageRecords = useLiveQuery(
    () => listInspectionsByIds(visibleIds),
    [visibleIds],
  );

  async function handleClear() {
    await clearInspections();
    setConfirmingClear(false);
  }

  if (allRecords === undefined || pageRecords === undefined) {
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
        <p className="text-lg text-slate-400">{t('history.loading')}</p>
      </main>
    );
  }

  const hasMore = (filteredRecords?.length ?? 0) > visibleIds.length;

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

      {allRecords.length > 0 && (
        <HistoryFilters
          filter={filter}
          onChange={setFilter}
          total={allRecords.length}
          count={filteredRecords?.length ?? 0}
        />
      )}

      {/* 저장된 기록 자체가 없는 것과 필터에 걸리는 기록이 없는 것은 다른
          안내다. 앞은 history.empty, 뒤는 history.filter.noResults가 맡는다 —
          HistoryList의 빈 상태에 필터로 줄어든 배열을 그대로 넘기면 두 경우가
          섞여 "저장된 기록이 없다"로 잘못 읽힌다. */}
      {allRecords.length > 0 && filteredRecords?.length === 0 ? (
        <p className="rounded-lg bg-slate-800 px-4 py-8 text-center text-base leading-relaxed text-slate-400">
          {t('history.filter.noResults')}
        </p>
      ) : (
        <>
          <HistoryList records={pageRecords} />
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
            >
              {t('history.loadMore', {
                shown: pageRecords.length,
                total: filteredRecords?.length ?? 0,
              })}
            </button>
          )}
        </>
      )}

      {allRecords.length > 0 && (
        <div className="flex flex-col gap-3">
          {confirmingClear ? (
            <div className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-4">
              <p className="text-lg leading-relaxed text-red-100">
                {t('history.clearConfirm', { count: allRecords.length })}
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
          숨긴 요소는 스크린리더와 인쇄로 새어 나온다. 사진 없는 전체 기록을
          그대로 넘긴다 — CSV·지표는 사진을 쓰지 않고, 페이지가 아니라 전체를
          내보내야 한다(검증판 CSV는 전체 기록을 내보낸다). */}
      {researchToolsEnabled() && <ResearchPanel records={allRecords} />}

      <Link
        href="/scan/grinder"
        className="flex min-h-14 items-center justify-center rounded-lg bg-slate-800 text-lg font-semibold text-slate-100 active:bg-slate-700"
      >
        {t('history.newInspection')}
      </Link>
    </main>
  );
}
