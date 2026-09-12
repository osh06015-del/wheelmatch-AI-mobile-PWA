// 简体中文 (중국어 간체).
//
// 검수 전이다. 현장 투입 전 원어민 확인이 필요하다 (docs/i18n.md 참고).
//
// 용어는 중국어권 산업안전 자료와 대조해 골랐다.
//   角磨机 · 砂轮 · 防护罩 · 回弹 · 裂纹
// 확인하지 못한 것은 docs/i18n.md의 검수 질문 목록에 남겼다.

import type { Messages } from './ko';

export const zh: Messages = {
  'common.home': '首页',
  'common.grinder': '角磨机',
  'common.wheel': '砂轮',
  'common.language': '语言',

  'home.title': 'WheelMatch AI',
  'home.subtitle': '角磨机与砂轮规格核对',
  'home.question': '今天做什么作业？',
  'home.cutting': '切割',
  'home.cuttingHint': '切断作业',
  'home.grinding': '打磨',
  'home.grindingHint': '打磨作业',
  'home.afterChoice': '选择后，先拍角磨机铭牌，再拍砂轮标签。',
  'home.history': '查看检查记录 →',

  'verdict.compatible': '规格相符',
  'verdict.incompatible': '规格不符',
  'verdict.undetermined': '无法判定',
  'verdict.note.compatible': '标签上的规格互相匹配。请完成下方的安全检查清单。',
  'verdict.note.incompatible': '请勿使用此组合。请查看下方原因。',
  'verdict.note.undetermined': '数据不足，无法判定。请重新拍摄或自行输入数值。',

  'result.title': '规格核对结果',
  'result.loading': '正在加载结果...',
  'result.undetermined.help':
    '数据不足或识别可信度低。请重新拍摄或自行输入数值后再判定。',
  'result.retakeGrinder': '从角磨机重新开始',
  'result.retakeWheel': '仅重拍砂轮',
  'result.save': '完成并保存',
  'result.saving': '正在保存...',
  'result.saveError': '保存失败。请检查存储空间后重试。',

  'group.confirmed': '已核对',
  'group.conflicting': '不相符',
  'group.unreadable': '未能读取',
  'group.manual': '需你亲自确认',
  'notVerifiable.title': '本应用无法确认的项目',
  'notVerifiable.note': '以下项目不包含在判定结果中。照片和标签无法得知。',

  'checks.title': '各检查项结果',
  'rule.requiredValues': '必需数值',
  'rule.rpmSafety': '转速上限',
  'rule.diameterFit': '直径匹配',
  'rule.purpose': '砂轮用途',
  'rule.workPurpose': '与作业相符',
  'rule.wheelType': '砂轮种类',
  'rule.visibleDamage': '外观损伤',
  'rule.unitConsistency': '标注一致性',
  'rule.mountingSpec': '安装孔径',
  'rule.peripheralSpeed': '线速度交叉核对',
  'rule.expiry': '有效期',
  'rule.confidence': '识别可信度',
  'expiry.source':
    '有效期依据：只使用标签上印刷的月/年标示，不从生产日期推算。标示格式依据 oSa《Product marking requirements for bonded abrasives》（2020-04，以 EN 12413:2019 为准）。EN 12413 原文未查阅。将标示月份视为有效至该月最后一天，是本应用的解读，并非法规。韩国《产业安全保健基准规则》第122条没有有效期条款。',

  'wheelCondition.title': '亲自检查砂轮状态',
  'wheelCondition.note': '安装前，请亲自检查实际砂轮的正反面、边缘和安装部位。',
  'wheelCondition.aiBoundary':
    'AI只能提示疑似可见损伤，不能确认砂轮无损，也不能确认作业安全。',
  'wheelCondition.aiDamageWarning':
    'AI怀疑照片中有可见损伤迹象。请亲自仔细检查砂轮。',
  'wheelCondition.labelWarning':
    'AI未能读取足够的标签信息。请检查实际标签并修正上方数值。',
  'wheelCondition.expiryWarning':
    'AI未能读取有效期。请亲自检查标签上印刷的月/年。',
  'wheelCondition.damageFree': '是否没有破损、裂纹、细裂纹或边缘缺口？',
  'wheelCondition.damageFreeHint':
    '不要只相信照片；请在光线充足处转动并检查整个砂轮',
  'wheelCondition.notDeformed': '砂轮是否没有翘曲或变形？',
  'wheelCondition.notDeformedHint': '若不平整、扭曲或鼓起，请选择“有问题”',
  'wheelCondition.mountingAreaUndamaged': '中心孔和安装部位是否没有可见损伤？',
  'wheelCondition.mountingAreaUndamagedHint':
    '从正反两面检查中心孔周围是否有缺口、磨损或变形',
  'wheelCondition.labelLegible': '是否能识别标签和关键规格？',
  'wheelCondition.labelLegibleHint':
    '确认能够读取转速、直径、用途等核对所需标示',
  'wheelCondition.expiryValid': '标签上的有效期是否仍然有效？',
  'wheelCondition.expiryValidHint':
    '直接读取标签上的月/年，不要根据生产日期推算',
  'wheelCondition.confirmed': '已确认',
  'wheelCondition.issue': '有问题',
  'wheelCondition.incomplete':
    '必须亲自确认剩余 {count} 项后，才能进行规格核对。',
  'wheelCondition.stopTitle': '请勿使用此砂轮',
  'wheelCondition.stopBody':
    '已确认砂轮状态存在问题。请勿安装，更换其他可用砂轮后重新检查。',

  'action.title': '请勿使用',
  'action.rpmSafety': '请勿安装此砂轮。请更换为可承受角磨机转速及以上的砂轮。',
  'action.diameterFit': '请勿安装此砂轮。请更换为不超过角磨机允许直径的砂轮。',
  'action.workPurpose':
    '请更换为适合今天作业的砂轮。用途不符的砂轮破裂风险很高。',
  'action.expiry':
    '请勿安装此砂轮。标签上的有效期已过。请更换为仍在有效期内的砂轮。',
  'action.generic': '请勿安装此砂轮。请更换为符合条件的砂轮。',

  'checklist.title': '安全检查清单',
  'checklist.note': '这些项目需要亲自确认，规格核对不包含这些内容。',
  'checklist.guardCover': '已安装防护罩',
  'checklist.guardCoverHint': '确认砂轮外露角度是否按规定遮挡',
  'checklist.auxiliaryHandle': '已安装辅助手柄',
  'checklist.auxiliaryHandleHint': '确认能否双手握持以应对回弹',
  'checklist.ppe': '已穿戴防护用品',
  'checklist.ppeHint': '确认是否佩戴护目镜、手套和面罩',
  'checklist.preWork': '就在开始作业前，请确认火花不会朝向人员或易燃物。',
  'checklist.incomplete': '必须确认安全检查清单的全部 {count} 项后才能保存。',

  disclaimer:
    '本应用仅提供标签所示规格的核对结果。不保证作业安全，也不能替代制造商说明书和作业现场的安全规程。',

  'translation.notice':
    '此译文尚未校对。若含义不清，请以韩文原文为准并向管理人员确认。',
};
