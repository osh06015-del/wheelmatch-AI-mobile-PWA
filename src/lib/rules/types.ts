// WheelMatch AI — 규격 대조에 쓰이는 모든 타입 정의.
// 이 파일은 순수 타입만 담는다. 런타임 코드를 추가하지 않는다.

// 그라인더 명판에서 추출하는 값
export interface GrinderSpec {
  model: string | null; // 모델명
  noLoadRPM: number | null; // 무부하 회전속도 (rpm)
  maxWheelDiameter: number | null; // 허용 숫돌 최대 지름 (mm)
  rawText: string; // OCR 원문 (디버깅용)
  confidence: 'high' | 'medium' | 'low';
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
  | 'bonded_abrasive' // 일반 결합숫돌 — 이 앱이 다루는 대상
  | 'flap_disc'
  | 'cup_wheel'
  | 'diamond'
  | 'wire_brush'
  | 'other'
  | 'unknown';

/**
 * 사진에서 보이는 손상 여부.
 *
 * 'none_visible'은 "손상이 없다"가 아니라 "사진에서 보이지 않는다"는 뜻이다.
 * 미세균열은 사진으로 판별할 수 없고 표준 확인법은 타음검사다.
 * 그래서 규칙엔진은 이 값을 통과 근거로 절대 쓰지 않는다.
 * 'suspected'일 때만 경고를 올린다. 판정을 완화하는 방향으로는 쓰지 않는다.
 */
export type VisibleDamage = 'suspected' | 'none_visible' | 'unknown';

/**
 * 작업자가 시작할 때 고른 오늘의 작업.
 *
 * 숫돌 라벨에서 읽은 용도(WheelPurpose)와 달리 사람이 직접 선언한 값이므로
 * 'unknown'이 없다. 이 둘을 대조하는 것이 용도 검사의 핵심이다.
 * 연삭 작업에 절단날을 쓰면 측면 하중이 걸려 숫돌이 깨진다.
 */
export type WorkPurpose = 'cutting' | 'grinding';

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
}

// OCR 인식 신뢰도
export type Confidence = 'high' | 'medium' | 'low';

// 규칙엔진 판정 결과
export type Verdict = 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNDETERMINED';

export interface MatchResult {
  verdict: Verdict;
  checks: CheckItem[]; // 개별 검사 항목 결과
  timestamp: string;
}

export interface CheckItem {
  rule: string; // 검사 규칙 이름
  passed: boolean | null; // true=통과, false=부적합, null=판정불가
  reason: string; // 한국어 사유
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
   * 불꽃 방향 확인.
   *
   * 체크박스에서는 뺐다. 이것은 장착 전에 예/아니오로 답할 수 있는 상태가 아니라
   * 작업 자세와 주변 상황에 따라 매 순간 달라지는 항목이라, 미리 체크해두면
   * "확인했다"는 착각만 남는다. 대신 점검 완료 화면에서 작업 직전 안내로 띄운다.
   * 예전에 저장된 기록에는 값이 남아 있으므로 선택 필드로 유지한다.
   */
  sparkDirection?: boolean | null;
}

// IndexedDB에 저장할 점검 기록
export interface InspectionRecord {
  id?: number;
  grinder: GrinderSpec;
  wheel: WheelSpec;
  result: MatchResult;
  checklist: SafetyChecklist;
  /**
   * 작업자가 숫돌을 직접 보고 답한 상태 점검. 기능 도입 전 기록에는 없다.
   * 규격 판정과 섞지 않고 별도 증거로 보관한다.
   */
  wheelCondition?: WheelCondition;
  /** 작업자가 고른 오늘의 작업. 이 기능 도입 전 기록에는 없다. */
  declaredPurpose?: WorkPurpose | null;
  /**
   * 사용자가 고치기 전의 OCR 원본값. 인식률·정정률을 재는 데만 쓴다.
   * 이 기능 도입 전 기록에는 없다.
   */
  grinderOcr?: GrinderSpec;
  wheelOcr?: WheelSpec;
  grinderImage?: Blob;
  wheelImage?: Blob;
  /**
   * 작업 선택부터 저장까지 걸린 시간(ms).
   * 이 기능 도입 전 기록과 시계가 뒤로 간 경우에는 없다.
   */
  elapsedMs?: number;
  createdAt: string;
}
