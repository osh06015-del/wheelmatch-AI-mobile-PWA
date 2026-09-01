'use client';

// 점검 이력. IndexedDB에서 최근 50건을 읽어 보여준다.
//
// useLiveQuery는 Dexie가 제공하는 구독형 훅이다. 삭제 후 목록을 수동으로
// 다시 읽을 필요 없이 IndexedDB 변경을 그대로 반영한다.

import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { useState } from 'react';

import { HistoryList } from '@/components/HistoryList';
import { ResearchPanel } from '@/components/ResearchPanel';
import { clearInspections, listInspections } from '@/lib/db';

export default function HistoryPage() {
  const records = useLiveQuery(() => listInspections(50), []);
  const [confirmingClear, setConfirmingClear] = useState(false);

  async function handleClear() {
    await clearInspections();
    setConfirmingClear(false);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="처음으로"
          className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl text-slate-300 active:bg-slate-800"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-slate-100">점검 이력</h1>
      </header>

      {records === undefined ? (
        <p className="text-lg text-slate-400">기록을 불러오는 중입니다...</p>
      ) : (
        <HistoryList records={records} />
      )}

      {records !== undefined && records.length > 0 && (
        <div className="flex flex-col gap-3">
          {confirmingClear ? (
            <div className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-4">
              <p className="text-lg leading-relaxed text-red-100">
                저장된 점검 기록 {records.length}건을 모두 삭제합니다. 되돌릴 수
                없습니다.
              </p>
              <button
                type="button"
                onClick={() => void handleClear()}
                className="min-h-14 rounded-lg bg-red-500 text-lg font-bold text-white active:bg-red-400"
              >
                모두 삭제
              </button>
              <button
                type="button"
                onClick={() => setConfirmingClear(false)}
                className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-200 active:bg-slate-800"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="min-h-14 rounded-lg border border-slate-600 text-lg font-semibold text-slate-300 active:bg-slate-800"
            >
              전체 삭제
            </button>
          )}
        </div>
      )}

      {records !== undefined && <ResearchPanel records={records} />}

      <Link
        href="/scan/grinder"
        className="flex min-h-14 items-center justify-center rounded-lg bg-slate-800 text-lg font-semibold text-slate-100 active:bg-slate-700"
      >
        새 점검 시작
      </Link>
    </main>
  );
}
