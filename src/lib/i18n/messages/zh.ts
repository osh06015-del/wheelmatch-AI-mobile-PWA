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
  'result.undetermined.guardMissing':
    '护罩信息相互冲突。请重新检查角磨机状态和护罩选择。',
  'result.undetermined.guardSize':
    '无法确认所选护罩是否符合配件条件。请查看制造商说明书。',
  'result.undetermined.limitedScope':
    '仅对照了转速和直径。作业、护罩和安装的适用性尚未确认，因此不提供相符判定。',
  'result.recheckGuard': '重新检查护罩信息',
  'result.save': '完成并保存',
  'result.saving': '正在保存...',
  'result.saveError': '保存失败。请检查存储空间后重试。',
  'result.saveErrorQuota':
    '设备存储空间已满，本次记录未保存。请在历史记录中删除不需要的记录，或释放设备存储空间后重试。',
  'result.saveWithoutPhotosHint':
    '可以不含照片、只保存结果。应用不会替您删除已保存的照片。',
  'result.saveWithoutPhotos': '不含照片，仅保存结果',
  'result.saveStopped': '保存中止结果',

  'group.confirmed': '已核对',
  'group.conflicting': '不相符',
  'group.unreadable': '无法判定的信息',
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

  'evidence.toggleShow': '查看依据',
  'evidence.toggleHide': '收起依据',
  'evidence.disclaimer':
    '此依据仅供参考，不是安全批准。「适合」只表示标示的规格互相匹配。',
  'evidence.fields.title': '规格值依据',
  'evidence.fields.note':
    '并列显示 AI 识别的原始值、单位归一化后的值，以及作业者确认的最终值。',
  'evidence.fields.raw': 'OCR 原始值',
  'evidence.fields.normalized': '归一化值',
  'evidence.fields.final': '最终值',
  'evidence.fields.source': '来源',
  'evidence.source.ai': 'AI 识别',
  'evidence.source.converted': 'AI 换算',
  'evidence.source.user': '作业者输入',
  'evidence.notRecorded': '未记录',
  'evidence.rules.title': '各规则判定依据',
  'evidence.rules.formula': '计算公式',
  'evidence.rules.difference': '差值',
  'evidence.rules.gapPercent': '差值约 {percent}%',
  'evidence.rules.expiryCompare': '有效期至 {lastValid} / 基准日 {today}',
  'evidence.rules.doc': '依据文件',
  'evidence.rules.limit': '适用限制',
  'evidence.formula.rpmSafety': '砂轮最高使用转速(rpm) ≥ 磨机空载转速(rpm)',
  'evidence.formula.diameterFit': '砂轮直径(mm) ≤ 磨机允许最大直径(mm)',
  'evidence.formula.peripheralSpeed':
    '线速度(m/s) = π × 直径(m) × 转速(rpm) ÷ 60',
  'evidence.formula.unitConsistency':
    '将标签上的 rpm 标示换算为线速度(m/s)，再与标签上的 m/s 标示比较（容许误差 10%）',
  'evidence.formula.expiry':
    '比较基准日与标示的有效期（月/年）所在月份的最后一天',
  'evidence.doc.requiredValues': '本应用的设计 — 比较转速的前提条件',
  'evidence.limit.requiredValues':
    '不是法规依据。必须两个值都存在才能进行下一步比较。',
  'evidence.doc.rpmSafety':
    '《产业安全保健基准规则》第122条第4项 — 禁止超过标示的最高使用转速使用',
  'evidence.limit.rpmSafety':
    '只对照磨机铭牌和砂轮标签上印刷的数值，不看实际磨损或损伤。',
  'evidence.doc.diameterFit': '磨机铭牌上印刷的允许最大直径',
  'evidence.limit.diameterFit': '只对照铭牌数值，不从照片测量尺寸。',
  'evidence.doc.purpose': '标签用途标示确认 — 仅作提醒',
  'evidence.limit.purpose':
    '不影响最终判定。与今日作业是否相符由「与作业相符」决定。',
  'evidence.doc.workPurpose':
    '《产业安全保健基准规则》第122条第5项 — 禁止将砂轮用于非标示用途的侧面作业',
  'evidence.limit.workPurpose':
    '只对照作业者选择的今日作业与标签上的用途标示。',
  'evidence.doc.wheelType':
    '本应用的设计 — 只有具备类型档案的配件才对照转速·直径。法规依据（第122条）仅对结合剂砂轮引用',
  'evidence.limit.wheelType':
    '判定不可并不代表危险，而是本应用无法判定这种砂轮种类。',
  'evidence.doc.visibleDamage': '仅确认照片中可见的损伤 — 仅作提醒',
  'evidence.limit.visibleDamage':
    '照片无法看出微裂纹。看不到损伤不会显示为「无损伤」。标准确认方法是敲击音检查。',
  'evidence.doc.unitConsistency': '算术核对 — 标签上的两种标示是否一致',
  'evidence.limit.unitConsistency':
    '不是安全标准，只是用来筛出 OCR 误读的容许误差（10%）。',
  'evidence.doc.mountingSpec': '制造商指南 — 博世韩国磨机安全宣传资料',
  'evidence.limit.mountingSpec':
    '磨机铭牌上没有主轴规格可供对照。仅显示数值供参考，不用于判定。',
  'evidence.doc.peripheralSpeed': '常识范围核对 — 15~110 m/s',
  'evidence.limit.peripheralSpeed':
    '不是安全上限，只是用来筛出位数读错的算术核对。',
  'evidence.doc.expiry':
    'oSa《Product marking requirements for bonded abrasives》（2020-04，以 EN 12413:2019 为准）',
  'evidence.limit.expiry':
    '韩国法规没有有效期条款。只比较标签上标示的日期，不从生产日期推算。将标示月份视为有效至该月最后一天，是本应用自行采用的解读。',
  'evidence.doc.confidence': '本应用的设计 — 可信度低时不会自动通过',
  'evidence.limit.confidence': '解决低可信度的唯一方法是由人直接确认。',

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

  'exam.title': '多角度外观确认',
  'exam.boundary':
    'AI 只查找照片中可见的异常迹象。不确认没有损伤，也不确认可以安全使用。',
  'exam.microCrack': '微裂纹和内部裂纹无法通过照片确认。安装前请做敲击音检查。',
  'exam.frontReused': '正面直接使用刚才拍摄的标签照片。',
  'exam.view.front': '正面（标签）',
  'exam.view.back': '背面整体',
  'exam.view.backHint': '请让砂轮背面整体完整地进入一张照片。',
  'exam.view.edge': '边缘',
  'exam.view.edgeHint': '从侧面拍摄外圆面。缺口和破损通常出现在这里。',
  'exam.view.bore': '中心孔与安装部位',
  'exam.view.boreHint': '近距离拍摄中心孔及其周围 — 与主轴接触的部位。',
  'exam.capture': '拍照',
  'exam.gallery': '相册',
  'exam.retakeView': '重拍{view}',
  'exam.photoReady': '已有照片',
  'exam.photoMissing': '尚未添加',
  'exam.analyze': '用 4 张照片确认',
  'exam.analyzing': '正在确认照片...',
  'exam.missing': '需要补齐背面、边缘和中心孔照片才能确认。',
  'exam.status.suspected': '照片中可见异常迹象。请直接检查实际砂轮。',
  'exam.status.notObserved':
    '未找到明显异常。请亲自确认实际砂轮的正面、背面、边缘和中心孔。',
  'exam.status.unassessable':
    '仅凭这些照片无法判断。请按下面的提示重拍，或直接检查实物。',
  'exam.findingConfidence': 'AI 确信程度：{confidence}',
  'exam.finding.crack': '疑似裂纹',
  'exam.finding.chip': '疑似缺口或掉块',
  'exam.finding.edgeBreak': '疑似边缘破损',
  'exam.finding.boreDamage': '疑似中心孔或安装部位损伤',
  'exam.finding.deformation': '疑似弯曲变形',
  'exam.finding.contamination': '疑似附着物或污染',
  'exam.finding.other': '疑似其他异常',
  'exam.quality.blur': '模糊',
  'exam.quality.glare': '反光',
  'exam.quality.darkness': '过暗',
  'exam.quality.incompleteView': '需要查看的部位未入镜',
  'exam.retakeRequired': '有照片无法判读。请重拍下列照片。',
  'exam.acknowledge': '我已在实际砂轮上确认了标示的位置。',
  'exam.blocked': '确认所报告的迹象后才能继续。',
  'exam.failed': 'AI 未能确认照片。',
  'exam.failedFallback':
    '将在没有 AI 确认的情况下继续。请亲自确认砂轮的正面、背面、边缘和中心孔。',
  'exam.block.photosMissing':
    '请添加背面、边缘、中心孔照片并执行确认后再继续。',
  'exam.block.notAnalyzed': '请对已添加的照片执行确认后再继续。',
  'exam.block.retakeRequired': '请重拍无法判读的照片后再继续。',
  'exam.block.needsAcknowledge':
    '请标示已在实际砂轮上确认所报告的迹象后再继续。',

  'exam.block.needsManualContinue':
    '请标示将在没有 AI 检查的情况下由作业者自行检查后继续。',
  'exam.progress': '已准备的补充照片：{done} / {total}',
  'exam.captureView': '拍摄{view}',
  'exam.galleryView': '从相册选择{view}',
  'exam.replaceNote':
    '更换照片后，基于该照片的检查结果和您的确认标示都会清除，需要重新检查。',
  'exam.manualContinue': '在没有 AI 检查的情况下，由作业者自行检查后继续。',
  'exam.manualContinueHint':
    '请亲自查看砂轮的正面、背面、边缘和中心孔。AI 没有确认任何内容。',
  'exam.notRun.networkError': 'AI 未能查看照片 — 无法连接服务器。',
  'exam.notRun.apiError': 'AI 未能查看照片 — 服务器返回错误。',
  'exam.notRun.offline': 'AI 未能查看照片 — 设备处于离线状态。',
  'exam.notRun.userManualContinue': 'AI 未能查看照片。未记录原因。',
  'exam.evidence.title': '多角度外观确认记录',
  'exam.evidence.suspected': '疑似异常迹象 — 请亲自确认实物',
  'exam.evidence.notObserved': '未发现明显异常 — 仍需亲自确认',
  'exam.evidence.unassessable': '照片无法判断 — 请亲自确认',
  'exam.evidence.notRun': 'AI 确认未执行 — 已由作业者自行检查后继续',
  'exam.evidence.notRunAt': '确认自行检查继续的时间：{time}',
  'exam.evidence.notCounted':
    '这是 AI 在照片中看到的内容，不计入作业者亲自确认的项目。',
  'exam.evidence.noFindings': '未记录迹象的位置。',
  'exam.evidence.unreadablePhotos': '无法判读的照片',
  'exam.evidence.acknowledged': '作业者已在实物上确认所报告的位置。',
  'exam.evidence.photosMissing': '此记录中没有保存多角度照片。',
  'exam.evidence.meta': '确认 {time} · 模型 {model} · 指令 {version}',
  'photo.zoomOpen': '放大查看{label}',
  'photo.zoomClose': '关闭放大查看',

  'exam.block.captureReview':
    '有照片质量警告的照片，需要重新拍摄或选择仍然使用后，才能进行确认。',
  'captureCheck.title': '照片质量检查',
  'captureCheck.titleFor': '照片质量检查：{subject}',
  'captureCheck.warning.lowResolution': '照片分辨率较低。',
  'captureCheck.warning.blur': '照片看起来模糊。',
  'captureCheck.warning.tooDark': '照片太暗。',
  'captureCheck.warning.overexposed': '照片过亮或反光强烈。',
  'captureCheck.hint.lowResolution':
    '请不要使用截屏或放大的照片，靠近后用相机重新拍摄。',
  'captureCheck.hint.blur': '请保持手机稳定，等文字对焦清晰后再拍。',
  'captureCheck.hint.tooDark': '请移到更亮的地方或打光后再拍。',
  'captureCheck.hint.overexposed': '请稍微倾斜拍摄或换个位置，避开反射光。',
  'captureCheck.provisional':
    '此警告使用的阈值尚未经过验证，仅供参考。可以重新拍摄，也可以直接使用。',
  'captureCheck.boundary':
    '只检查照片是否便于判读，不判断铭牌或砂轮的状态，也不判断使用是否安全。',
  'captureCheck.decodeBlocked':
    '无法打开的照片不能继续使用。请重新拍摄或选择其他照片。',
  'captureCheck.retake': '重新拍摄',
  'captureCheck.useAnyway': '仍然使用这张照片',
  'captureCheck.useAnywayFor': '仍然使用{subject}照片',
  'captureCheck.usedAnyway': '已查看警告并选择使用这张照片。',

  'work.material.label': '材料',
  'work.material.steel': '普通钢材',
  'work.material.stainless': '不锈钢',
  'work.material.nonFerrous': '有色金属（铝等）',
  'work.material.stoneConcrete': '石材 / 混凝土',
  'work.material.other': '其他',
  'work.material.unknown': '不确定',
  'work.cooling.label': '干式 / 湿式',
  'work.cooling.dry': '干式',
  'work.cooling.wet': '湿式',
  'work.cooling.unknown': '不确定',
  'work.conditionsNote': '不确定时请保持“不确定”。不会把未知的值推定为相符。',
  'grinderMount.title': '主轴与护罩',
  'grinderMount.note': '铭牌上没有时请查看实物。不确定时请保持“不确定”。',
  'grinderMount.spindle.label': '主轴螺纹',
  'grinderMount.spindle.m14': 'M14',
  'grinderMount.spindle.m10': 'M10',
  'grinderMount.spindle.unc58': '5/8-11',
  'grinderMount.spindle.other': '其他',
  'grinderMount.spindle.unknown': '不确定',
  'grinderMount.guardType.label': '护罩类型',
  'grinderMount.guardType.grinding': '磨削护罩（半圆形）',
  'grinderMount.guardType.cutting': '切割护罩（包覆式）',
  'grinderMount.guardType.none': '没有护罩',
  'grinderMount.guardType.other': '其他',
  'grinderMount.guardType.unknown': '不确定',
  'grinderMount.guardSize.label': '护罩尺寸（适用砂轮直径）',
  'grinderMount.guardSize.hint': '不确定时请留空。',
  'profile.title': '安装与作业条件',
  'profile.note':
    '护罩不一致会使判定变为无法判定。其余项目不计入规格判定，应用也不会推定为相符，请亲自确认。',
  'profile.version': '条件表：{type} · {version}',
  'profile.none': '此类型没有可用的条件表。请查看制造商说明书。',
  'profile.status.unknown': '未知',
  'profile.status.manualCheck': '亲自确认',
  'profile.status.conflict': '不一致',
  'profile.key.material': '材料',
  'profile.key.cooling': '干式 / 湿式',
  'profile.key.spindle': '主轴',
  'profile.key.guard': '护罩',
  'profile.key.guardSize': '护罩尺寸',
  'profile.key.rotation': '旋转方向',
  'profile.code.material.unknown': '未选择作业材料。',
  'profile.code.material.unverified':
    '应用没有此类型的材料标准。请亲自核对标签上的材料标示。',
  'profile.code.material.manualCheck':
    '属于允许的材料，但请亲自核对标签上的材料标示。',
  'profile.code.material.notAllowed': '所选材料不在此类型的允许范围内。',
  'profile.code.cooling.unknown': '未选择干式或湿式。',
  'profile.code.cooling.unverified':
    '应用没有此类型的干式/湿式标准。请亲自核对标签标示。',
  'profile.code.cooling.manualCheck': '属于允许的方式，但请亲自核对标签标示。',
  'profile.code.cooling.notAllowed': '所选的干式/湿式方式不适用于此类型。',
  'profile.code.spindle.unknown':
    '主轴螺纹未知。请亲自确认砂轮内孔是否与主轴相配。',
  'profile.code.spindle.manualCheck':
    '铭牌上没有主轴规格，应用不与砂轮内孔对照。请亲自确认是否相配。',
  'profile.code.guard.unknown': '护罩类型未知。请亲自确认是否装有护罩。',
  'profile.code.guard.missing':
    '您选择了没有护罩。此类型需要护罩。装上护罩之前请勿作业。',
  'profile.code.guard.manualCheck':
    '应用不核对护罩是否适合作业（切割/磨削）。请亲自确认。',
  'profile.code.guardSize.unknown': '护罩尺寸未知。请亲自确认是否能罩住砂轮。',
  'profile.code.guardSize.smallerThanWheel':
    '护罩小于砂轮直径，无法罩住此砂轮。',
  'profile.code.guardSize.manualCheck':
    '仅凭尺寸无法判断护罩是否合适。请亲自确认安装状态。',
  'profile.code.rotation.unverified':
    '应用没有旋转方向标准。标签上有箭头时，请按箭头方向安装。',
  'profile.code.rotation.followArrow':
    '请亲自确认已按标签上的旋转方向箭头安装。',

  'rule.guard': '护罩条件',
  'rule.profileScope': '有限规格对照',
  'reason.guard.missing':
    '您输入了没有护罩。此类型需要护罩。在装上护罩并更正输入之前无法判定。',
  'reason.guard.smallerThanWheel':
    '输入的护罩尺寸小于砂轮直径。此护罩无法罩住砂轮，在核对护罩和输入之前无法判定。',
  'reason.guard.manualCheck':
    '应用不核对护罩类型和尺寸是否适合此砂轮。请亲自确认安装状态。',
  'reason.profileScope.limited':
    '仅对照了转速和直径。作业、护罩和安装的适用性尚未确认，因此不提供相符判定。',
  'evidence.doc.guard': '《产业安全保健基准规则》第122条第1项 — 砂轮须设护罩',
  'evidence.limit.guard':
    '仅在作业者输入没有护罩或护罩小于砂轮时阻止。护罩尺寸标准的依据尚未核实，因此判为无法判定，而非不相符。有护罩并不代表护罩合适。',
  'evidence.doc.profileScope':
    '本应用的设计 — 对于作业、护罩、材料等核心条件缺乏依据的类型，仅按通用规则对照转速和直径',
  'evidence.limit.profileScope':
    '即使转速和直径相符，也不会得出相符（COMPATIBLE）结果。本应用未确认该类型是否适合此作业、护罩是否适合该类型、安装是否正确。请遵循制造商说明书和管理监督者的确认。',

  'wheelType.bonded_abrasive': '普通砂轮（固结磨具）',
  'wheelType.flap_disc': '百叶片',
  'wheelType.cup_wheel': '碗形砂轮',
  'wheelType.diamond': '金刚石片',
  'wheelType.wire_brush': '钢丝刷',
  'wheelType.bonded_cutting': '固结切割砂轮（Type 1/41）',
  'wheelType.bonded_grinding': '固结磨削砂轮（Type 27/28）',
  'wheelType.bonded_combination': '切割磨削两用砂轮（Type 27/42）',
  'wheelType.bonded_cup': '固结杯形砂轮（Type 6/11）',
  'wheelType.diamond_continuous': '金刚石锯片（连续边）',
  'wheelType.diamond_turbo': '金刚石锯片（涡轮边）',
  'wheelType.diamond_segmented': '金刚石锯片（分段式）',
  'wheelType.diamond_cup': '金刚石碗磨片',
  'wheelType.tuck_pointing': '勾缝片',
  'wheelType.fibre_disc': '钢纸 / 砂纸磨片',
  'wheelType.nonwoven_disc': '无纺布表面处理片',
  'wheelType.polishing_pad': '制造商认可的抛光垫',
  'wheelTypeConfirm.supportedProfile':
    '此类型会对照转速和直径。该类型特有的状态检查须由作业者亲自完成。',
  'wheelTypeConfirm.needsSubtype':
    '请选择具体类型才能对照规格。保持现状将无法判定。',
  'reason.workPurpose.manualCheck':
    '今天的作业是{work}。应用没有依据核对此类型是否适合该作业。请亲自查看制造商说明书。',
  'reason.workPurpose.profileMismatch':
    '今天的作业（{work}）不在所选类型（{type}）的允许作业范围内。在重新核对类型和作业之前无法判定。',
  'reason.wheelType.supportedProfile':
    '已确认类型：{type}。应用会对照此类型的转速和直径。该类型特有的状态项目须由作业者亲自确认。',
  'reason.expiry.noPolicy':
    '应用没有依据对此类型适用有效期标准。如标签或制造商注明期限，请亲自确认。',
  'trialRun.noPolicy':
    '应用没有此类型试运转标准的依据，因此不要求也不记录试运转。请遵循制造商说明书中的试运转说明。',
  'wheelCondition.diamondRimIntact': '分段或边缘没有脱落或破损吗？',
  'wheelCondition.diamondRimIntactHint':
    '检查分段之间和边缘有无缺块、裂纹或磨到基体的地方。',
  'wheelCondition.flapsIntact': '叶片没有脱落或撕裂吗？',
  'wheelCondition.flapsIntactHint':
    '检查有无缺失叶片、撕裂叶片或一侧磨短的地方。',
  'wheelCondition.noDelamination': '叶片没有从底盘上翘起或剥离吗？',
  'wheelCondition.noDelaminationHint': '轻按叶片根部，检查粘接有无松脱。',
  'wheelCondition.flapBackingIntact': '底盘没有破裂或变形吗？',
  'wheelCondition.flapBackingIntactHint':
    '检查背面底盘（纤维或塑料）有无裂纹、破损或变形。',
  'wheelCondition.threadAdapterFit': '螺纹和转接件与主轴相配且无损坏吗？',
  'wheelCondition.threadAdapterFitHint':
    '确认螺纹未滑牙、转接件不松动，并与角磨机主轴规格相符。',
  'wheelCondition.evenWear': '没有偏向一侧的磨损（偏磨）吗？',
  'wheelCondition.evenWearHint': '检查工作面是否一侧磨得更深或磨成台阶状。',
  'wheelCondition.dedicatedGuardFitted': '是否装有适合此杯形的专用护罩？',
  'wheelCondition.dedicatedGuardFittedHint':
    '确认按制造商说明安装的是适合此杯形的护罩，而不是普通砂轮护罩。',
  'wheelCondition.wiresIntact': '没有断裂或松散的钢丝吗？',
  'wheelCondition.wiresIntactHint':
    '检查有无突出的钢丝、断丝或偏向一侧聚集的地方。',
  'wheelCondition.backingPadUndamaged': '磨片和背垫没有开裂、变形或磨损吗？',
  'wheelCondition.backingPadUndamagedHint':
    '检查背垫边缘有无撕裂或压坏，磨片是否均匀贴合背垫。',
  'wheelType.other': '其他',
  'wheelType.unknown': '不确定',
  'wheelTypeConfirm.label': '砂轮种类',
  'wheelTypeConfirm.hint':
    '按砂轮的外形选择，而不是按标签文字。请查看实物后选择。',
  'wheelTypeConfirm.aiSuggestion':
    'AI 建议：{type}——这只是根据照片给出的初始建议。',
  'wheelTypeConfirm.supported':
    '普通砂轮（固结磨具）由本应用对照转速和直径。请查看实物亲自确认类型。',
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
  'field.wheelType': '砂轮种类',
  'field.accessoryName': '配件名称(选填)',
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
  'history.deleteRecord': '删除此记录',
  'history.deleteConfirm':
    '将删除这一条记录。一并保存的照片也会删除且无法恢复。',
  'history.deleteConfirmButton': '确认删除此记录',
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
  'history.loadMore': '加载更多（{shown}/{total}）',
  'history.filter.title': '筛选',
  'history.filter.reset': '重置筛选',
  'history.filter.purpose': '作业',
  'history.filter.purposeAll': '全部',
  'history.filter.verdict': '判定',
  'history.filter.verdictAll': '全部',
  'history.filter.wheelType': '砂轮种类',
  'history.filter.wheelTypeAll': '全部',
  'history.filter.trialRun': '试运转结果',
  'history.filter.trialRunAll': '全部',
  'history.filter.trialRunNormal': '无异常',
  'history.filter.trialRunAbnormal': '有异常',
  'history.filter.trialRunNone': '未试运转',
  'history.filter.dateFrom': '起始日期',
  'history.filter.dateTo': '结束日期',
  'history.filter.resultCount': '{count} 条记录',
  'history.filter.resultCountOf': '共 {total} 条中的 {count} 条',
  'history.filter.noResults': '没有符合筛选条件的记录。',
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
  'research.exported': '已导出全部 {count} 条记录到 CSV。',
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

  // 构建信息。现场版和验证版都会在免责声明旁的信息区显示。
  'build.commit': '构建 {sha}',
  'build.commitUnknown': '无构建信息',

  // Service Worker 更新提示。检测到新版本时显示在屏幕最上方。
  // 检查或试运转期间锁定应用按钮 —— 机器实际运转时画面不能毫无预警地改变。
  'update.available': '有新版本。',
  'update.apply': '立即更新',
  'update.applying': '正在应用更新...',
  'update.blockedDuringInspection': '完成检查后即可更新。',

  'meta.title': 'WheelMatch AI — 角磨机与砂轮规格核对',

  disclaimer:
    '本应用仅提供标签所示规格的核对结果。不保证作业安全，也不能替代制造商说明书和作业现场的安全规程。',

  'translation.notice':
    '此译文尚未校对。若含义不清，请以韩文原文为准并向管理人员确认。',
};
