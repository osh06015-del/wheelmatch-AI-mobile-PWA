// origin 저장공간 사용량 추정. navigator.storage.estimate()는 브라우저마다
// 지원 여부와 정확도가 다르다 — 이름 그대로 "추정값"이지 정확한 값이 아니다.
//
// 지원하지 않거나 호출이 실패해도 앱을 깨뜨리지 않는다. 확인 불가로 남긴다.

export interface StorageUsageEstimate {
  supported: boolean;
  /** byte. 지원하지 않거나 브라우저가 값을 주지 않으면 null */
  usageBytes: number | null;
  /** byte. 지원하지 않거나 브라우저가 값을 주지 않으면 null */
  quotaBytes: number | null;
}

const UNSUPPORTED: StorageUsageEstimate = {
  supported: false,
  usageBytes: null,
  quotaBytes: null,
};

export async function estimateStorageUsage(): Promise<StorageUsageEstimate> {
  if (typeof navigator === 'undefined') return UNSUPPORTED;
  const estimate = navigator.storage?.estimate;
  if (typeof estimate !== 'function') return UNSUPPORTED;
  try {
    const result = await estimate.call(navigator.storage);
    return {
      supported: true,
      usageBytes: result.usage ?? null,
      quotaBytes: result.quota ?? null,
    };
  } catch {
    return UNSUPPORTED;
  }
}
