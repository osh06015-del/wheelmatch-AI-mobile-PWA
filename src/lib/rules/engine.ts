// WheelMatch AI — 규격 대조 규칙엔진.
//
// 이 파일이 프로젝트의 핵심이다. 최종 적합 판정은 반드시 여기서만 이루어진다.
// AI(OCR)는 라벨에서 값을 읽어오는 역할만 하고, 판정에는 일절 관여하지 않는다.
// 따라서 이 파일은 외부 의존성이 없는 순수 함수로만 구성한다.

import type {
  CheckItem,
  GrinderSpec,
  MatchResult,
  Verdict,
  WheelPurpose,
  WheelSpec,
  WheelType,
  WorkPurpose,
} from './types';

/** 검사 규칙 이름. UI와 테스트가 항목을 찾을 때 쓰는 키이기도 하다. */
export const RULE = {
  REQUIRED_VALUES: '필수값 존재',
  RPM_SAFETY: 'RPM 안전',
  DIAMETER_FIT: '지름 호환',
  PURPOSE: '용도 확인',
  WORK_PURPOSE: '작업 목적 일치',
  WHEEL_TYPE: '숫돌 종류',
  VISIBLE_DAMAGE: '외관 손상',
  PERIPHERAL_SPEED: '원주속도 교차검증',
  CONFIDENCE: '신뢰도 검증',
} as const;

const PURPOSE_LABEL: Record<WheelPurpose, string> = {
  cutting: '절단용',
  grinding: '연삭용',
  unknown: '미확인',
};

/** 이 앱의 RPM·지름 규칙이 성립하는 종류. 나머지는 규격 체계가 다르다. */
const SUPPORTED_WHEEL_TYPES: ReadonlySet<WheelType> = new Set<WheelType>([
  'bonded_abrasive',
]);

const WHEEL_TYPE_LABEL: Record<WheelType, string> = {
  bonded_abrasive: '결합숫돌 (절단·연삭)',
  flap_disc: '플랩디스크',
  cup_wheel: '컵휠',
  diamond: '다이아몬드',
  wire_brush: '와이어 브러시',
  other: '기타',
  unknown: '미확인',
};

const WORK_PURPOSE_LABEL: Record<WorkPurpose, string> = {
  cutting: '절단',
  grinding: '연삭',
};

const rpmText = (value: number | null): string | null =>
  value === null ? null : `${value}rpm`;

const diameterText = (value: number | null): string | null =>
  value === null ? null : `Φ${value}mm`;

/**
 * 앞 단어의 받침 유무에 맞는 조사를 고른다. "회전속도을(를)" 같은 표기를 피한다.
 * 한글이 아닌 글자로 끝나면 받침 없는 쪽을 쓴다.
 */
export function withParticle(
  word: string,
  withJongseong: string,
  withoutJongseong: string,
): string {
  const last = word.charCodeAt(word.length - 1);
  const isHangulSyllable = last >= 0xac00 && last <= 0xd7a3;
  if (!isHangulSyllable) return `${word}${withoutJongseong}`;
  const hasJongseong = (last - 0xac00) % 28 !== 0;
  return `${word}${hasJongseong ? withJongseong : withoutJongseong}`;
}

/**
 * Rule 1 — 필수값 존재
 * 그라인더 무부하 회전속도와 숫돌 최고사용회전속도가 둘 다 있어야
 * 회전속도 비교 자체가 성립한다. 하나라도 없으면 판정불가.
 */
export function checkRequiredValues(
  grinder: GrinderSpec,
  wheel: WheelSpec,
): CheckItem {
  const missing: string[] = [];
  if (grinder.noLoadRPM === null) missing.push('그라인더 무부하 회전속도');
  if (wheel.maxRPM === null) missing.push('숫돌 최고사용회전속도');

  return {
    rule: RULE.REQUIRED_VALUES,
    passed: missing.length === 0 ? true : null,
    reason:
      missing.length === 0
        ? '회전속도 비교에 필요한 값을 모두 읽었습니다.'
        : `${withParticle(missing.join(', '), '을', '를')} 읽지 못했습니다. 재촬영하거나 수동으로 값을 입력하세요.`,
    grinderValue: rpmText(grinder.noLoadRPM),
    wheelValue: rpmText(wheel.maxRPM),
  };
}

/**
 * Rule 2 — RPM 안전
 * 숫돌의 최고사용회전속도가 그라인더의 무부하 회전속도 이상이어야 한다.
 * 이 조건이 깨지면 숫돌이 정격을 넘겨 회전하게 되어 파손·비산 위험이 있다.
 * 경계값(같은 값)은 통과로 본다.
 */
