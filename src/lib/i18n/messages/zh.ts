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
  'result.saveStopped': '保存中止结果',

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

  'trialRun.title': '试运转',
  'trialRun.legalBasis':
    '韩国《产业安全保健基准规则》第122条第2款要求：开始作业前试运转 1 分钟以上，更换砂轮后试运转 3 分钟以上，并确认机器有无异常。本应用只负责计时并记录你的回答，不能替代该法定程序。',
  'trialRun.standClear': '试运转时，请避开砂轮正面和旋转方向的危险区域。',
  'trialRun.replacedQuestion': '你刚刚更换过砂轮吗？',
  'trialRun.startReplaced': '是 — 开始 {seconds} 秒试运转',
  'trialRun.startBeforeWork': '否 — 开始 {seconds} 秒试运转',
  'trialRun.modeReplaced': '更换砂轮后试运转',
  'trialRun.modeBeforeWork': '开始作业前试运转',
  'trialRun.running': '正在运转，至少 {seconds} 秒。剩余时间',
  'trialRun.elapsed': '已达到要求时间。请在下方确认有无异常。',
  'trialRun.waitNotice': '达到要求时间后才能作答。',
  'trialRun.findingsTitle': '试运转期间有异常吗？',
  'trialRun.findingsHint':
    '请勾选所有符合的项目。只要勾选任意一项，就只能选择「有问题」继续。',
  'trialRun.finding.vibration': '异常振动',
  'trialRun.finding.noise': '异常噪音',
  'trialRun.finding.wobble': '砂轮摆动',
  'trialRun.finding.wheelDamage': '砂轮破损或松脱迹象',
  'trialRun.finding.equipment': '设备异常',
  'trialRun.confirmNormal': '确认无异常',
  'trialRun.reportAbnormal': '有问题',
  'trialRun.stopTitle': '请勿开始作业',
  'trialRun.stopBody':
    '试运转期间发现异常。请停机并切断电源，然后检查砂轮安装状态和设备。',
  'trialRun.required': '规格核对已完成。试运转后即可保存。',

  'grinderCondition.title': '亲自检查角磨机状态',
  'grinderCondition.note': '装砂轮之前，请查看整台角磨机并回答以下五项。',
  'grinderCondition.aiBoundary':
    'AI 只读取铭牌上的规格信息。角磨机状态和作业安全必须由作业人员亲自确认。',
  'grinderCondition.cordAndPlug': '电源线和插头有无破损？',
  'grinderCondition.cordAndPlugHint': '沿整根线摸查——绝缘破皮、压痕、插头裂损',
  'grinderCondition.body': '机身有无裂纹或严重损坏？',
  'grinderCondition.bodyHint': '跌落痕迹、外壳开裂、部件松动',
  'grinderCondition.guard': '防护罩是否已安装并牢固锁紧？',
  'grinderCondition.guardHint': '用手拧动不得移位，且须按规定角度遮住砂轮',
  'grinderCondition.auxiliaryHandle': '辅助手柄是否已安装并拧紧？',
  'grinderCondition.auxiliaryHandleHint':
    '必须能双手握持以应对反弹。若晃动，请选择「有问题」',
  'grinderCondition.spindle': '主轴、法兰和锁紧螺母有无明显损伤？',
  'grinderCondition.spindleHint': '螺纹滑牙、法兰变形或有异物、螺母磨损',
  'grinderCondition.confirmed': '已确认',
  'grinderCondition.issue': '有问题',
  'grinderCondition.incomplete': '还需亲自确认 {count} 项，才能进入砂轮拍摄。',
  'grinderCondition.stopTitle': '请勿使用此角磨机',
  'grinderCondition.stopBody':
    '已发现设备状态问题。请勿使用，送检维修后重新确认。',

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
  'checklist.ppe': '已穿戴防护用品',
  'checklist.ppeHint': '确认是否佩戴护目镜、手套和面罩',
  'checklist.preWork': '就在开始作业前，请确认火花不会朝向人员或易燃物。',
  'checklist.incomplete': '必须确认安全检查清单的全部 {count} 项后才能保存。',

  disclaimer:
    '本应用仅提供标签所示规格的核对结果。不保证作业安全，也不能替代制造商说明书和作业现场的安全规程。',

  'translation.notice':
    '此译文尚未校对。若含义不清，请以韩文原文为准并向管理人员确认。',
};
