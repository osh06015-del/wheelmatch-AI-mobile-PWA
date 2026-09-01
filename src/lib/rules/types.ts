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
export interface WheelSpec {
  maxRPM: number | null; // 최고사용회전속도 (rpm)
  diameter: number | null; // 지름 (mm)
  thickness: number | null; // 두께 (mm)
  purpose: WheelPurpose; // 라벨이 말하는 용도
  wheelType: WheelType; // 숫돌 자체의 생김새로 판별한 종류
  visibleDamage: VisibleDamage; // 눈에 띄는 큰 손상만
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
