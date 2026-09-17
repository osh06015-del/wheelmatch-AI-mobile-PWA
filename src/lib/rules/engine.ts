// WheelMatch AI — 규격 대조 규칙엔진.
//
// 이 파일이 프로젝트의 핵심이다. 최종 적합 판정은 반드시 여기서만 이루어진다.
// AI(OCR)는 라벨에서 값을 읽어오는 역할만 하고, 판정에는 일절 관여하지 않는다.
// 따라서 이 파일은 외부 의존성이 없는 순수 함수로만 구성한다.

import type {
  AccessoryProfile,
  CheckItem,
  ExpiryMonth,
  GrinderSpec,
  MatchResult,
  ReasonCode,
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
  UNIT_CONSISTENCY: '표기 일치',
  MOUNTING_SPEC: '장착 규격',
  PERIPHERAL_SPEED: '원주속도 교차검증',
  EXPIRY: '유효기한',
  CONFIDENCE: '신뢰도 검증',
  GUARD: '덮개 조건',
  PROFILE_SCOPE: '제한적 규격 대조',
} as const;

const PURPOSE_LABEL: Record<WheelPurpose, string> = {
  cutting: '절단용',
  grinding: '연삭용',
  unknown: '미확인',
};

/**
 * 확인 화면의 숫돌 종류 선택지와 같은 이름을 쓴다. 작업자가 고른 이름과 결과
 * 화면의 이름이 다르면 무엇을 골랐는지 되짚기 어렵다.
 */
const WHEEL_TYPE_LABEL: Record<WheelType, string> = {
  bonded_abrasive: '일반 결합숫돌',
  bonded_cutting: '결합 절단숫돌(Type 1/41)',
  bonded_grinding: '결합 연삭숫돌(Type 27/28)',
  bonded_combination: '절단·연삭 겸용 숫돌(Type 27/42)',
  bonded_cup: '결합 컵숫돌(Type 6/11)',
  flap_disc: '플랩디스크',
  cup_wheel: '컵휠',
  diamond: '다이아몬드 휠',
  diamond_continuous: '다이아몬드 절단날(연속 림)',
  diamond_turbo: '다이아몬드 절단날(터보)',
  diamond_segmented: '다이아몬드 절단날(세그먼트)',
  diamond_cup: '다이아몬드 컵휠',
  tuck_pointing: '줄눈 휠(턱포인팅)',
  wire_brush: '와이어 브러시',
  fibre_disc: '파이버·샌딩 디스크',
  nonwoven_disc: '부직포 표면처리 디스크',
  polishing_pad: '제조사 승인 연마 패드',
  other: '기타',
  unknown: '확인 안 됨',
};

/** 넘겨받은 Profile이 이 숫돌 종류의 것일 때만 쓴다. 잘못 넘긴 Profile은 무시한다. */
function appliedProfile(
  wheel: WheelSpec,
  profile: AccessoryProfile | null,
): AccessoryProfile | null {
  return profile !== null && profile.type === wheel.wheelType ? profile : null;
}

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
    detail: {
      code: requiredValuesCode(
        grinder.noLoadRPM === null,
        wheel.maxRPM === null,
      ),
    },
    grinderValue: rpmText(grinder.noLoadRPM),
    wheelValue: rpmText(wheel.maxRPM),
  };
}

