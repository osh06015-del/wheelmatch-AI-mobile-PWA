// WheelMatch AI — 규격 대조에 쓰이는 모든 타입 정의.
// 이 파일은 순수 타입만 담는다. 런타임 코드를 추가하지 않는다.

// 그라인더 명판에서 추출하는 값
export interface GrinderSpec {
  model: string | null; // 모델명
  noLoadRPM: number | null; // 무부하 회전속도 (rpm)
  maxWheelDiameter: number | null; // 허용 숫돌 최대 지름 (mm)
  /**
   * 스핀들(축) 나사 규격. 명판에 적히지 않는 경우가 많아 작업자가 고른다.
   * 모르면 'unknown'이다. 이 기능 도입 전 기록에는 없다 — 없으면 unknown으로 읽는다.
   */
  spindleThread?: SpindleThread;
  /** 장착된 덮개 종류. 모르면 'unknown'. 도입 전 기록에는 없다 */
  guardType?: GuardType;
  /** 덮개가 맞춰진 숫돌 지름(mm). 모르면 null. 도입 전 기록에는 없다 */
  guardSize?: number | null;
  rawText: string; // OCR 원문 (디버깅용)
  confidence: 'high' | 'medium' | 'low';
}

/**
 * 그라인더 스핀들(축) 나사 규격.
 *
 * 흔한 것만 둔다. 목록에 없으면 'other', 모르면 'unknown'이다. 모르는 것을
 * 흔한 값(M14 등)으로 채우지 않는다 — 규격 대조가 아니라 관행 추정이 된다.
 */
export type SpindleThread = 'M14' | 'M10' | '5/8-11' | 'other' | 'unknown';

/**
 * 그라인더에 달린 덮개 종류.
 *
 *   grinding — 연삭용(한쪽이 열린 반원형)
 *   cutting  — 절단용(양쪽을 감싸는 형)
 *   none     — 덮개 없음
 */
export type GuardType = 'grinding' | 'cutting' | 'none' | 'other' | 'unknown';

/** 오늘 작업하는 재료. 모르면 'unknown'. */
export type WorkMaterial =
  | 'steel'
  | 'stainless'
  | 'non_ferrous'
  | 'stone_concrete'
  | 'other'
  | 'unknown';

/** 건식/습식. 모르면 'unknown'. */
export type CoolingMode = 'dry' | 'wet' | 'unknown';

/**
 * 작업자가 시작할 때 고르는 작업 조건. 작업(절단/연삭)과 따로 둔다 —
 * 작업 목적 일치 규칙(Rule 5)은 작업만 본다.
 */
export interface WorkConditions {
  material: WorkMaterial;
  cooling: CoolingMode;
}

// 숫돌 라벨에서 추출하는 값
/**
 * 라벨에 **인쇄된 그대로**의 표시. 정규화 전 값이다.
 *
 * 정규화된 값(WheelSpec.maxRPM)과 반드시 따로 보관한다. 환산해서 덮어쓰면
 * 두 가지를 잃는다 — 라벨이 원래 무엇으로 적혀 있었는지, 그리고 두 표기가
 * 서로 어긋났는지. 뒤엣것은 OCR 오독의 신호라 판정에 필요하다.
 */
export interface WheelMarkings {
  /** rpm 단위로 라벨에 직접 적혀 있던 값 */
  labeledRPM: number | null;
  /** m/s 단위로 라벨에 적혀 있던 원주속도 */
  peripheralSpeedMps: number | null;
  /**
   * 장착 구멍 지름(내경, mm). D×T×H 표기의 H.
   *
   * 그라인더 명판에는 스핀들 규격이 적히지 않는다. 그래서 이 값은
   * **대조할 상대가 없다.** 읽어서 보여줄 뿐 판정에 쓰지 않는다.
   * 통용 규격(22.23mm 등)을 규칙으로 만들지 않는다 — 규격 대조가 아니라
   * 관행 추정이 되기 때문이다.
   */
  boreDiameter: number | null;
  /**
   * 라벨에 인쇄된 유효기한 문자열 **그대로**. 예: "04/2023".
   *
   * 정규화된 값(WheelSpec.expiry)과 따로 둔다. 사용자가 확인 화면에서 값을
   * 고쳐도 이 값은 바뀌지 않는다 — 라벨에 무엇이 찍혀 있었는지가 사라지면
   * 나중에 오독이었는지 되짚을 수 없다.
   *
   * 이 기능 도입 전 기록에는 없다.
   */
  expiryRaw?: string | null;
}

/**
 * 라벨의 유효기한. **월 단위다.**
 *
 * oSa 「Product marking requirements for bonded abrasives」(2020-04)는
 * 유효기한을 "expressed as month and year e.g. 04/2023"으로 정한다.
 * 일(日)이 없으므로 여기에도 두지 않는다. 없는 자리를 만들면 채우고 싶어진다.
 */
export interface ExpiryMonth {
  year: number;
  /** 1~12 */
  month: number;
}

/**
 * maxRPM이 어디서 왔는지. 단위 정규화 오류를 재려면 출처를 알아야 한다.
 *
 * 'user'가 따로 있는 이유: 확인 화면에서 사람이 값을 고치면 그 값은 더 이상
 * 라벨에서 읽은 것도, 코드가 환산한 것도 아니다. 그대로 'label'을 이어가면
 * 사람이 넣은 값을 모델이 읽은 값으로 세게 된다 — 정정률과 환산 오류를
 * 나눠 재려는 설계(validation-plan.md)가 무너진다.
 */
