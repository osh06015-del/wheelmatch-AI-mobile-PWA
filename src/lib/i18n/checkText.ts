// 검사 항목의 사유와 값을 고른 언어로 만든다.
//
// 규칙엔진은 한국어 사유(reason)와 함께 사유 코드(detail)를 낸다. 엔진은 순수
// 함수로 남아야 해서 번역을 모르기 때문이다. 화면은 여기서 코드를 고른 언어의
// 문장으로 바꾼다.
//
// 한국어 문구는 엔진 문장과 글자까지 같아야 한다. 어긋나면 한국어 화면과 저장된
// 기록이 서로 다른 말을 한다. checkText.test.ts가 엔진 출력 전체로 이를 확인한다.
//
// 코드가 없는 기록(이 기능 도입 전 저장분)은 한국어 reason을 그대로 보여준다.
// 빈 칸을 띄우는 것보다 읽지 못하는 언어로라도 사유가 남는 편이 낫다.

import { RULE, withParticle } from '@/lib/rules/engine';
import type {
  CheckItem,
  Confidence,
  ReasonCode,
  VisibleDamageSource,
  WheelPurpose,
  WheelSpec,
  WheelType,
  WorkPurpose,
} from '@/lib/rules/types';
import { translate, type Locale } from './index';
import type { MessageKey } from './messages/ko';

/** 사유 코드 → 문구 키. 코드 전체를 요구하므로 번역을 빠뜨리면 타입 검사가 막는다. */
export const REASON_MESSAGE_KEY: Readonly<Record<ReasonCode, MessageKey>> = {
  'requiredValues.ok': 'reason.requiredValues.ok',
  'requiredValues.missingGrinder': 'reason.requiredValues.missingGrinder',
  'requiredValues.missingWheel': 'reason.requiredValues.missingWheel',
  'requiredValues.missingBoth': 'reason.requiredValues.missingBoth',
  'rpmSafety.missing': 'reason.rpmSafety.missing',
  'rpmSafety.fail': 'reason.rpmSafety.fail',
  'rpmSafety.pass': 'reason.rpmSafety.pass',
  'diameterFit.missing': 'reason.diameterFit.missing',
  'diameterFit.fail': 'reason.diameterFit.fail',
  'diameterFit.pass': 'reason.diameterFit.pass',
  'purpose.unknown': 'reason.purpose.unknown',
  'purpose.recognized': 'reason.purpose.recognized',
  'workPurpose.unknown': 'reason.workPurpose.unknown',
  'workPurpose.mismatch': 'reason.workPurpose.mismatch',
  'workPurpose.match': 'reason.workPurpose.match',
  'workPurpose.manualCheck': 'reason.workPurpose.manualCheck',
  'workPurpose.profileMismatch': 'reason.workPurpose.profileMismatch',
  'workPurpose.notDeclared': 'reason.workPurpose.notDeclared',
  'wheelType.unsupported': 'reason.wheelType.unsupported',
  'wheelType.supported': 'reason.wheelType.supported',
  'wheelType.supportedProfile': 'reason.wheelType.supportedProfile',
  'visibleDamage.suspected': 'reason.visibleDamage.suspected',
  'visibleDamage.notVerifiable': 'reason.visibleDamage.notVerifiable',
  'confidence.low': 'reason.confidence.low',
  'confidence.ok': 'reason.confidence.ok',
  'unitConsistency.mismatch': 'reason.unitConsistency.mismatch',
  'unitConsistency.match': 'reason.unitConsistency.match',
  'mountingSpec.missing': 'reason.mountingSpec.missing',
  'mountingSpec.shown': 'reason.mountingSpec.shown',
  'peripheralSpeed.oddGrinder': 'reason.peripheralSpeed.oddGrinder',
  'peripheralSpeed.oddWheel': 'reason.peripheralSpeed.oddWheel',
  'peripheralSpeed.oddBoth': 'reason.peripheralSpeed.oddBoth',
  'peripheralSpeed.ok': 'reason.peripheralSpeed.ok',
  'expiry.noToday': 'reason.expiry.noToday',
  'expiry.unreadable': 'reason.expiry.unreadable',
  'expiry.expired': 'reason.expiry.expired',
  'expiry.valid': 'reason.expiry.valid',
  'expiry.noPolicy': 'reason.expiry.noPolicy',
  'expiry.notFound': 'reason.expiry.notFound',
  'expiry.manualUnreadable': 'reason.expiry.manualUnreadable',
  'guard.missing': 'reason.guard.missing',
  'guard.smallerThanWheel': 'reason.guard.smallerThanWheel',
  'guard.manualCheck': 'reason.guard.manualCheck',
  'profileScope.limited': 'reason.profileScope.limited',
  'analysisMode.offlineLimited': 'reason.analysisMode.offlineLimited',
};

