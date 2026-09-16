// Tiếng Việt (베트남어).
//
// 검수 전이다. 현장 투입 전 원어민 확인이 필요하다 (docs/i18n.md 참고).
//
// 용어는 베트남 현지 산업안전 자료와 Bosch 베트남 자료를 대조해 골랐다.
//   máy mài (góc) · đá mài · tay cầm phụ · giật ngược  ← 현지 용례 확인됨
// 확인하지 못한 것은 docs/i18n.md의 검수 질문 목록에 남겼다.

import type { Messages } from './ko';

export const vi: Messages = {
  'common.home': 'Trang chủ',
  'common.grinder': 'Máy mài',
  'common.wheel': 'Đá mài',
  'common.language': 'Ngôn ngữ',

  'home.title': 'WheelMatch AI',
  'home.subtitle': 'Đối chiếu thông số máy mài và đá mài',
  'home.question': 'Hôm nay làm việc gì?',
  'home.cutting': 'Cắt',
  'home.cuttingHint': 'Công việc cắt',
  'home.grinding': 'Mài',
  'home.grindingHint': 'Công việc mài',
  'home.afterChoice':
    'Sau khi chọn, hãy chụp nhãn máy mài trước, rồi đến nhãn đá mài.',
  'home.history': 'Xem lịch sử kiểm tra →',

  'verdict.compatible': 'THÔNG SỐ PHÙ HỢP',
  'verdict.incompatible': 'THÔNG SỐ KHÔNG PHÙ HỢP',
  'verdict.undetermined': 'KHÔNG THỂ XÁC ĐỊNH',
  'verdict.note.compatible':
    'Các thông số in trên nhãn phù hợp với nhau. Hãy hoàn thành danh mục kiểm tra an toàn bên dưới.',
  'verdict.note.incompatible':
    'Không được dùng tổ hợp này. Hãy xem nguyên nhân bên dưới.',
  'verdict.note.undetermined':
    'Không đủ dữ liệu để xác định. Hãy chụp lại hoặc tự nhập giá trị.',

  'result.title': 'Kết quả đối chiếu thông số',
  'result.loading': 'Đang tải kết quả...',
  'result.undetermined.help':
    'Thiếu dữ liệu hoặc độ tin cậy khi đọc nhãn thấp. Hãy chụp lại hoặc tự nhập giá trị để có kết quả.',
  'result.retakeGrinder': 'Làm lại từ máy mài',
  'result.retakeWheel': 'Chỉ chụp lại đá mài',
  'result.save': 'Hoàn tất và lưu',
  'result.saving': 'Đang lưu...',
  'result.saveError':
    'Lưu không thành công. Hãy kiểm tra dung lượng lưu trữ rồi thử lại.',
  'result.saveErrorQuota':
    'Bản ghi này chưa được lưu — bộ nhớ thiết bị đã đầy. Hãy xóa các bản ghi không cần thiết trong lịch sử hoặc giải phóng bộ nhớ thiết bị rồi thử lại.',
  'result.saveWithoutPhotosHint':
    'Bạn có thể lưu kết quả mà không kèm ảnh. Ứng dụng không tự xóa các ảnh đã lưu trước đó.',
  'result.saveWithoutPhotos': 'Lưu kết quả, không kèm ảnh',
  'result.saveStopped': 'Lưu kết quả dừng máy',

  'group.confirmed': 'Đã đối chiếu',
  'group.conflicting': 'Không khớp',
  'group.unreadable': 'Không đọc được',
  'group.manual': 'Bạn phải tự kiểm tra',
  'notVerifiable.title': 'Những điều ứng dụng này không kiểm tra được',
  'notVerifiable.note':
    'Các mục dưới đây không nằm trong kết quả. Ảnh và nhãn không cho biết được.',

  'checks.title': 'Kết quả từng mục kiểm tra',
  'rule.requiredValues': 'Giá trị bắt buộc',
  'rule.rpmSafety': 'Tốc độ cho phép',
  'rule.diameterFit': 'Đường kính phù hợp',
  'rule.purpose': 'Công dụng đá mài',
  'rule.workPurpose': 'Đúng với công việc',
  'rule.wheelType': 'Loại đá mài',
  'rule.visibleDamage': 'Hư hỏng bên ngoài',
  'rule.unitConsistency': 'Nhãn khớp nhau',
  'rule.mountingSpec': 'Đường kính lỗ lắp',
  'rule.peripheralSpeed': 'Đối chiếu tốc độ vòng ngoài',
  'rule.expiry': 'Hạn sử dụng',
  'rule.confidence': 'Độ tin cậy khi đọc nhãn',
  'expiry.source':
    'Căn cứ hạn sử dụng: chỉ dùng tháng/năm in trên nhãn. Không tính từ ngày sản xuất. Định dạng ghi nhãn theo oSa "Product marking requirements for bonded abrasives" (2020-04, dựa trên EN 12413:2019). Bản gốc EN 12413 chưa được đọc. Việc coi đá mài còn hạn đến ngày cuối của tháng ghi trên nhãn là cách hiểu của ứng dụng này, không phải quy định. Điều 122 Quy định về tiêu chuẩn an toàn vệ sinh lao động của Hàn Quốc không có điều khoản về hạn sử dụng.',

  'evidence.toggleShow': 'Xem căn cứ',
  'evidence.toggleHide': 'Ẩn căn cứ',
  'evidence.disclaimer':
    'Căn cứ này chỉ để tham khảo, không phải xác nhận an toàn. "Đạt" chỉ có nghĩa là các thông số ghi trên nhãn khớp với nhau.',
  'evidence.fields.title': 'Căn cứ giá trị thông số',
  'evidence.fields.note':
    'Hiển thị cùng lúc giá trị AI đọc được, giá trị sau khi quy đổi đơn vị, và giá trị cuối cùng do người vận hành xác nhận.',
  'evidence.fields.raw': 'Bản gốc OCR',
  'evidence.fields.normalized': 'Giá trị quy đổi',
  'evidence.fields.final': 'Giá trị cuối',
  'evidence.fields.source': 'Nguồn',
  'evidence.source.ai': 'AI nhận diện',
  'evidence.source.converted': 'AI quy đổi',
  'evidence.source.user': 'Người vận hành nhập',
  'evidence.notRecorded': 'Chưa ghi',
  'evidence.rules.title': 'Căn cứ kết quả theo từng quy tắc',
  'evidence.rules.formula': 'Công thức',
  'evidence.rules.difference': 'Chênh lệch',
  'evidence.rules.gapPercent': 'Chênh lệch khoảng {percent}%',
  'evidence.rules.expiryCompare': 'Hết hạn {lastValid} / mốc so sánh {today}',
  'evidence.rules.doc': 'Tài liệu căn cứ',
  'evidence.rules.limit': 'Giới hạn áp dụng',
  'evidence.formula.rpmSafety':
    'Tốc độ tối đa cho phép của đá mài (rpm) ≥ tốc độ không tải của máy mài (rpm)',
  'evidence.formula.diameterFit':
    'Đường kính đá mài (mm) ≤ đường kính tối đa cho phép của máy mài (mm)',
  'evidence.formula.peripheralSpeed':
    'Tốc độ vòng ngoài (m/s) = π × đường kính (m) × rpm ÷ 60',
  'evidence.formula.unitConsistency':
    'Quy đổi số rpm ghi trên nhãn sang tốc độ vòng ngoài (m/s) rồi so với số m/s ghi trên nhãn (sai số cho phép 10%)',
  'evidence.formula.expiry':
    'So sánh mốc ngày với ngày cuối cùng của tháng/năm hết hạn ghi trên nhãn',
  'evidence.doc.requiredValues':
    'Thiết kế của ứng dụng — điều kiện tiên quyết để so sánh tốc độ',
  'evidence.limit.requiredValues':
    'Không phải căn cứ pháp lý. Cả hai giá trị phải có mới so sánh được bước tiếp theo.',
  'evidence.doc.rpmSafety':
    'Điều 122 khoản 4, Quy định về tiêu chuẩn an toàn vệ sinh lao động — không dùng vượt tốc độ tối đa cho phép ghi trên nhãn',
  'evidence.limit.rpmSafety':
    'Chỉ đối chiếu giá trị in trên biển máy mài và nhãn đá mài. Không xem hao mòn hay hư hỏng thực tế.',
  'evidence.doc.diameterFit': 'Đường kính tối đa cho phép in trên biển máy mài',
  'evidence.limit.diameterFit':
    'Chỉ đối chiếu giá trị trên biển máy, không đo kích thước từ ảnh.',
  'evidence.doc.purpose': 'Kiểm tra nhãn ghi công dụng — chỉ cảnh báo',
  'evidence.limit.purpose':
    'Không ảnh hưởng đến kết quả. Việc khớp với công việc hôm nay do "Đúng với công việc" quyết định.',
  'evidence.doc.workPurpose':
    'Điều 122 khoản 5, Quy định về tiêu chuẩn an toàn vệ sinh lao động — không dùng đá mài sai công dụng theo hướng cạnh bên',
  'evidence.limit.workPurpose':
    'Chỉ đối chiếu công việc người vận hành đã chọn với công dụng ghi trên nhãn.',
  'evidence.doc.wheelType':
    'Thiết kế của ứng dụng — quy tắc tốc độ/đường kính giả định là đá mài kết dính thông thường',
  'evidence.limit.wheelType':
    '"Không xác định" không có nghĩa là nguy hiểm, mà là ứng dụng này không thể đánh giá loại đá mài này.',
  'evidence.doc.visibleDamage':
    'Chỉ xác nhận hư hỏng thấy được trong ảnh — chỉ cảnh báo',
  'evidence.limit.visibleDamage':
    'Vết nứt nhỏ không thấy được trong ảnh. Không thấy hư hỏng không có nghĩa là hiển thị "không hư hỏng". Cách kiểm tra chuẩn là gõ nghe âm thanh.',
  'evidence.doc.unitConsistency':
    'Kiểm tra bằng tính toán — hai cách ghi trên nhãn có khớp nhau không',
  'evidence.limit.unitConsistency':
    'Không phải tiêu chuẩn an toàn. Đây là sai số cho phép (10%) để lọc lỗi đọc nhãn.',
  'evidence.doc.mountingSpec':
    'Hướng dẫn của nhà sản xuất — chiến dịch an toàn máy mài Bosch Korea',
  'evidence.limit.mountingSpec':
    'Biển máy mài không ghi quy cách trục nên không có gì để đối chiếu. Chỉ hiển thị để tham khảo, không dùng để ra kết quả.',
  'evidence.doc.peripheralSpeed': 'Kiểm tra phạm vi hợp lý — 15–110 m/s',
  'evidence.limit.peripheralSpeed':
    'Không phải giới hạn an toàn. Đây là kiểm tra tính toán để lọc giá trị đọc sai chữ số.',
  'evidence.doc.expiry':
    'oSa "Product marking requirements for bonded abrasives" (2020-04, dựa trên EN 12413:2019)',
  'evidence.limit.expiry':
    'Pháp luật Hàn Quốc không có điều khoản về hạn sử dụng. Chỉ so sánh ngày ghi trên nhãn, không tính từ ngày sản xuất. Coi hạn còn đến ngày cuối tháng ghi trên nhãn là cách hiểu riêng của ứng dụng này.',
  'evidence.doc.confidence':
    'Thiết kế của ứng dụng — độ tin cậy thấp không bao giờ tự động đạt',
  'evidence.limit.confidence':
    'Cách duy nhất để giải quyết độ tin cậy thấp là để người vận hành trực tiếp xác nhận.',

  'ruleVersion.label': 'Phiên bản bộ quy tắc',
  'ruleVersion.note':
    'Nguồn và phạm vi áp dụng của các quy tắc dùng cho kết quả này. Đây không phải chứng nhận pháp lý hay bảo đảm tuân thủ quy định.',
  'ruleVersion.missing': 'Chưa ghi (kiểm tra trước khi có tính năng này)',
  'trialRun.title': 'Chạy thử',
  'trialRun.legalBasis':
    'Điều 122 khoản 2 Quy định về tiêu chuẩn an toàn vệ sinh lao động Hàn Quốc yêu cầu chạy thử ít nhất 1 phút trước khi bắt đầu làm việc và ít nhất 3 phút sau khi thay đá mài, đồng thời kiểm tra máy có bất thường không. Ứng dụng chỉ bấm giờ và ghi lại câu trả lời, không thay thế thủ tục đó.',
  'trialRun.standClear':
    'Khi chạy thử, hãy đứng tránh mặt đá mài và hướng quay của nó.',
  'trialRun.separateFromTarget':
    'Thời gian chạy thử được tính riêng, không nằm trong mục tiêu kiểm tra trước 30 giây. Không được rút ngắn thời gian bắt buộc theo luật vì mục tiêu này.',
  'trialRun.replacedQuestion': 'Bạn vừa thay đá mài phải không?',
  'trialRun.startReplaced': 'Có — bắt đầu chạy thử {seconds} giây',
  'trialRun.startBeforeWork': 'Không — bắt đầu chạy thử {seconds} giây',
  'trialRun.modeReplaced': 'Chạy thử sau khi thay đá mài',
  'trialRun.modeBeforeWork': 'Chạy thử trước khi bắt đầu làm việc',
  'trialRun.running': 'Đang chạy tối thiểu {seconds} giây. Còn lại',
  'trialRun.elapsed':
    'Đã đủ thời gian yêu cầu. Hãy báo bất thường ở phía dưới.',
  'trialRun.waitNotice': 'Bạn chỉ trả lời được sau khi đủ thời gian yêu cầu.',
  'trialRun.findingsTitle': 'Có gì bất thường khi chạy thử không?',
  'trialRun.findingsHint':
    'Hãy chọn tất cả mục phù hợp. Nếu chọn bất kỳ mục nào, bạn chỉ có thể tiếp tục với Có vấn đề.',
  'trialRun.finding.vibration': 'Rung bất thường',
  'trialRun.finding.noise': 'Tiếng ồn bất thường',
  'trialRun.finding.wobble': 'Đá mài bị đảo',
  'trialRun.finding.wheelDamage': 'Dấu hiệu đá mài nứt vỡ hoặc bị lỏng',
  'trialRun.finding.equipment': 'Máy có dấu hiệu bất thường',
  'trialRun.confirmNormal': 'Xác nhận không có bất thường',
  'trialRun.reportAbnormal': 'Có vấn đề',
  'trialRun.stopTitle': 'Không được bắt đầu làm việc',
  'trialRun.stopBody':
    'Đã phát hiện bất thường khi chạy thử. Hãy dừng máy, ngắt nguồn điện, rồi kiểm tra cách lắp đá mài và tình trạng máy.',
  'trialRun.required':
    'Đã đối chiếu xong thông số. Bạn có thể lưu sau khi chạy thử.',

  'grinderCondition.title': 'Tự kiểm tra tình trạng máy mài',
  'grinderCondition.note':
    'Trước khi lắp đá mài, hãy nhìn toàn bộ máy mài và trả lời năm mục sau.',
  'grinderCondition.aiBoundary':
    'AI chỉ đọc thông số ghi trên nhãn máy. Tình trạng máy mài và an toàn lao động phải do người lao động tự kiểm tra.',
  'grinderCondition.cordAndPlug': 'Dây điện và phích cắm có nguyên vẹn không?',
  'grinderCondition.cordAndPlugHint':
    'Lần tay dọc toàn bộ dây — tróc vỏ, chỗ bị đè bẹp, phích cắm nứt vỡ',
  'grinderCondition.body': 'Thân máy có bị nứt hay hư hỏng nặng không?',
  'grinderCondition.bodyHint': 'Vết rơi va đập, vỏ máy nứt, bộ phận bị lỏng ra',
  'grinderCondition.guard': 'Chụp bảo vệ đã lắp và siết chặt chưa?',
  'grinderCondition.guardHint':
    'Xoay bằng tay không được xê dịch, và phải che đá mài đúng góc quy định',
  'grinderCondition.auxiliaryHandle': 'Tay cầm phụ đã lắp và siết chặt chưa?',
  'grinderCondition.auxiliaryHandleHint':
    'Phải cầm được bằng hai tay để chống giật ngược. Nếu lung lay, hãy chọn Có vấn đề',
  'grinderCondition.spindle':
    'Trục, mặt bích và đai ốc hãm có hư hỏng rõ rệt không?',
  'grinderCondition.spindleHint':
    'Ren bị trờn, mặt bích cong vênh hoặc dính bẩn, đai ốc mòn',
  'grinderCondition.confirmed': 'Đã kiểm tra',
  'grinderCondition.issue': 'Có vấn đề',
  'grinderCondition.incomplete':
    'Bạn phải tự kiểm tra {count} mục còn lại trước khi chuyển sang chụp đá mài.',
  'grinderCondition.stopTitle': 'Không được sử dụng máy mài này',
  'grinderCondition.stopBody':
    'Đã phát hiện vấn đề về tình trạng thiết bị. Không sử dụng. Hãy cho kiểm tra, sửa chữa rồi kiểm tra lại.',

  'wheelCondition.title': 'Tự kiểm tra tình trạng đá mài',
  'wheelCondition.note':
    'Trước khi lắp, hãy tự kiểm tra hai mặt, cạnh và vùng lắp của đá mài thật.',
  'wheelCondition.aiBoundary':
    'AI chỉ có thể cảnh báo hư hỏng nhìn thấy đáng ngờ; AI không xác nhận đá mài không hư hỏng hoặc công việc an toàn.',
  'wheelCondition.aiDamageWarning':
    'AI nghi ngờ có dấu hiệu hư hỏng nhìn thấy trong ảnh. Hãy tự kiểm tra kỹ đá mài.',
  'wheelCondition.labelWarning':
    'AI không đọc đủ thông tin trên nhãn. Hãy kiểm tra nhãn thật và sửa các giá trị bên trên.',
  'wheelCondition.expiryWarning':
    'AI không đọc được hạn sử dụng. Hãy tự kiểm tra tháng/năm in trên nhãn.',
  'wheelCondition.damageFree':
    'Đá mài không bị vỡ, nứt, rạn nhỏ hoặc sứt cạnh?',
  'wheelCondition.damageFreeHint':
    'Không chỉ dựa vào ảnh; xoay và kiểm tra toàn bộ đá mài ở nơi đủ sáng',
  'wheelCondition.notDeformed': 'Đá mài không bị cong vênh hoặc biến dạng?',
  'wheelCondition.notDeformedHint':
    'Chọn Có vấn đề nếu đá không phẳng, bị xoắn hoặc phồng',
  'wheelCondition.mountingAreaUndamaged':
    'Lỗ tâm và vùng lắp không có hư hỏng nhìn thấy?',
  'wheelCondition.mountingAreaUndamagedHint':
    'Kiểm tra cả hai mặt quanh lỗ tâm xem có sứt, mòn hoặc biến dạng không',
  'wheelCondition.labelLegible': 'Có thể nhận biết nhãn và các thông số chính?',
  'wheelCondition.labelLegibleHint':
    'Xác nhận có thể đọc RPM, đường kính, công dụng và các dấu cần đối chiếu',
  'wheelCondition.expiryValid': 'Hạn sử dụng in trên nhãn vẫn còn hiệu lực?',
  'wheelCondition.expiryValidHint':
    'Đọc trực tiếp tháng/năm trên nhãn; không ước tính từ ngày sản xuất',
  'wheelCondition.confirmed': 'Đã xác nhận',
  'wheelCondition.issue': 'Có vấn đề',
  'wheelCondition.incomplete':
    'Bạn phải tự kiểm tra {count} mục còn lại trước khi đối chiếu thông số.',
  'wheelCondition.stopTitle': 'KHÔNG ĐƯỢC SỬ DỤNG ĐÁ MÀI NÀY',
  'wheelCondition.stopBody':
    'Đã phát hiện vấn đề với đá mài. Không được lắp. Hãy thay bằng đá mài khác còn dùng được và kiểm tra lại.',

  'exam.title': 'Kiểm tra bề ngoài nhiều góc',
  'exam.boundary':
    'AI chỉ tìm những dấu hiệu bất thường nhìn thấy được trong ảnh. AI không xác nhận là không có hư hỏng, cũng không xác nhận là an toàn để sử dụng.',
  'exam.microCrack':
    'Vết nứt nhỏ và nứt bên trong không thể kiểm tra bằng ảnh. Hãy gõ nhẹ và nghe âm thanh trước khi lắp.',
  'exam.frontReused': 'Mặt trước dùng lại ảnh nhãn bạn vừa chụp.',
  'exam.view.front': 'Mặt trước (nhãn)',
  'exam.view.back': 'Toàn bộ mặt sau',
  'exam.view.backHint': 'Chụp sao cho toàn bộ mặt sau nằm gọn trong một ảnh.',
  'exam.view.edge': 'Cạnh ngoài',
  'exam.view.edgeHint':
    'Chụp vành ngoài từ bên hông. Đây là nơi dễ thấy mẻ và vỡ.',
  'exam.view.bore': 'Lỗ tâm và phần lắp',
  'exam.view.boreHint':
    'Chụp cận cảnh lỗ tâm và vùng quanh nó — phần tiếp xúc với trục.',
  'exam.capture': 'Chụp ảnh',
  'exam.gallery': 'Thư viện',
  'exam.retakeView': 'Chụp lại {view}',
  'exam.photoReady': 'Đã có ảnh',
  'exam.photoMissing': 'Chưa có',
  'exam.analyze': 'Kiểm tra bằng 4 ảnh',
  'exam.analyzing': 'Đang kiểm tra ảnh...',
  'exam.missing':
    'Cần đủ ảnh mặt sau, cạnh ngoài và lỗ tâm thì mới kiểm tra được.',
  'exam.status.suspected':
    'Ảnh cho thấy dấu hiệu bất thường. Hãy kiểm tra trực tiếp đá mài thật.',
  'exam.status.notObserved':
    'Không tìm thấy bất thường rõ ràng. Hãy tự kiểm tra mặt trước, mặt sau, cạnh ngoài và lỗ tâm của đá mài thật.',
  'exam.status.unassessable':
    'Không thể đánh giá bằng những ảnh này. Hãy chụp lại theo hướng dẫn bên dưới hoặc kiểm tra trực tiếp.',
  'exam.findingConfidence': 'Mức độ chắc chắn của AI: {confidence}',
  'exam.finding.crack': 'Nghi ngờ có vết nứt',
  'exam.finding.chip': 'Nghi ngờ bị mẻ hoặc bong mảnh',
  'exam.finding.edgeBreak': 'Nghi ngờ vỡ cạnh ngoài',
  'exam.finding.boreDamage': 'Nghi ngờ hỏng lỗ tâm hoặc phần lắp',
  'exam.finding.deformation': 'Nghi ngờ cong vênh, biến dạng',
  'exam.finding.contamination': 'Nghi ngờ bám bẩn hoặc dị vật',
  'exam.finding.other': 'Nghi ngờ bất thường khác',
  'exam.quality.blur': 'bị mờ',
  'exam.quality.glare': 'bị lóa',
  'exam.quality.darkness': 'quá tối',
  'exam.quality.incompleteView': 'chưa lấy đủ phần cần xem',
  'exam.retakeRequired':
    'Có ảnh không đọc được. Hãy chụp lại những ảnh liệt kê bên dưới.',
  'exam.acknowledge': 'Tôi đã kiểm tra vị trí được chỉ ra trên đá mài thật.',
  'exam.blocked': 'Xác nhận dấu hiệu được báo rồi mới đi tiếp được.',
  'exam.failed': 'AI không kiểm tra được ảnh.',
  'exam.failedFallback':
    'Tiếp tục mà không có kiểm tra của AI. Hãy tự kiểm tra mặt trước, mặt sau, cạnh ngoài và lỗ tâm của đá mài.',
  'exam.block.photosMissing':
    'Hãy thêm ảnh mặt sau, cạnh ngoài, lỗ tâm và chạy kiểm tra rồi mới đi tiếp.',
  'exam.block.notAnalyzed':
    'Hãy chạy kiểm tra trên những ảnh đã thêm rồi mới đi tiếp.',
  'exam.block.retakeRequired':
    'Hãy chụp lại những ảnh không đọc được rồi mới đi tiếp.',
  'exam.block.needsAcknowledge':
    'Hãy đánh dấu là đã kiểm tra dấu hiệu được báo trên đá mài thật rồi mới đi tiếp.',

  'exam.block.needsManualContinue':
    'Hãy đánh dấu là bạn tiếp tục bằng cách tự kiểm tra, không có phần kiểm tra của AI, rồi mới đi tiếp.',
  'exam.progress': 'Ảnh bổ sung đã có: {done} / {total}',
  'exam.captureView': 'Chụp ảnh {view}',
  'exam.galleryView': 'Chọn ảnh {view} từ thư viện',
  'exam.replaceNote':
    'Khi thay ảnh, kết quả kiểm tra từ ảnh đó và phần bạn đã đánh dấu sẽ bị xóa. Bạn phải kiểm tra lại.',
  'exam.manualContinue':
    'Tiếp tục bằng cách tự kiểm tra, không có phần kiểm tra của AI.',
  'exam.manualContinueHint':
    'Hãy tự nhìn mặt trước, mặt sau, mép và lỗ tâm của đá mài. AI không xác nhận điều gì cả.',
  'exam.notRun.networkError':
    'AI không xem được ảnh — không kết nối được tới máy chủ.',
  'exam.notRun.apiError': 'AI không xem được ảnh — máy chủ trả về lỗi.',
  'exam.notRun.offline': 'AI không xem được ảnh — thiết bị đang ngoại tuyến.',
  'exam.notRun.userManualContinue':
    'AI không xem được ảnh. Nguyên nhân không được ghi lại.',
  'exam.evidence.title': 'Bản ghi kiểm tra bề ngoài nhiều góc',
  'exam.evidence.suspected':
    'Nghi ngờ có dấu hiệu bất thường — hãy tự kiểm tra đá mài thật',
  'exam.evidence.notObserved':
    'Không phát hiện dấu hiệu rõ ràng — vẫn phải tự kiểm tra',
  'exam.evidence.unassessable': 'Ảnh không đủ để kết luận — hãy tự kiểm tra',
  'exam.evidence.notRun':
    'Chưa chạy kiểm tra bằng AI — đã tiếp tục bằng cách người thợ tự kiểm tra',
  'exam.evidence.notRunAt': 'Thời điểm xác nhận tự kiểm tra: {time}',
  'exam.evidence.notCounted':
    'Đây là những gì AI nhìn thấy trong ảnh. Nó không được tính vào các mục mà người thợ tự xác nhận.',
  'exam.evidence.noFindings': 'Không ghi lại vị trí của dấu hiệu.',
  'exam.evidence.unreadablePhotos': 'Ảnh không đọc được',
  'exam.evidence.acknowledged':
    'Người thợ đã xác nhận các vị trí được báo trên đá mài thật.',
  'exam.evidence.photosMissing': 'Bản ghi này không lưu ảnh nhiều góc.',
  'exam.evidence.meta': 'Kiểm tra {time} · mô hình {model} · chỉ dẫn {version}',
  'photo.zoomOpen': 'Xem to {label}',
  'photo.zoomClose': 'Đóng ảnh phóng to',

  'exam.block.captureReview':
    'Với ảnh có cảnh báo chất lượng, hãy chụp lại hoặc chọn vẫn dùng rồi mới kiểm tra được.',
  'captureCheck.title': 'Kiểm tra chất lượng ảnh',
  'captureCheck.titleFor': 'Kiểm tra chất lượng ảnh: {subject}',
  'captureCheck.warning.lowResolution': 'Độ phân giải của ảnh thấp.',
  'captureCheck.warning.blur': 'Ảnh có vẻ bị mờ.',
  'captureCheck.warning.tooDark': 'Ảnh quá tối.',
  'captureCheck.warning.overexposed': 'Ảnh quá sáng hoặc bị lóa mạnh.',
  'captureCheck.hint.lowResolution':
    'Đừng dùng ảnh chụp màn hình hay ảnh phóng to; hãy lại gần và chụp lại bằng máy ảnh.',
  'captureCheck.hint.blur': 'Giữ yên điện thoại và chụp khi chữ đã rõ nét.',
  'captureCheck.hint.tooDark':
    'Hãy chuyển sang chỗ sáng hơn hoặc chiếu đèn rồi chụp.',
  'captureCheck.hint.overexposed':
    'Chụp hơi nghiêng hoặc đổi vị trí để tránh ánh sáng phản chiếu.',
  'captureCheck.provisional':
    'Cảnh báo này dùng ngưỡng chưa được kiểm chứng, chỉ để tham khảo. Bạn có thể chụp lại hoặc dùng luôn.',
  'captureCheck.boundary':
    'Chỉ xem ảnh có dễ đọc hay không. Không đánh giá tình trạng của nhãn máy, đá mài hay mức độ an toàn khi sử dụng.',
  'captureCheck.decodeBlocked':
    'Không thể tiếp tục với ảnh không mở được. Hãy chụp lại hoặc chọn ảnh khác.',
  'captureCheck.retake': 'Chụp lại',
  'captureCheck.useAnyway': 'Vẫn dùng ảnh này',
  'captureCheck.useAnywayFor': 'Vẫn dùng ảnh {subject}',
  'captureCheck.usedAnyway': 'Bạn đã xem cảnh báo và chọn dùng ảnh này.',

  'wheelType.bonded_abrasive': 'Đá mài liên kết thông thường',
  'wheelType.flap_disc': 'Đĩa nhám xếp',
  'wheelType.cup_wheel': 'Đá mài dạng chén',
  'wheelType.diamond': 'Lưỡi kim cương',
  'wheelType.wire_brush': 'Chổi cước sắt',
  'wheelType.other': 'Loại khác',
  'wheelType.unknown': 'Không rõ',
  'wheelTypeConfirm.label': 'Loại đá mài',
  'wheelTypeConfirm.hint':
    'Chọn theo hình dạng của đá, không theo chữ trên nhãn. Hãy nhìn đá thật.',
  'wheelTypeConfirm.aiSuggestion':
    'AI gợi ý: {type} — đây chỉ là giá trị gợi ý ban đầu từ ảnh.',
  'wheelTypeConfirm.supported':
    'Ứng dụng chỉ đối chiếu thông số khi bạn tự xác nhận đây là đá mài liên kết thông thường.',
  'wheelTypeConfirm.unknown':
    'Nếu chưa xác nhận loại đá, kết quả đối chiếu thông số sẽ là KHÔNG THỂ XÁC ĐỊNH. Hãy nhìn đá thật rồi chọn.',
  'wheelTypeConfirm.unsupported':
    'Ứng dụng không đánh giá loại đá này. Kết quả đối chiếu thông số sẽ là KHÔNG THỂ XÁC ĐỊNH. Hãy làm theo hướng dẫn của nhà sản xuất.',
  'wheelTypeConfirm.differs':
    'Gợi ý của AI ({ai}) khác với loại bạn chọn ({selected}). Hãy kiểm tra lại đá thật và đánh dấu ô xác nhận trực tiếp bên dưới để tiếp tục.',
  'wheelTypeConfirm.needsConfirm':
    'Loại đá khác với gợi ý của AI. Cần đánh dấu ô xác nhận trực tiếp để tiếp tục.',

  'action.title': 'KHÔNG ĐƯỢC SỬ DỤNG',
  'action.rpmSafety':
    'Không lắp đá mài này. Hãy thay bằng đá mài chịu được tốc độ bằng hoặc cao hơn tốc độ của máy.',
  'action.diameterFit':
    'Không lắp đá mài này. Hãy thay bằng đá mài có đường kính không vượt quá mức máy cho phép.',
  'action.workPurpose':
    'Hãy thay bằng đá mài đúng với công việc hôm nay. Đá mài sai công dụng rất dễ vỡ.',
  'action.expiry':
    'Không lắp đá mài này. Hạn sử dụng ghi trên nhãn đã hết. Hãy thay bằng đá mài còn hạn.',
  'action.generic':
    'Không lắp đá mài này. Hãy thay bằng đá mài đáp ứng đủ điều kiện.',

  'checklist.title': 'Danh mục kiểm tra an toàn',
  'checklist.note':
    'Những mục này bạn phải tự kiểm tra. Việc đối chiếu thông số không bao gồm chúng.',
  'checklist.ppe': 'Đã mang đồ bảo hộ',
  'checklist.ppeHint': 'Kiểm tra kính bảo hộ, găng tay và tấm che mặt',
  'checklist.workpiece': 'Vật gia công đã được cố định',
  'checklist.workpieceHint':
    'Kẹp chặt bằng ê tô hoặc kẹp. Không giữ bằng tay hay chân',
  'checklist.surroundings': 'Người và vật dễ cháy xung quanh',
  'checklist.surroundingsHint':
    'Kiểm tra không có người và vật dễ cháy trong tầm tia lửa bắn tới',
  'checklist.preWork':
    'Ngay trước khi làm, hãy kiểm tra tia lửa không hướng về phía người hoặc vật dễ cháy.',
  'checklist.incomplete':
    'Bạn phải xác nhận đủ {count} mục an toàn thì mới lưu được.',

  'scan.retake': 'Chụp lại',
  'scan.retryAnalysis': 'Phân tích lại ảnh này',
  'scan.confirmTitle': 'Kiểm tra các giá trị đã đọc',
  'scan.grinder.title': 'Chụp nhãn máy mài',
  'scan.grinder.guide': 'Đặt nhãn máy vào trong khung',
  'scan.grinder.analyzing': 'Đang phân tích nhãn máy...',
  'scan.grinder.failed': 'Không phân tích được nhãn máy.',
  'scan.grinder.proceed': 'Xác nhận và chụp đá mài',
  'scan.wheel.title': 'Chụp nhãn đá mài',
  'scan.wheel.guide': 'Đặt nhãn vào trong khung',
  'scan.wheel.analyzing': 'Đang phân tích nhãn...',
  'scan.wheel.failed': 'Không phân tích được nhãn đá mài.',
  'scan.wheel.proceed': 'Xác nhận và đối chiếu thông số',
  'scan.wheel.grinderFirst': 'Cần kiểm tra tình trạng máy mài trước.',

  'camera.starting': 'Đang mở camera...',
  'camera.pickFromGallery': 'Chọn từ thư viện',
  'camera.pickPhoto': 'Chọn ảnh từ thư viện',
  'camera.retry': 'Thử mở camera lại',
  'camera.gallery': 'Thư viện',
  'camera.shutter': 'Chụp',
  'camera.error.unsupported':
    'Trình duyệt này không hỗ trợ camera. Hãy kiểm tra trang có được mở bằng HTTPS không.',
  'camera.error.permission':
    'Quyền dùng camera đã bị từ chối. Hãy cho phép camera trong cài đặt trình duyệt rồi thử lại.',
  'camera.error.notFound': 'Không tìm thấy camera dùng được.',
  'camera.error.inUse':
    'Một ứng dụng khác đang dùng camera. Hãy đóng ứng dụng đó rồi thử lại.',
  'camera.error.failed': 'Không mở được camera.',
  'camera.error.failedNamed': 'Không mở được camera. ({name})',

  'error.imageDecode':
    'Không đọc được định dạng ảnh này. Hãy chọn lại ảnh JPG hoặc PNG. (Ảnh HEIC của iPhone có thể không được hỗ trợ)',
  'error.network':
    'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi phân tích lại ảnh này.',
  'error.serverConfig':
    'Không phân tích được nhãn do lỗi cài đặt máy chủ. Hãy báo cho người quản lý.',
  'error.badRequest': 'Yêu cầu phân tích không hợp lệ. Hãy chụp lại.',
  'error.imageTooLarge':
    'Ảnh quá lớn. Hãy thử lại với ảnh có độ phân giải thấp hơn.',
  'error.rateLimited': 'Có quá nhiều yêu cầu. Hãy chờ một lát rồi thử lại.',
  'error.upstream':
    'Dịch vụ phân tích không xử lý được yêu cầu. Hãy chờ một lát rồi thử lại. (lỗi {status})',

  'field.model': 'Mã máy',
  'field.noLoadRPM': 'Tốc độ không tải',
  'field.maxWheelDiameter': 'Đường kính đá mài tối đa cho phép',
  'field.maxRPM': 'Tốc độ làm việc tối đa',
  'field.diameter': 'Đường kính',
  'field.thickness': 'Độ dày',
  'field.purpose': 'Công dụng',
  'field.expiry': 'Hạn sử dụng',
  'field.wheelType': 'Loại đá mài',
  'field.placeholder': 'Không đọc được — hãy tự nhập',
  'field.purposeUnknown': 'Không rõ',
  'field.confidence.high': 'Độ tin cậy khi đọc: cao',
  'field.confidence.medium':
    'Độ tin cậy khi đọc: trung bình — hãy kiểm tra các giá trị',
  'field.confidence.low':
    'Độ tin cậy khi đọc: thấp — hãy chụp lại hoặc tự nhập giá trị',
  'field.rawShow': 'Xem văn bản đã đọc',
  'field.rawHide': 'Ẩn văn bản đã đọc',
  'manualConfirm.label': 'Tôi đã tự xem nhãn và xác nhận các giá trị ở trên',
  'manualConfirm.hint':
    'Khi đánh dấu, kết quả dùng giá trị bạn đã xác nhận thay cho độ tin cậy khi đọc.',

  'guide.grinder.model.hint':
    'Tên sản phẩm của máy mài. Chỉ được ghi lại, không dùng để xác định kết quả.',
  'guide.grinder.model.where':
    'In to ở phía trên cùng của nhãn máy. Ví dụ: GWS 750-125',
  'guide.grinder.noLoadRPM.hint':
    'Tốc độ quay của máy mài này. Đá mài phải chịu được tốc độ này.',
  'guide.grinder.noLoadRPM.where':
    'Con số cạnh n₀ hoặc "no load speed" trên nhãn máy. Ví dụ: 11000 r/min, 11000 min⁻¹',
  'guide.grinder.maxWheelDiameter.hint':
    'Đá mài lớn nhất máy này lắp được. Đá lớn hơn không vừa trong chụp bảo vệ.',
  'guide.grinder.maxWheelDiameter.where':
    'Đường kính cạnh các chữ như wheel, disc trên nhãn máy. Ví dụ: max Ø125mm',
  'guide.wheel.maxRPM.hint':
    'Tốc độ cao nhất đá mài này chịu được. Nếu thấp hơn tốc độ của máy, đá có thể vỡ và văng ra.',
  'guide.wheel.maxRPM.where':
    'Tốc độ in to trên nhãn. Nếu chỉ ghi m/s, ứng dụng tự quy đổi. Ví dụ: 12200 r/min, 80 m/s',
  'guide.wheel.diameter.hint':
    'Đường kính ngoài của đá mài. Không được vượt quá mức máy mài cho phép.',
  'guide.wheel.diameter.where':
    'Con số đầu tiên của kích thước. Ví dụ: 125 trong 125 × 1.6 × 22.23',
  'guide.wheel.thickness.hint':
    'Độ dày của đá mài. Đá mài dùng để cắt mỏng (1–3mm), đá mài dùng để mài dày (khoảng 6mm).',
  'guide.wheel.thickness.where':
    'Con số ở giữa của kích thước. Ví dụ: 1.6 trong 125 × 1.6 × 22.23',
  'guide.wheel.purpose.hint':
    'Đá dùng để cắt thì để cắt, đá dùng để mài thì để mài. Dùng sai công dụng, đá chịu lực ngang và có thể vỡ.',
  'guide.wheel.purpose.where':
    'Dấu công dụng cắt/mài trên nhãn, in là CUT-OFF, GRINDING hoặc DEPRESSED CENTER.',
  'guide.wheel.expiry.hint':
    'Hạn sử dụng in trên nhãn. Nhà sản xuất khuyên không dùng đá mài đã quá hạn. Có loại đá không ghi hạn.',
  'guide.wheel.expiry.where':
    'Dập theo tháng/năm trên vòng kim loại ở giữa. Ví dụ: 04/2023, đôi khi có V hoặc EXP phía trước. Không nhập ngày sản xuất thay vào.',

  'requirement.compactTitle': 'Đá mài cần dùng',
  'requirement.compactUnknown':
    'Không đọc được nhãn máy nên không đặt được điều kiện',
  'requirement.title': 'Điều kiện của đá mài',
  'requirement.partial':
    'Chưa đặt được đủ điều kiện. Hãy tự kiểm tra các giá trị còn thiếu trên nhãn máy.',
  'requirement.notRecommendation':
    'Đây không phải gợi ý sản phẩm, mà là điều kiện suy ra từ các giá trị ghi trên nhãn máy.',
  'requirement.purposeUnknown':
    'Chưa chọn công việc nên chưa xác định được công dụng.',
  'requirement.diameterMax': 'Φ{diameter}mm trở xuống',
  'requirement.diameterUnknown':
    'Không đọc được đường kính tối đa cho phép trên nhãn máy.',
  'requirement.rpmMin': '{rpm}rpm trở lên',
  'requirement.rpmUnknown': 'Không đọc được tốc độ không tải trên nhãn máy.',
  'summary.sizeClass': 'Loại {inch} inch (tối đa Φ{diameter}mm)',
  'summary.maxDiameter': 'tối đa Φ{diameter}mm',
  'summary.unreadable': 'Không đọc được giá trị trên nhãn máy',
  'margin.surplus': 'Dư +{percent}%',
  'margin.shortfall': 'Thiếu {percent}%',
  'margin.none': 'Không còn dư (0%)',

  'wheelPurpose.cutting': 'Dùng để cắt',
  'wheelPurpose.grinding': 'Dùng để mài',
  'wheelPurpose.unknown': 'Chưa xác định',
  'wheelType.unconfirmed': 'Chưa xác nhận',
  'confidence.high': 'Cao',
  'confidence.medium': 'Trung bình',
  'confidence.low': 'Thấp',
  'value.bore': 'Lỗ lắp Φ{bore}mm',
  'value.unitConsistency': '{rpm}rpm = {computed}m/s / nhãn {labeled}m/s',

  'reason.requiredValues.ok': 'Đã đọc đủ các giá trị cần để so sánh tốc độ.',
  'reason.requiredValues.missingGrinder':
    'Không đọc được tốc độ không tải của máy mài. Hãy chụp lại hoặc tự nhập giá trị.',
  'reason.requiredValues.missingWheel':
    'Không đọc được tốc độ làm việc tối đa của đá mài. Hãy chụp lại hoặc tự nhập giá trị.',
  'reason.requiredValues.missingBoth':
    'Không đọc được tốc độ không tải của máy mài và tốc độ làm việc tối đa của đá mài. Hãy chụp lại hoặc tự nhập giá trị.',
  'reason.rpmSafety.missing': 'Thiếu giá trị tốc độ nên không so sánh được.',
  'reason.rpmSafety.fail':
    'Tốc độ làm việc tối đa của đá mài ({wheel}rpm) thấp hơn tốc độ không tải của máy mài ({grinder}rpm). Đá có nguy cơ vỡ và văng ra.',
  'reason.rpmSafety.pass':
    'Tốc độ làm việc tối đa của đá mài ({wheel}rpm) bằng hoặc cao hơn tốc độ không tải của máy mài ({grinder}rpm).',
  'reason.diameterFit.missing':
    'Thiếu giá trị đường kính nên không so sánh được. Hãy tự kiểm tra đường kính trên nhãn máy mài và nhãn đá mài.',
  'reason.diameterFit.fail':
    'Đường kính đá mài ({wheel}mm) vượt quá đường kính tối đa máy mài cho phép ({grinder}mm).',
  'reason.diameterFit.pass':
    'Đường kính đá mài ({wheel}mm) nằm trong đường kính tối đa máy mài cho phép ({grinder}mm).',
  'reason.purpose.unknown':
    'Không nhận ra công dụng của đá mài (cắt/mài). Hãy tự kiểm tra nhãn.',
  'reason.purpose.recognized': 'Đã nhận ra công dụng của đá mài: {purpose}.',
  'reason.workPurpose.unknown':
    'Công việc hôm nay: {work}. Không đọc được công dụng của đá mài. Hãy tự kiểm tra dấu công dụng trên nhãn.',
  'reason.workPurpose.mismatch':
    'Công việc hôm nay: {work}. Đá mài này: {purpose}. Đá mài sai công dụng có thể vỡ do chịu lực ngang.',
  'reason.workPurpose.match':
    'Công việc hôm nay ({work}) đúng với công dụng của đá mài.',
  'reason.wheelType.unknown':
    'Chưa xác nhận loại đá mài. Ứng dụng chỉ đối chiếu thông số khi đã xác nhận là đá mài liên kết thông thường. Hãy nhìn đá thật và chọn loại ở màn hình kiểm tra giá trị.',
  'reason.wheelType.unsupported':
    '{type}: ứng dụng không xử lý loại đá này. Hệ thông số khác nên không thể xác định. Hãy làm theo hướng dẫn của nhà sản xuất.',
  'reason.wheelType.supported':
    'Đã xác nhận là đá mài liên kết thông thường, loại mà ứng dụng này đối chiếu thông số.',
  'reason.visibleDamage.suspected':
    'Trong ảnh có chỗ trông như vỡ hoặc nứt. Không dùng đá mài này; hãy tự kiểm tra.',
  'reason.visibleDamage.notVerifiable':
    'Ảnh không cho thấy được vết nứt nhỏ. Trước khi lắp, hãy gõ thử (gõ nhẹ và nghe tiếng).',
  'reason.confidence.low':
    'Độ tin cậy khi đọc nhãn thấp. Hãy chụp lại hoặc tự nhập giá trị.',
  'reason.confidence.ok': 'Độ tin cậy khi đọc nhãn đủ cao.',
  'reason.unitConsistency.mismatch':
    'Tốc độ ghi bằng rpm và tốc độ vòng ngoài ghi bằng m/s trên nhãn không khớp nhau. Có thể đã đọc sai một trong hai. Hãy kiểm tra lại các con số trên nhãn.',
  'reason.unitConsistency.match': 'Hai cách ghi tốc độ trên nhãn khớp nhau.',
  'reason.mountingSpec.missing':
    'Không đọc được đường kính lỗ lắp trên nhãn. Trước khi lắp, hãy tự kiểm tra đá có vừa trục không.',
  'reason.mountingSpec.shown':
    'Đường kính lỗ lắp ghi trên nhãn là Φ{bore}mm. Nhãn máy mài không ghi kích thước trục nên ứng dụng không so sánh được. Hãy tự kiểm tra đá có vừa trục không.',
  'reason.peripheralSpeed.oddGrinder':
    'Tốc độ vòng ngoài tính từ giá trị của máy mài nằm ngoài phạm vi thông thường. Có thể đã đọc sai đường kính hoặc tốc độ. Hãy kiểm tra lại các con số của máy mài.',
  'reason.peripheralSpeed.oddWheel':
    'Tốc độ vòng ngoài tính từ giá trị của đá mài nằm ngoài phạm vi thông thường. Có thể đã đọc sai đường kính hoặc tốc độ. Hãy kiểm tra lại các con số trên nhãn đá mài.',
  'reason.peripheralSpeed.oddBoth':
    'Tốc độ vòng ngoài tính từ giá trị của máy mài và đá mài nằm ngoài phạm vi thông thường. Có thể đã đọc sai đường kính hoặc tốc độ. Hãy kiểm tra lại các con số của máy mài và đá mài.',
  'reason.peripheralSpeed.ok': 'Đường kính và tốc độ phù hợp với nhau.',
  'reason.expiry.noToday':
    'Không có ngày tham chiếu nên không kiểm tra được hạn sử dụng. Hãy mở lại ứng dụng và kiểm tra lại.',
  'reason.expiry.unreadable':
    'Không đọc được hạn sử dụng trên nhãn. Ngày tham chiếu {today}. Hãy tự kiểm tra dấu tháng/năm trên vòng kim loại (ví dụ: 04/2023). Có loại đá không ghi hạn.',
  'reason.expiry.expired':
    'Hạn sử dụng ghi trên nhãn đã hết. Ghi {expiry} (còn hạn đến {lastValid}), ngày tham chiếu {today}. Nhà sản xuất khuyên không dùng đá mài đã quá hạn.',
  'reason.expiry.valid':
    'Hạn sử dụng ghi trên nhãn vẫn còn. Ghi {expiry} (còn hạn đến {lastValid}), ngày tham chiếu {today}.',

  'ruleSource.krOsh.label':
    'Quy định về tiêu chuẩn an toàn vệ sinh lao động (Hàn Quốc)',
  'ruleSource.krOsh.reference':
    'Điều 122 (Pháp lệnh số 450 của Bộ Việc làm và Lao động, hiệu lực từ 2026-03-02)',
  'ruleSource.krOsh.scope':
    'Tốc độ làm việc tối đa · dùng mặt bên · chụp bảo vệ · chạy thử',
  'ruleSource.kosha.label': 'KOSHA GUIDE',
  'ruleSource.kosha.reference':
    'M-189-2015 Hướng dẫn kỹ thuật về làm việc an toàn với máy mài cầm tay',
  'ruleSource.kosha.scope':
    'Khuyến nghị về bảo quản và sử dụng (không bắt buộc về mặt pháp lý)',
  'ruleSource.osa.label': 'oSa Product marking requirements',
  'ruleSource.osa.reference': 'Issue 2, 2020-04 (dựa trên EN 12413:2019)',
  'ruleSource.osa.scope':
    'Tham khảo định dạng ghi hạn sử dụng. Chưa đọc được bản gốc EN',

  'hazard.list.cutting': 'Nguy hiểm khi cắt',
  'hazard.list.grinding': 'Nguy hiểm khi mài',
  'hazard.list.common': 'Nguy hiểm chung',
  'hazard.summary': '{title} ({count})',
  'hazard.cuttingSide.title': 'Không mài bằng mặt bên của đá',
  'hazard.cuttingSide.detail':
    'Đá mài dùng để cắt chỉ được làm để cắt bằng mép ngoài. Nếu đẩy sang ngang, đá mỏng không chịu được lực bên và bị gãy.',
  'hazard.cuttingPinch.title': 'Không vặn hoặc bẻ đá',
  'hazard.cuttingPinch.detail':
    'Khi rãnh cắt khép lại, đá bị kẹp và gây giật ngược. Hãy đỡ vật liệu ở hai bên để rãnh cắt mở ra.',
  'hazard.cuttingForce.title': 'Không ấn mạnh khi cắt',
  'hazard.cuttingForce.detail':
    'Ấn mạnh làm đá quá nóng và biến dạng. Hãy để trọng lượng của máy đưa đá vào từ từ.',
  'hazard.grindingAngle.title': 'Nghiêng đá khoảng 15–30° khi mài',
  'hazard.grindingAngle.detail':
    'Dựng đá quá đứng thì mép đá cắm vào vật liệu và máy bị giật. Nghiêng đá giúp mặt tiếp xúc rộng hơn và ổn định hơn.',
  'hazard.grindingSide.title': 'Không tạo lực bên lên đá mài dùng để mài',
  'hazard.grindingSide.detail':
    'Chỉ đá mài dạng chén mới được làm để dùng mặt bên. Đẩy đá mài thông thường sang ngang có thể làm đá vỡ.',
  'hazard.grindingIdle.title': 'Cho đá mới lắp chạy không tải trước',
  'hazard.grindingIdle.detail':
    'Lắp sai hoặc có vết nứt sẽ lộ ra trước khi có tải. Hướng máy về phía không có người và kiểm tra rung, tiếng ồn bất thường.',
  'hazard.commonStop.title': 'Chỉ đặt máy xuống khi đá đã dừng hẳn',
  'hazard.commonStop.detail':
    'Tắt nguồn rồi đá vẫn quay theo quán tính. Nếu chạm đất khi còn quay, máy sẽ bật lên.',
  'hazard.commonGuard.title': 'Xoay chụp bảo vệ về phía ngược với người làm',
  'hazard.commonGuard.detail':
    'Chụp bảo vệ chắn phía mảnh vỡ văng tới. Nếu góc bị lệch, người vẫn bị hở dù đã lắp chụp bảo vệ.',

  'notVerifiable.internalCrack.title': 'Vết nứt bên trong',
  'notVerifiable.internalCrack.detail':
    'Vết nứt nhỏ không hiện trên ảnh bề mặt. Trước khi lắp, hãy gõ thử (gõ nhẹ và nghe tiếng).',
  'notVerifiable.physicalDamage.title': 'Hư hỏng vật lý',
  'notVerifiable.physicalDamage.detail':
    'Ảnh chỉ cho thấy vỡ rõ rệt. Vết lõm, biến dạng hay ẩm ướt thì không nhận ra được. Hãy tự xem kỹ.',
  'notVerifiable.mounting.title': 'Lắp đúng cách',
  'notVerifiable.mounting.detail':
    'Ảnh không cho biết mặt bích đã siết chưa, chiều quay có đúng không, đá đã ngồi đúng trên trục chưa. Hãy tự kiểm tra sau khi lắp.',
  'notVerifiable.guard.title': 'Tình trạng chụp bảo vệ',
  'notVerifiable.guard.detail':
    'Ứng dụng không thấy được chụp bảo vệ đã lắp chưa, đúng góc chưa, có hư hỏng không. Hãy tự nhìn kiểm tra.',

  'history.title': 'Lịch sử kiểm tra',
  'history.loading': 'Đang tải hồ sơ...',
  'history.clearConfirm':
    'Sẽ xóa toàn bộ {count} hồ sơ kiểm tra đã lưu. Không thể hoàn tác.',
  'history.clearConfirmButton': 'Xóa tất cả',
  'history.deleteRecord': 'Xóa bản ghi này',
  'history.deleteConfirm':
    'Thao tác này xóa một bản ghi. Ảnh lưu kèm cũng bị xóa và không thể khôi phục.',
  'history.deleteConfirmButton': 'Xóa bản ghi',
  'history.cancel': 'Hủy',
  'history.clearAll': 'Xóa toàn bộ hồ sơ',
  'history.newInspection': 'Bắt đầu kiểm tra mới',
  'history.empty': 'Chưa có hồ sơ kiểm tra nào được lưu.',
  'history.timeNote':
    '"30 giây" là mục tiêu cho thời gian kiểm tra trước: tính từ lúc chọn công việc đến ngay trước khi bắt đầu chạy thử. Thời gian chạy thử theo luật (ít nhất 1 phút hoặc 3 phút) tách riêng khỏi mục tiêu này và không được rút ngắn.',
  'history.elapsed': 'Kiểm tra mất {time}',
  'history.elapsedWithTrial': 'Kiểm tra mất {time} (gồm cả chạy thử)',
  'history.preTrial': 'Kiểm tra trước {time} (đến trước khi chạy thử)',
  'history.unknownModel': 'Không rõ mã máy',
  'history.unknownDiameter': 'Không rõ đường kính',
  'history.summary': '{model} {grinderRpm} · đá mài {wheelDiameter} {wheelRpm}',
  'history.grinderPhoto': 'Nhãn máy mài',
  'history.wheelPhoto': 'Nhãn đá mài',
  'history.noPhoto': 'Không có ảnh được lưu.',
  'history.loadMore': 'Xem thêm ({shown}/{total})',
  'history.filter.title': 'Bộ lọc',
  'history.filter.reset': 'Đặt lại bộ lọc',
  'history.filter.purpose': 'Công việc',
  'history.filter.purposeAll': 'Tất cả',
  'history.filter.verdict': 'Kết quả',
  'history.filter.verdictAll': 'Tất cả',
  'history.filter.wheelType': 'Loại đá mài',
  'history.filter.wheelTypeAll': 'Tất cả',
  'history.filter.trialRun': 'Kết quả chạy thử',
  'history.filter.trialRunAll': 'Tất cả',
  'history.filter.trialRunNormal': 'Không có bất thường',
  'history.filter.trialRunAbnormal': 'Có bất thường',
  'history.filter.trialRunNone': 'Chưa chạy thử',
  'history.filter.dateFrom': 'Từ ngày',
  'history.filter.dateTo': 'Đến ngày',
  'history.filter.resultCount': '{count} bản ghi',
  'history.filter.resultCountOf': '{count}/{total} bản ghi',
  'history.filter.noResults': 'Không có bản ghi nào khớp với bộ lọc này.',
  'elapsed.overHour': 'hơn 1 giờ',
  'elapsed.seconds': '{seconds} giây',
  'elapsed.minutes': '{minutes} phút',
  'elapsed.minutesSeconds': '{minutes} phút {seconds} giây',

  'research.notice':
    'Đây là tính năng dùng cho kiểm chứng/nghiên cứu, không thay đổi kết quả tại hiện trường.',
  'research.noticeDetail':
    'Chỉ hiện trong bản dựng kiểm chứng. Tính năng này chỉ xuất hồ sơ và tính chỉ số, không can thiệp vào kết quả, kiểm tra tình trạng, chạy thử hay điều kiện lưu.',
  'research.modeTitle': 'Chế độ nghiên cứu',
  'research.modeHint':
    'Xuất số đo ra tệp CSV. Không cần khi làm việc tại hiện trường.',
  'research.download': 'Tải CSV ({count} hồ sơ)',
  'research.deviceOnly':
    'Hồ sơ chỉ nằm trên thiết bị này. Bạn phải tự chuyển tệp đã tải.',
  'research.exported': 'Đã xuất toàn bộ {count} hồ sơ ra CSV.',
  'research.downloadFailed':
    'Tải xuống không thành công. Hãy kiểm tra dung lượng lưu trữ.',
  'research.truthTitle': 'Tệp giá trị đúng (Ground Truth)',
  'research.truthHint':
    'Là các giá trị bạn tự đọc và ghi lại trước khi chụp. Cần có để tính chỉ số. Ứng dụng không tự tạo giá trị đúng.',
  'research.truthEmpty':
    'Không đọc được giá trị đúng nào. Hãy kiểm tra tệp có phải mảng JSON không.',
  'research.truthUnreadable': 'Không đọc được tệp giá trị đúng.',
  'research.truthRejected':
    'Đã loại {count} dòng vì sai định dạng. Hãy kiểm tra số mẫu.',
  'metrics.title': 'Chỉ số đánh giá',
  'metrics.note':
    'Tính từ {count} hồ sơ có giá trị đúng. Độ chính xác khi đọc được đo bằng giá trị OCR gốc trước khi người dùng sửa.',
  'metrics.notAvailable': 'N/A — không có dữ liệu để tính',
  'metrics.records': '{numerator} / {denominator} hồ sơ',
  'metrics.fields': '{numerator} / {denominator} trường',
  'metrics.falseSafe.name': 'False-Safe Rate',
  'metrics.falseSafe.definition':
    'Trong các hồ sơ có giá trị đúng là THÔNG SỐ KHÔNG PHÙ HỢP, tỷ lệ ứng dụng báo THÔNG SỐ PHÙ HỢP. Nếu khác 0 thì không phát hành.',
  'metrics.undetermined.name': 'Tỷ lệ không thể xác định',
  'metrics.undetermined.definition':
    'Tỷ lệ không xác định được kết quả. Đây là hành vi được thiết kế, không phải lỗi.',
  'metrics.fieldAccuracy.name': 'Độ chính xác trích xuất trường',
  'metrics.fieldAccuracy.definition':
    'Trong các trường có giá trị đúng, tỷ lệ giá trị OCR gốc khớp với giá trị đúng.',
  'metrics.unitNormalization.name': 'Lỗi quy đổi đơn vị',
  'metrics.unitNormalization.definition':
    'Trong các hồ sơ quy đổi từ m/s, tỷ lệ kết quả khác với giá trị đúng.',
  'metrics.falseSafeIds':
    'Mã hồ sơ False-Safe: {ids} — hãy phân tích và báo cáo từng hồ sơ. Không che giấu.',

  // Biểu ngữ bản kiểm chứng. Hiển thị cùng điều kiện với công cụ nghiên cứu.
  // Chỉ hiển thị — không ảnh hưởng đến kết quả hay hồ sơ đã lưu.
  'validationBuild.label': 'Bản kiểm chứng',
  'validationBuild.note':
    'Không dùng cho hiện trường. Hồ sơ được lưu tách biệt với bản hiện trường.',
  'validationBuild.commit': 'commit {sha}',
  'validationBuild.commitUnknown': 'không có thông tin commit',

  // Thông tin bản build. Hiển thị ở cả hai bản, cạnh phần miễn trừ trách nhiệm.
  'build.commit': 'bản build {sha}',
  'build.commitUnknown': 'không có thông tin bản build',

  // Thông báo cập nhật service worker. Hiện ở đầu màn hình khi phát hiện.
  // Nút áp dụng bị khóa trong lúc kiểm tra hoặc chạy thử — màn hình không được
  // đổi bất ngờ khi máy đang thực sự chạy.
  'update.available': 'Có phiên bản mới.',
  'update.apply': 'Cập nhật ngay',
  'update.applying': 'Đang áp dụng cập nhật...',
  'update.blockedDuringInspection':
    'Bạn có thể cập nhật sau khi hoàn tất kiểm tra.',

  'meta.title': 'WheelMatch AI — Đối chiếu thông số máy mài và đá mài',

  disclaimer:
    'Ứng dụng này chỉ đối chiếu các thông số in trên nhãn. Ứng dụng không bảo đảm an toàn lao động và không thay thế hướng dẫn của nhà sản xuất hay nội quy an toàn của nơi làm việc.',

  'translation.notice':
    'Bản dịch này chưa được hiệu đính. Nếu nghĩa chưa rõ, hãy theo bản tiếng Hàn và hỏi người quản lý.',
};
