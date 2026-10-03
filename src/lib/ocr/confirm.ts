// 확인 화면을 통과한 뒤의 최종 WheelSpec을 만든다.
//
// 이 파일이 지키는 계약은 한 문장이다.
//
//   사용자의 확인은 **정규화 값만** 바꾼다. 라벨에서 읽은 원본 표시는 바꾸지 않는다.
//
// 확인 화면이 보여주는 것은 최고사용회전속도·지름·두께·용도·유효기한과 숫돌 종류다.
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
import { refinesSuggestion } from '@/lib/rules/profiles';
import type {
  RpmSource,
  WheelMarkings,
  WheelPurpose,
  WheelSpec,
  WheelType,
} from '@/lib/rules/types';

/** 확인 화면에서 사람이 확정한 값. 확인 화면이 노출하는 필드가 전부다. */
export interface ConfirmedWheelFields {
  maxRPM: number | null;
  diameter: number | null;
  thickness: number | null;
  purpose: WheelPurpose;
  /**
   * 작업자가 실물을 보고 고른 숫돌 종류.
   *
   * AI가 사진으로 본 종류는 초기 제안값일 뿐이고 최종값은 이쪽이다. OCR 원본
   * (wheelOcr.wheelType)은 이 값과 무관하게 그대로 남는다 — 둘을 견줘야
   * 모델이 종류를 잘못 봤는지 되짚을 수 있다.
   */
  wheelType: WheelType;
  /**
   * 유효기한 입력칸의 문자열 그대로. 여기서 정규화한다.
   *
   * 사용자가 고친 값이므로 정규화 결과는 WheelSpec.expiry로 간다.
   * OCR이 읽은 원문(markings.expiryRaw)은 이 값과 무관하게 그대로 남는다.
   */
  expiryText: string;
  expiryReview?: WheelSpec['expiryReview'];
  /** ManualConfirmToggle 상태. 사람이 직접 확인해야만 신뢰도가 올라간다. */
  userConfirmed: boolean;
  /**
   * 이 숫돌에 이미 올라와 있던 외관 의심.
   *
   * 두 곳에서 온다. 다각도 외관 확인이 있던 이전 버전이 남긴 확인 화면 draft가
   * "의심"이었던 경우(formDraftModel의 LegacyExamTrace)와, 확인 화면 draft의 OCR을
   * 읽을 수 없어 통째로 버렸는데 그 OCR이 "의심"이었던 경우(DroppedOcrTrace)다.
   * **의심을 더하는 방향으로만** 쓴다: true면 라벨 사진의 판독이 무엇이든
   * 'suspected'이고, 아니면 라벨 사진의 판독을 그대로 둔다. 의심을 지우는 값은
   * 받지 않는다.
   */
  priorDamageSuspected?: boolean;
  /**
   * 부속품 이름(선택). 종류를 특정하지 못한 경우(other·unknown)에 작업자가
   * 적는 식별용 문구다. 판정에 쓰지 않는다.
   */
  accessoryName?: string | null;
}

/**
 * 작업자가 고른 종류가 AI 제안과 다른가.
 *
 * 다르면 둘 중 하나가 틀렸다는 뜻이다. 어느 쪽인지 앱은 알 수 없으므로 차이를
 * 숨기지 않고 작업자에게 실물을 다시 보게 한다. OCR이 없으면(수동 입력) 제안도
 * 없으니 'unknown'과 견준다 — 결합숫돌을 고르려면 사람의 확인이 필요해진다.
 */
export function wheelTypeDiffersFromSuggestion(
  ocr: WheelSpec | null,
  selected: WheelType,
): boolean {
  const suggested = ocr?.wheelType ?? 'unknown';
  // AI는 굵은 분류(다이아몬드)까지만 제안한다. 작업자가 세부 형식(세그먼트)을
  // 고른 것은 제안을 좁힌 것이지 어긋난 것이 아니다.
  return selected !== suggested && !refinesSuggestion(suggested, selected);
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
    // 종류는 작업자가 실물을 보고 고른 값이다. AI 판별은 제안으로만 쓰였다.
    wheelType: fields.wheelType,
    // 판정에 쓰지 않는 식별용 문구. 비어 있으면 null로 남긴다.
    accessoryName: fields.accessoryName?.trim()
      ? fields.accessoryName.trim()
      : null,
    // 외관 손상은 라벨 사진에서 판별한 값이고 확인 화면에 없다. 사용자가 숫자를
    // 고쳐도 그대로 이어간다. 값이 없으면 'unknown'으로 둔다 — 'none_visible'로
    // 채우면 보지 않은 것을 본 것처럼 남긴다. 이미 올라와 있던 의심은 지우지 않는다.
    visibleDamage: fields.priorDamageSuspected
      ? 'suspected'
      : (ocr?.visibleDamage ?? 'unknown'),
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
    ...(fields.expiryReview ? { expiryReview: fields.expiryReview } : {}),
    rawText: ocr?.rawText ?? '',
    confidence: fields.userConfirmed ? 'high' : (ocr?.confidence ?? 'low'),
  };
}