export type RpmSource =
  | 'label' // 라벨에 rpm으로 적혀 있었다
  | 'converted' // m/s에서 환산했다
  | 'user'; // 확인 화면에서 사람이 직접 넣거나 고쳤다

export interface WheelSpec {
  maxRPM: number | null; // 최고사용회전속도 (rpm) — 정규화된 값
  diameter: number | null; // 지름 (mm)
  thickness: number | null; // 두께 (mm)
  purpose: WheelPurpose; // 라벨이 말하는 용도
  wheelType: WheelType; // 숫돌 자체의 생김새로 판별한 종류
  visibleDamage: VisibleDamage; // 눈에 띄는 큰 손상만
  /** 정규화 전 원본 표시. 이 기능 도입 전 기록에는 없다. */
  markings?: WheelMarkings;
  /** maxRPM의 출처. maxRPM이 null이면 없다. */
  rpmSource?: RpmSource;
  /**
   * 정규화된 유효기한. **라벨에 표시된 것만** 담는다.
   *
   * 제조일에서 계산하지 않는다. oSa 규정은 "최장 3년"이라 제조사가 더 짧게
   * 찍을 수 있고, 계산해 넣으면 실제보다 긴 기한을 주장하게 된다.
   * 읽지 못했거나 형식이 모호하면 null이다. 이 기능 도입 전 기록에는 없다.
   */
  expiry?: ExpiryMonth | null;
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
}

export type WheelPurpose = 'cutting' | 'grinding' | 'unknown';

/**
 * 숫돌의 물리적 종류. 라벨 글자가 아니라 생김새로 판별한다.
 *
 * WheelPurpose와 다르다. 다이아몬드 절단날은 purpose가 'cutting'이지만
 * 결합숫돌과 다른 규격 체계를 쓰므로 이 앱의 RPM·지름 규칙을 적용하면 안 된다.
 * 그래서 종류를 따로 본다.
 */
export type WheelType =
  | 'bonded_abrasive' // 일반 결합숫돌(세부 형식 미지정) — 처음부터 다뤄 온 종류
  | 'bonded_cutting' // 결합 절단숫돌 Type 1/41
  | 'bonded_grinding' // 결합 연삭숫돌 Type 27/28
  | 'bonded_combination' // 절단·연삭 겸용 Type 27/42
  | 'bonded_cup' // 결합 컵숫돌 Type 6/11
  | 'flap_disc' // 플랩디스크 Type 27/29
  | 'cup_wheel' // 컵휠(세부 종류 미지정) — AI 제안·구기록 값. Profile 없음
  | 'diamond' // 다이아몬드(세부 종류 미지정) — AI 제안·구기록 값. Profile 없음
  | 'diamond_continuous' // 다이아몬드 절단날 — 연속 림
  | 'diamond_turbo' // 다이아몬드 절단날 — 터보 림
  | 'diamond_segmented' // 다이아몬드 절단날 — 세그먼트
  | 'diamond_cup' // 다이아몬드 컵휠
  | 'tuck_pointing' // 줄눈(턱포인팅) 휠
  | 'wire_brush' // 와이어 휠·컵 브러시
  | 'fibre_disc' // 파이버·샌딩 디스크(백킹패드 사용)
  | 'nonwoven_disc' // 부직포 표면처리 디스크
  | 'polishing_pad' // 제조사 승인 연마 패드
  | 'other'
  | 'unknown';

// ─────────────────────────────────────────────────────────────
// 부속품 Profile
//
// 숫돌·디스크 종류마다 "무엇이 맞아야 쓸 수 있는가"가 다르다. 그 차이를
// 규칙엔진 곳곳의 if 문이 아니라 종류별 Profile 한 곳에 모은다. 새 종류를
// 지원하려면 Profile을 더하고, 근거 출처를 함께 적는다.
//
// **Profile에 적힌 요구는 판정을 완화하는 데 쓰지 않는다.** 모르는 값은 통과가
// 아니고, 근거를 확인하지 못한 항목은 'unverified'로 둔 채 작업자 확인으로 남긴다.
// ─────────────────────────────────────────────────────────────

/** 부속품 계열. 규격 체계가 같은 것끼리 묶는다. */
export type AccessoryFamily =
  | 'bonded_abrasive' // 결합숫돌(절단날·연삭석·컵숫돌)
  | 'coated_abrasive' // 플랩디스크·파이버 디스크 등 연마포
  | 'superabrasive' // 다이아몬드·CBN
  | 'brush'
  | 'nonwoven' // 부직포 표면처리
  | 'polishing' // 연마 패드
  | 'other';

/**
 * 항목 하나에 대한 Profile의 요구 수준.
 *
 *   required        — 반드시 맞아야 한다. 값을 모르면 판정불가다
 *   advisory        — 확인해야 하지만 앱이 대조할 상대가 없다(작업자 확인)
 *   not_applicable  — 이 종류에는 해당하지 않는다(근거가 있을 때만 쓴다)
 *   unverified      — 근거를 아직 확인하지 못했다. 적합으로 추정하지 않는다
 */
export type RequirementLevel =
  'required' | 'advisory' | 'not_applicable' | 'unverified';

