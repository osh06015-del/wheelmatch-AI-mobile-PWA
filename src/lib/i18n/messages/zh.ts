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

  'ruleVersion.label': '规则版本',
  'ruleVersion.note':
    '本次判定所用规则的出处与适用范围。这不是法律认证，也不是法规符合性保证。',
  'ruleVersion.missing': '未记录（该功能上线前的检查）',
  'trialRun.title': '试运转',
  'trialRun.legalBasis':
    '韩国《产业安全保健基准规则》第122条第2款要求：开始作业前试运转 1 分钟以上，更换砂轮后试运转 3 分钟以上，并确认机器有无异常。本应用只负责计时并记录你的回答，不能替代该法定程序。',
  'trialRun.standClear': '试运转时，请避开砂轮正面和旋转方向的危险区域。',
  'trialRun.separateFromTarget':
    '试运转时间与 30 秒预检目标分开计算。不要为了目标缩短法定时间。',
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

  'wheelType.bonded_abrasive': '普通砂轮（固结磨具）',
  'wheelType.flap_disc': '百叶片',
  'wheelType.cup_wheel': '碗形砂轮',
  'wheelType.diamond': '金刚石片',
  'wheelType.wire_brush': '钢丝刷',
  'wheelType.other': '其他',
  'wheelType.unknown': '不确定',
  'wheelTypeConfirm.label': '砂轮种类',
  'wheelTypeConfirm.hint':
    '按砂轮的外形选择，而不是按标签文字。请查看实物后选择。',
  'wheelTypeConfirm.aiSuggestion':
    'AI 建议：{type}——这只是根据照片给出的初始建议。',
  'wheelTypeConfirm.supported':
    '只有亲自确认是普通砂轮（固结磨具）时，本应用才核对规格。',
  'wheelTypeConfirm.unknown':
    '如果未确认砂轮种类，规格核对结果将是无法判定。请查看实物后选择。',
  'wheelTypeConfirm.unsupported':
    '本应用不判定这种砂轮。规格核对结果将是无法判定。请按照制造商说明书操作。',
  'wheelTypeConfirm.differs':
    'AI 建议（{ai}）与您选择的种类（{selected}）不同。请再次查看实物，并勾选下方的人工确认后才能继续。',
  'wheelTypeConfirm.needsConfirm':
    '砂轮种类与 AI 建议不同，需要勾选人工确认才能继续。',

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
  'checklist.workpiece': '确认工件已固定',
  'checklist.workpieceHint': '用台钳或夹具夹紧。不得用手或脚按住',
  'checklist.surroundings': '确认周围人员和可燃物',
  'checklist.surroundingsHint': '确认火花可及范围内没有人员和易燃、可燃物',
  'checklist.preWork': '就在开始作业前，请确认火花不会朝向人员或易燃物。',
  'checklist.incomplete': '必须确认安全检查清单的全部 {count} 项后才能保存。',

  'scan.retake': '重新拍摄',
  'scan.retryAnalysis': '用同一张照片重新分析',
  'scan.confirmTitle': '请确认识别出的数值',
  'scan.grinder.title': '拍摄角磨机铭牌',
  'scan.grinder.guide': '请将铭牌对准方框',
  'scan.grinder.analyzing': '正在分析铭牌...',
  'scan.grinder.failed': '铭牌分析失败。',
  'scan.grinder.proceed': '确认后拍摄砂轮',
  'scan.wheel.title': '拍摄砂轮标签',
  'scan.wheel.guide': '请将标签对准方框',
  'scan.wheel.analyzing': '正在分析标签...',
  'scan.wheel.failed': '标签分析失败。',
  'scan.wheel.proceed': '确认后核对规格',
  'scan.wheel.grinderFirst': '请先确认角磨机状态。',

  'camera.starting': '正在打开相机...',
  'camera.pickFromGallery': '从相册选择',
  'camera.pickPhoto': '从相册选择照片',
  'camera.retry': '重新尝试打开相机',
  'camera.gallery': '相册',
  'camera.shutter': '拍摄',
  'camera.error.unsupported':
    '此浏览器不支持相机。请确认页面是否通过 HTTPS 打开。',
  'camera.error.permission':
    '相机权限被拒绝。请在浏览器设置中允许使用相机后重试。',
  'camera.error.notFound': '未找到可用的相机。',
  'camera.error.inUse': '其他应用正在使用相机。请关闭该应用后重试。',
  'camera.error.failed': '无法打开相机。',
  'camera.error.failedNamed': '无法打开相机。（{name}）',

  'error.imageDecode':
    '无法读取此照片格式。请重新选择 JPG 或 PNG 照片。（可能不支持 iPhone 的 HEIC 照片）',
  'error.network': '无法连接服务器。请检查网络后，用同一张照片重新分析。',
  'error.serverConfig': '服务器设置有问题，无法分析标签。请告知管理人员。',
  'error.badRequest': '分析请求无效。请重新拍摄。',
  'error.imageTooLarge': '图片过大。请换一张分辨率较低的照片重试。',
  'error.rateLimited': '请求过多。请稍后重试。',
  'error.upstream': '分析服务未能处理请求。请稍后重试。（错误 {status}）',

  'field.model': '型号',
  'field.noLoadRPM': '空载转速',
  'field.maxWheelDiameter': '允许的最大砂轮直径',
  'field.maxRPM': '最高工作转速',
  'field.diameter': '直径',
  'field.thickness': '厚度',
  'field.purpose': '用途',
  'field.expiry': '有效期',
  'field.placeholder': '未识别 — 请手动输入',
  'field.purposeUnknown': '不确定',
  'field.confidence.high': '识别可信度：高',
  'field.confidence.medium': '识别可信度：中 — 请核对数值',
  'field.confidence.low': '识别可信度：低 — 请重新拍摄或手动输入',
  'field.rawShow': '查看识别出的原文',
  'field.rawHide': '收起识别出的原文',
  'manualConfirm.label': '我已亲自查看标签并确认上方数值',
  'manualConfirm.hint': '勾选后，将以你确认的数值代替识别可信度进行判定。',

  'guide.grinder.model.hint': '角磨机的产品名称。只作记录，不用于判定。',
  'guide.grinder.model.where': '以大字印在铭牌最上方。例：GWS 750-125',
  'guide.grinder.noLoadRPM.hint': '这台角磨机的转速。砂轮必须能承受这个转速。',
  'guide.grinder.noLoadRPM.where':
    '铭牌上 n₀ 或 no load speed 旁边的数字。例：11000 r/min、11000 min⁻¹',
  'guide.grinder.maxWheelDiameter.hint':
    '这台机器能装的最大砂轮。更大的砂轮装不进防护罩。',
  'guide.grinder.maxWheelDiameter.where':
    '铭牌上 wheel、disc 等字样旁边的直径。例：max Ø125mm',
  'guide.wheel.maxRPM.hint':
    '这片砂轮能承受的最高转速。低于角磨机转速时，砂轮会破裂飞出。',
  'guide.wheel.maxRPM.where':
    '标签上以大字印出的转速。若只标 m/s，应用会自动换算。例：12200 r/min、80 m/s',
  'guide.wheel.diameter.hint': '砂轮的外径。不得超过角磨机允许的尺寸。',
  'guide.wheel.diameter.where':
    '尺寸标示的第一个数字。例：125 × 1.6 × 22.23 中的 125',
  'guide.wheel.thickness.hint':
    '砂轮的厚度。切割用砂轮较薄（1~3mm），打磨用砂轮较厚（约 6mm）。',
  'guide.wheel.thickness.where':
    '尺寸标示中间的数字。例：125 × 1.6 × 22.23 中的 1.6',
  'guide.wheel.purpose.hint':
    '切割用砂轮用于切断，打磨用砂轮用于打磨。用错会承受侧向力而破裂。',
  'guide.wheel.purpose.where':
    '标签上的切割/打磨标示，英文为 CUT-OFF、GRINDING 或 DEPRESSED CENTER。',
  'guide.wheel.expiry.hint':
    '标签上的有效期。制造商要求不要使用过期的砂轮。也有不标有效期的砂轮。',
  'guide.wheel.expiry.where':
    '以月/年压印在中间的金属环上。例：04/2023，前面有时带 V 或 EXP。不要用生产日期代替。',

  'requirement.compactTitle': '所需砂轮',
  'requirement.compactUnknown': '未能读取铭牌数值，无法确定条件',
  'requirement.title': '所需砂轮条件',
  'requirement.partial': '未能确定全部条件。请在铭牌上亲自确认缺少的数值。',
  'requirement.notRecommendation':
    '这不是产品推荐，而是根据铭牌数值得出的条件。',
  'requirement.purposeUnknown': '未选择作业，无法确定用途。',
  'requirement.diameterMax': 'Φ{diameter}mm 以下',
  'requirement.diameterUnknown': '未能从铭牌读取允许的最大直径。',
  'requirement.rpmMin': '{rpm}rpm 以上',
  'requirement.rpmUnknown': '未能从铭牌读取空载转速。',
  'summary.sizeClass': '{inch} 英寸级（最大 Φ{diameter}mm）',
  'summary.maxDiameter': '最大 Φ{diameter}mm',
  'summary.unreadable': '未能读取铭牌数值',
  'margin.surplus': '余量 +{percent}%',
  'margin.shortfall': '不足 {percent}%',
  'margin.none': '无余量（0%）',

  'wheelPurpose.cutting': '切割用',
  'wheelPurpose.grinding': '打磨用',
  'wheelPurpose.unknown': '未识别',
  'wheelType.unconfirmed': '未确认',
  'confidence.high': '高',
  'confidence.medium': '中',
  'confidence.low': '低',
  'value.bore': '内孔 Φ{bore}mm',
  'value.unitConsistency': '{rpm}rpm = {computed}m/s / 标签 {labeled}m/s',

  'reason.requiredValues.ok': '转速比较所需的数值已全部读取。',
  'reason.requiredValues.missingGrinder':
    '未能读取角磨机空载转速。请重新拍摄或手动输入。',
  'reason.requiredValues.missingWheel':
    '未能读取砂轮最高工作转速。请重新拍摄或手动输入。',
  'reason.requiredValues.missingBoth':
    '未能读取角磨机空载转速和砂轮最高工作转速。请重新拍摄或手动输入。',
  'reason.rpmSafety.missing': '缺少转速数值，无法比较。',
  'reason.rpmSafety.fail':
    '砂轮最高工作转速（{wheel}rpm）低于角磨机空载转速（{grinder}rpm）。有破裂飞出的危险。',
  'reason.rpmSafety.pass':
    '砂轮最高工作转速（{wheel}rpm）不低于角磨机空载转速（{grinder}rpm）。',
  'reason.diameterFit.missing':
    '缺少直径数值，无法比较。请亲自确认角磨机铭牌和砂轮标签上的直径标示。',
  'reason.diameterFit.fail':
    '砂轮直径（{wheel}mm）超过角磨机允许的最大直径（{grinder}mm）。',
  'reason.diameterFit.pass':
    '砂轮直径（{wheel}mm）在角磨机允许的最大直径（{grinder}mm）以内。',
  'reason.purpose.unknown': '未能识别砂轮用途（切割/打磨）。请亲自查看标签。',
  'reason.purpose.recognized': '已识别砂轮用途：{purpose}。',
  'reason.workPurpose.unknown':
    '今天的作业：{work}。未能读取砂轮用途。请亲自确认标签上的用途标示。',
  'reason.workPurpose.mismatch':
    '今天的作业：{work}。这片砂轮：{purpose}。用途不符的砂轮可能因侧向力而破裂。',
  'reason.workPurpose.match': '今天的作业（{work}）与砂轮用途相符。',
  'reason.wheelType.unknown':
    '未确认砂轮种类。只有确认是普通砂轮（固结磨具）时才核对规格。请查看实物，在数值确认页面选择种类。',
  'reason.wheelType.unsupported':
    '{type}：本应用不处理这种砂轮。规格体系不同，无法判定。请按照制造商说明书操作。',
  'reason.wheelType.supported':
    '已确认为普通砂轮（固结磨具），属于本应用核对规格的种类。',
  'reason.visibleDamage.suspected':
    '照片中有看似破损或裂纹的部位。请勿使用这片砂轮，并亲自检查。',
  'reason.visibleDamage.notVerifiable':
    '照片无法看出细微裂纹。安装前请做敲击检查（轻敲并听声音）。',
  'reason.confidence.low': '标签识别可信度低。请重新拍摄或手动输入。',
  'reason.confidence.ok': '标签识别可信度足够。',
  'reason.unitConsistency.mismatch':
    '标签上的转速（rpm）与线速度（m/s）标示不一致。可能读错了其中一个。请再次核对标签上的数字。',
  'reason.unitConsistency.match': '标签上的两种转速标示一致。',
  'reason.mountingSpec.missing':
    '未能从标签读取安装孔径（内孔）。安装前请亲自确认砂轮是否与主轴匹配。',
  'reason.mountingSpec.shown':
    '标签上的内孔为 Φ{bore}mm。角磨机铭牌上没有标注主轴规格，本应用无法核对。请亲自确认是否与主轴匹配。',
  'reason.peripheralSpeed.oddGrinder':
    '根据角磨机数值算出的线速度超出正常范围。可能读错了直径或转速。请再次核对角磨机的数字。',
  'reason.peripheralSpeed.oddWheel':
    '根据砂轮数值算出的线速度超出正常范围。可能读错了直径或转速。请再次核对砂轮标签上的数字。',
  'reason.peripheralSpeed.oddBoth':
    '根据角磨机和砂轮数值算出的线速度都超出正常范围。可能读错了直径或转速。请再次核对角磨机和砂轮的数字。',
  'reason.peripheralSpeed.ok': '直径与转速数值相互吻合。',
  'reason.expiry.noToday':
    '没有基准日期，无法核对有效期。请重新打开应用再进行检查。',
  'reason.expiry.unreadable':
    '未能从标签读取有效期。基准日期 {today}。请亲自确认金属环上的月/年标示（例：04/2023）。也有不标有效期的砂轮。',
  'reason.expiry.expired':
    '标签上的有效期已过。标示 {expiry}（有效至 {lastValid}），基准日期 {today}。制造商要求不要使用过期的砂轮。',
  'reason.expiry.valid':
    '标签上的有效期未过。标示 {expiry}（有效至 {lastValid}），基准日期 {today}。',

  'ruleSource.krOsh.label': '韩国《产业安全保健基准规则》',
  'ruleSource.krOsh.reference':
    '第122条（雇佣劳动部令第450号，2026-03-02 起施行）',
  'ruleSource.krOsh.scope': '最高工作转速 · 侧面使用 · 防护罩 · 试运转',
  'ruleSource.kosha.label': 'KOSHA GUIDE',
  'ruleSource.kosha.reference': 'M-189-2015 手持式磨削机安全作业技术指南',
  'ruleSource.kosha.scope': '保管与操作建议（无法律强制力）',
  'ruleSource.osa.label': 'oSa Product marking requirements',
  'ruleSource.osa.reference': 'Issue 2, 2020-04（以 EN 12413:2019 为准）',
  'ruleSource.osa.scope': '有效期标示格式参考。EN 原文未查阅',

  'hazard.list.cutting': '切割作业危险事项',
  'hazard.list.grinding': '打磨作业危险事项',
  'hazard.list.common': '通用危险事项',
  'hazard.summary': '{title}（{count} 项）',
  'hazard.cuttingSide.title': '不要用侧面打磨',
  'hazard.cuttingSide.detail':
    '切割用砂轮只能用外圆周切割。向侧面推压时，薄砂轮承受不住侧向力会折断。',
  'hazard.cuttingPinch.title': '不要扭转或弯折砂轮',
  'hazard.cuttingPinch.detail':
    '切缝合拢会夹住砂轮并引起回弹。请从两侧支撑材料，让切缝朝张开的方向。',
  'hazard.cuttingForce.title': '不要用力压着切',
  'hazard.cuttingForce.detail':
    '用力推压会使砂轮过热变形。请让机器自身重量带着砂轮慢慢切入。',
  'hazard.grindingAngle.title': '以 15~30° 倾斜接触',
  'hazard.grindingAngle.detail':
    '砂轮立得太直，边缘会啃入材料使工具弹跳。倾斜接触时接触面变宽，更加稳定。',
  'hazard.grindingSide.title': '打磨用砂轮也不要施加侧向力',
  'hazard.grindingSide.detail':
    '只有碗形砂轮是为侧面使用而设计的。向侧面推压普通打磨用砂轮有破裂危险。',
  'hazard.grindingIdle.title': '新装的砂轮先空转确认',
  'hazard.grindingIdle.detail':
    '安装错误或有裂纹时，在加负载之前就会显现。请朝向无人的方向，确认有无异常振动和声音。',
  'hazard.commonStop.title': '完全停止后再放下',
  'hazard.commonStop.detail':
    '切断电源后砂轮仍会因惯性继续转动。转动时触地，工具会弹起。',
  'hazard.commonGuard.title': '将防护罩角度调到背向作业人员',
  'hazard.commonGuard.detail':
    '防护罩挡住碎片飞来的方向。角度偏了，即使装有防护罩，身体一侧也会暴露。',

  'notVerifiable.internalCrack.title': '内部裂纹',
  'notVerifiable.internalCrack.detail':
    '细微裂纹不会出现在表面照片中。安装前请做敲击检查（轻敲并听声音）。',
  'notVerifiable.physicalDamage.title': '物理损伤',
  'notVerifiable.physicalDamage.detail':
    '照片只能看出明显的破损。压痕、变形、受潮无法判别。请亲自查看。',
  'notVerifiable.mounting.title': '正确安装',
  'notVerifiable.mounting.detail':
    '法兰是否拧紧、旋转方向、是否在主轴上装正，照片无法得知。安装后请亲自确认。',
  'notVerifiable.guard.title': '防护罩状态',
  'notVerifiable.guard.detail':
    '防护罩是否装上、角度是否正确、是否破损，本应用看不到。请亲眼确认。',

  'history.title': '检查记录',
  'history.loading': '正在加载记录...',
  'history.clearConfirm': '将删除已保存的全部 {count} 条检查记录。无法恢复。',
  'history.clearConfirmButton': '全部删除',
  'history.cancel': '取消',
  'history.clearAll': '删除全部记录',
  'history.newInspection': '开始新的检查',
  'history.empty': '没有已保存的检查记录。',
  'history.timeNote':
    '「30 秒」是预检时间的目标：从选择作业到即将开始试运转为止。法定试运转（1 分钟、3 分钟以上）与此目标分开计算，不得缩短。',
  'history.elapsed': '检查用时 {time}',
  'history.elapsedWithTrial': '检查用时 {time}（含试运转）',
  'history.preTrial': '预检 {time}（至试运转前）',
  'history.unknownModel': '型号不明',
  'history.unknownDiameter': '直径不明',
  'history.summary': '{model} {grinderRpm} · 砂轮 {wheelDiameter} {wheelRpm}',
  'history.grinderPhoto': '角磨机铭牌',
  'history.wheelPhoto': '砂轮标签',
  'history.noPhoto': '没有保存照片。',
  'elapsed.overHour': '超过 1 小时',
  'elapsed.seconds': '{seconds} 秒',
  'elapsed.minutes': '{minutes} 分钟',
  'elapsed.minutesSeconds': '{minutes} 分 {seconds} 秒',

  'research.notice': '此为验证/研究用功能，不会改变现场判定。',
  'research.noticeDetail':
    '仅在验证版本中显示。只负责导出记录和计算指标，不参与判定、状态确认、试运转或保存条件。',
  'research.modeTitle': '研究模式',
  'research.modeHint': '将测量值导出为 CSV。现场使用不需要。',
  'research.download': '下载 CSV（{count} 条）',
  'research.deviceOnly': '记录只保存在本设备中。下载的文件需要自行转移。',
  'research.downloadFailed': '下载失败。请检查存储空间。',
  'research.truthTitle': '标准答案（Ground Truth）文件',
  'research.truthHint':
    '拍摄前亲自读取并记下的数值。需要它才能计算指标。应用不会生成标准答案。',
  'research.truthEmpty': '未读取到标准答案。请确认文件是否为 JSON 数组。',
  'research.truthUnreadable': '无法读取标准答案文件。',
  'research.truthRejected': '因格式不符排除了 {count} 行。请确认样本数。',
  'metrics.title': '评估指标',
  'metrics.note':
    '根据 {count} 条含标准答案的记录计算。识别准确度以用户修改前的 OCR 原始值衡量。',
  'metrics.notAvailable': 'N/A — 没有可计算的数据',
  'metrics.records': '{numerator} / {denominator} 条',
  'metrics.fields': '{numerator} / {denominator} 个字段',
  'metrics.falseSafe.name': 'False-Safe Rate',
  'metrics.falseSafe.definition':
    '标准答案为「规格不符」的记录中，应用判定为「规格相符」的比例。不为 0 则不发布。',
  'metrics.undetermined.name': '无法判定率',
  'metrics.undetermined.definition':
    '未能判定的比例。这是设计上的行为，不是故障。',
  'metrics.fieldAccuracy.name': '字段提取准确度',
  'metrics.fieldAccuracy.definition':
    '有标准答案的字段中，OCR 原始值与标准答案一致的比例。',
  'metrics.unitNormalization.name': '单位换算错误',
  'metrics.unitNormalization.definition':
    '由 m/s 换算的记录中，结果与标准答案不同的比例。',
  'metrics.falseSafeIds':
    'False-Safe 记录 id：{ids} — 请逐条分析并报告，不得隐瞒。',

  // 验证版本标识。与研究工具相同的条件下显示。
  // 仅用于显示 — 不影响判定或已保存的记录。
  'validationBuild.label': '验证版本',
  'validationBuild.note': '不用于现场判定。记录与现场版分开保存。',
  'validationBuild.commit': 'commit {sha}',
  'validationBuild.commitUnknown': '无 commit 信息',

  'meta.title': 'WheelMatch AI — 角磨机与砂轮规格核对',

  disclaimer:
    '本应用仅提供标签所示规格的核对结果。不保证作业安全，也不能替代制造商说明书和作业现场的安全规程。',

  'translation.notice':
    '此译文尚未校对。若含义不清，请以韩文原文为准并向管理人员确认。',
};