/** 어느 쪽 회전속도가 빠졌는지에 따라 사유 코드를 고른다. 문장이 셋으로 갈린다. */
function requiredValuesCode(
  grinderMissing: boolean,
  wheelMissing: boolean,
): ReasonCode {
  if (grinderMissing && wheelMissing) return 'requiredValues.missingBoth';
  if (grinderMissing) return 'requiredValues.missingGrinder';
  if (wheelMissing) return 'requiredValues.missingWheel';
  return 'requiredValues.ok';
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
      detail: { code: 'rpmSafety.missing' },
    };
  }

  const params = { wheel: wheelMaxRPM, grinder: grinderRPM };

  if (wheelMaxRPM < grinderRPM) {
    return {
      ...base,
      passed: false,
      reason: `숫돌 최고사용회전속도(${wheelMaxRPM}rpm)가 그라인더 무부하 회전속도(${grinderRPM}rpm)보다 낮습니다. 파손·비산 위험이 있습니다.`,
      detail: { code: 'rpmSafety.fail', params },
    };
  }

  return {
    ...base,
    passed: true,
    reason: `숫돌 최고사용회전속도(${wheelMaxRPM}rpm)가 그라인더 무부하 회전속도(${grinderRPM}rpm) 이상입니다.`,
    detail: { code: 'rpmSafety.pass', params },
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
      detail: { code: 'diameterFit.missing' },
    };
  }

  const params = { wheel: wheelDia, grinder: grinderMaxDia };

  if (wheelDia > grinderMaxDia) {
    return {
      ...base,
      passed: false,
      reason: `숫돌 지름(${wheelDia}mm)이 그라인더 허용 최대 지름(${grinderMaxDia}mm)을 초과합니다.`,
      detail: { code: 'diameterFit.fail', params },
    };
  }

  return {
    ...base,
    passed: true,
    reason: `숫돌 지름(${wheelDia}mm)이 그라인더 허용 최대 지름(${grinderMaxDia}mm) 이내입니다.`,
    detail: { code: 'diameterFit.pass', params },
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

  // 이름이 아니라 코드를 넘긴다. 화면이 고른 언어의 이름으로 바꾼다.
  const params = { purpose: wheel.purpose };

  if (wheel.purpose === 'unknown') {
    return {
      ...base,
      passed: null,
      reason:
        '숫돌 용도(절단/연삭)를 인식하지 못했습니다. 라벨을 직접 확인하세요.',
      detail: { code: 'purpose.unknown', params },
    };
  }

  return {
    ...base,
    passed: true,
    reason: `숫돌 용도를 ${PURPOSE_LABEL[wheel.purpose]}으로 인식했습니다.`,
    detail: { code: 'purpose.recognized', params },
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
  profile: AccessoryProfile | null,
): CheckItem | null {
  if (declaredPurpose === null) return null;

  const base = {
    rule: RULE.WORK_PURPOSE,
    grinderValue: WORK_PURPOSE_LABEL[declaredPurpose],
    wheelValue: PURPOSE_LABEL[wheel.purpose],
  };

  // 라벨 용도를 읽지 못하면 대조가 성립하지 않는다.
  // 작업을 선언한 이상 "모르겠다"를 통과시키지 않는다.
  const params = { work: declaredPurpose, purpose: wheel.purpose };

  // Profile이 허용 작업을 근거와 함께 좁혔는데 오늘 작업이 그 밖이면, 작업자가
  // 고른 종류와 작업이 서로 어긋난다. 어느 쪽이 사실인지 앱은 모르므로 부적합이
  // 아니라 판정불가다(덮개 어긋남과 같은 원칙).
  const applied = appliedProfile(wheel, profile);
  const allowed = applied?.allowedWork ?? 'unverified';
  const profileMismatch: CheckItem | null =
    applied !== null &&
    allowed !== 'unverified' &&
    !allowed.includes(declaredPurpose)
      ? {
          ...base,
          passed: null,
          reason: `오늘 작업(${WORK_PURPOSE_LABEL[declaredPurpose]})이 고른 종류(${WHEEL_TYPE_LABEL[wheel.wheelType]})의 허용 작업에 들지 않습니다. 종류 선택과 작업을 다시 확인하기 전에는 판정할 수 없습니다.`,
          detail: {
            code: 'workPurpose.profileMismatch',
            params: { ...params, type: wheel.wheelType },
          },
        }
      : null;

  // 라벨에 절단용/연삭용 표기가 없는 종류(플랩·다이아몬드·브러시 등)는 라벨
  // 용도로 대조하지 않는다. 허용 작업의 근거도 없으면 통과가 아니라 직접 확인이다.
  if (applied !== null && applied.workCheck === 'allowed_work') {
    if (profileMismatch) return profileMismatch;
    return {
      ...base,
      passed: null,
      advisory: true,
      reason: `오늘 작업은 ${WORK_PURPOSE_LABEL[declaredPurpose]}입니다. 이 종류에 맞는 작업인지 대조할 근거가 이 앱에 없습니다. 제조사 취급설명서로 직접 확인하세요.`,
      detail: { code: 'workPurpose.manualCheck', params },
    };
  }

  if (wheel.purpose === 'unknown') {
    return {
      ...base,
      passed: null,
      reason: `오늘 작업은 ${WORK_PURPOSE_LABEL[declaredPurpose]}인데 숫돌 용도를 읽지 못했습니다. 라벨의 용도 표기를 직접 확인하세요.`,
      detail: { code: 'workPurpose.unknown', params },
    };
  }

  if (wheel.purpose !== declaredPurpose) {
    // 라벨 용도와 작업이 어긋난 것은 부적합이다. Profile 어긋남보다 앞선다.
    return {
      ...base,
      passed: false,
      reason: `오늘 작업은 ${WORK_PURPOSE_LABEL[declaredPurpose]}인데 이 숫돌은 ${PURPOSE_LABEL[wheel.purpose]}입니다. 용도에 맞지 않는 숫돌은 측면 하중으로 파손될 수 있습니다.`,
      detail: { code: 'workPurpose.mismatch', params },
    };
  }

  if (profileMismatch) return profileMismatch;

  return {
    ...base,
    passed: true,
    reason: `오늘 작업(${WORK_PURPOSE_LABEL[declaredPurpose]})과 숫돌 용도가 일치합니다.`,
    detail: { code: 'workPurpose.match', params },
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
 *
 * wheel.wheelType은 작업자가 확인 화면에서 실물을 보고 고른 값이다. AI가 사진으로
 * 본 종류는 제안으로만 쓰였고 wheelOcr에 따로 남는다(src/lib/ocr/confirm.ts).
 */
export function checkWheelType(
  wheel: WheelSpec,
  profile: AccessoryProfile | null,
): CheckItem {
  const base = {
    rule: RULE.WHEEL_TYPE,
    grinderValue: null,
    wheelValue: WHEEL_TYPE_LABEL[wheel.wheelType],
  };

  const params = { type: wheel.wheelType };

  // 종류를 확인하지 못한 것(unknown)도 다른 미지원 종류와 같은 길로 막는다 —
  // profiles.ts의 UNKNOWN_PROFILE이 종류에 맞게 넘어오면 아래 일반 분기가
  // RPM·지름은 대조하고(scope: 'limited') checkProfileScope가 그 이상을 막는다.
  // 호출자가 Profile을 넘기지 않았거나 다른 종류의 Profile을 넘겼으면 이
  // 앱이 다루지 않는 종류와 똑같이 취급한다 — 예전에는 unknown만 별도
  // 문구로 막았지만, 작업자가 확인 화면에서 종류를 직접 고르는 지금은
  // 그 종류만 다르게 말할 이유가 없다.
  //
  // 이 앱의 RPM·지름 규칙이 성립하는 종류는 호출자가 넘긴 Profile이 정한다
  // (profiles.ts의 profileFor). 엔진이 Profile 표를 직접 불러오지 않는 이유는
  // engine.ts를 import 없는 순수 함수로 두기 위해서다(safety-invariants.md §1).
  // Profile이 없거나, 다른 종류의 Profile이거나, 지원하지 않는 Profile이면
  // 대조하지 않는다 — 잘못 넘긴 Profile이 통과를 만들지 못하게 종류까지 맞춘다.
  if (
    profile === null ||
    profile.type !== wheel.wheelType ||
    !profile.supported
  ) {
    return {
      ...base,
      passed: null,
      reason: `${withParticle(WHEEL_TYPE_LABEL[wheel.wheelType], '은', '는')} 이 앱이 다루지 않는 종류입니다. 규격 체계가 달라 판정할 수 없으니 제조사 취급설명서를 확인하세요.`,
      detail: { code: 'wheelType.unsupported', params },
    };
  }

  // 처음부터 다뤄 온 일반 결합숫돌은 문장을 그대로 둔다 — 기존 기록과 같은 말이다.
  if (wheel.wheelType === 'bonded_abrasive') {
    return {
      ...base,
      passed: true,
      reason:
        '일반 결합숫돌로 확인되었습니다. 이 앱이 규격을 대조하는 종류입니다.',
      detail: { code: 'wheelType.supported', params },
    };
  }

  return {
    ...base,
    passed: true,
    reason: `확인된 종류: ${WHEEL_TYPE_LABEL[wheel.wheelType]}. 이 앱이 회전속도·지름을 대조하는 종류입니다. 종류별 상태 확인 항목은 작업자가 직접 확인해야 합니다.`,
    detail: { code: 'wheelType.supportedProfile', params },
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
      detail: { code: 'visibleDamage.suspected' },
    };
  }

  // none_visible / unknown 둘 다 "확인되지 않음"으로 같게 다룬다.
  // 사진에 안 보인다고 손상이 없는 것이 아니다.
  return {
    ...base,
    passed: null,
    reason:
      '사진으로는 미세균열을 확인할 수 없습니다. 장착 전 타음검사(가볍게 두드려 소리 확인)를 하세요.',
    detail: { code: 'visibleDamage.notVerifiable' },
  };
}

/** 덮개 입력끼리의 명시적 어긋남. 모르는 값은 어긋남이 아니다. */
export interface GuardConflicts {
  /** 덮개가 필요한 종류인데 작업자가 "덮개 없음"을 골랐다 */
  missing: boolean;
  /** 덮개 크기가 숫돌 지름보다 작다고 입력됐다 */
  smallerThanWheel: boolean;
}

/**
 * 덮개 어긋남을 찾는다. 판정 규칙(checkGuard)과 결과 화면의 조건 표
 * (profiles.ts의 profileConditions)가 이 함수 하나를 함께 쓴다 — 둘이 따로
 * 계산하면 표는 어긋남이라 하고 판정은 적합이라 하는 모순이 다시 생긴다.
 *
 * 모름(unknown)·입력 없음(구기록의 undefined)은 없음으로 치지 않는다.
 * 숫돌 지름을 모르면 크기를 비교하지 않는다 — 어긋남을 지어내지 않는다.
 */
export function guardConflicts(
  grinder: GrinderSpec,
  wheel: WheelSpec,
  profile: AccessoryProfile | null,
): GuardConflicts {
  const required =
    profile !== null &&
    profile.type === wheel.wheelType &&
    profile.equipment.guard === 'required';
  const guardSize = grinder.guardSize ?? null;
  return {
    missing: required && grinder.guardType === 'none',
    smallerThanWheel:
      guardSize !== null &&
      wheel.diameter !== null &&
      guardSize < wheel.diameter,
  };
}

/**
 * Rule 13 — 덮개 조건
 *
 * 작업자가 명판 확인 화면에서 **명시적으로** 넣은 덮개 입력이 어긋나면
 * 적합을 내지 않는다.
 *
 *   덮개 없음(필수 Profile)   → 판정불가
 *   덮개가 숫돌보다 작음        → 판정불가
 *   그 밖에 무언가 입력함       → 경고(직접 확인) — 판정을 움직이지 않는다
 *   아무것도 입력하지 않음      → 항목 없음(기존 흐름 그대로)
 *
 * 부적합이 아니라 판정불가인 이유.
 *   · 덮개 없음: 결과 화면에 오려면 작업자가 Grinder Condition Gate의
 *     "방호덮개 장착·고정"을 이미 확인함으로 눌렀다. 두 답이 서로 어긋난다.
 *     서로 다른 경로의 값이 충돌하면 판정불가다(safety-critical.md §3).
 *     제122조 ①(덮개 설치)은 근거가 있지만, 어느 답이 사실인지 앱은 모른다.
 *   · 덮개 크기: 크기 기준의 근거를 저장소에서 확인하지 못했다. 법적
 *     부적합으로 단정하지 않고 판정불가로 막는다.
 *
 * 덮개가 있다고 해서 통과(true)로 두지 않는다 — 종류·크기가 맞는 덮개인지는
 * 근거가 없다. 덮개 장착 자체는 Gate가 사람에게 받는다(중복 규칙을 만들지 않는다).
 */
export function checkGuard(
  grinder: GrinderSpec,
  wheel: WheelSpec,
  profile: AccessoryProfile | null,
): CheckItem | null {
  if (
    profile === null ||
    profile.type !== wheel.wheelType ||
    profile.equipment.guard === 'not_applicable'
  ) {
    return null;
  }

  const guardType = grinder.guardType ?? 'unknown';
  const guardSize = grinder.guardSize ?? null;
  // 구기록·모름 — 입력이 없으면 기존처럼 항목을 만들지 않는다.
  if (guardType === 'unknown' && guardSize === null) return null;

  const conflicts = guardConflicts(grinder, wheel, profile);
  const base = {
    rule: RULE.GUARD,
    grinderValue: guardSize === null ? null : `${guardSize}mm`,
    wheelValue: diameterText(wheel.diameter),
  };

  if (conflicts.missing) {
    return {
      ...base,
      passed: null,
      reason:
        '덮개가 없다고 입력했습니다. 이 종류는 덮개가 필요합니다. 덮개를 달고 입력을 바로잡기 전에는 판정할 수 없습니다.',
      detail: { code: 'guard.missing' },
    };
  }

  if (conflicts.smallerThanWheel) {
    return {
      ...base,
      passed: null,
      reason:
        '덮개 크기가 숫돌 지름보다 작게 입력됐습니다. 이 덮개로는 숫돌을 감쌀 수 없으니 덮개와 입력을 확인하기 전에는 판정할 수 없습니다.',
      detail: { code: 'guard.smallerThanWheel' },
    };
  }

  return {
    ...base,
    passed: null,
    // 입력끼리 어긋나지는 않지만 맞는 덮개라고 확인해 주지도 않는다.
    advisory: true,
    reason:
      '덮개 종류와 크기가 이 숫돌에 맞는지 앱이 대조하지 않습니다. 장착 상태를 직접 확인하세요.',
    detail: { code: 'guard.manualCheck' },
  };
}

/**
 * Rule 13 — 판정 범위(부분 검증 Profile은 적합을 내지 않는다)
 *
 * Profile의 `scope`가 'limited'면 작업·덮개·재료 같은 핵심 조건 중 근거를
 * 확인하지 못한 것이 있다는 뜻이다(profiles.ts). 이런 종류는 RPM·지름이
 * 둘 다 맞아도 **적합으로 끝내지 않는다** — "일부만 검증된 종류"가 "검증된
 * 종류"와 같은 결론에 이르면, 화면에서 두 경우를 구분할 수 없게 된다.
 *
 * 부적합(false)은 이 규칙보다 항상 앞선다 — decideVerdict가 false를 먼저
 * 본다. 이 항목은 RPM·지름 위반이 없을 때만 "그래도 적합은 아니다"를 만든다.
 *
 * scope가 'full'(bonded_abrasive와 결합숫돌 세부 형식)이면 항목을 만들지
 * 않는다 — 기존 결합숫돌 판정에 새 항목을 더해 흔들지 않기 위해서다.
 */
export function checkProfileScope(
  wheel: WheelSpec,
  profile: AccessoryProfile | null,
): CheckItem | null {
  const applied = appliedProfile(wheel, profile);
  if (applied === null || applied.scope !== 'limited') return null;

  return {
    rule: RULE.PROFILE_SCOPE,
    grinderValue: null,
    wheelValue: null,
    passed: null,
    reason:
      'RPM과 지름만 대조했습니다. 작업·덮개·장착 적합성은 확인되지 않아 적합 판정을 제공하지 않습니다.',
    detail: { code: 'profileScope.limited' },
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

  const params = { grinder: grinder.confidence, wheel: wheel.confidence };

  if (grinder.confidence === 'low' || wheel.confidence === 'low') {
    return {
      ...base,
      passed: null,
      reason:
        '라벨 인식 신뢰도가 낮습니다. 재촬영하거나 수동으로 값을 입력하세요.',
      detail: { code: 'confidence.low', params },
    };
  }

  return {
    ...base,
    passed: true,
    reason: '라벨 인식 신뢰도가 충분합니다.',
    detail: { code: 'confidence.ok', params },
  };
}

/**
 * 라벨의 두 표기가 서로 어긋나는 허용 폭(%).
 *
 * 라벨은 반올림해서 인쇄된다. Φ125 12,200rpm은 79.85m/s인데 라벨에는 "80m/s"로
 * 찍힌다 — 0.2% 차이다. 실제 오독은 자릿수가 통째로 어긋나므로 훨씬 크게 벌어진다.
 * 10%면 반올림은 넘어가고 오독만 걸린다.
 */
const MARKING_TOLERANCE_PERCENT = 10;

/**
 * Rule 10 — 표기 일치
 *
 * 라벨에 rpm과 m/s가 **둘 다** 적혀 있는 경우가 있다. 둘은 같은 것을 다른
 * 단위로 말한 것이므로 서로 환산이 맞아야 한다. 맞지 않으면 둘 중 하나를
 * 잘못 읽은 것이다.
 *
 * 왜 판정불가(차단)인가:
 * 어느 쪽이 틀렸는지 알 수 없다. rpm 쪽이 높게 읽혔다면 그대로 통과해버리고,
 * m/s 쪽이 틀렸다면 환산값이 오염된다. 어느 경우든 "적합"이 근거를 잃는다.
 * 값을 믿을 수 없으면 통과가 아니라 판정불가다.
 *
 * 표기가 하나뿐이면 대조할 상대가 없으므로 이 항목을 만들지 않는다.
 * 원본 표시가 없는(기능 도입 전) 기록도 마찬가지다.
 */
export function checkUnitConsistency(wheel: WheelSpec): CheckItem | null {
  const markings = wheel.markings;
  if (!markings) return null;

  // 구조분해 이름을 함수와 겹치지 않게 둔다. peripheralSpeedMps로 받으면
  // 아래에서 부르는 동명의 함수를 가려버린다 (실제로 한 번 그렇게 만들었다).
  const { labeledRPM, peripheralSpeedMps: labeledMps } = markings;
  if (labeledRPM === null || labeledMps === null) return null;
  if (wheel.diameter === null || labeledMps <= 0) return null;

  // rpm 쪽을 m/s로 옮겨 같은 단위에서 견준다.
  const fromRpm = peripheralSpeedMps(wheel.diameter, labeledRPM);
  if (fromRpm === null) return null;

  const gapPercent = (Math.abs(fromRpm - labeledMps) / labeledMps) * 100;

  const base = {
    rule: RULE.UNIT_CONSISTENCY,
    grinderValue: null,
    wheelValue: `${labeledRPM}rpm = ${Math.round(fromRpm)}m/s / 라벨 ${labeledMps}m/s`,
  };

  // 화면이 비교 값을 고른 언어로 다시 적을 수 있게 숫자만 따로 넘긴다.
  const params = {
    rpm: labeledRPM,
    computed: Math.round(fromRpm),
    labeled: labeledMps,
  };

  if (gapPercent > MARKING_TOLERANCE_PERCENT) {
    return {
      ...base,
      passed: null,
      reason:
        '라벨의 회전속도 표기와 원주속도 표기가 서로 맞지 않습니다. ' +
        '둘 중 하나를 잘못 읽었을 수 있습니다. 라벨의 숫자를 다시 확인하세요.',
      detail: { code: 'unitConsistency.mismatch', params },
    };
  }

  return {
    ...base,
    passed: true,
    reason: '라벨의 두 표기가 서로 맞습니다.',
    detail: { code: 'unitConsistency.match', params },
  };
}

/**
 * Rule 11 — 장착 규격 (내경)
 *
 * **이 항목은 판정하지 않는다.** 읽은 값을 보여주고 사용자가 직접 확인하게 한다.
 *
 * 이유: 그라인더 명판에는 스핀들 규격이 적히지 않는다. 대조할 상대가 없다.
 * 통용 규격(앵글그라인더 22.23mm 등)을 기준으로 만들면 그건 규격 대조가 아니라
 * 관행 추정이다. 이 앱은 라벨에 적힌 값끼리만 대조한다.
 *
 * 그래서 항상 경고 수준(advisory)이다. 값을 읽었든 못 읽었든 전체 판정을
 * 끌어내리지 않는다. 대신 "사용자가 직접 확인할 항목"으로 화면에 남는다.
 */
export function checkMountingSpec(wheel: WheelSpec): CheckItem | null {
  const markings = wheel.markings;
  if (!markings) return null;

  const bore = markings.boreDiameter;
  const base = {
    rule: RULE.MOUNTING_SPEC,
    grinderValue: null,
    wheelValue: bore === null ? null : `내경 Φ${bore}mm`,
    advisory: true,
  };

  if (bore === null) {
    return {
      ...base,
      passed: null,
      reason:
        '라벨에서 장착 구멍 지름(내경)을 읽지 못했습니다. ' +
        '숫돌이 축에 제대로 맞는지 장착 전에 직접 확인하세요.',
      detail: { code: 'mountingSpec.missing' },
    };
  }

  return {
    ...base,
    passed: null,
    reason:
      `라벨에 적힌 내경은 Φ${bore}mm입니다. ` +
      '그라인더 명판에는 축 규격이 적혀 있지 않아 이 앱이 대조할 수 없습니다. ' +
      '축에 맞는지 직접 확인하세요.',
    detail: { code: 'mountingSpec.shown', params: { bore } },
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

  const grinderOdd = odd(grinderSpeed);
  const wheelOdd = odd(wheelSpeed);
  const suspects: string[] = [];
  if (grinderOdd) suspects.push('그라인더');
  if (wheelOdd) suspects.push('숫돌');

  if (suspects.length > 0) {
    const who = suspects.join('와 ');
    return {
      ...base,
      passed: null,
      reason:
        `${who} 값으로 계산한 가장자리 속도가 상식 범위를 벗어납니다. ` +
        `지름이나 회전속도를 잘못 읽었을 수 있습니다. ` +
        `${withParticle(who, '은', '는')} 라벨의 숫자를 다시 확인하세요.`,
      detail: {
        code:
          grinderOdd && wheelOdd
            ? 'peripheralSpeed.oddBoth'
            : grinderOdd
              ? 'peripheralSpeed.oddGrinder'
              : 'peripheralSpeed.oddWheel',
      },
    };
  }

  return {
    ...base,
    passed: true,
    reason: '지름과 회전속도가 서로 어울리는 값입니다.',
    detail: { code: 'peripheralSpeed.ok' },
  };
}

// ─────────────────────────────────────────────────────────────
// Rule 12 — 유효기한
//
// 근거와 한계는 docs/regulatory-sources.md §7에 있다. 요약하면:
//   · 한국 법령(산업안전보건기준에 관한 규칙 제122조)에는 유효기한 조항이 없다.
//   · oSa 표시 요구사항(2020-04, EN 12413:2019 기준)은 수공구용 B/BF 본드
//     제품에 "date of expiry"를 월/연으로 표시하게 한다.
//   · EN 12413 원문은 유료라 읽지 못했다. 조항 번호를 인용하지 않는다.
//
// 그래서 이 규칙은 **라벨에 표시된 기한만** 본다. 제조일에서 계산하지 않는다.
// ─────────────────────────────────────────────────────────────

/** 기준일 형식. 시간대 없이 날짜만 본다. */
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad2 = (value: number): string => String(value).padStart(2, '0');
const pad4 = (value: number): string => String(value).padStart(4, '0');

/** 그레고리력 각 달의 마지막 날. 2월만 윤년을 본다. */
function lastDayOfMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/**
 * YYYY-MM-DD 형식이면서 달력에 실재하는 날짜인지 본다.
 *
 * 형식만 보고 넘기면 2월 30일 같은 값이 그대로 비교에 들어간다.
 */
export function isValidDateOnly(value: string | null): value is string {
  if (value === null) return false;
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= lastDayOfMonth(year, month);
}

/**
 * Date를 기준일 문자열로 바꾼다. **로컬 날짜**를 쓴다.
 *
 * toISOString()을 쓰면 UTC로 변환되어 한국 시간 오전 9시 이전에는 전날이 된다.
 * 하루가 통째로 어긋나면 만료 경계가 흔들린다.
 *
 * 엔진은 시계를 읽지 않는다. 이 함수도 넘겨받은 Date만 본다.
 */
export function toDateOnly(date: Date): string {
  return `${pad4(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 라벨과 같은 표기로 되돌린다. 예: { year: 2023, month: 4 } → "04/2023" */
export function formatExpiry(expiry: ExpiryMonth): string {
  return `${pad2(expiry.month)}/${pad4(expiry.year)}`;
}

/**
 * 표시된 유효기한의 **마지막 유효일**.
 *
 *   04/2023 → 2023-04-30까지 유효. 2023-05-01부터 만료.
 *
 * 확인된 원문은 "expressed as month and year e.g. 04/2023"까지만 정하고
 * 그 달의 언제 만료되는지는 정하지 않는다(oSa 2020-04). EN 12413 원문은
 * 읽지 못했다. **그러므로 아래 해석은 규정이 아니라 이 앱이 정한 것이다.**
 *
 * 월을 가리키는 표기이므로 그 달 전체를 유효로 본다. 반대로 잡으면(그 달 1일
 * 만료) 근거 없이 한 달을 앞당겨 멀쩡한 숫돌을 막는다. 근거 없는 완화도,
 * 근거 없는 강화도 하지 않는다.
 */
export function expiryLastValidDate(expiry: ExpiryMonth): string {
  return `${pad4(expiry.year)}-${pad2(expiry.month)}-${pad2(
    lastDayOfMonth(expiry.year, expiry.month),
  )}`;
}

/**
 * Rule 12 — 유효기한
 *
 * 기준일(today)은 호출자가 넣는다. 엔진이 시계를 읽으면 같은 기록을 다시 열
 * 때마다 판정이 달라져 근거를 되짚을 수 없다.
 *
 *   기준일 없음/형식 오류  → 판정불가 (비교할 기준이 없다)
 *   표시 없음/모호/판독실패 → 판정불가 (통과도 부적합도 아니다)
 *   기한 지남              → **부적합**
 *   기한 남음              → 통과
 *
 * 왜 기한 초과가 판정불가가 아니라 부적합인가:
 * 날짜를 읽었고 비교도 끝났다. "판정하지 못했다"고 말하면 아는 것을 모른다고
 * 하는 것이다. 화면에서도 판정불가는 "읽지 못한 정보"로 묶여 재촬영을
 * 권하는데, 만료된 숫돌에는 쓸모없는 안내다.
 *
 * 왜 표시가 없을 때 부적합이 아닌가:
 * 표시 의무는 수공구용 B/BF 본드 제품에만 있다(oSa 2020-04). 표시가 없는
 * 숫돌이 정상일 수 있다. 다만 확인하지 못한 것을 확인한 것처럼 넘기지도
 * 않으므로 경고(advisory)로 두지 않는다 — 판정은 적합까지 가지 못한다.
 */
export function checkExpiry(
  wheel: WheelSpec,
  today: string | null,
  profile: AccessoryProfile | null,
): CheckItem {
  const expiry = wheel.expiry ?? null;
  const base = {
    rule: RULE.EXPIRY,
    grinderValue: null,
    wheelValue: expiry === null ? null : formatExpiry(expiry),
  };

  // 유효기한 기준(라벨 월/연 표기, oSa)은 결합숫돌에 대한 것이다. 근거가 확인된
  // Profile에만 적용한다. 그 밖의 종류는 막지도 통과시키지도 않고 직접 확인으로
  // 남긴다. Profile이 없는 종류는 이전과 같이 본다(어차피 종류 규칙이 막는다).
  const applied = appliedProfile(wheel, profile);
  if (applied !== null && applied.expiryPolicy !== 'label_marked_month') {
    return {
      ...base,
      passed: null,
      advisory: true,
      reason:
        '이 종류에 유효기한 기준을 적용할 근거가 이 앱에 없습니다. 라벨이나 제조사 안내에 기한이 있으면 직접 확인하세요.',
      detail: { code: 'expiry.noPolicy' },
    };
  }

  if (!isValidDateOnly(today)) {
    return {
      ...base,
      passed: null,
      reason:
        '기준일이 없어 유효기한을 비교할 수 없습니다. 앱을 다시 열어 점검을 진행하세요.',
      detail: { code: 'expiry.noToday' },
    };
  }

  if (expiry === null) {
    return {
      ...base,
      passed: null,
      reason:
        `라벨에서 유효기한을 읽지 못했습니다. 기준일 ${today}. ` +
        '라벨 금속 링의 월/연 표기(예: 04/2023)를 직접 확인하세요. ' +
        '표기가 없는 숫돌도 있습니다.',
      detail: { code: 'expiry.unreadable', params: { today } },
    };
  }

  const lastValid = expiryLastValidDate(expiry);
  const params = { expiry: formatExpiry(expiry), lastValid, today };

  if (today > lastValid) {
    return {
      ...base,
      passed: false,
      reason:
        `라벨에 표시된 유효기한이 지났습니다. 표시 ${formatExpiry(expiry)} ` +
        `(${lastValid}까지), 기준일 ${today}. ` +
        '제조사는 유효기한이 지난 숫돌을 사용하지 말라고 안내합니다.',
      detail: { code: 'expiry.expired', params },
    };
  }

  return {
    ...base,
    passed: true,
    reason:
      `라벨에 표시된 유효기한이 남아 있습니다. 표시 ${formatExpiry(expiry)} ` +
      `(${lastValid}까지), 기준일 ${today}.`,
    detail: { code: 'expiry.valid', params },
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
  /**
   * 숫돌 종류의 부속품 Profile(profiles.ts의 profileFor). 없으면 null.
   *
   * 필수 인자다. 기본값을 두면 넘기는 것을 잊은 호출이 조용히 어떤 Profile로
   * 대조된다. null을 넘기면 종류 규칙이 판정불가로 막는다.
   */
  profile: AccessoryProfile | null;
  /** 작업자가 고른 오늘의 작업. 고르지 않았으면 목적 대조를 건너뛴다. */
  declaredPurpose?: WorkPurpose | null;
  /**
   * 유효기한 만료 판정의 기준일. `YYYY-MM-DD` 로컬 날짜다.
   *
   * 엔진이 시계를 읽지 않는다. 같은 입력과 같은 기준일이면 언제 돌려도 같은
   * 결과가 나와야 판정을 되짚을 수 있기 때문이다. 넣지 않으면 유효기한은
   * 판정불가로 남는다 — 조용히 건너뛰지 않는다.
   */
  today?: string | null;
  /** 테스트에서 시각을 고정하기 위한 주입점 */
  now?: Date;
}

export function matchSpecs(
  grinder: GrinderSpec,
  wheel: WheelSpec,
  options: MatchOptions,
): MatchResult {
  const {
    profile,
    declaredPurpose = null,
    today = null,
    now = new Date(),
  } = options;

  const workPurpose = checkWorkPurpose(wheel, declaredPurpose, profile);
  const peripheralSpeed = checkPeripheralSpeed(grinder, wheel);
  // 원본 표시가 없는(기능 도입 전) 기록에서는 둘 다 null이라 항목이 생기지 않는다.
  const unitConsistency = checkUnitConsistency(wheel);
  const mountingSpec = checkMountingSpec(wheel);
  // 덮개를 아무것도 입력하지 않았으면(구기록 포함) 항목이 생기지 않는다.
  const guard = checkGuard(grinder, wheel, profile);
  // scope가 'full'이면(bonded_abrasive·결합숫돌 세부 형식) 항목이 생기지 않는다.
  const profileScope = checkProfileScope(wheel, profile);

  const checks: CheckItem[] = [
    checkRequiredValues(grinder, wheel),
    checkRpmSafety(grinder, wheel),
    checkDiameterFit(grinder, wheel),
    checkPurpose(wheel),
    // 작업을 고르지 않았으면 이 항목 자체가 없다.
    ...(workPurpose ? [workPurpose] : []),
    checkWheelType(wheel, profile),
    checkVisibleDamage(wheel),
    // 기준일을 넣지 않으면 판정불가로 남는다. 항목 자체는 언제나 만든다 —
    // 조건부로 만들면 호출자가 빠뜨렸을 때 화면에 아무 흔적이 남지 않는다.
    checkExpiry(wheel, today, profile),
    // 양쪽 다 계산할 수 없으면 항목 자체가 없다.
    ...(peripheralSpeed ? [peripheralSpeed] : []),
    ...(unitConsistency ? [unitConsistency] : []),
    ...(mountingSpec ? [mountingSpec] : []),
    ...(guard ? [guard] : []),
    ...(profileScope ? [profileScope] : []),
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