/** 허용 목록형 정책. 근거를 확인하지 못했으면 'unverified'다. */
export type AllowList<T> = readonly T[] | 'unverified';

export interface AccessoryProfile {
  type: WheelType;
  family: AccessoryFamily;
  /** 이 앱이 규격을 대조하는 종류인가. 아니면 종류 규칙이 판정불가로 막는다 */
  supported: boolean;
  /**
   * 이 Profile로 최종 적합(COMPATIBLE)까지 낼 수 있는가.
   *
   *   full    — 작업·덮개·재료 등 핵심 조건까지 근거가 갖춰졌다. RPM·지름이
   *             맞으면 적합을 낼 수 있다. 지금은 bonded_abrasive와 결합숫돌
   *             세부 형식(Type 1/41·27/28·27/42·6/11)뿐이다.
   *   limited — RPM·지름만 공통 규칙으로 대조했다. 작업·덮개·장착 적합성의
   *             근거가 없어, RPM·지름이 맞아도 적합을 내지 않는다
   *             (checkProfileScope가 판정불가로 막는다).
   *
   * required로 선언한 필드가 있어도 scope가 limited면 적합에 이르지 못한다 —
   * "부분적으로 검증된 종류"를 "검증된 종류"처럼 통과시키지 않기 위해서다.
   */
  scope: 'full' | 'limited';
  /** 허용 작업(절단/연삭). 근거가 없으면 'unverified' — 작업을 막지도 통과시키지도 않는다 */
  allowedWork: AllowList<WorkPurpose>;
  /**
   * 작업 목적 일치 규칙이 무엇으로 대조하는가.
   *
   *   label_purpose — 라벨의 용도 표기(절단용/연삭용)와 오늘 작업을 대조한다(기존 방식)
   *   allowed_work  — 라벨에 용도 표기가 없는 종류. allowedWork로만 본다
   */
  workCheck: 'label_purpose' | 'allowed_work';
  /** 허용 재료 */
  allowedMaterials: AllowList<WorkMaterial>;
  /** 규격 값 요구 */
  specs: {
    rpm: RequirementLevel;
    diameter: RequirementLevel;
    /** 장착 구멍·스핀들 */
    mounting: RequirementLevel;
  };
  /** 장착 부품 요구 */
  equipment: {
    guard: RequirementLevel;
    flange: RequirementLevel;
    backingPad: RequirementLevel;
    adapter: RequirementLevel;
  };
  /** 허용 건식/습식 */
  cooling: AllowList<Exclude<CoolingMode, 'unknown'>>;
  /** 회전방향 표시 정책 */
  rotationDirection: 'any' | 'follow_marked_arrow' | 'unverified';
  /** 유효기한 정책. label_marked_month = 라벨에 표시된 월/연만 본다 */
  expiryPolicy: 'label_marked_month' | 'not_applicable' | 'unverified';
  /** 시험운전 정책. kr_osh_122 = 산업안전보건기준에 관한 규칙 제122조 ② */
  trialRunPolicy: 'kr_osh_122' | 'unverified';
  /** 작업자 상태 확인 Gate. wheel_condition_v1 = WheelConditionGate */
  conditionGate: 'wheel_condition_v1' | 'unverified';
  /**
   * Gate에서 작업자가 직접 답해야 하는 항목. 종류마다 보는 곳이 다르다.
   * AI는 어느 항목도 채우지 않는다.
   */
  conditionItems: readonly WheelConditionKey[];
  /**
   * 이 종류를 가리킬 수 있는 AI 제안값. AI는 세부 형식을 고르지 못하므로
   * (schema.ts의 wheelType은 굵은 분류다) 작업자가 세부 형식을 고른 것은
   * 제안과 어긋난 것이 아니라 좁힌 것이다.
   */
  aiSuggestions: readonly WheelType[];
  /** 필요한 사진. front는 라벨 사진이다 */
  requiredPhotos: readonly WheelExamView[];
  /** 근거 문서. version.ts의 RULE_SOURCES 식별자 */
  sources: readonly AccessorySourceId[];
  /** Profile 버전. 요구를 바꾸면 올린다 */
  version: string;
}

/** Profile 근거 문서 식별자. RULE_SOURCES의 순서·키와 맞춘다 */
export type AccessorySourceId = 'krOsh' | 'kosha' | 'osa';

/** 기록에 남기는 Profile 참조 */
export interface AccessoryProfileRef {
  type: WheelType;
  version: string;
  /** 저장 당시의 판정 범위(AccessoryProfile.scope). 이 기능 도입 전 기록에는 없다 */
  scope?: 'full' | 'limited';
}

/**
 * Profile과 작업·그라인더 입력을 맞춰 본 결과 한 줄.
 *
 * **"맞다"는 상태가 없다.** 이 앱은 여기 항목들을 대조할 근거가 충분하지 않다.
 * 할 수 있는 말은 셋뿐이다 — 모른다, 직접 확인하라, 입력끼리 어긋난다.
 * 판정(verdict)은 규칙엔진이 낸다. 덮개 어긋남(guard.missing·guardSize.smallerThanWheel)은
 * 엔진의 덮개 조건 규칙이 같은 함수(guardConflicts)로 판정불가를 만든다.
 */