export function checkRpmSafety(
  grinder: GrinderSpec,
  wheel: WheelSpec,
): CheckItem {
  const grinderRPM = grinder.noLoadRPM;
  const wheelMaxRPM = wheel.maxRPM;
  const base = {
    rule: RULE.RPM_SAFETY,
    grinderValue: rpmText(grinderRPM),
    wheelValue: rpmText(wheelMaxRPM),
  };

  // 값이 없으면 비교하지 않는다. 빈 값을 임의로 채워 통과시키지 않는다.
  if (grinderRPM === null || wheelMaxRPM === null) {
    return {
      ...base,
      passed: null,
      reason: '회전속도 값이 없어 비교할 수 없습니다.',
    };
  }

  if (wheelMaxRPM < grinderRPM) {
    return {
      ...base,
      passed: false,
      reason: `숫돌 최고사용회전속도(${wheelMaxRPM}rpm)가 그라인더 무부하 회전속도(${grinderRPM}rpm)보다 낮습니다. 파손·비산 위험이 있습니다.`,
    };
  }

  return {
    ...base,
    passed: true,
    reason: `숫돌 최고사용회전속도(${wheelMaxRPM}rpm)가 그라인더 무부하 회전속도(${grinderRPM}rpm) 이상입니다.`,
  };
}

/**
 * Rule 3 — 지름 호환
 * 숫돌 지름이 그라인더가 허용하는 최대 지름 이하여야 한다.
 * 둘 중 하나라도 값이 없으면 판정불가로 남긴다.
 */
export function checkDiameterFit(
  grinder: GrinderSpec,
  wheel: WheelSpec,
): CheckItem {
  const grinderMaxDia = grinder.maxWheelDiameter;
  const wheelDia = wheel.diameter;
  const base = {
    rule: RULE.DIAMETER_FIT,
    grinderValue: diameterText(grinderMaxDia),
    wheelValue: diameterText(wheelDia),
  };

  if (grinderMaxDia === null || wheelDia === null) {
    return {
      ...base,
      passed: null,
      reason:
        '지름 값이 없어 비교할 수 없습니다. 그라인더 명판과 숫돌 라벨의 지름 표기를 직접 확인하세요.',
    };
  }

  if (wheelDia > grinderMaxDia) {
    return {
      ...base,
      passed: false,
      reason: `숫돌 지름(${wheelDia}mm)이 그라인더 허용 최대 지름(${grinderMaxDia}mm)을 초과합니다.`,
    };
  }

  return {
    ...base,
    passed: true,
    reason: `숫돌 지름(${wheelDia}mm)이 그라인더 허용 최대 지름(${grinderMaxDia}mm) 이내입니다.`,
  };
}

/**
 * Rule 4 — 용도 확인 (경고 수준)
 * 용도를 읽지 못해도 전체 verdict는 바꾸지 않는다. 사용자에게 직접 확인을 요청한다.
 */
export function checkPurpose(wheel: WheelSpec): CheckItem {
  const base = {
    rule: RULE.PURPOSE,
    grinderValue: null,
    wheelValue: PURPOSE_LABEL[wheel.purpose],
    // 용도 미인식은 알림이다. 회전속도·지름 같은 물리 조건을 무효화하지 않는다.
    advisory: true,
  };

  if (wheel.purpose === 'unknown') {
    return {
      ...base,
      passed: null,
      reason:
        '숫돌 용도(절단/연삭)를 인식하지 못했습니다. 라벨을 직접 확인하세요.',
    };
  }

  return {
    ...base,
    passed: true,
    reason: `숫돌 용도를 ${PURPOSE_LABEL[wheel.purpose]}으로 인식했습니다.`,
  };
}

/**
 * Rule 5 — 작업 목적 일치
 *
 * 작업자가 시작할 때 고른 작업과 숫돌 라벨의 용도를 대조한다.
 * Rule 4(용도 확인)가 "라벨을 읽었는가"라면, 이 규칙은 "읽은 것이 오늘 할
 * 작업과 맞는가"다. 연삭 작업에 절단날을 쓰면 측면 하중이 걸려 숫돌이 깨진다.
 * 그래서 불일치는 경고가 아니라 부적합이다.
 *
 * 작업을 고르지 않았으면(구버전 기록 등) 대조할 대상이 없으므로 건너뛴다.
 * 이때는 Rule 4가 예전처럼 경고 수준으로 남는다.
 */
