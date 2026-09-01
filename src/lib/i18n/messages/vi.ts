// Tiếng Việt (베트남어).
//
// 검수 전이다. 현장 투입 전 원어민 확인이 필요하다 (docs/i18n.md 참고).

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
  'home.grindingHint': 'Mài và đánh bóng',
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

  'checks.title': 'Kết quả từng mục kiểm tra',
  'rule.requiredValues': 'Giá trị bắt buộc',
  'rule.rpmSafety': 'Tốc độ cho phép',
  'rule.diameterFit': 'Đường kính phù hợp',
  'rule.purpose': 'Công dụng đá mài',
  'rule.workPurpose': 'Đúng với công việc',
  'rule.wheelType': 'Loại đá mài',
  'rule.visibleDamage': 'Hư hỏng bên ngoài',
  'rule.peripheralSpeed': 'Đối chiếu tốc độ vòng ngoài',
  'rule.confidence': 'Độ tin cậy khi đọc nhãn',

  'action.title': 'KHÔNG ĐƯỢC SỬ DỤNG',
  'action.rpmSafety':
    'Không lắp đá mài này. Hãy thay bằng đá mài chịu được tốc độ bằng hoặc cao hơn tốc độ của máy.',
  'action.diameterFit':
    'Không lắp đá mài này. Hãy thay bằng đá mài có đường kính không vượt quá mức máy cho phép.',
  'action.workPurpose':
    'Hãy thay bằng đá mài đúng với công việc hôm nay. Đá mài sai công dụng rất dễ vỡ.',
  'action.generic':
    'Không lắp đá mài này. Hãy thay bằng đá mài đáp ứng đủ điều kiện.',

  'checklist.title': 'Danh mục kiểm tra an toàn',
  'checklist.note':
    'Những mục này bạn phải tự kiểm tra. Việc đối chiếu thông số không bao gồm chúng.',
  'checklist.guardCover': 'Đã lắp nắp bảo vệ',
  'checklist.guardCoverHint':
    'Kiểm tra đá mài đã được che đúng góc quy định chưa',
  'checklist.auxiliaryHandle': 'Đã lắp tay cầm phụ',
  'checklist.auxiliaryHandleHint':
    'Kiểm tra có thể giữ bằng hai tay để chống giật ngược không',
  'checklist.wheelDamage': 'Đá mài không hư hỏng',
  'checklist.wheelDamageHint':
    'Kiểm tra vết nứt, sứt mẻ, cong vênh (nếu có phải thay ngay)',
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