export interface ProfileCondition {
  key: ProfileConditionKey;
  status: 'unknown' | 'manual_check' | 'conflict';
  /** 화면이 고르는 사유 코드 */
  code: ProfileConditionCode;
}

export type ProfileConditionKey =
  'material' | 'cooling' | 'spindle' | 'guard' | 'guardSize' | 'rotation';

export type ProfileConditionCode =
  | 'material.unknown'
  | 'material.unverified'
  | 'material.manualCheck'
  | 'material.notAllowed'
  | 'cooling.unknown'
  | 'cooling.unverified'
  | 'cooling.manualCheck'
  | 'cooling.notAllowed'
  | 'spindle.unknown'
  | 'spindle.manualCheck'
  | 'guard.unknown'
  | 'guard.missing'
  | 'guard.manualCheck'
  | 'guardSize.unknown'
  | 'guardSize.smallerThanWheel'
  | 'guardSize.manualCheck'
  | 'rotation.unverified'
  | 'rotation.followArrow';

/**
 * 사진에서 보이는 손상 여부.
 *
 * 'none_visible'은 "손상이 없다"가 아니라 "사진에서 보이지 않는다"는 뜻이다.
 * 미세균열은 사진으로 판별할 수 없고 표준 확인법은 타음검사다.
 * 그래서 규칙엔진은 이 값을 통과 근거로 절대 쓰지 않는다.
 * 'suspected'일 때만 경고를 올린다. 판정을 완화하는 방향으로는 쓰지 않는다.
 */
export type VisibleDamage = 'suspected' | 'none_visible' | 'unknown';

// ─────────────────────────────────────────────────────────────
// 다각도 외관 이상 징후 확인 (WheelExam)
//
// 라벨 한 장으로는 뒷면·가장자리·중심구멍을 볼 수 없다. 앞면(라벨 사진)에
// 뒷면·가장자리·중심구멍 사진을 더해 한 번에 살펴본 결과다.
//
// **이 결과는 손상이 없다고 말하지 않는다.** 보이는 이상 징후를 찾아 알릴
// 뿐이고, 찾지 못한 경우는 "확인되지 않음"으로만 남는다. 그래서 상태에
// safe·normal·undamaged 같은 승인 값이 없다. 통과 근거로 쓰지 않는다.
// ─────────────────────────────────────────────────────────────

/** 어느 사진에서 본 것인지. front는 기존 라벨 사진을 그대로 재사용한다. */
export type WheelExamView = 'front' | 'back' | 'edge' | 'bore';

/**
 * 다각도 확인의 결론.
 *
 *   suspected     — 사진에서 이상 징후가 보인다
 *   not_observed  — 사진에서 찾지 못했다. **손상 없음이라는 뜻이 아니다**
 *   unassessable  — 사진으로는 판단할 수 없다(품질·누락)
 */
export type WheelExamStatus = 'suspected' | 'not_observed' | 'unassessable';

/** 이상 징후의 종류. 부위가 아니라 무엇이 보이는지를 나눈다. */
export type WheelExamFindingKind =
  | 'crack' // 균열
  | 'chip' // 깨짐·조각 떨어짐
  | 'edge_break' // 가장자리 파손
  | 'bore_damage' // 중심구멍·장착부 손상
  | 'deformation' // 휨·변형
  | 'contamination' // 이물·오염
  | 'other';

/** 사진이 판독을 방해하는 이유. 해당 사진을 다시 찍어야 한다. */
export type WheelExamPhotoIssue =
  'blur' | 'glare' | 'darkness' | 'incomplete_view';

export interface WheelExamFinding {
  kind: WheelExamFindingKind;
  view: WheelExamView;
  /** 왜 그렇게 보았는지. 작업자가 실물의 어디를 봐야 하는지 알려주는 문장 */
  reason: string;
  confidence: Confidence;
}

/**
 * 사진 한 장의 판독 가능 여부.
 *
 * readable은 **사진**이 판독할 만한가를 말한다. 숫돌이 정상이라는 뜻이 아니다.
 * issues가 비어 있어도 "품질 문제를 찾지 못했다"는 뜻일 뿐이다.
 */
export interface WheelExamPhotoQuality {
  view: WheelExamView;
  issues: WheelExamPhotoIssue[];
  readable: boolean;
}

/**
 * 다각도 확인이 **실행되지 않은** 이유.
 *
 * 실패를 not_observed나 unassessable로 바꾸지 않는다. 그 둘은 "사진을 보았다"는
 * 뜻이라, 보지도 못한 경우에 쓰면 확인한 것처럼 보인다. 실행되지 않은 것은
 * 실행되지 않은 채로 남긴다.
 */
export type WheelExamNotRunReason =
  | 'network_error' // 서버에 닿지 못했다
  | 'api_error' // 서버·분석 서비스가 오류를 돌려줬다
  | 'offline' // 기기가 오프라인이었다
  | 'user_manual_continue'; // 원인을 가릴 수 없어 작업자 확인으로만 남는다

/**
 * 다각도 확인을 하지 못한 채 진행한 기록.
 *
 * 작업자가 "AI 확인 없이 직접점검으로 진행"을 명시적으로 확인해야만 만들어진다.
 * 확인 없이 조용히 넘어가는 경로는 없다.
 */
export interface WheelExamNotRun {
  reason: WheelExamNotRunReason;
  /** 작업자가 직접점검 진행을 확인한 시각 */
  acknowledgedAt: string;
}

