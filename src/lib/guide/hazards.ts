// 작업별 위험사항.
//
// 규격이 맞아도 쓰는 방법이 틀리면 숫돌은 깨진다. 규격 대조가 잡지 못하는
// 부분이라 따로 적어 둔다. 판정에는 관여하지 않는다 — 읽을거리다.
//
// 절단과 연삭은 위험 요인이 서로 다르다. 절단날은 얇아서 측면 하중에 부러지고,
// 연삭은 각도를 잘못 잡으면 모서리가 파고들어 튄다. 그래서 작업별로 나눈다.
//
// 여기 문구는 물리적 원인이 분명한 것만 담았다. 법령 조항 번호는 적지 않는다.
// 확인하지 않은 인용을 현장 화면에 띄우는 것이 문구가 없는 것보다 나쁘다.

import type { WorkPurpose } from '@/lib/rules/types';

export interface Hazard {
  /** 무엇을 하지 말아야 하는지 (또는 해야 하는지) */
  title: string;
  /** 왜 그런지 — 이유를 알아야 지킨다 */
  detail: string;
}

const CUTTING_HAZARDS: readonly Hazard[] = [
  {
    title: '측면으로 갈지 않는다',
    detail:
      '절단날은 원주면으로만 자르도록 만들어졌습니다. 옆면으로 밀면 얇은 날이 측면 하중을 견디지 못하고 부러집니다.',
  },
  {
    title: '날을 비틀거나 꺾지 않는다',
    detail:
      '자르던 홈이 닫히면 날이 물려 반동(킥백)이 납니다. 재료를 양쪽에서 받쳐 홈이 벌어지는 방향으로 두세요.',
  },
  {
    title: '눌러서 자르지 않는다',
    detail:
      '힘으로 밀면 과열되어 날이 변형됩니다. 날 자체 무게로 천천히 들어가게 하세요.',
  },
];

const GRINDING_HAZARDS: readonly Hazard[] = [
  {
    title: '15~30° 로 눕혀서 댄다',
    detail:
      '너무 세워서 대면 숫돌 모서리가 재료를 파고들어 공구가 튕깁니다. 눕혀 대면 접촉면이 넓어져 안정됩니다.',
  },
  {
    title: '연삭날에도 측면 하중을 주지 않는다',
    detail:
      '옆면으로 밀어 쓰라고 만든 것은 컵형 숫돌뿐입니다. 일반 연삭날을 옆으로 밀면 파손 위험이 있습니다.',
  },
  {
    title: '새로 끼운 숫돌은 공회전으로 먼저 확인한다',
    detail:
      '장착이 잘못되었거나 균열이 있으면 부하가 걸리기 전에 드러납니다. 사람이 없는 방향으로 두고 이상 진동·소리를 확인하세요.',
  },
];

const COMMON_HAZARDS: readonly Hazard[] = [
  {
    title: '완전히 멈춘 뒤 내려놓는다',
    detail:
      '전원을 끊어도 숫돌은 관성으로 계속 돕니다. 도는 상태로 바닥에 닿으면 공구가 튀어 오릅니다.',
  },
  {
    title: '덮개 각도를 작업자 반대쪽으로 맞춘다',
    detail:
      '방호덮개는 파편이 날아오는 쪽을 막습니다. 각도가 틀어져 있으면 덮개가 있어도 몸 쪽이 열립니다.',
  },
];

/**
 * 오늘 작업에 맞는 위험사항.
 *
 * 작업을 고르지 않았으면 공통 항목만 준다. 어느 쪽인지 모르는 채로
 * 절단·연삭 주의사항을 한꺼번에 늘어놓으면 읽지 않는다.
 */
export function hazardsFor(purpose: WorkPurpose | null): Hazard[] {
  if (purpose === 'cutting') return [...CUTTING_HAZARDS, ...COMMON_HAZARDS];
  if (purpose === 'grinding') return [...GRINDING_HAZARDS, ...COMMON_HAZARDS];
  return [...COMMON_HAZARDS];
}

/** 목록 제목. 작업을 고른 경우에만 작업 이름을 붙인다. */
export function hazardTitle(purpose: WorkPurpose | null): string {
  if (purpose === 'cutting') return '절단 작업 위험사항';
  if (purpose === 'grinding') return '연삭 작업 위험사항';
  return '공통 위험사항';
}
