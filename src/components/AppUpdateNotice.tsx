'use client';

// 서비스 워커 업데이트 안내. 감지되면 모든 화면 맨 위에 뜬다.
//
// 현장판·검증판 모두에서 그린다 — 업데이트는 어느 빌드에서든 같은 문제다.
// ValidationBuildBanner(검증 빌드 전용)와 달리 조건 없이 항상 마운트하고,
// 실제로 보여줄지는 lib/pwa/serviceWorkerUpdate.ts가 알려주는 상태로 정한다.
//
// 적용 버튼은 점검이 진행 중이거나 시험운전이 돌고 있으면 잠근다. 실제로
// 기계가 도는 중에 화면이 예고 없이 바뀌면 안 되기 때문이다(safety-critical.md
// 공통 원칙과 같은 방향). declaredPurpose가 null이 아니면 메인 화면에서 작업을
// 고른 뒤 아직 끝내지 않은 상태다 — 저장을 마치거나 메인으로 돌아가면 다시 null이
// 된다(useInspection의 reset()).

import { useLocale } from '@/lib/i18n';
import { useServiceWorkerUpdate } from '@/lib/pwa/serviceWorkerUpdate';
import { useInspection } from '@/lib/state/inspection';

export function AppUpdateNotice() {
  const { t } = useLocale();
  const { available, applying, applyUpdate } = useServiceWorkerUpdate();
  const { declaredPurpose, trialRun, hydrating } = useInspection();

  if (!available) return null;

  // hydration 전에는 declaredPurpose가 항상 null로 보인다(서버 스냅샷).
  // 그 틈에 적용 버튼을 열어주면 실제로는 점검 중인데 잠깐 눌릴 수 있다.
  const inspectionInProgress =
    hydrating || declaredPurpose !== null || trialRun !== null;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-slate-600 bg-slate-800 px-4 py-2 text-center text-sm font-semibold text-slate-100"
    >
      <span>🔄 {t('update.available')}</span>
      {inspectionInProgress ? (
        <span className="text-slate-400">
          {t('update.blockedDuringInspection')}
        </span>
      ) : (
        <button
          type="button"
          onClick={applyUpdate}
          disabled={applying}
          className="min-h-8 rounded-md bg-slate-100 px-3 py-1 text-sm font-bold text-slate-900 active:bg-white disabled:opacity-60"
        >
          {applying ? t('update.applying') : t('update.apply')}
        </button>
      )}
    </div>
  );
}
