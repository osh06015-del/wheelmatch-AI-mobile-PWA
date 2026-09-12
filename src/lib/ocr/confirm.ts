// 확인 화면을 통과한 뒤의 최종 WheelSpec을 만든다.
//
// 이 파일이 지키는 계약은 한 문장이다.
//
//   사용자의 확인은 **정규화 값만** 바꾼다. 라벨에서 읽은 원본 표시는 바꾸지 않는다.
//
// 확인 화면(FieldConfirm)이 보여주는 것은 최고사용회전속도·지름·두께·용도 넷뿐이다.
// markings — 라벨에 인쇄된 rpm 표기, m/s 표기, 내경 — 는 화면에 없다. 사용자가
// 확인한 적 없는 값이므로 사용자가 회전속도를 고쳤다고 해서 따라 바뀌면 안 된다.
// 따라가면 두 가지를 잃는다.
//
//   1. 라벨이 원래 무엇으로 적혀 있었는가 (safety-critical.md 2번 — 원본 보존)
//   2. 두 표기가 서로 어긋났다는 신호 (engine.ts의 checkUnitConsistency가 쓴다)
//
// 2번이 특히 중요하다. 사용자 수정으로 markings를 덮으면 라벨의 모순이 사라져
// 판정이 조용히 통과한다. 의심을 덜어내는 방향이라 이 앱에 넣을 수 없다
// (docs/safety-boundaries.md). 그래서 markings는 OCR이 준 그대로 이어간다.
//
// 판정은 하지 않는다. 값을 옮기기만 한다.

import { normalizeExpiry } from './parser';
import type { RpmSource, WheelPurpose, WheelSpec } from '@/lib/rules/types';

/** 확인 화면에서 사람이 확정한 값. FieldConfirm이 노출하는 필드가 전부다. */
export interface ConfirmedWheelFields {
  maxRPM: number | null;
  diameter: number | null;
  thickness: number | null;
  purpose: WheelPurpose;
  /**
   * 유효기한 입력칸의 문자열 그대로. 여기서 정규화한다.
   *
   * 사용자가 고친 값이므로 정규화 결과는 WheelSpec.expiry로 간다.
   * OCR이 읽은 원문(markings.expiryRaw)은 이 값과 무관하게 그대로 남는다.
   */
  expiryText: string;
  /** ManualConfirmToggle 상태. 사람이 직접 확인해야만 신뢰도가 올라간다. */
  userConfirmed: boolean;
}

/**
 * 확인 후 maxRPM의 출처.
 *
 * 확정값이 OCR이 낸 값과 다르면 출처는 더 이상 'label'도 'converted'도 아니다.
 * 그대로 이어가면 사람이 넣은 값을 모델이 환산한 값으로 세게 된다.
 */
function rpmSourceAfterConfirm(
  ocr: WheelSpec | null,
  confirmedRPM: number | null,
): RpmSource | undefined {
  // 값이 없으면 출처를 말할 대상이 없다 (types.ts의 계약).
  if (confirmedRPM === null) return undefined;
  if (ocr === null || confirmedRPM !== ocr.maxRPM) return 'user';
  return ocr.rpmSource;
}

/**
 * OCR 결과와 사용자가 확정한 값을 합쳐 규칙엔진에 넘길 WheelSpec을 만든다.
 *
 * @param ocr 사용자가 손대기 전의 OCR 결과. 수동 입력만 한 경우 null이다.
 */
export function confirmedWheelSpec(
  ocr: WheelSpec | null,
  fields: ConfirmedWheelFields,
): WheelSpec {
  const rpmSource = rpmSourceAfterConfirm(ocr, fields.maxRPM);

  return {
    maxRPM: fields.maxRPM,
    diameter: fields.diameter,
    thickness: fields.thickness,
    purpose: fields.purpose,
    // 종류와 외관 손상은 사진에서 판별한 값이고 확인 화면에 없다. 사용자가
    // 숫자를 고쳐도 그대로 이어간다. 값이 없으면 'unknown'으로 두어
    // 판정불가로 이어지게 한다.
    wheelType: ocr?.wheelType ?? 'unknown',
    visibleDamage: ocr?.visibleDamage ?? 'unknown',
    // 라벨 원본 표시. 사용자 수정으로 덮지 않는다 — 이 파일 맨 위 참고.
    //
    // 사본으로 넘긴다. 참조를 공유하면 최종값과 OCR 원본이 사실상 한 객체가
    // 되어, 한쪽을 고치는 순간 다른 쪽도 조용히 바뀐다. 둘은 따로 남아야 한다.
    //
    // OCR이 없으면(수동 입력) 대조할 원본 표시 자체가 없으므로 넣지 않는다.
    // 그러면 표기 일치·장착 규격 항목이 만들어지지 않는다 — 기존과 같다.
    ...(ocr?.markings ? { markings: { ...ocr.markings } } : {}),
    ...(rpmSource ? { rpmSource } : {}),
    // 사용자가 확인·수정한 유효기한. 라벨 원문은 markings.expiryRaw에 그대로
    // 남아 있고, 이쪽만 사용자의 손을 탄다. 형식이 모호하면 null이 되어
    // 규칙엔진이 판정불가로 남긴다 — 애매한 값으로 만료를 단정하지 않는다.
    expiry: normalizeExpiry(
      fields.expiryText.trim() === '' ? null : fields.expiryText,
    ),
    rawText: ocr?.rawText ?? '',
    confidence: fields.userConfirmed ? 'high' : (ocr?.confidence ?? 'low'),
  };
}
