import type { MatchResult } from '@/lib/rules/types';

/** 저장된 검사 결과만 읽는다. 구기록의 판정을 다시 계산하지 않는다. */
export function hasUnconfirmedExpiry(result: MatchResult): boolean {
  return result.checks.some(
    (check) =>
      check.passed === null &&
      check.advisory === true &&
      (check.detail?.code === 'expiry.notFound' ||
        check.detail?.code === 'expiry.manualUnreadable'),
  );
}
