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
  'trialRun.separateFromTarget':
    '시험운전 시간은 「30초 사전점검」 목표와 따로 잽니다. 목표 때문에 법정 시간을 줄이지 마십시오.',
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

  'wheelType.bonded_abrasive': '일반 결합숫돌',
  'wheelType.flap_disc': '플랩디스크',
  'wheelType.cup_wheel': '컵휠',
  'wheelType.diamond': '다이아몬드 휠',
  'wheelType.wire_brush': '와이어 브러시',
  'wheelType.other': '기타',
  'wheelType.unknown': '모르겠음',
  'wheelTypeConfirm.label': '숫돌 종류',
  'wheelTypeConfirm.hint':
    '라벨 글자가 아니라 숫돌의 생김새로 고릅니다. 실물을 보고 직접 고르세요.',
  'wheelTypeConfirm.aiSuggestion':
    'AI 제안: {type} — 사진으로 본 초기 제안값일 뿐입니다.',
  'wheelTypeConfirm.supported':
    '일반 결합숫돌로 직접 확인한 경우에만 이 앱이 규격을 대조합니다.',
  'wheelTypeConfirm.unknown':
    '종류를 확인하지 못하면 규격 대조가 판정불가로 끝납니다. 실물을 보고 고르세요.',
  'wheelTypeConfirm.unsupported':
    '이 앱이 판정하지 않는 종류입니다. 규격 대조는 판정불가로 끝납니다. 제조사 취급설명서를 확인하세요.',
  'wheelTypeConfirm.differs':
    'AI 제안({ai})과 선택한 종류({selected})가 다릅니다. 실물을 다시 보고 아래 직접 확인을 체크해야 진행할 수 있습니다.',
  'wheelTypeConfirm.needsConfirm':
    '숫돌 종류가 AI 제안과 달라 직접 확인 체크가 필요합니다.',

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

  // 촬영·분석·값 확인 화면
  'scan.retake': '재촬영',
  'scan.retryAnalysis': '같은 사진으로 다시 분석',
  'scan.confirmTitle': '읽어낸 값을 확인하세요',
  'scan.grinder.title': '그라인더 명판 촬영',
  'scan.grinder.guide': '명판을 사각형 안에 맞추세요',
  'scan.grinder.analyzing': '명판을 분석하고 있습니다...',
  'scan.grinder.failed': '명판 분석에 실패했습니다.',
  'scan.grinder.proceed': '확인 후 숫돌 촬영',
  'scan.wheel.title': '숫돌 라벨 촬영',
  'scan.wheel.guide': '라벨을 사각형 안에 맞추세요',
  'scan.wheel.analyzing': '라벨을 분석하고 있습니다...',
  'scan.wheel.failed': '라벨 분석에 실패했습니다.',
  'scan.wheel.proceed': '확인 후 규격 대조',
  'scan.wheel.grinderFirst': '그라인더 상태 확인이 먼저입니다.',

  'camera.starting': '카메라를 여는 중입니다...',
  'camera.pickFromGallery': '갤러리에서 선택',
  'camera.pickPhoto': '갤러리에서 사진 선택',
  'camera.retry': '카메라 다시 시도',
  'camera.gallery': '갤러리',
  'camera.shutter': '촬영',
  'camera.error.unsupported':
    '이 브라우저는 카메라를 지원하지 않습니다. HTTPS 환경인지 확인하세요.',
  'camera.error.permission':
    '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라를 허용한 뒤 다시 시도하세요.',
  'camera.error.notFound': '사용할 수 있는 카메라를 찾지 못했습니다.',
  'camera.error.inUse':
    '다른 앱이 카메라를 사용 중입니다. 해당 앱을 닫고 다시 시도하세요.',
  'camera.error.failed': '카메라를 열지 못했습니다.',
  'camera.error.failedNamed': '카메라를 열지 못했습니다. ({name})',

  // 분석 실패. 서버 문장을 그대로 띄우지 않고 실패 종류로 고른다.
  'error.imageDecode':
    '이 사진 형식을 읽지 못했습니다. JPG 또는 PNG로 다시 선택해 주세요. (아이폰 HEIC 사진은 지원되지 않을 수 있습니다)',
  'error.network':
    '서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 같은 사진으로 다시 분석하세요.',
  'error.serverConfig':
    '서버 설정 문제로 라벨을 분석할 수 없습니다. 관리자에게 알리세요.',
  'error.badRequest': '분석 요청이 올바르지 않습니다. 다시 촬영해 주세요.',
  'error.imageTooLarge':
    '이미지가 너무 큽니다. 해상도가 낮은 사진으로 다시 시도해 주세요.',
  'error.rateLimited': '요청이 많아 잠시 후 다시 시도해야 합니다.',
  'error.upstream':
    '분석 서비스가 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요. (오류 {status})',

  'field.model': '모델명',
  'field.noLoadRPM': '무부하 회전속도',
  'field.maxWheelDiameter': '허용 숫돌 최대 지름',
  'field.maxRPM': '최고사용회전속도',
  'field.diameter': '지름',
  'field.thickness': '두께',
  'field.purpose': '용도',
  'field.expiry': '유효기한',
  'field.placeholder': '인식하지 못함 — 직접 입력',
  'field.purposeUnknown': '모르겠음',
  'field.confidence.high': '인식 신뢰도 높음',
  'field.confidence.medium': '인식 신뢰도 보통 — 값을 확인하세요',
  'field.confidence.low': '인식 신뢰도 낮음 — 재촬영하거나 직접 입력하세요',
  'field.rawShow': '읽어낸 원문 보기',
  'field.rawHide': '읽어낸 원문 접기',
  'manualConfirm.label': '라벨을 직접 보고 위 값을 확인했습니다',
  'manualConfirm.hint':
    '체크하면 인식 신뢰도 대신 사용자가 확인한 값으로 판정합니다.',

  // 항목 설명. hint는 항상, where는 값을 읽지 못했을 때만 보인다.
  'guide.grinder.model.hint':
    '그라인더 제품 이름입니다. 판정에는 쓰지 않고 기록에만 남깁니다.',
  'guide.grinder.model.where':
    '명판 맨 위에 크게 적혀 있습니다. 예: GWS 750-125',
  'guide.grinder.noLoadRPM.hint':
    '이 그라인더가 도는 속도입니다. 숫돌이 이 속도를 견뎌야 합니다.',
  'guide.grinder.noLoadRPM.where':
    '명판에서 n₀ 또는 no load speed 옆의 숫자입니다. 예: 11000 r/min, 11000 min⁻¹',
  'guide.grinder.maxWheelDiameter.hint':
    '이 기계에 끼울 수 있는 가장 큰 숫돌입니다. 더 큰 숫돌은 방호덮개에 들어가지 않습니다.',
  'guide.grinder.maxWheelDiameter.where':
    '명판에서 wheel, disc, 숫돌 같은 단어 옆의 지름입니다. 예: max Ø125mm',
  'guide.wheel.maxRPM.hint':
    '이 숫돌이 견디는 최대 속도입니다. 그라인더 속도보다 낮으면 깨져서 날아갑니다.',
  'guide.wheel.maxRPM.where':
    '라벨에 크게 적힌 회전속도입니다. m/s로만 적혀 있으면 앱이 자동으로 바꿉니다. 예: 12200 r/min, 80 m/s',
  'guide.wheel.diameter.hint':
    '숫돌의 바깥 지름입니다. 그라인더가 허용하는 크기 이하여야 합니다.',
  'guide.wheel.diameter.where':
    '치수 표기의 첫 숫자입니다. 예: 125 × 1.6 × 22.23 에서 125',
  'guide.wheel.thickness.hint':
    '숫돌의 두께입니다. 절단날은 얇고(1~3mm) 연삭석은 두껍습니다(6mm 안팎).',
  'guide.wheel.thickness.where':
    '치수 표기의 가운데 숫자입니다. 예: 125 × 1.6 × 22.23 에서 1.6',
  'guide.wheel.purpose.hint':
    '절단용은 자르기, 연삭용은 갈기입니다. 바꿔 쓰면 옆으로 힘을 받아 깨질 수 있습니다.',
  'guide.wheel.purpose.where':
    '라벨의 절단용/연삭용 표기입니다. 영문은 CUT-OFF 또는 GRINDING, DEPRESSED CENTER로 적힙니다.',
  'guide.wheel.expiry.hint':
    '라벨에 적힌 유효기한입니다. 지난 숫돌은 제조사가 사용하지 말라고 안내합니다. 표기가 없는 숫돌도 있습니다.',
  'guide.wheel.expiry.where':
    '가운데 금속 링에 월/연으로 찍힙니다. 예: 04/2023. 앞에 V나 EXP가 붙기도 합니다. 제조일을 대신 넣지 마세요.',

  'requirement.compactTitle': '필요한 숫돌',
  'requirement.compactUnknown': '명판 값을 읽지 못해 조건을 세울 수 없습니다',
  'requirement.title': '필요한 숫돌 조건',
  'requirement.partial':
    '조건을 다 세우지 못했습니다. 빠진 값은 명판에서 직접 확인하세요.',
  'requirement.notRecommendation':
    '제품을 추천하는 것이 아니라, 명판에 적힌 값에서 따라 나오는 조건입니다.',
  'requirement.purposeUnknown': '작업을 고르지 않아 용도를 정할 수 없습니다.',
  'requirement.diameterMax': 'Φ{diameter}mm 이하',
  'requirement.diameterUnknown': '명판에서 허용 최대 지름을 읽지 못했습니다.',
  'requirement.rpmMin': '{rpm}rpm 이상',
  'requirement.rpmUnknown': '명판에서 무부하 회전속도를 읽지 못했습니다.',
  'summary.sizeClass': '{inch}인치급 (최대 Φ{diameter}mm)',
  'summary.maxDiameter': '최대 Φ{diameter}mm',
  'summary.unreadable': '명판 값을 읽지 못했습니다',
  'margin.surplus': '여유 +{percent}%',
  'margin.shortfall': '부족 {percent}%',
  'margin.none': '여유 없음 (0%)',

  // 검사 항목 값에 들어가는 이름. 규칙엔진의 이름과 같은 한국어를 쓴다.
  'wheelPurpose.cutting': '절단용',
  'wheelPurpose.grinding': '연삭용',
  'wheelPurpose.unknown': '미확인',
  'wheelType.unconfirmed': '확인 안 됨',
  'confidence.high': '높음',
  'confidence.medium': '보통',
  'confidence.low': '낮음',
  'value.bore': '내경 Φ{bore}mm',
  'value.unitConsistency': '{rpm}rpm = {computed}m/s / 라벨 {labeled}m/s',

  // 검사 항목 사유. 한국어 문장은 규칙엔진이 기록에 남기는 문장과 글자까지 같아야
  // 한다(checkText.test.ts가 지킨다). 「은(는)」은 앞 낱말에 맞춰 하나로 바뀐다.
  'reason.requiredValues.ok': '회전속도 비교에 필요한 값을 모두 읽었습니다.',
  'reason.requiredValues.missingGrinder':
    '그라인더 무부하 회전속도를 읽지 못했습니다. 재촬영하거나 수동으로 값을 입력하세요.',
  'reason.requiredValues.missingWheel':
    '숫돌 최고사용회전속도를 읽지 못했습니다. 재촬영하거나 수동으로 값을 입력하세요.',
  'reason.requiredValues.missingBoth':
    '그라인더 무부하 회전속도, 숫돌 최고사용회전속도를 읽지 못했습니다. 재촬영하거나 수동으로 값을 입력하세요.',
  'reason.rpmSafety.missing': '회전속도 값이 없어 비교할 수 없습니다.',
  'reason.rpmSafety.fail':
    '숫돌 최고사용회전속도({wheel}rpm)가 그라인더 무부하 회전속도({grinder}rpm)보다 낮습니다. 파손·비산 위험이 있습니다.',
  'reason.rpmSafety.pass':
    '숫돌 최고사용회전속도({wheel}rpm)가 그라인더 무부하 회전속도({grinder}rpm) 이상입니다.',
  'reason.diameterFit.missing':
    '지름 값이 없어 비교할 수 없습니다. 그라인더 명판과 숫돌 라벨의 지름 표기를 직접 확인하세요.',
  'reason.diameterFit.fail':
    '숫돌 지름({wheel}mm)이 그라인더 허용 최대 지름({grinder}mm)을 초과합니다.',
  'reason.diameterFit.pass':
    '숫돌 지름({wheel}mm)이 그라인더 허용 최대 지름({grinder}mm) 이내입니다.',
  'reason.purpose.unknown':
    '숫돌 용도(절단/연삭)를 인식하지 못했습니다. 라벨을 직접 확인하세요.',
  'reason.purpose.recognized': '숫돌 용도를 {purpose}으로 인식했습니다.',
  'reason.workPurpose.unknown':
    '오늘 작업은 {work}인데 숫돌 용도를 읽지 못했습니다. 라벨의 용도 표기를 직접 확인하세요.',
  'reason.workPurpose.mismatch':
    '오늘 작업은 {work}인데 이 숫돌은 {purpose}입니다. 용도에 맞지 않는 숫돌은 측면 하중으로 파손될 수 있습니다.',
  'reason.workPurpose.match': '오늘 작업({work})과 숫돌 용도가 일치합니다.',
  'reason.wheelType.unknown':
    '숫돌 종류가 확인되지 않았습니다. 일반 결합숫돌로 확인된 경우에만 규격을 대조합니다. 값 확인 화면에서 실물을 보고 종류를 고르세요.',
  'reason.wheelType.unsupported':
    '{type}은(는) 이 앱이 다루지 않는 종류입니다. 규격 체계가 달라 판정할 수 없으니 제조사 취급설명서를 확인하세요.',
  'reason.wheelType.supported':
    '일반 결합숫돌로 확인되었습니다. 이 앱이 규격을 대조하는 종류입니다.',
  'reason.visibleDamage.suspected':
    '사진에서 깨짐·균열로 보이는 부분이 있습니다. 이 숫돌을 사용하지 말고 직접 확인하세요.',
  'reason.visibleDamage.notVerifiable':
    '사진으로는 미세균열을 확인할 수 없습니다. 장착 전 타음검사(가볍게 두드려 소리 확인)를 하세요.',
  'reason.confidence.low':
    '라벨 인식 신뢰도가 낮습니다. 재촬영하거나 수동으로 값을 입력하세요.',
  'reason.confidence.ok': '라벨 인식 신뢰도가 충분합니다.',
  'reason.unitConsistency.mismatch':
    '라벨의 회전속도 표기와 원주속도 표기가 서로 맞지 않습니다. 둘 중 하나를 잘못 읽었을 수 있습니다. 라벨의 숫자를 다시 확인하세요.',
  'reason.unitConsistency.match': '라벨의 두 표기가 서로 맞습니다.',
  'reason.mountingSpec.missing':
    '라벨에서 장착 구멍 지름(내경)을 읽지 못했습니다. 숫돌이 축에 제대로 맞는지 장착 전에 직접 확인하세요.',
  'reason.mountingSpec.shown':
    '라벨에 적힌 내경은 Φ{bore}mm입니다. 그라인더 명판에는 축 규격이 적혀 있지 않아 이 앱이 대조할 수 없습니다. 축에 맞는지 직접 확인하세요.',
  'reason.peripheralSpeed.oddGrinder':
    '그라인더 값으로 계산한 가장자리 속도가 상식 범위를 벗어납니다. 지름이나 회전속도를 잘못 읽었을 수 있습니다. 그라인더는 라벨의 숫자를 다시 확인하세요.',
  'reason.peripheralSpeed.oddWheel':
    '숫돌 값으로 계산한 가장자리 속도가 상식 범위를 벗어납니다. 지름이나 회전속도를 잘못 읽었을 수 있습니다. 숫돌은 라벨의 숫자를 다시 확인하세요.',
  'reason.peripheralSpeed.oddBoth':
    '그라인더와 숫돌 값으로 계산한 가장자리 속도가 상식 범위를 벗어납니다. 지름이나 회전속도를 잘못 읽었을 수 있습니다. 그라인더와 숫돌은 라벨의 숫자를 다시 확인하세요.',
  'reason.peripheralSpeed.ok': '지름과 회전속도가 서로 어울리는 값입니다.',
  'reason.expiry.noToday':
    '기준일이 없어 유효기한을 비교할 수 없습니다. 앱을 다시 열어 점검을 진행하세요.',
  'reason.expiry.unreadable':
    '라벨에서 유효기한을 읽지 못했습니다. 기준일 {today}. 라벨 금속 링의 월/연 표기(예: 04/2023)를 직접 확인하세요. 표기가 없는 숫돌도 있습니다.',
  'reason.expiry.expired':
    '라벨에 표시된 유효기한이 지났습니다. 표시 {expiry} ({lastValid}까지), 기준일 {today}. 제조사는 유효기한이 지난 숫돌을 사용하지 말라고 안내합니다.',
  'reason.expiry.valid':
    '라벨에 표시된 유효기한이 남아 있습니다. 표시 {expiry} ({lastValid}까지), 기준일 {today}.',

  // 규칙 근거. 법령 이름과 조항도 번역한다 — 작업자가 읽을 수 있어야 근거다.
  'ruleSource.krOsh.label': '산업안전보건기준에 관한 규칙',
  'ruleSource.krOsh.reference':
    '제122조 (고용노동부령 제450호, 시행 2026-03-02)',
  'ruleSource.krOsh.scope': '최고사용회전속도·측면 사용·덮개·시험운전',
  'ruleSource.kosha.label': 'KOSHA GUIDE',
  'ruleSource.kosha.reference':
    'M-189-2015 휴대형 연삭기 안전작업에 관한 기술지침',
  'ruleSource.kosha.scope': '보관·취급 권고 (법적 강제력 없음)',
  'ruleSource.osa.label': 'oSa Product marking requirements',
  'ruleSource.osa.reference': 'Issue 2, 2020-04 (EN 12413:2019 기준)',
  'ruleSource.osa.scope': '유효기한 표시 형식 참고. EN 원문은 확인하지 못함',

  'hazard.list.cutting': '절단 작업 위험사항',
  'hazard.list.grinding': '연삭 작업 위험사항',
  'hazard.list.common': '공통 위험사항',
  'hazard.summary': '{title} {count}가지',
  'hazard.cuttingSide.title': '측면으로 갈지 않는다',
  'hazard.cuttingSide.detail':
    '절단날은 원주면으로만 자르도록 만들어졌습니다. 옆면으로 밀면 얇은 날이 측면 하중을 견디지 못하고 부러집니다.',
  'hazard.cuttingPinch.title': '날을 비틀거나 꺾지 않는다',
  'hazard.cuttingPinch.detail':
    '자르던 홈이 닫히면 날이 물려 반동(킥백)이 납니다. 재료를 양쪽에서 받쳐 홈이 벌어지는 방향으로 두세요.',
  'hazard.cuttingForce.title': '눌러서 자르지 않는다',
  'hazard.cuttingForce.detail':
    '힘으로 밀면 과열되어 날이 변형됩니다. 날 자체 무게로 천천히 들어가게 하세요.',
  'hazard.grindingAngle.title': '15~30° 로 눕혀서 댄다',
  'hazard.grindingAngle.detail':
    '너무 세워서 대면 숫돌 모서리가 재료를 파고들어 공구가 튕깁니다. 눕혀 대면 접촉면이 넓어져 안정됩니다.',
  'hazard.grindingSide.title': '연삭날에도 측면 하중을 주지 않는다',
  'hazard.grindingSide.detail':
    '옆면으로 밀어 쓰라고 만든 것은 컵형 숫돌뿐입니다. 일반 연삭날을 옆으로 밀면 파손 위험이 있습니다.',
  'hazard.grindingIdle.title': '새로 끼운 숫돌은 공회전으로 먼저 확인한다',
  'hazard.grindingIdle.detail':
    '장착이 잘못되었거나 균열이 있으면 부하가 걸리기 전에 드러납니다. 사람이 없는 방향으로 두고 이상 진동·소리를 확인하세요.',
  'hazard.commonStop.title': '완전히 멈춘 뒤 내려놓는다',
  'hazard.commonStop.detail':
    '전원을 끊어도 숫돌은 관성으로 계속 돕니다. 도는 상태로 바닥에 닿으면 공구가 튀어 오릅니다.',
  'hazard.commonGuard.title': '덮개 각도를 작업자 반대쪽으로 맞춘다',
  'hazard.commonGuard.detail':
    '방호덮개는 파편이 날아오는 쪽을 막습니다. 각도가 틀어져 있으면 덮개가 있어도 몸 쪽이 열립니다.',

  'notVerifiable.internalCrack.title': '내부 균열',
  'notVerifiable.internalCrack.detail':
    '미세균열은 표면 사진에 나타나지 않습니다. 장착 전 타음검사(가볍게 두드려 소리 확인)를 하세요.',
  'notVerifiable.physicalDamage.title': '물리적 손상',
  'notVerifiable.physicalDamage.detail':
    '사진에서는 뚜렷한 파손만 보입니다. 눌린 자국·변형·젖음은 판별하지 못합니다. 직접 살펴보세요.',
  'notVerifiable.mounting.title': '올바른 장착',
  'notVerifiable.mounting.detail':
    '플랜지 조임, 회전 방향, 축에 제대로 앉았는지는 사진으로 알 수 없습니다. 장착 후 직접 확인하세요.',
  'notVerifiable.guard.title': '방호덮개 상태',
  'notVerifiable.guard.detail':
    '덮개가 달려 있는지, 각도가 맞는지, 파손되지 않았는지는 이 앱이 보지 못합니다. 눈으로 확인하세요.',

  'history.title': '점검 이력',
  'history.loading': '기록을 불러오는 중입니다...',
  'history.clearConfirm':
    '저장된 점검 기록 {count}건을 모두 삭제합니다. 되돌릴 수 없습니다.',
  'history.clearConfirmButton': '모두 삭제',
  'history.cancel': '취소',
  'history.clearAll': '전체 삭제',
  'history.newInspection': '새 점검 시작',
  'history.empty': '저장된 점검 기록이 없습니다.',
  'history.timeNote':
    '「30초」는 사전점검 시간 목표입니다. 작업 선택부터 시험운전을 시작하기 직전까지를 잽니다. 법정 시험운전(1분·3분 이상)은 이 목표와 별도이며 줄이지 않습니다.',
  'history.elapsed': '점검에 {time} 걸림',
  'history.elapsedWithTrial': '점검에 {time} 걸림 (시험운전 포함)',
  'history.preTrial': '사전점검 {time} (시험운전 전까지)',
  'history.unknownModel': '모델 미상',
  'history.unknownDiameter': '지름 미상',
  'history.summary': '{model} {grinderRpm} · 숫돌 {wheelDiameter} {wheelRpm}',
  'history.grinderPhoto': '그라인더 명판',
  'history.wheelPhoto': '숫돌 라벨',
  'history.noPhoto': '저장된 사진이 없습니다.',
  'elapsed.overHour': '1시간 이상',
  'elapsed.seconds': '{seconds}초',
  'elapsed.minutes': '{minutes}분',
  'elapsed.minutesSeconds': '{minutes}분 {seconds}초',

  // 연구 도구. 검증 빌드에서만 그려진다.
  'research.notice': '검증/연구용 기능이며 현장 판정을 변경하지 않습니다.',
  'research.noticeDetail':
    '검증 빌드에서만 보입니다. 기록을 내보내고 지표를 계산할 뿐, 판정·상태 확인·시험운전·저장 조건에는 관여하지 않습니다.',
  'research.modeTitle': '연구·실험 모드',
  'research.modeHint':
    '측정값을 CSV로 내보냅니다. 현장 사용에는 필요하지 않습니다.',
  'research.download': 'CSV 내려받기 ({count}건)',
  'research.deviceOnly':
    '기록은 이 기기에만 있습니다. 내려받은 파일은 직접 옮겨야 합니다.',
  'research.downloadFailed': '내려받기에 실패했습니다. 저장 공간을 확인하세요.',
  'research.truthTitle': '정답(Ground Truth) 파일',
  'research.truthHint':
    '촬영 전에 직접 읽어 적어둔 값입니다. 넣어야 지표를 계산할 수 있습니다. 앱이 정답을 만들지는 않습니다.',
  'research.truthEmpty':
    '읽어낸 정답이 없습니다. JSON 배열 형식인지 확인하세요.',
  'research.truthUnreadable': '정답 파일을 읽지 못했습니다.',
  'research.truthRejected':
    '형식이 맞지 않아 {count}줄을 제외했습니다. 표본 수를 확인하세요.',
  'metrics.title': '평가 지표',
  'metrics.note':
    '정답을 넣은 기록 {count}건으로 계산했습니다. 인식 정확도는 사용자가 고치기 전의 OCR 원본값으로 잽니다.',
  'metrics.notAvailable': 'N/A — 계산할 데이터 없음',
  'metrics.records': '{numerator} / {denominator}건',
  'metrics.fields': '{numerator} / {denominator}필드',
  'metrics.falseSafe.name': 'False-Safe Rate',
  'metrics.falseSafe.definition':
    '정답이 부적합인 기록 중 앱이 적합으로 낸 비율. 0이 아니면 출시하지 않습니다.',
  'metrics.undetermined.name': '판정불가율',
  'metrics.undetermined.definition':
    '판정하지 못한 비율. 실패가 아니라 설계된 동작입니다.',
  'metrics.fieldAccuracy.name': '필드 추출 정확도',
  'metrics.fieldAccuracy.definition':
    '정답이 있는 필드 중 OCR 원본값이 정답과 맞은 비율.',
  'metrics.unitNormalization.name': '단위 정규화 오류',
  'metrics.unitNormalization.definition':
    'm/s에서 환산한 기록 중 결과가 정답과 다른 비율.',
  'metrics.falseSafeIds':
    'False-Safe 기록 id: {ids} — 개별로 분석해 보고하세요. 숨기지 않습니다.',

  // 검증 빌드 표시. 연구 도구와 같은 조건(researchToolsEnabled)으로 그려진다.
  // 판정·기록에는 관여하지 않는다 — 화면에만 보인다.
  'validationBuild.label': '검증용 빌드',
  'validationBuild.note':
    '현장 판정에는 쓰지 않습니다. 기록은 현장판과 다른 저장소에 남습니다.',
  'validationBuild.commit': '커밋 {sha}',
  'validationBuild.commitUnknown': '커밋 정보 없음',

  // 빌드 정보. 현장판·검증판 모두 정보 영역(면책 문구 옆)에서 보인다.
  'build.commit': '빌드 {sha}',
  'build.commitUnknown': '빌드 정보 없음',

  // 서비스 워커 업데이트 안내. 감지되면 화면 맨 위에 뜬다.
  // 점검·시험운전 중에는 적용 버튼을 잠근다 — 실제로 기계가 도는 중에
  // 화면이 예고 없이 바뀌면 안 된다.
  'update.available': '새 버전이 있습니다.',
  'update.apply': '지금 업데이트',
  'update.applying': '업데이트 적용 중...',
  'update.blockedDuringInspection': '점검을 마치면 업데이트할 수 있습니다.',

  'meta.title': 'WheelMatch AI — 그라인더·숫돌 규격 대조',

  disclaimer:
    '이 앱은 라벨에 표시된 규격의 대조 결과만 제공합니다. 작업 안전성을 보증하지 않으며, 제조사 취급설명서와 사업장 안전수칙을 대체할 수 없습니다.',

  'translation.notice':
    '번역문은 검수 전입니다. 뜻이 갈리면 한국어 원문을 따르고, 관리감독자에게 확인하세요.',
} as const;

/** 메시지 키. ko가 원본이므로 여기서 파생시킨다. */
export type MessageKey = keyof typeof ko;

/** 모든 언어가 만족해야 하는 형태. 키가 빠지면 타입 검사에서 걸린다. */
export type Messages = Record<MessageKey, string>;