export function checkWorkPurpose(
  wheel: WheelSpec,
  declaredPurpose: WorkPurpose | null,
): CheckItem | null {
  if (declaredPurpose === null) return null;

  const base = {
    rule: RULE.WORK_PURPOSE,
    grinderValue: WORK_PURPOSE_LABEL[declaredPurpose],
    wheelValue: PURPOSE_LABEL[wheel.purpose],
  };

  // 라벨 용도를 읽지 못하면 대조가 성립하지 않는다.
  // 작업을 선언한 이상 "모르겠다"를 통과시키지 않는다.
  if (wheel.purpose === 'unknown') {
    return {
      ...base,
      passed: null,
      reason: `오늘 작업은 ${WORK_PURPOSE_LABEL[declaredPurpose]}인데 숫돌 용도를 읽지 못했습니다. 라벨의 용도 표기를 직접 확인하세요.`,
    };
  }

  if (wheel.purpose !== declaredPurpose) {
    return {
      ...base,
      passed: false,
      reason: `오늘 작업은 ${WORK_PURPOSE_LABEL[declaredPurpose]}인데 이 숫돌은 ${PURPOSE_LABEL[wheel.purpose]}입니다. 용도에 맞지 않는 숫돌은 측면 하중으로 파손될 수 있습니다.`,
    };
  }

  return {
    ...base,
    passed: true,
    reason: `오늘 작업(${WORK_PURPOSE_LABEL[declaredPurpose]})과 숫돌 용도가 일치합니다.`,
  };
}

/**
 * Rule 6 — 숫돌 종류
 *
 * 이 앱의 RPM·지름 규칙은 일반 결합숫돌(절단날·연삭석)을 전제로 만들어졌다.
 * 다이아몬드 절단날, 컵휠, 플랩디스크, 와이어 브러시는 규격 체계가 달라
 * 같은 규칙을 적용하면 틀린 답이 나온다. 조용히 틀리느니 멈추는 편이 낫다.
 *
 * 지원하지 않는 종류는 부적합이 아니라 판정불가다.
 * 그 숫돌이 위험하다는 뜻이 아니라, 이 앱이 판단할 수 없다는 뜻이기 때문이다.
 */
export function checkWheelType(wheel: WheelSpec): CheckItem {
  const base = {
    rule: RULE.WHEEL_TYPE,
    grinderValue: null,
    wheelValue: WHEEL_TYPE_LABEL[wheel.wheelType],
  };

  // 확인하지 못한 것과 확인해보니 다른 종류인 것을 구분한다.
  //
  // 종류를 못 봤다고 판정을 막으면, 글자만 읽는 Tesseract 경로에서는
  // 항상 판정불가가 되어 오프라인 모드가 통째로 쓸모없어진다.
  // 못 본 것은 알리기만 하고, 다른 종류임을 확인했을 때만 막는다.
  if (wheel.wheelType === 'unknown') {
    return {
      ...base,
      passed: null,
      advisory: true,
      reason:
        '숫돌 종류를 사진으로 확인하지 못했습니다. 결합숫돌(일반 절단날·연삭석)이 맞는지 직접 확인하세요.',
    };
  }

  if (!SUPPORTED_WHEEL_TYPES.has(wheel.wheelType)) {
    return {
      ...base,
      passed: null,
      reason: `${withParticle(WHEEL_TYPE_LABEL[wheel.wheelType], '은', '는')} 이 앱이 다루지 않는 종류입니다. 규격 체계가 달라 판정할 수 없으니 제조사 취급설명서를 확인하세요.`,
    };
  }

  return {
    ...base,
    passed: true,
    reason: '이 앱이 다루는 결합숫돌입니다.',
  };
}

/**
 * Rule 7 — 외관 손상 (경고 수준, 한 방향으로만 작동)
 *
 * 사진으로는 눈에 띄는 파손만 알 수 있다. 미세균열은 보이지 않고
 * 표준 확인법은 타음검사다. 그래서 이 규칙은 한쪽으로만 움직인다.
 *
 *   손상이 보임      → 경고를 올린다
 *   손상이 안 보임    → 아무것도 보장하지 않는다 (통과 근거로 쓰지 않는다)
 *
 * "손상 없음"을 승인하는 경로는 만들지 않는다.
 */
