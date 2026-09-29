import { afterEach, describe, expect, it, vi } from 'vitest';
import { db, putInspectionWithId, type StoredInspection } from './index';

afterEach(() => vi.restoreAllMocks());

describe('백업 기록 삽입 — 기존 ID 덮어쓰기 금지', () => {
  it('조회와 저장 사이에 같은 ID가 생겨도 add의 중복 오류를 그대로 전달한다', async () => {
    const conflict = new Error('duplicate');
    conflict.name = 'ConstraintError';
    const add = vi.spyOn(db.inspections, 'add').mockRejectedValue(conflict);
    const put = vi.spyOn(db.inspections, 'put').mockResolvedValue(1);
    const record = { id: 1 } as StoredInspection;
    await expect(putInspectionWithId(record)).rejects.toBe(conflict);
    expect(add).toHaveBeenCalledWith(record);
    expect(put).not.toHaveBeenCalled();
  });
});
