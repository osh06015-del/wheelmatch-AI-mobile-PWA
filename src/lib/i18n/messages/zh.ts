// 简体中文 (중국어 간체).
//
// 검수 전이다. 현장 투입 전 원어민 확인이 필요하다 (docs/i18n.md 참고).

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
  'home.grindingHint': '打磨与抛光',
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

  'checks.title': '各检查项结果',
  'rule.requiredValues': '必需数值',
  'rule.rpmSafety': '转速上限',
  'rule.diameterFit': '直径匹配',
  'rule.purpose': '砂轮用途',
  'rule.workPurpose': '与作业相符',
  'rule.wheelType': '砂轮种类',
  'rule.visibleDamage': '外观损伤',
  'rule.peripheralSpeed': '线速度交叉核对',
  'rule.confidence': '识别可信度',

  'action.title': '请勿使用',
  'action.rpmSafety': '请勿安装此砂轮。请更换为可承受角磨机转速及以上的砂轮。',
  'action.diameterFit': '请勿安装此砂轮。请更换为不超过角磨机允许直径的砂轮。',
  'action.workPurpose':
    '请更换为适合今天作业的砂轮。用途不符的砂轮破裂风险很高。',
  'action.generic': '请勿安装此砂轮。请更换为符合条件的砂轮。',

  'checklist.title': '安全检查清单',
  'checklist.note': '这些项目需要亲自确认，规格核对不包含这些内容。',
  'checklist.guardCover': '已安装防护罩',
  'checklist.guardCoverHint': '确认砂轮外露角度是否按规定遮挡',
  'checklist.auxiliaryHandle': '已安装辅助手柄',
  'checklist.auxiliaryHandleHint': '确认能否双手握持以应对反弹',
  'checklist.wheelDamage': '砂轮无损伤',
  'checklist.wheelDamageHint': '确认有无裂纹、缺口、变形（若有请立即更换）',
  'checklist.ppe': '已穿戴防护用品',
  'checklist.ppeHint': '确认是否佩戴护目镜、手套和面罩',
  'checklist.preWork': '就在开始作业前，请确认火花不会朝向人员或易燃物。',
  'checklist.incomplete': '必须确认安全检查清单的全部 {count} 项后才能保存。',

  disclaimer:
    '本应用仅提供标签所示规格的核对结果。不保证作业安全，也不能替代制造商说明书和作业现场的安全规程。',

  'translation.notice':
    '此译文尚未校对。若含义不清，请以韩文原文为准并向管理人员确认。',
};
