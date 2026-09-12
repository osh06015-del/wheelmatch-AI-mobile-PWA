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
  'checklist.guardCover': 'Đã lắp chụp bảo vệ',
  'checklist.guardCoverHint':
    'Kiểm tra đá mài đã được che đúng góc quy định chưa',
  'checklist.auxiliaryHandle': 'Đã lắp tay cầm phụ',
  'checklist.auxiliaryHandleHint':
    'Kiểm tra có thể giữ bằng hai tay để chống giật ngược không',
  'checklist.ppe': 'Đã mang đồ bảo hộ',
  'checklist.ppeHint': 'Kiểm tra kính bảo hộ, găng tay và tấm che mặt',
  'checklist.preWork':
    'Ngay trước khi làm, hãy kiểm tra tia lửa không hướng về phía người hoặc vật dễ cháy.',
  'checklist.incomplete':
    'Bạn phải xác nhận đủ {count} mục an toàn thì mới lưu được.',

  disclaimer:
    'Ứng dụng này chỉ đối chiếu các thông số in trên nhãn. Ứng dụng không bảo đảm an toàn lao động và không thay thế hướng dẫn của nhà sản xuất hay nội quy an toàn của nơi làm việc.',

  'translation.notice':
    'Bản dịch này chưa được hiệu đính. Nếu nghĩa chưa rõ, hãy theo bản tiếng Hàn và hỏi người quản lý.',
};
