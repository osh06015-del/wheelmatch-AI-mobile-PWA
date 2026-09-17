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
  WheelPurpose,
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
  'wheelType.unknown': 'reason.wheelType.unknown',
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
  'guard.missing': 'reason.guard.missing',
  'guard.smallerThanWheel': 'reason.guard.smallerThanWheel',
  'guard.manualCheck': 'reason.guard.manualCheck',
  'profileScope.limited': 'reason.profileScope.limited',
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