/** 다각도 확인 결과 원본. 작업자 확인과 따로 보관한다. */
export interface WheelExamResult {
  status: WheelExamStatus;
  findings: WheelExamFinding[];
  photoQuality: WheelExamPhotoQuality[];
  /** 어느 모델이 보았는지. 되짚을 수 없는 기록은 근거가 되지 못한다 */
  model: string | null;
  /** 어느 지시문으로 물었는지 (src/lib/vision/wheelExamSchema.ts) */
  promptVersion: string;
  analyzedAt: string;
}

/**
 * 작업자가 시작할 때 고른 오늘의 작업.
 *
 * 숫돌 라벨에서 읽은 용도(WheelPurpose)와 달리 사람이 직접 선언한 값이므로
 * 'unknown'이 없다. 이 둘을 대조하는 것이 용도 검사의 핵심이다.
 * 연삭 작업에 절단날을 쓰면 측면 하중이 걸려 숫돌이 깨진다.
 */
export type WorkPurpose = 'cutting' | 'grinding';

/**
 * 시험운전에서 작업자가 확인하는 이상 징후.
 *
 * 항목은 작업자가 **직접 보고 듣는 것**만 담는다. 앱은 어느 것도 판별하지 못한다.
 */
export type TrialRunFinding =
  | 'vibration' // 비정상 진동
  | 'noise' // 비정상 소음
  | 'wobble' // 숫돌 흔들림
  | 'wheelDamage' // 숫돌 파손·이탈 징후
  | 'equipment'; // 장비 이상

export type TrialRunOutcome = 'normal' | 'abnormal';

/**
 * 시험운전 기록.
 *
 * 근거: 산업안전보건기준에 관한 규칙 제122조 ② — 작업을 시작하기 전에는
 * 1분 이상, 연삭숫돌을 교체한 후에는 3분 이상 시험운전을 하고 이상이 있는지
 * 확인해야 한다. **이 앱은 시간을 재고 답을 남길 뿐, 법정 절차를 대신하지 않는다.**
 *
 * 기능 도입 전 기록에는 없다. 시험운전을 해서는 안 되는 판정(부적합·판정불가)
 * 기록에는 넣지 않는다 — 하지 않은 절차를 한 것처럼 남기지 않는다.
 */
export interface TrialRun {
  /** 숫돌을 방금 교체했는가. 요구 시간이 갈린다 */
  wheelReplaced: boolean;
  /** 60 또는 180 */
  requiredSeconds: number;
  startedAt: string;
  finishedAt: string;
  /** 실제로 흐른 시간. 요구 시간보다 길 수 있다 */
  elapsedSeconds: number;
  outcome: TrialRunOutcome;
  /** 작업자가 고른 이상 항목. 이상 없음이면 비어 있다 */
  findings: TrialRunFinding[];
  /** 타이머를 끝까지 돌리고 작업자가 답했는가 */
  completed: boolean;
}

/**
 * 명판을 확인한 뒤 작업자가 직접 보는 그라인더 장비 상태.
 *
 * WheelCondition과 같은 규칙이다 — true는 작업자가 직접 확인했다는 뜻,
 * false는 문제를 발견했다는 뜻, null은 아직 답하지 않은 상태다.
 * AI는 어느 값도 true로 만들 수 없다.
 *
 * 두 Gate를 하나의 타입으로 묶지 않는다. 항목이 뜻하는 바가 서로 다르고,
 * 일반화하면 어느 쪽 안전 조건인지 코드에서 읽히지 않는다.
 *
 * **현재 촬영은 명판 중심이라 사진으로는 이 다섯 가지를 볼 수 없다.**
 * 그래서 AI 의심 경고조차 붙이지 않았다. 전부 작업자의 눈으로만 채운다.
 */
export interface GrinderCondition {
  /** 전원선·플러그 손상 없음 */
  cordAndPlugUndamaged: boolean | null;
  /** 본체 균열·파손 없음 */
  bodyUndamaged: boolean | null;
  /** 방호덮개 장착 + 단단히 고정 */
  guardSecure: boolean | null;
  /** 보조손잡이 장착 + 단단히 고정 */
  auxiliaryHandleSecure: boolean | null;
  /** 스핀들·플랜지·고정너트 손상 없음 */
  spindleAssemblyUndamaged: boolean | null;
}

/**
 * 숫돌을 장착하기 전에 작업자가 직접 확인하는 상태 점검.
 *
 * true는 작업자가 해당 정상 조건을 직접 확인했다는 뜻이고, false는 문제를
 * 발견했다는 뜻이다. null은 아직 답하지 않은 상태다. AI는 어느 값도 true로
 * 만들 수 없다.
 */
