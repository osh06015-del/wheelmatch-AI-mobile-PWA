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
//
// 문장은 문구 파일(src/lib/i18n/messages)에 있다. 여기서는 순서와 묶음만 정한다.

import type { MessageKey } from '@/lib/i18n';
import type { WorkPurpose } from '@/lib/rules/types';

export interface Hazard {
  /** 무엇을 하지 말아야 하는지 (또는 해야 하는지) */
  titleKey: MessageKey;
  /** 왜 그런지 — 이유를 알아야 지킨다 */
  detailKey: MessageKey;
}

const CUTTING_HAZARDS: readonly Hazard[] = [
  {
    titleKey: 'hazard.cuttingSide.title',
    detailKey: 'hazard.cuttingSide.detail',
  },
  {
    titleKey: 'hazard.cuttingPinch.title',
    detailKey: 'hazard.cuttingPinch.detail',
  },
  {
    titleKey: 'hazard.cuttingForce.title',
    detailKey: 'hazard.cuttingForce.detail',
  },
];

const GRINDING_HAZARDS: readonly Hazard[] = [
  {
    titleKey: 'hazard.grindingAngle.title',
    detailKey: 'hazard.grindingAngle.detail',
  },
  {
    titleKey: 'hazard.grindingSide.title',
    detailKey: 'hazard.grindingSide.detail',
  },
  {
    titleKey: 'hazard.grindingIdle.title',
    detailKey: 'hazard.grindingIdle.detail',
  },
];

const COMMON_HAZARDS: readonly Hazard[] = [
  {
    titleKey: 'hazard.commonStop.title',
    detailKey: 'hazard.commonStop.detail',
  },
  {
    titleKey: 'hazard.commonGuard.title',
    detailKey: 'hazard.commonGuard.detail',
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

/** 목록 제목의 문구 키. 작업을 고른 경우에만 작업 이름이 붙는다. */
export function hazardTitle(purpose: WorkPurpose | null): MessageKey {
  if (purpose === 'cutting') return 'hazard.list.cutting';
  if (purpose === 'grinding') return 'hazard.list.grinding';
  return 'hazard.list.common';
}