export const WHEEL_PURPOSE_LABEL: Readonly<Record<WheelPurpose, MessageKey>> = {
  cutting: 'wheelPurpose.cutting',
  grinding: 'wheelPurpose.grinding',
  unknown: 'wheelPurpose.unknown',
};

/** 오늘 작업 이름. 메인 화면에서 고른 버튼과 같은 말을 쓴다. */
const WORK_PURPOSE_LABEL: Readonly<Record<WorkPurpose, MessageKey>> = {
  cutting: 'home.cutting',
  grinding: 'home.grinding',
};

/**
 * 결과 화면의 숫돌 종류 이름. 확인 화면 선택지와 같은 말을 쓰되,
 * 고르지 못한 종류는 결과에서 '확인 안 됨'으로 적는다 — 엔진의 이름과 같다.
 */
export const WHEEL_TYPE_LABEL: Readonly<Record<WheelType, MessageKey>> = {
  bonded_abrasive: 'wheelType.bonded_abrasive',
  bonded_cutting: 'wheelType.bonded_cutting',
  bonded_grinding: 'wheelType.bonded_grinding',
  bonded_combination: 'wheelType.bonded_combination',
  bonded_cup: 'wheelType.bonded_cup',
  diamond_continuous: 'wheelType.diamond_continuous',
  diamond_turbo: 'wheelType.diamond_turbo',
  diamond_segmented: 'wheelType.diamond_segmented',
  diamond_cup: 'wheelType.diamond_cup',
  tuck_pointing: 'wheelType.tuck_pointing',
  fibre_disc: 'wheelType.fibre_disc',
  nonwoven_disc: 'wheelType.nonwoven_disc',
  polishing_pad: 'wheelType.polishing_pad',
  flap_disc: 'wheelType.flap_disc',
  cup_wheel: 'wheelType.cup_wheel',
  diamond: 'wheelType.diamond',
  wire_brush: 'wheelType.wire_brush',
  other: 'wheelType.other',
  unknown: 'wheelType.unconfirmed',
};

const CONFIDENCE_LABEL: Readonly<Record<Confidence, MessageKey>> = {
  high: 'confidence.high',
  medium: 'confidence.medium',
  low: 'confidence.low',
};

type Params = Readonly<Record<string, string | number>>;

/** 코드를 고른 언어의 이름으로 바꾼다. 모르는 코드면 null — 이름을 지어내지 않는다. */
export function labelOf<T extends string>(
  table: Readonly<Record<T, MessageKey>>,
  code: string | number | undefined,
  locale: Locale,
): string | null {
  if (typeof code !== 'string' || !(code in table)) return null;
  return translate(locale, table[code as T]);
}

/** 문장에 들어갈 코드를 이름으로 바꾼다. 숫자·날짜는 그대로 둔다. */
function localizeParams(
  params: Params,
  locale: Locale,
): Record<string, string | number> {
  const out: Record<string, string | number> = { ...params };
  const purpose = labelOf(WHEEL_PURPOSE_LABEL, params.purpose, locale);
  if (purpose !== null) out.purpose = purpose;
  const work = labelOf(WORK_PURPOSE_LABEL, params.work, locale);
  if (work !== null) out.work = work;
  const type = labelOf(WHEEL_TYPE_LABEL, params.type, locale);
  if (type !== null) out.type = type;
  return out;
}

