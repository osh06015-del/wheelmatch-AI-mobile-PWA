// 한국어 — 번역의 원본.
//
// 여기 있는 키가 곧 계약이다. 다른 언어 파일은 Messages 타입을 만족해야 하므로
// 키를 하나라도 빠뜨리면 타입 검사에서 막힌다. 조용히 비어 있는 문구가 생기지 않는다.
//
// 문구를 고칠 때는 이 파일부터 고치고, 나머지 4개 언어를 함께 고친다.
// 안전 문구를 한 언어만 고쳐두면 사람에 따라 다른 지시를 받게 된다.

export const ko = {
  'common.home': '처음으로',
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
  'result.saveStopped': '중지 결과 저장',

  'group.confirmed': '확인된 정보',
  'group.conflicting': '맞지 않는 정보',
  'group.unreadable': '읽지 못한 정보',
  'group.manual': '직접 확인할 항목',
  'notVerifiable.title': '이 앱이 확인하지 못하는 것',
  'notVerifiable.note':
    '아래 항목은 판정에 들어가지 않았습니다. 사진과 라벨로는 알 수 없습니다.',

  'checks.title': '검사 항목별 결과',
  'rule.requiredValues': '필수값 존재',
  'rule.rpmSafety': 'RPM 안전',
  'rule.diameterFit': '지름 호환',
  'rule.purpose': '용도 확인',
  'rule.workPurpose': '작업 목적 일치',
  'rule.wheelType': '숫돌 종류',
  'rule.visibleDamage': '외관 손상',
  'rule.unitConsistency': '표기 일치',
  'rule.mountingSpec': '장착 규격',
  'rule.peripheralSpeed': '원주속도 교차검증',
  'rule.expiry': '유효기한',
  'rule.confidence': '신뢰도 검증',
  'expiry.source':
    '유효기한 근거: 라벨에 표시된 월/연 표기만 씁니다. 제조일에서 계산하지 않습니다. 표시 형식은 oSa 「Product marking requirements for bonded abrasives」(2020-04, EN 12413:2019 기준)를 따랐습니다. EN 12413 원문은 확인하지 못했습니다. 표시된 달의 말일까지 유효로 보는 것은 이 앱의 해석이며 규정이 아닙니다. 한국 산업안전보건기준에 관한 규칙 제122조에는 유효기한 조항이 없습니다.',

  'ruleVersion.label': '규칙 버전',
  'ruleVersion.note':
    '이 판정에 쓰인 규칙의 출처와 적용 범위입니다. 법적 인증이나 법령 적합 보증이 아닙니다.',
  'ruleVersion.missing': '미기록 (이 기능 도입 전 점검)',
  'trialRun.title': '시험운전',
  'trialRun.legalBasis':
    '산업안전보건기준에 관한 규칙 제122조 ②는 작업을 시작하기 전 1분 이상, 연삭숫돌을 교체한 후 3분 이상 시험운전을 하고 이상이 있는지 확인하도록 정합니다. 이 앱은 시간을 재고 답을 남길 뿐이며, 법정 절차를 대신하지 않습니다.',
  'trialRun.standClear':
    '시험운전 중에는 숫돌의 정면과 회전 방향 위험구역을 피해 서십시오.',
  'trialRun.replacedQuestion': '숫돌을 방금 교체했습니까?',
  'trialRun.startReplaced': '예 — 교체 후 시험운전 {seconds}초 시작',
  'trialRun.startBeforeWork': '아니오 — 작업 시작 전 시험운전 {seconds}초 시작',
  'trialRun.modeReplaced': '숫돌 교체 후 시험운전',
  'trialRun.modeBeforeWork': '작업 시작 전 시험운전',
  'trialRun.running': '{seconds}초 이상 돌리는 중입니다. 남은 시간',
  'trialRun.elapsed':
    '요구 시간을 채웠습니다. 아래에서 이상 여부를 확인하세요.',
  'trialRun.waitNotice': '요구 시간을 채운 뒤에 답할 수 있습니다.',
  'trialRun.findingsTitle': '시험운전 중 이상이 있었습니까?',
  'trialRun.findingsHint':
    '해당하는 것을 모두 고르세요. 하나라도 고르면 이상 있음으로만 넘어갈 수 있습니다.',
  'trialRun.finding.vibration': '비정상 진동',
  'trialRun.finding.noise': '비정상 소음',
  'trialRun.finding.wobble': '숫돌 흔들림',
  'trialRun.finding.wheelDamage': '숫돌 파손·이탈 징후',
  'trialRun.finding.equipment': '장비 이상',
  'trialRun.confirmNormal': '이상 없음 확인',
  'trialRun.reportAbnormal': '이상 있음',
  'trialRun.stopTitle': '작업하지 마십시오',
  'trialRun.stopBody':
    '시험운전 중 이상이 확인되었습니다. 장비를 정지하고 전원을 차단한 뒤 숫돌 장착 상태와 장비를 점검하십시오.',
  'trialRun.required':
    '규격 대조를 마쳤습니다. 시험운전 후 저장할 수 있습니다.',

  'grinderCondition.title': '그라인더 상태 직접 확인',
  'grinderCondition.note':
    '숫돌을 끼우기 전에 그라인더 전체를 직접 보고 다섯 가지를 확인하세요.',
  'grinderCondition.aiBoundary':
    'AI는 명판의 규격 정보만 읽습니다. 그라인더 상태와 작업 안전은 작업자가 직접 확인해야 합니다.',
  'grinderCondition.cordAndPlug': '전원선과 플러그에 손상이 없는가?',
  'grinderCondition.cordAndPlugHint':
    '피복 벗겨짐·눌린 자국·깨진 플러그를 전선 끝까지 훑어 확인',
  'grinderCondition.body': '본체에 균열·파손·심한 손상이 없는가?',
  'grinderCondition.bodyHint': '떨어뜨린 자국, 갈라진 하우징, 헐거운 부품 확인',
  'grinderCondition.guard': '방호덮개가 장착되어 있고 단단히 고정되어 있는가?',
  'grinderCondition.guardHint':
    '손으로 돌려봐도 움직이지 않아야 하고, 숫돌 노출 각도가 규정대로 덮여 있어야 함',
  'grinderCondition.auxiliaryHandle':
    '보조손잡이가 장착되어 있고 단단히 고정되어 있는가?',
  'grinderCondition.auxiliaryHandleHint':
    '반동에 대비해 양손으로 잡을 수 있어야 함. 흔들리면 문제 있음 선택',
  'grinderCondition.spindle':
    '스핀들·플랜지·고정너트에 눈에 띄는 손상이 없는가?',
  'grinderCondition.spindleHint':
    '나사산 뭉개짐, 플랜지 휨·이물질, 너트 마모를 확인',
  'grinderCondition.confirmed': '확인함',
  'grinderCondition.issue': '문제 있음',
  'grinderCondition.incomplete':
    '남은 {count}개 항목을 작업자가 직접 확인해야 숫돌 촬영으로 넘어갈 수 있습니다.',
  'grinderCondition.stopTitle': '그라인더를 사용하지 마십시오',
  'grinderCondition.stopBody':
    '장비 상태에 문제가 확인되었습니다. 사용하지 말고 점검·정비를 받은 뒤 다시 확인하세요.',

  'wheelCondition.title': '숫돌 상태 직접 확인',
  'wheelCondition.note':
    '숫돌을 장착하기 전에 실제 숫돌의 앞·뒤·가장자리와 장착부를 직접 확인하세요.',
  'wheelCondition.aiBoundary':
    'AI는 사진에서 의심되는 손상만 알릴 수 있으며, 손상 없음이나 작업 안전을 정상으로 확정하지 않습니다.',
  'wheelCondition.aiDamageWarning':
    'AI가 사진에서 눈에 띄는 손상 징후를 의심했습니다. 숫돌을 직접 자세히 확인하세요.',
  'wheelCondition.labelWarning':
    'AI가 라벨 정보를 충분히 읽지 못했습니다. 실제 라벨을 직접 확인하고 위 값을 보정하세요.',
  'wheelCondition.expiryWarning':
    'AI가 유효기한을 읽지 못했습니다. 라벨의 월/연 표기를 직접 확인하세요.',
  'wheelCondition.damageFree': '깨짐·갈라짐·잔금·모서리 파손이 없는가?',
  'wheelCondition.damageFreeHint':
    '사진만 믿지 말고 밝은 곳에서 숫돌 전체를 돌려 보며 확인',
  'wheelCondition.notDeformed': '숫돌이 휘거나 변형되지 않았는가?',
  'wheelCondition.notDeformedHint':
    '평평하지 않거나 뒤틀림·부풀음이 보이면 문제 있음 선택',
  'wheelCondition.mountingAreaUndamaged':
    '중심구멍과 장착부에 눈에 띄는 손상이 없는가?',
  'wheelCondition.mountingAreaUndamagedHint':
    '중심구멍 주변의 깨짐·마모·변형을 앞뒤에서 확인',
  'wheelCondition.labelLegible': '라벨과 핵심 규격을 식별할 수 있는가?',
  'wheelCondition.labelLegibleHint':
    'RPM·지름·용도 등 대조에 필요한 표기를 직접 읽을 수 있는지 확인',
  'wheelCondition.expiryValid': '라벨의 유효기한이 남아 있는가?',
  'wheelCondition.expiryValidHint':
    '제조일로 추정하지 말고 라벨에 표시된 월/연을 직접 확인',
  'wheelCondition.confirmed': '확인함',
  'wheelCondition.issue': '문제 있음',
  'wheelCondition.incomplete':
    '남은 {count}개 항목을 작업자가 직접 확인해야 규격 대조로 진행할 수 있습니다.',
  'wheelCondition.stopTitle': '이 숫돌을 사용하지 마십시오',
  'wheelCondition.stopBody':
    '숫돌 상태에 문제가 확인되었습니다. 장착하지 말고 사용 가능한 다른 숫돌로 교체한 뒤 다시 점검하세요.',

  'action.title': '사용하지 마십시오',
  'action.rpmSafety':
    '이 숫돌을 장착하지 마세요. 그라인더 회전속도 이상을 견디는 숫돌로 교체해야 합니다.',
  'action.diameterFit':
    '이 숫돌을 장착하지 마세요. 그라인더가 허용하는 지름 이하의 숫돌로 교체해야 합니다.',
  'action.workPurpose':
    '오늘 작업에 맞는 용도의 숫돌로 교체하세요. 용도가 다른 숫돌은 파손 위험이 큽니다.',
  'action.expiry':
    '이 숫돌을 장착하지 마세요. 라벨의 유효기한이 지났습니다. 기한이 남은 숫돌로 교체하세요.',
  'action.generic': '이 숫돌을 장착하지 마세요. 조건에 맞는 숫돌로 교체하세요.',

  'checklist.title': '안전 체크리스트',
  'checklist.note': '규격 대조와 별개로 직접 확인해야 하는 항목입니다.',
  'checklist.ppe': '보호구 착용',
  'checklist.ppeHint': '보안경·장갑·안면보호구 착용 여부 확인',
  'checklist.workpiece': '작업물 고정 상태 확인',
  'checklist.workpieceHint':
    '바이스·클램프로 단단히 고정됐는지 확인. 손발로 누르지 않는다',
  'checklist.surroundings': '주변 사람과 가연물 확인',
  'checklist.surroundingsHint':
    '불티가 닿는 범위에 사람·인화물질·가연물이 없는지 확인',
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
