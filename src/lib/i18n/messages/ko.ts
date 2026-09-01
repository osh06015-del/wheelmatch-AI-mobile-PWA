// 한국어 — 번역의 원본.
//
// 여기 있는 키가 곧 계약이다. 다른 언어 파일은 Messages 타입을 만족해야 하므로
// 키를 하나라도 빠뜨리면 타입 검사에서 막힌다. 조용히 비어 있는 문구가 생기지 않는다.
//
// 문구를 고칠 때는 이 파일부터 고치고, 나머지 4개 언어를 함께 고친다.
// 안전 문구를 한 언어만 고쳐두면 사람에 따라 다른 지시를 받게 된다.

export const ko = {
  'common.back': '뒤로',
  'common.home': '처음으로',
  'common.retake': '재촬영',
  'common.grinder': '그라인더',
  'common.wheel': '숫돌',
  'common.language': '언어',

  'home.title': 'WheelMatch AI',
  'home.subtitle': '그라인더·숫돌 규격 대조',
  'home.question': '오늘 작업은?',
  'home.cutting': '절단',
  'home.cuttingHint': '자르기',
  'home.grinding': '연삭',
  'home.grindingHint': '갈기·연마',
  'home.afterChoice': '작업을 고르면 명판 → 숫돌 라벨 순서로 촬영합니다.',
  'home.history': '점검 이력 보기 →',

  'verdict.compatible': '적합',
  'verdict.incompatible': '부적합',
  'verdict.undetermined': '판정불가',
  'verdict.note.compatible':
    '표시된 규격끼리는 서로 맞습니다. 아래 안전 체크리스트를 확인하세요.',
  'verdict.note.incompatible':
    '이 조합은 사용하면 안 됩니다. 아래 원인을 확인하세요.',
  'verdict.note.undetermined':
    '값이 부족해 판정할 수 없습니다. 재촬영하거나 값을 직접 입력하세요.',

  'result.title': '규격 대조 결과',
  'result.loading': '결과를 불러오는 중입니다...',
  'result.undetermined.help':
    '값이 부족하거나 인식 신뢰도가 낮습니다. 다시 촬영하거나 값을 직접 입력하면 판정할 수 있습니다.',
  'result.retakeGrinder': '그라인더부터 다시 확인',
  'result.retakeWheel': '숫돌만 다시 확인',
  'result.save': '점검 완료 및 저장',
  'result.saving': '저장 중...',
  'result.saveError':
    '저장에 실패했습니다. 저장 공간을 확인한 뒤 다시 시도하세요.',

  'checks.title': '검사 항목별 결과',
  'rule.requiredValues': '필수값 존재',
  'rule.rpmSafety': 'RPM 안전',
  'rule.diameterFit': '지름 호환',
  'rule.purpose': '용도 확인',
  'rule.workPurpose': '작업 목적 일치',
  'rule.wheelType': '숫돌 종류',
  'rule.visibleDamage': '외관 손상',
  'rule.peripheralSpeed': '원주속도 교차검증',
  'rule.confidence': '신뢰도 검증',

  'action.title': '사용하지 마십시오',
  'action.rpmSafety':
    '이 숫돌을 장착하지 마세요. 그라인더 회전속도 이상을 견디는 숫돌로 교체해야 합니다.',
  'action.diameterFit':
    '이 숫돌을 장착하지 마세요. 그라인더가 허용하는 지름 이하의 숫돌로 교체해야 합니다.',
  'action.workPurpose':
    '오늘 작업에 맞는 용도의 숫돌로 교체하세요. 용도가 다른 숫돌은 파손 위험이 큽니다.',
  'action.generic': '이 숫돌을 장착하지 마세요. 조건에 맞는 숫돌로 교체하세요.',

  'checklist.title': '안전 체크리스트',
  'checklist.note': '규격 대조와 별개로 직접 확인해야 하는 항목입니다.',
  'checklist.guardCover': '방호덮개 장착',
  'checklist.guardCoverHint': '숫돌 노출 각도가 규정대로 덮여 있는지 확인',
  'checklist.auxiliaryHandle': '보조손잡이 장착',
  'checklist.auxiliaryHandleHint': '반동에 대비해 양손으로 잡을 수 있는지 확인',
  'checklist.wheelDamage': '숫돌 손상 없음',
  'checklist.wheelDamageHint':
    '균열·깨짐·변형이 없는지 확인 (있으면 즉시 교체)',
  'checklist.ppe': '보호구 착용',
  'checklist.ppeHint': '보안경·장갑·안면보호구 착용 여부 확인',
  'checklist.preWork':
    '작업 직전, 불꽃이 사람·가연물 쪽으로 향하지 않는지 확인하세요.',
  'checklist.incomplete':
    '안전 체크리스트 {count}개 항목을 모두 확인해야 저장할 수 있습니다.',

  disclaimer:
    '이 앱은 라벨에 표시된 규격의 대조 결과만 제공합니다. 작업 안전성을 보증하지 않으며, 제조사 취급설명서와 사업장 안전수칙을 대체할 수 없습니다.',

  'translation.notice':
    '번역문은 검수 전입니다. 뜻이 갈리면 한국어 원문을 따르고, 관리감독자에게 확인하세요.',
} as const;

/** 메시지 키. ko가 원본이므로 여기서 파생시킨다. */
export type MessageKey = keyof typeof ko;

/** 모든 언어가 만족해야 하는 형태. 키가 빠지면 타입 검사에서 걸린다. */
export type Messages = Record<MessageKey, string>;