/**
 * 한국어 조사 「은(는)」을 앞 글자에 맞춰 하나로 고른다.
 *
 * 문구 파일에는 어떤 낱말이 들어올지 모르는 채로 적어야 해서 둘 다 적어 둔다.
 * 고르는 규칙은 엔진의 withParticle 그대로다 — 같아야 기록과 화면 문장이 같다.
 */
function resolveKoreanParticles(text: string): string {
  return text.replace(/(.)은\(는\)/gu, (_, before: string) =>
    withParticle(before, '은', '는'),
  );
}

function messageKeyFor(code: string): MessageKey | null {
  return code in REASON_MESSAGE_KEY
    ? REASON_MESSAGE_KEY[code as ReasonCode]
    : null;
}

/** 사유를 고른 언어로 만든다. 코드가 없거나 모르는 코드면 한국어 사유를 그대로 쓴다. */
export function checkReasonText(check: CheckItem, locale: Locale): string {
  const detail = check.detail;
  const key = detail ? messageKeyFor(detail.code) : null;
  if (!detail || key === null) return check.reason;

  const text = translate(
    locale,
    key,
    localizeParams(detail.params ?? {}, locale),
  );
  return locale === 'ko' ? resolveKoreanParticles(text) : text;
}

export interface CheckValues {
  grinder: string | null;
  wheel: string | null;
}

/**
 * 그라인더·숫돌 쪽 값을 고른 언어로 만든다.
 *
 * 숫자와 단위(11000rpm, Φ125mm)는 언어와 상관없어 엔진 값을 그대로 쓴다.
 * 이름(절단용·플랩디스크)이나 낱말(내경·라벨)이 들어간 값만 코드로 다시 만든다.
 * 신뢰도는 엔진이 high·low 코드를 그대로 두므로 여기서 낱말로 바꾼다.
 */
export function checkValueText(check: CheckItem, locale: Locale): CheckValues {
  const raw = { grinder: check.grinderValue, wheel: check.wheelValue };
  const params = check.detail?.params;
  if (!params) return raw;

  switch (check.rule) {
    case RULE.PURPOSE:
      return {
        grinder: raw.grinder,
        wheel:
          labelOf(WHEEL_PURPOSE_LABEL, params.purpose, locale) ?? raw.wheel,
      };
    case RULE.WORK_PURPOSE:
      return {
        grinder:
          labelOf(WORK_PURPOSE_LABEL, params.work, locale) ?? raw.grinder,
        wheel:
          labelOf(WHEEL_PURPOSE_LABEL, params.purpose, locale) ?? raw.wheel,
      };
    case RULE.WHEEL_TYPE:
      return {
        grinder: raw.grinder,
        wheel: labelOf(WHEEL_TYPE_LABEL, params.type, locale) ?? raw.wheel,
      };
    case RULE.CONFIDENCE:
      return {
        grinder:
          labelOf(CONFIDENCE_LABEL, params.grinder, locale) ?? raw.grinder,
        wheel: labelOf(CONFIDENCE_LABEL, params.wheel, locale) ?? raw.wheel,
      };
    case RULE.MOUNTING_SPEC:
      return {
        grinder: raw.grinder,
        wheel: translate(locale, 'value.bore', params),
      };
    case RULE.UNIT_CONSISTENCY:
      return {
        grinder: raw.grinder,
        wheel: translate(locale, 'value.unitConsistency', params),
      };
    default:
      return raw;
  }
}

/**
 * 이어받은 의심 하나의 출처 문구.
 *
 *   only — 그 출처가 의심의 전부일 때. "이 의심은 …에서 왔다"고 말한다
 *   also — 다른 출처도 있을 때. "…에서도 의심이 있었다"고만 말한다
 */
interface DamageSourceNote {
  only: MessageKey;
  also: MessageKey;
}

/**
 * 외관 손상 의심의 출처 → 사유 문장 아래에 붙이는 문구.
 *
 * 이 점검의 라벨 사진을 읽은 판독(label_photo·reanalysis)은 null이다 — 엔진의 사유
 * 문장("사진에서 … 보이는 부분이 있습니다")이 그 판독을 그대로 말하고 있어 덧붙일
 * 문장이 없다. 출처 전체를 요구하므로, 출처를 더하고 여기서 정하지 않으면 타입
 * 검사가 막는다.
 */
