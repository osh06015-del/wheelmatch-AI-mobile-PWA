// 작업자에게 보여줄 항목 설명.
//
// 앱을 처음 쓰는 사람, 특히 명판 용어에 익숙하지 않은 작업자를 위한 것이다.
// "무부하 회전속도"라는 말만 던져놓으면 무엇을 확인해야 하는지 알 수 없다.
//
// 두 가지를 나눠서 적는다.
//   hint   — 이게 무엇이고 왜 중요한가. 항상 보여준다.
//   where  — 라벨 어디에 적혀 있는가. 값을 읽지 못했을 때만 보여준다.
//            직접 입력해야 하는 순간에 정확히 필요한 정보이기 때문이다.
//
// 문구는 규칙엔진의 판정 사유와 어긋나지 않게 쓴다.
// 예: RPM은 "숫돌이 그라인더보다 높아야 한다"는 방향을 그대로 반복한다.
// 문장은 문구 파일(src/lib/i18n/messages)에 있고, 여기서는 키만 잇는다.

import type { MessageKey } from '@/lib/i18n';

export interface FieldGuide {
  hint: MessageKey;
  where: MessageKey;
}

export const GRINDER_FIELD_GUIDE: Record<string, FieldGuide> = {
  model: {
    hint: 'guide.grinder.model.hint',
    where: 'guide.grinder.model.where',
  },
  noLoadRPM: {
    hint: 'guide.grinder.noLoadRPM.hint',
    where: 'guide.grinder.noLoadRPM.where',
  },
  maxWheelDiameter: {
    hint: 'guide.grinder.maxWheelDiameter.hint',
    where: 'guide.grinder.maxWheelDiameter.where',
  },
};

export const WHEEL_FIELD_GUIDE: Record<string, FieldGuide> = {
  maxRPM: {
    hint: 'guide.wheel.maxRPM.hint',
    where: 'guide.wheel.maxRPM.where',
  },
  diameter: {
    hint: 'guide.wheel.diameter.hint',
    where: 'guide.wheel.diameter.where',
  },
  thickness: {
    hint: 'guide.wheel.thickness.hint',
    where: 'guide.wheel.thickness.where',
  },
  purpose: {
    hint: 'guide.wheel.purpose.hint',
    where: 'guide.wheel.purpose.where',
  },
  expiry: {
    hint: 'guide.wheel.expiry.hint',
    where: 'guide.wheel.expiry.where',
  },
};