export function checkVisibleDamage(wheel: WheelSpec): CheckItem {
  const base = {
    rule: RULE.VISIBLE_DAMAGE,
    grinderValue: null,
    wheelValue: null,
    // 보이면 경고, 안 보여도 아무것도 보장하지 않는다.
    // 어느 쪽이든 판정을 움직이지 않는다.
    advisory: true as const,
  };

  if (wheel.visibleDamage === 'suspected') {
    return {
      ...base,
      passed: null,
      reason:
        '사진에서 깨짐·균열로 보이는 부분이 있습니다. 이 숫돌을 사용하지 말고 직접 확인하세요.',
    };
  }

  // none_visible / unknown 둘 다 "확인되지 않음"으로 같게 다룬다.
  // 사진에 안 보인다고 손상이 없는 것이 아니다.
  return {
    ...base,
    passed: null,
    reason:
      '사진으로는 미세균열을 확인할 수 없습니다. 장착 전 타음검사(가볍게 두드려 소리 확인)를 하세요.',
  };
}

/**
 * Rule 8 — 신뢰도 검증
 * 어느 한쪽이라도 인식 신뢰도가 낮으면, 나머지 항목이 통과하더라도
 * 그 값을 믿고 적합 판정을 내릴 수 없다. 전체를 판정불가로 되돌린다.
 */
export function checkConfidence(
  grinder: GrinderSpec,
  wheel: WheelSpec,
): CheckItem {
  const base = {
    rule: RULE.CONFIDENCE,
    grinderValue: grinder.confidence,
    wheelValue: wheel.confidence,
  };

  if (grinder.confidence === 'low' || wheel.confidence === 'low') {
    return {
      ...base,
      passed: null,
      reason:
        '라벨 인식 신뢰도가 낮습니다. 재촬영하거나 수동으로 값을 입력하세요.',
    };
  }

  return {
    ...base,
    passed: true,
    reason: '라벨 인식 신뢰도가 충분합니다.',
  };
}

/**
 * 상식 범위(m/s).
 *
 * **안전 한계가 아니다.** OCR이 숫자를 잘못 읽었는지 거르기 위한 범위일 뿐이다.
 * 실제 안전 상한(KS/EN 12413 등)을 규칙으로 쓰려면 원문 확인이 먼저다.
 * 이 숫자를 안전 기준으로 인용하지 마라.
 *
 * 시중 제품은 35~80 m/s에 몰려 있다. 위아래로 넉넉히 잡아 자리수 오류만
 * 걸리게 했다. 범위를 좁히면 멀쩡한 숫돌이 판정불가로 막힌다.
 */
const PLAUSIBLE_MIN_MPS = 15;
const PLAUSIBLE_MAX_MPS = 110;

/**
 * 가장자리가 실제로 도는 속도.
 *
 *   v(m/s) = π × 지름(m) × 회전속도(rpm) / 60
 */
export function peripheralSpeedMps(
  diameterMm: number | null,
  rpm: number | null,
): number | null {
  if (diameterMm === null || rpm === null) return null;
  if (diameterMm <= 0 || rpm <= 0) return null;
  return (Math.PI * (diameterMm / 1000) * rpm) / 60;
}

function speedText(mps: number | null): string | null {
  return mps === null ? null : `${Math.round(mps)}m/s`;
}

/**
 * Rule 9 — 원주속도 교차검증
 *
 * 지름과 회전속도는 따로 정해지는 값이 아니다. 제조사는 가장자리 속도를
 * 맞춰 두 값을 함께 정한다(같은 80 m/s를 내려고 Φ125는 12,200rpm,
 * Φ180은 8,500rpm). 그래서 둘 중 하나만 잘못 읽으면 계산값이 상식 밖으로 튄다.
 *
 *   12,200 → 1,220 으로 읽음   →   8m/s   (자리 하나 빠짐)
 *   Φ125  → Φ12.5 로 읽음      →   8m/s
 *   12,200 → 122,000 으로 읽음 → 798m/s
 *
 * 왜 경고가 아니라 판정불가(차단)인가:
 * 이 오류들은 안전한 쪽으로만 틀리지 않는다. 그라인더 rpm을 낮게 읽으면
 * RPM 검사가 그냥 통과하고, 숫돌 지름을 작게 읽으면 지름 검사가 통과한다.
 * 즉 조용히 "적합"을 만들어낼 수 있다. 값을 믿을 수 없으면 통과가 아니라
 * 판정불가다 — 이 앱의 기본 원칙 그대로다.
 *
 * 양쪽 다 계산할 수 없으면 이 항목 자체를 만들지 않는다. 값이 없는 것은
 * checkRequiredValues가 이미 잡는다. 같은 사유를 두 번 띄우지 않는다.
 */
