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

export interface FieldGuide {
  hint: string;
  where: string;
}

export const GRINDER_FIELD_GUIDE: Record<string, FieldGuide> = {
  model: {
    hint: '그라인더 제품 이름입니다. 판정에는 쓰지 않고 기록에만 남깁니다.',
    where: '명판 맨 위에 크게 적혀 있습니다. 예: GWS 750-125',
  },
  noLoadRPM: {
    hint: '이 그라인더가 도는 속도입니다. 숫돌이 이 속도를 견뎌야 합니다.',
    where:
      '명판에서 n₀ 또는 no load speed 옆의 숫자입니다. 예: 11000 r/min, 11000 min⁻¹',
  },
  maxWheelDiameter: {
    hint: '이 기계에 끼울 수 있는 가장 큰 숫돌입니다. 더 큰 숫돌은 방호덮개에 들어가지 않습니다.',
    where:
      '명판에서 wheel, disc, 숫돌 같은 단어 옆의 지름입니다. 예: max Ø125mm',
  },
};

export const WHEEL_FIELD_GUIDE: Record<string, FieldGuide> = {
  maxRPM: {
    hint: '이 숫돌이 견디는 최대 속도입니다. 그라인더 속도보다 낮으면 깨져서 날아갑니다.',
    where:
      '라벨에 크게 적힌 회전속도입니다. m/s로만 적혀 있으면 앱이 자동으로 바꿉니다. 예: 12200 r/min, 80 m/s',
  },
  diameter: {
    hint: '숫돌의 바깥 지름입니다. 그라인더가 허용하는 크기 이하여야 합니다.',
    where: '치수 표기의 첫 숫자입니다. 예: 125 × 1.6 × 22.23 에서 125',
  },
  thickness: {
    hint: '숫돌의 두께입니다. 절단날은 얇고(1~3mm) 연삭석은 두껍습니다(6mm 안팎).',
    where: '치수 표기의 가운데 숫자입니다. 예: 125 × 1.6 × 22.23 에서 1.6',
  },
  purpose: {
    hint: '절단용은 자르기, 연삭용은 갈기입니다. 바꿔 쓰면 옆으로 힘을 받아 깨질 수 있습니다.',
    where:
      '라벨의 절단용/연삭용 표기입니다. 영문은 CUT-OFF 또는 GRINDING, DEPRESSED CENTER로 적힙니다.',
  },
};