export interface WheelCondition {
  damageFree: boolean | null;
  notDeformed: boolean | null;
  mountingAreaUndamaged: boolean | null;
  labelLegible: boolean | null;
  expiryValid: boolean | null;
  // ── 종류별 항목. Profile의 conditionItems에 있을 때만 묻는다. 기존 기록에는 없다 ──
  /** 다이아몬드: 세그먼트·림 탈락·깨짐 없음 */
  diamondRimIntact?: boolean | null;
  /** 플랩: 날개 탈락·찢어짐 없음 */
  flapsIntact?: boolean | null;
  /** 플랩: 날개 박리(접착 떨어짐) 없음 */
  noDelamination?: boolean | null;
  /** 플랩: 백킹판 깨짐·변형 없음 */
  flapBackingIntact?: boolean | null;
  /** 컵: 나사·어댑터가 축에 맞고 손상 없음 */
  threadAdapterFit?: boolean | null;
  /** 컵: 편마모 없음 */
  evenWear?: boolean | null;
  /** 컵: 전용 덮개 장착 */
  dedicatedGuardFitted?: boolean | null;
  /** 브러시: 끊어지거나 풀린 와이어 없음 */
  wiresIntact?: boolean | null;
  /** 샌딩·부직포·연마 패드: 백킹패드 손상 없음 */
  backingPadUndamaged?: boolean | null;
}

/** Wheel Condition Gate 항목 이름. */
export type WheelConditionKey = keyof WheelCondition;

// OCR 인식 신뢰도
export type Confidence = 'high' | 'medium' | 'low';

// 규칙엔진 판정 결과
export type Verdict = 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNDETERMINED';

export interface MatchResult {
  verdict: Verdict;
  checks: CheckItem[]; // 개별 검사 항목 결과
  timestamp: string;
}

/**
 * 사유 문장 코드. `규칙.분기` 형태다.
 *
 * 화면은 이 코드로 고른 언어의 문장을 찾는다(src/lib/i18n/checkText.ts).
 * 거기 연결표가 이 타입 전체를 요구하므로, 코드를 추가하고 번역을 잊으면
 * 타입 검사에서 막힌다.
 */
export type ReasonCode =
  | 'requiredValues.ok'
  | 'requiredValues.missingGrinder'
  | 'requiredValues.missingWheel'
  | 'requiredValues.missingBoth'
  | 'rpmSafety.missing'
  | 'rpmSafety.fail'
  | 'rpmSafety.pass'
  | 'diameterFit.missing'
  | 'diameterFit.fail'
  | 'diameterFit.pass'
  | 'purpose.unknown'
  | 'purpose.recognized'
  | 'workPurpose.unknown'
  | 'workPurpose.mismatch'
  | 'workPurpose.match'
  | 'workPurpose.manualCheck'
  | 'workPurpose.profileMismatch'
  | 'wheelType.unknown'
  | 'wheelType.unsupported'
  | 'wheelType.supported'
  | 'wheelType.supportedProfile'
  | 'visibleDamage.suspected'
  | 'visibleDamage.notVerifiable'
  | 'confidence.low'
  | 'confidence.ok'
  | 'unitConsistency.mismatch'
  | 'unitConsistency.match'
  | 'mountingSpec.missing'
  | 'mountingSpec.shown'
  | 'peripheralSpeed.oddGrinder'
  | 'peripheralSpeed.oddWheel'
  | 'peripheralSpeed.oddBoth'
  | 'peripheralSpeed.ok'
  | 'expiry.noToday'
  | 'expiry.unreadable'
  | 'expiry.expired'
  | 'expiry.valid'
  | 'expiry.noPolicy'
  | 'guard.missing'
  | 'guard.smallerThanWheel'
  | 'guard.manualCheck'
  | 'profileScope.limited';

/**
 * 사유를 고른 언어로 다시 만들기 위한 코드와 값.
 *
 * 엔진은 번역을 모른다 — 순수 함수로 남아야 하기 때문이다. 대신 어느 분기에서
 * 나온 사유인지와 문장에 들어갈 값을 함께 낸다. 화면은 이것으로 문장을 만들고,
 * 한국어 reason은 기록과 CSV에 그대로 남는다.
 *
 * params에는 숫자·날짜·코드('cutting', 'flap_disc')만 넣는다. 절단용·플랩디스크
 * 같은 이름을 넣으면 그 낱말이 번역되지 않은 채 다른 언어 문장에 박힌다.
 */
export interface CheckDetail {
  code: ReasonCode;
  params?: Readonly<Record<string, string | number>>;
}

export interface CheckItem {
  rule: string; // 검사 규칙 이름
  passed: boolean | null; // true=통과, false=부적합, null=판정불가
  reason: string; // 한국어 사유. 기록·CSV에 그대로 남는다
  /**
   * 사유 코드와 값. 화면이 고른 언어로 사유를 다시 만든다.
   * 이 기능 도입 전 기록에는 없다 — 그때 화면은 한국어 reason을 그대로 보여준다.
   */
  detail?: CheckDetail;
  grinderValue: string | null;
  wheelValue: string | null;
  /**
   * 경고 수준 항목인지.
   *
   * true이면 판정불가(null)로 남아도 전체 판정을 끌어내리지 않는다.
   * "확인하지 못했다"와 "확인해보니 문제가 있다"를 구분하기 위한 것이다.
   * 규칙 이름이 아니라 항목별로 정하는 이유는, 같은 규칙이라도 상황에 따라
   * 차단해야 할 때와 알리기만 하면 될 때가 다르기 때문이다.
   */
  advisory?: boolean;
}

// 방호장비 수동 체크리스트
export interface SafetyChecklist {
  guardCover: boolean | null; // 방호덮개 장착
  auxiliaryHandle: boolean | null; // 보조손잡이 장착
  wheelDamage: boolean | null; // 숫돌 손상(균열·깨짐) 없음
  ppe: boolean | null; // 보호구(보안경·장갑·안면보호구) 착용