const DAMAGE_SOURCE_NOTE: Readonly<
  Record<VisibleDamageSource, DamageSourceNote | null>
> = {
  label_photo: null,
  reanalysis: null,
  legacy_exam: {
    only: 'damageSource.legacyExam',
    also: 'damageSource.legacyExamAlso',
  },
  dropped_ocr: {
    only: 'damageSource.droppedOcr',
    also: 'damageSource.droppedOcrAlso',
  },
  carried: {
    only: 'damageSource.carried',
    also: 'damageSource.carriedAlso',
  },
};

/**
 * 「외관 손상」 항목의 사유 문장 아래에 붙이는 출처 문장들. 붙일 것이 없으면 빈 목록.
 *
 * 엔진의 사유 문장은 의심이 어디서 왔든 "사진에서 깨짐·균열로 보이는 부분이
 * 있습니다"다. 그런데 의심이 이어받은 것이면 — 이전 버전의 추가 사진 확인, 읽을 수
 * 없어 버린 판독, 라벨을 다시 찍기 전의 draft — 이 점검에 남는 사진과 OCR 원본은 그
 * 의심을 담고 있지 않다. 다시 찍은 사진은 다른 숫돌의 것일 수도 있다. 출처를 밝히지
 * 않으면 작업자는 이 사진에서 무엇이 의심됐는지 찾게 되고, 기록을 읽는 사람은 누가
 * 의심으로 만들었는지 되짚을 수 없다.
 *
 * 이어받은 출처의 문장은 **다른 출처가 더 있어도 빼지 않는다.** 이 사진의 판독도
 * 의심했다고 빼면, 결과 화면에서 서버 재분석이 의심을 더하는 순간 보이던 문장
 * (「다른 숫돌을 촬영했더라도 실물을 직접 확인하세요」)이 사라진다 — 앱이 보여 주던
 * 경고를 앱이 줄이게 된다. 대신 문장을 바꾼다: 출처가 하나뿐일 때만 "이 의심은
 * …에서 왔다"·"이 사진의 판독에서 나온 것이 아니다"라고 말하고, 둘 이상이거나 지금
 * 목록에 없는 값(다른 버전이 쓴 기록)이 섞였으면 "…에서도 의심이 있었다"고만 말한다.
 * 모르는 출처가 이 사진의 판독이었을 수도 있으므로 단정하지 않는다.
 *
 * 붙이지 않는 경우.
 *   · 출처가 이 점검의 라벨 사진을 읽은 판독뿐이다 — 엔진 문장이 그대로 말한다
 *   · 출처가 기록되지 않았다(이 표시가 생기기 전의 기록) — 추정해서 말하지 않는다
 *
 * 의심을 덜어내지 않는다. 판정도 visibleDamage도 건드리지 않고 문장만 더한다.
 */
export function damageSourceNotes(
  check: CheckItem,
  wheel: WheelSpec | undefined,
  locale: Locale,
): string[] {
  if (check.rule !== RULE.VISIBLE_DAMAGE) return [];
  if (wheel?.visibleDamage !== 'suspected') return [];
  const stored = wheel.visibleDamageSources;
  if (!stored) return [];

  // 같은 출처가 두 번 적힌 값(손으로 고친 백업 등)은 한 번만 본다. 같은 문장을 두 번
  // 보이지 않는다.
  const sources = stored.filter(
    (source, index) => stored.indexOf(source) === index,
  );
  const sole = sources.length === 1;
  return sources.flatMap((source) => {
    // 저장된 기록의 값이다. 지금 목록에 없는 출처에는 문장이 없다.
    const note = Object.prototype.hasOwnProperty.call(
      DAMAGE_SOURCE_NOTE,
      source,
    )
      ? DAMAGE_SOURCE_NOTE[source]
      : null;
    return note ? [translate(locale, sole ? note.only : note.also)] : [];
  });
}
