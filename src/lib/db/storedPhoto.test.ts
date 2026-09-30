import { describe, expect, it } from 'vitest';

import {
  fromStoredPhoto,
  isStoredPhotoBytes,
  storedPhotoSize,
  toStoredPhoto,
} from './storedPhoto';

describe('storedPhoto — 사진을 IndexedDB에 넣을 수 있는 바이트로', () => {
  it('Blob을 바이트로 바꿨다가 같은 내용·형식의 Blob으로 되돌린다', async () => {
    const original = new Blob(['plate-bytes'], { type: 'image/jpeg' });
    const stored = await toStoredPhoto(original);

    expect(stored).not.toBeInstanceOf(Blob);
    expect(isStoredPhotoBytes(stored)).toBe(true);
    expect(storedPhotoSize(stored)).toBe(original.size);

    const restored = fromStoredPhoto(stored);
    expect(restored).toBeInstanceOf(Blob);
    expect(restored?.type).toBe('image/jpeg');
    expect(await restored?.text()).toBe('plate-bytes');
  });

  it('예전 기록의 Blob은 그대로 돌려준다', () => {
    const blob = new Blob(['old']);
    expect(fromStoredPhoto(blob)).toBe(blob);
    expect(storedPhotoSize(blob)).toBe(3);
  });

  it('사진이 아닌 값은 Blob으로 지어내지 않는다', () => {
    expect(fromStoredPhoto(undefined)).toBeUndefined();
    expect(fromStoredPhoto('data:image/png;base64,xx')).toBeUndefined();
    expect(
      fromStoredPhoto({ kind: 'wheelmatch-photo-bytes', type: 'x' }),
    ).toBeUndefined();
    expect(storedPhotoSize(null)).toBe(0);
  });
});