  /**
   * 작업물 고정 상태. 이 기능 도입 전 기록에는 없으므로 선택 필드다.
   * 기계도 숫돌도 아닌 **작업 환경**이라 어느 Gate에도 속하지 않는다.
   */
  workpieceSecured?: boolean | null;
  /** 주변 사람과 가연물 확인. 같은 이유로 선택 필드다. */
  surroundingsClear?: boolean | null;

  /**
   * 불꽃 방향 확인.
   *
   * 체크박스에서는 뺐다. 이것은 장착 전에 예/아니오로 답할 수 있는 상태가 아니라
   * 작업 자세와 주변 상황에 따라 매 순간 달라지는 항목이라, 미리 체크해두면
   * "확인했다"는 착각만 남는다. 대신 점검 완료 화면에서 작업 직전 안내로 띄운다.
   * 예전에 저장된 기록에는 값이 남아 있으므로 선택 필드로 유지한다.
   */
  sparkDirection?: boolean | null;
}

/**
 * 촬영 원본·업로드본의 원시 측정값. 검증용 실측 데이터일 뿐이다.
 *
 * **차단·적합 판정의 근거로 쓰지 않는다.** 여기 있는 어떤 값도 점검 흐름을
 * 막을 수 없다. 촬영 직후의 사진 상태 경고(captureCheck.ts)가 이 값을 읽지만
 * 경고일 뿐이고, 작업자가 그래도 쓸 수 있다. 측정 자체가 실패해도(카메라·디코딩 환경에 따라
 * 다르다) 각 항목을 null로 남기고 점검은 그대로 진행된다.
 */
export interface CaptureQualityMetrics {
  originalWidth: number | null;
  originalHeight: number | null;
  originalBytes: number | null;
  uploadWidth: number | null;
  uploadHeight: number | null;
  uploadBytes: number | null;
  /** 0~255 그레이스케일 평균 밝기 */
  meanBrightness: number | null;
  /** 그레이스케일 표준편차(명암 대비) */
  contrast: number | null;
  /** 너무 어두운 픽셀의 비율(0~1). 경계값은 lib/image/quality.ts에만 있다 */
  darkPixelRatio: number | null;
  /** 너무 밝은 픽셀의 비율(0~1) */
  brightPixelRatio: number | null;
  /** 라플라시안 분산. 임계값 없이 수치만 남긴다 — 흐림 여부는 판단하지 않는다 */
  blurMetric: number | null;
  /** optimizeForUpload()가 걸린 시간(ms) */
  optimizeMs: number | null;
}

/**
 * 촬영 직후 사진 상태 경고의 종류.
 *
 * **사진**이 읽기 좋은 상태인지만 말한다. 명판·숫돌이 찍혔는지, 손상됐는지,
 * 써도 되는지는 이 값의 범위가 아니다. 경계값은 검증되지 않은 잠정값이라
 * 경고만 하고 작업자가 그래도 쓸 수 있다(src/lib/image/captureCheck.ts).
 */
export type CaptureQualityWarning =
  'low_resolution' | 'blur' | 'too_dark' | 'overexposed';

/** 사진 상태 확인을 받는 촬영 자리. */
export type CaptureSlot =
  'grinder' | 'wheel' | 'wheelBack' | 'wheelEdge' | 'wheelBore';

/**
 * 한 촬영 자리의 사진 상태 확인 기록(검증용).
 *
 * 판정·Gate에 쓰지 않는다. 경고가 실제 판독 실패와 겹치는지, 작업자가 경고를
 * 보고 다시 찍는지를 나중에 재기 위해 남긴다.
 */
export interface CaptureQualityCheck {
  /** 어느 경계값으로 낸 경고인지. 경계값을 바꾸면 올린다 */
  checkVersion: string;
  /** 최종으로 쓴 사진에 붙은 경고. 비어 있어도 사진이 좋다는 뜻이 아니다 */
  warnings: CaptureQualityWarning[];
  /** 경고가 있는데 작업자가 "그래도 사용"을 골랐는가 */
  usedDespiteWarning: boolean;
  /** 이 자리에서 사진을 다시 넣은 횟수. 0이면 다시 찍지 않았다 */
  retakeCount: number;
}

/**
 * 서버 OCR 응답의 메타데이터. 검증용 실측 데이터일 뿐이다.
 *
 * 비용은 여기 넣지 않는다(하드코딩한 단가는 바뀐다). 토큰 수만 남기고
 * 비용 계산은 필요할 때 CSV 밖에서 한다.
 */
export interface OcrTelemetry {
  engine: 'claude' | 'tesseract';
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheCreationTokens: number | null;
  /** 서버가 Anthropic 호출에 걸린 시간(ms). tesseract는 브라우저 처리 시간 */
  durationMs: number | null;
}