export function checkPeripheralSpeed(
  grinder: GrinderSpec,
  wheel: WheelSpec,
): CheckItem | null {
  const grinderSpeed = peripheralSpeedMps(
    grinder.maxWheelDiameter,
    grinder.noLoadRPM,
  );
  const wheelSpeed = peripheralSpeedMps(wheel.diameter, wheel.maxRPM);

  if (grinderSpeed === null && wheelSpeed === null) return null;

  const base = {
    rule: RULE.PERIPHERAL_SPEED,
    grinderValue: speedText(grinderSpeed),
    wheelValue: speedText(wheelSpeed),
  };

  const odd = (mps: number | null): boolean =>
    mps !== null && (mps < PLAUSIBLE_MIN_MPS || mps > PLAUSIBLE_MAX_MPS);

  const suspects: string[] = [];
  if (odd(grinderSpeed)) suspects.push('그라인더');
  if (odd(wheelSpeed)) suspects.push('숫돌');

  if (suspects.length > 0) {
    const who = suspects.join('와 ');
    return {
      ...base,
      passed: null,
      reason:
        `${who} 값으로 계산한 가장자리 속도가 상식 범위를 벗어납니다. ` +
        `지름이나 회전속도를 잘못 읽었을 수 있습니다. ` +
        `${withParticle(who, '은', '는')} 라벨의 숫자를 다시 확인하세요.`,
    };
  }

  return {
    ...base,
    passed: true,
    reason: '지름과 회전속도가 서로 어울리는 값입니다.',
  };
}

/**
 * 개별 검사 결과들로부터 최종 판정을 정한다.
 *
 *   1) 하나라도 명시적으로 부적합(false)이면 → INCOMPATIBLE
 *   2) 경고 규칙이 아닌 항목이 하나라도 판정불가(null)이면 → UNDETERMINED
 *   3) 그 외 → COMPATIBLE
 *
 * 부적합을 판정불가보다 먼저 본다. 값이 불확실하더라도 명백한 위반이 하나라도
 * 확인됐다면 그 숫돌은 장착하면 안 되기 때문이다.
 */
export function decideVerdict(checks: CheckItem[]): Verdict {
  if (checks.some((check) => check.passed === false)) {
    return 'INCOMPATIBLE';
  }
  if (checks.some((check) => check.passed === null && !check.advisory)) {
    return 'UNDETERMINED';
  }
  return 'COMPATIBLE';
}

/**
 * 규격 대조 진입점. Rule 1 → 5를 순서대로 실행하고 최종 판정을 반환한다.
 * 어떤 규칙도 건너뛰지 않는다. 판정을 막는 규칙이 있어도 나머지 항목의 결과를
 * 함께 보여줘야 사용자가 무엇을 고쳐야 하는지 알 수 있다.
 */
export interface MatchOptions {
  /** 작업자가 고른 오늘의 작업. 고르지 않았으면 목적 대조를 건너뛴다. */
  declaredPurpose?: WorkPurpose | null;
  /** 테스트에서 시각을 고정하기 위한 주입점 */
  now?: Date;
}

export function matchSpecs(
  grinder: GrinderSpec,
  wheel: WheelSpec,
  options: MatchOptions = {},
): MatchResult {
  const { declaredPurpose = null, now = new Date() } = options;

  const workPurpose = checkWorkPurpose(wheel, declaredPurpose);
  const peripheralSpeed = checkPeripheralSpeed(grinder, wheel);

  const checks: CheckItem[] = [
    checkRequiredValues(grinder, wheel),
    checkRpmSafety(grinder, wheel),
    checkDiameterFit(grinder, wheel),
    checkPurpose(wheel),
    // 작업을 고르지 않았으면 이 항목 자체가 없다.
    ...(workPurpose ? [workPurpose] : []),
    checkWheelType(wheel),
    checkVisibleDamage(wheel),
    // 양쪽 다 계산할 수 없으면 항목 자체가 없다.
    ...(peripheralSpeed ? [peripheralSpeed] : []),
    checkConfidence(grinder, wheel),
  ];

  return {
    verdict: decideVerdict(checks),
    checks,
    timestamp: now.toISOString(),
  };
}

/** 부적합 원인만 추린다. 결과 화면에서 굵게 강조할 문장들이다. */
export function failureReasons(result: MatchResult): string[] {
  return result.checks
    .filter((check) => check.passed === false)
    .map((check) => check.reason);
}

/** 판정불가 원인만 추린다. 경고 수준 규칙도 포함해 사용자에게 모두 알린다. */
export function undeterminedReasons(result: MatchResult): string[] {
  return result.checks
    .filter((check) => check.passed === null)
    .map((check) => check.reason);
}
