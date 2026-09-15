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

  'meta.title': 'WheelMatch AI — Đối chiếu thông số máy mài và đá mài',

  disclaimer:
    'Ứng dụng này chỉ đối chiếu các thông số in trên nhãn. Ứng dụng không bảo đảm an toàn lao động và không thay thế hướng dẫn của nhà sản xuất hay nội quy an toàn của nơi làm việc.',

  'translation.notice':
    'Bản dịch này chưa được hiệu đính. Nếu nghĩa chưa rõ, hãy theo bản tiếng Hàn và hỏi người quản lý.',
};