// IndexedDB에 저장할 점검 기록
export interface InspectionRecord {
  id?: number;
  grinder: GrinderSpec;
  wheel: WheelSpec;
  result: MatchResult;
  checklist: SafetyChecklist;
  /**
   * 작업자가 그라인더를 직접 보고 답한 장비 상태. 기능 도입 전 기록에는 없다.
   * 규격 판정과 섞지 않고 별도 증거로 보관한다.
   */
  grinderCondition?: GrinderCondition;
  /**
   * 작업자가 숫돌을 직접 보고 답한 상태 점검. 기능 도입 전 기록에는 없다.
   * 규격 판정과 섞지 않고 별도 증거로 보관한다.
   */
  wheelCondition?: WheelCondition;
  /**
   * 시험운전 기록. 규격이 맞는 조합에서만 생긴다.
   * 하지 않은 절차를 한 것처럼 남기지 않으므로 없을 수 있다.
   */
  trialRun?: TrialRun;
  /** 작업자가 고른 오늘의 작업. 이 기능 도입 전 기록에는 없다. */
  declaredPurpose?: WorkPurpose | null;
  /** 작업자가 고른 재료·건식/습식. 이 기능 도입 전 기록에는 없다 */
  workConditions?: WorkConditions;
  /**
   * 판정에 쓰인 부속품 Profile. 어느 정책(버전)으로 조건을 보았는지 되짚는 데
   * 쓴다. 이 기능 도입 전 기록과 Profile이 없는 종류에는 없다.
   */
  accessoryProfile?: AccessoryProfileRef;
  /**
   * 저장 당시 Profile과 입력을 맞춰 본 결과. 이력은 이것을 그대로 보인다 —
   * 지금 Profile로 다시 계산하면 그때 무엇을 보았는지 거짓으로 적게 된다.
   */
  profileConditions?: ProfileCondition[];
  /**
   * 사용자가 고치기 전의 OCR 원본값. 인식률·정정률을 재는 데만 쓴다.
   * 이 기능 도입 전 기록에는 없다.
   */
  grinderOcr?: GrinderSpec;
  wheelOcr?: WheelSpec;
  /**
   * 촬영 원본·업로드본의 원시 측정값(검증용). 이 기능 도입 전 기록에는 없다.
   * 판정·UI에 영향을 주지 않는다 — [[CaptureQualityMetrics]] 참고.
   */
  grinderCaptureMetrics?: CaptureQualityMetrics;
  wheelCaptureMetrics?: CaptureQualityMetrics;
  /** 다각도 확인 사진의 원시 측정값(검증용). 이 기능 도입 전 기록에는 없다 */
  wheelBackCaptureMetrics?: CaptureQualityMetrics;
  wheelEdgeCaptureMetrics?: CaptureQualityMetrics;
  wheelBoreCaptureMetrics?: CaptureQualityMetrics;
  /**
   * 촬영 자리별 사진 상태 경고와 재촬영 여부(검증용). 이 기능 도입 전 기록에는
   * 없다. 판정·UI 흐름의 근거로 쓰지 않는다 — [[CaptureQualityCheck]] 참고.
   */
  captureChecks?: Partial<Record<CaptureSlot, CaptureQualityCheck>>;
  /**
   * 서버 OCR 응답의 메타데이터(검증용). 이 기능 도입 전 기록에는 없다.
   * 판정·UI에 영향을 주지 않는다 — [[OcrTelemetry]] 참고.
   */
  grinderOcrTelemetry?: OcrTelemetry;
  wheelOcrTelemetry?: OcrTelemetry;
  /**
   * 다각도 외관 확인의 AI 원본 결과. 이 기능 도입 전 기록에는 없다.
   * 작업자의 최종 확인(wheelCondition)과 따로 남긴다 — 둘을 합치면 AI가
   * 무엇을 보았고 사람이 무엇을 확인했는지 되짚을 수 없다.
   */
  wheelExam?: WheelExamResult;
  /**
   * 다각도 확인을 하지 못한 채 진행한 경우의 사유. wheelExam과 둘 중 하나만 있다.
   * 둘 다 없으면 이 기능 도입 전 기록이거나 요구되지 않는 종류다.
   */
  wheelExamNotRun?: WheelExamNotRun;
  /** 이상 징후 경고를 작업자가 확인했는가. 경고가 없었으면 없다 */
  wheelExamAcknowledged?: boolean;
  grinderImage?: Blob;
  wheelImage?: Blob;
  /** 다각도 확인 사진. 앞면은 wheelImage(라벨 사진)를 그대로 쓴다 */
  wheelBackImage?: Blob;
  wheelEdgeImage?: Blob;
  wheelBoreImage?: Blob;
  /**
   * 작업 선택부터 저장까지 걸린 전체 흐름 시간(ms). 적합 조합이면 법정 시험운전
   * 시간이 들어 있다. 이 기능 도입 전 기록과 시계가 뒤로 간 경우에는 없다.
   */
  elapsedMs?: number;
  /**
   * 사전점검 시간(ms). 작업 선택부터 **시험운전을 시작하기 직전**까지.
   *
   * 「30초 사전점검」 목표는 이 값으로 잰다. 법정 시험운전(1분·3분 이상)은 목표와
   * 따로 잰다 — 합쳐 재면 시험운전을 줄이는 쪽으로 압박이 생긴다.
   * 시험운전이 열리지 않는 판정(부적합·판정불가)은 저장 순간에 끝나므로 elapsedMs와
   * 같다. 이 기능 도입 전 기록과 시계가 뒤로 간 경우에는 없다.
   */
  preTrialElapsedMs?: number;
  /**
   * 이 판정에 쓰인 규칙 세트 버전. 기능 도입 전 기록에는 없다 —
   * 없는 것을 특정 버전으로 채우면 어느 규칙으로 나온 판정인지 알 수 없게 된다.
   */
  ruleVersion?: string;
  createdAt: string;
}
