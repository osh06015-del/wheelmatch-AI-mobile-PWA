import { afterEach, describe, expect, it, vi } from 'vitest';

import { estimateStorageUsage } from './storageUsage';

const originalStorage = navigator.storage;

afterEach(() => {
  Object.defineProperty(navigator, 'storage', {
    value: originalStorage,
    configurable: true,
  });
});

describe('estimateStorageUsage', () => {
  it('지원하면 usage·quota를 그대로 돌려준다', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({ usage: 100, quota: 1000 }),
      },
      configurable: true,
    });
    await expect(estimateStorageUsage()).resolves.toEqual({
      supported: true,
      usageBytes: 100,
      quotaBytes: 1000,
    });
  });

  it('navigator.storage가 없으면 확인 불가로 본다', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: undefined,
      configurable: true,
    });
    await expect(estimateStorageUsage()).resolves.toEqual({
      supported: false,
      usageBytes: null,
      quotaBytes: null,
    });
  });

  it('estimate()가 없으면(오래된 브라우저) 확인 불가로 본다', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {},
      configurable: true,
    });
    await expect(estimateStorageUsage()).resolves.toEqual({
      supported: false,
      usageBytes: null,
      quotaBytes: null,
    });
  });

  it('estimate() 호출이 실패해도 던지지 않고 확인 불가로 본다', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: vi.fn().mockRejectedValue(new Error('boom')) },
      configurable: true,
    });
    await expect(estimateStorageUsage()).resolves.toEqual({
      supported: false,
      usageBytes: null,
      quotaBytes: null,
    });
  });

  it('usage·quota가 undefined면 null로 채운다', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: vi.fn().mockResolvedValue({}) },
      configurable: true,
    });
    await expect(estimateStorageUsage()).resolves.toEqual({
      supported: true,
      usageBytes: null,
      quotaBytes: null,
    });
  });
});
