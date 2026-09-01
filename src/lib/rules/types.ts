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
  purpose: WheelPurpose; // 용도
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
}

export type WheelPurpose = 'cutting' | 'grinding' | 'unknown';

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
  grinderImage?: Blob;
  wheelImage?: Blob;
  createdAt: string;
}