// ─────────────────────────────────────────────────────────────
// 서버 재분석 — 확정한 뒤에 도착한 OCR
//
// 서버 분석 없이(직접 입력·로컬 OCR) 확정한 숫돌을 결과 화면에서 서버로 다시
// 분석하면, OCR이 확정보다 늦게 온다. 그 OCR로 바꾸지 않는 것과 옮기는 것을 나눈다.
//
//   바꾸지 않는다 — 작업자가 확인 화면에서 확정한 값(회전속도·지름·두께·용도·종류·
//                   유효기한·신뢰도와 그 출처). AI 값과 다르면 어느 쪽이 맞는지
//                   앱은 모른다. 그래서 값은 나란히 보여 주기만 한다.
//   옮긴다       — confirmedWheelSpec이 OCR에서 그대로 이어가던 두 칸, 외관 손상과
//                   원본 표시. 확인 화면에 없어 작업자가 확정한 적이 없는 값이다.
//
// 옮기지 않으면 온라인 대조로 바뀐 뒤에도 판정은 확정값만 보므로, 같은 사진을
// 처음부터 온라인으로 읽었을 때 나왔을 경고와 표기 대조가 통째로 빠진다. 재분석을
// 거친 쪽이 더 느슨해지는 것이라 이 앱에 넣을 수 없다(docs/safety-boundaries.md).
//
// 둘 다 **의심을 더하는 방향으로만** 옮긴다. 이미 있는 의심과 표기는 지우지 않는다.
// ─────────────────────────────────────────────────────────────

/**
 * 재분석이 올린 외관 의심을 확정값에 더한다.
 *
 * 전환을 받아들였는지와 무관하게 부른다. 값이 달라 전환이 막히거나 작업자가
 * 취소하면 AI 값은 버리지만, 의심은 값이 아니라 이 사진에 대해 앱이 올린 경고다.
 * 함께 버리면 경고가 조용히 사라진다.
 *
 * 재분석이 의심하지 않았으면 아무것도 바꾸지 않는다(같은 객체를 돌려준다) —
 * 'none_visible'로 덮어쓰지도 않는다. 의심을 지어내지 않고, 지우지도 않는다.
 */
export function withReanalysisSuspicion(
  wheel: WheelSpec,
  reanalyzed: WheelSpec,
): WheelSpec {
  if (reanalyzed.visibleDamage !== 'suspected') return wheel;
  if (wheel.visibleDamage === 'suspected') return wheel;
  return { ...wheel, visibleDamage: 'suspected' };
}

/**
 * 확정값의 원본 표시에서 비어 있는 자리만 재분석이 읽은 표시로 채운다.
 *
 * 이미 있는 표기는 덮지 않는다. 로컬 OCR이 읽어 둔 표기가 서로 어긋나 있었다면
 * 그 어긋남이 재분석으로 사라지면 안 된다. 빈 자리를 채우는 쪽은 표기 일치·장착
 * 규격 항목을 새로 만들 수만 있어 판정을 느슨하게 하지 못한다 — 표기 일치의 통과는
 * 전체 판정을 올리지 못하고(engine.ts의 decideVerdict), 어긋나면 판정불가로 막는다.
 */
function withBlankMarkingsFilled(
  confirmed: WheelMarkings | undefined,
  reanalyzed: WheelMarkings | undefined,
): WheelMarkings | undefined {
  if (!reanalyzed) return confirmed;
  // 직접 입력한 확정값에는 원본 표시가 없다. 사본으로 넣는다 — confirmedWheelSpec과
  // 같은 이유로 OCR 원본과 객체를 공유하지 않는다.
  if (!confirmed) return { ...reanalyzed };

  const filled: WheelMarkings = {
    ...confirmed,
    labeledRPM: confirmed.labeledRPM ?? reanalyzed.labeledRPM,
    peripheralSpeedMps:
      confirmed.peripheralSpeedMps ?? reanalyzed.peripheralSpeedMps,
    boreDiameter: confirmed.boreDiameter ?? reanalyzed.boreDiameter,
    // 유효기한 원문은 없어도 되는 칸이다. 채울 것이 있을 때만 만든다.
    ...(confirmed.expiryRaw == null && reanalyzed.expiryRaw != null
      ? { expiryRaw: reanalyzed.expiryRaw }
      : {}),
  };
  const unchanged =
    filled.labeledRPM === confirmed.labeledRPM &&
    filled.peripheralSpeedMps === confirmed.peripheralSpeedMps &&
    filled.boreDiameter === confirmed.boreDiameter &&
    filled.expiryRaw === confirmed.expiryRaw;
  return unchanged ? confirmed : filled;
}

/**
 * 재분석을 받아들여 온라인 대조로 바꿀 때의 확정값.
 *
 * 외관 의심(withReanalysisSuspicion)에 더해 원본 표시의 빈 자리를 채운다. 표시는
 * 전환할 때만 옮긴다 — 전환하지 않으면 AI 값은 버리는 것이고, 표시도 AI가 읽은 값이다.
 *
 * 바뀐 것이 없으면 같은 객체를 돌려준다.
 */
export function withAcceptedReanalysis(
  wheel: WheelSpec,
  reanalyzed: WheelSpec,
): WheelSpec {
  const suspected = withReanalysisSuspicion(wheel, reanalyzed);
  const markings = withBlankMarkingsFilled(
    suspected.markings,
    reanalyzed.markings,
  );
  if (markings === suspected.markings) return suspected;
  return { ...suspected, markings };
}
