import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe('새로고침 작업 목적 복원', () => {
  it.each(['"polishing"', '""', '0', 'false', '{}', '[]', 'null', '{broken'])(
    '저장값 %s는 작업 선택 완료로 복원하지 않는다',
    async (raw) => {
      sessionStorage.setItem('wheelmatch.purpose', raw);
      vi.resetModules();
      const { useInspection } = await import('./inspection');
      const { result } = renderHook(() => useInspection());
      expect(result.current.declaredPurpose).toBeNull();
      expect(result.current.hydrating).toBe(false);
    },
  );

  it.each(['cutting', 'grinding'] as const)(
    '%s는 새로고침 뒤에도 유지한다',
    async (purpose) => {
      sessionStorage.setItem('wheelmatch.purpose', JSON.stringify(purpose));
      vi.resetModules();
      const { useInspection } = await import('./inspection');
      const { result } = renderHook(() => useInspection());
      expect(result.current.declaredPurpose).toBe(purpose);
    },
  );
});
