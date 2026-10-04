// 점검 흐름 E2E — 저장된 AI 판독을 읽을 수 없게 된 확인 화면 draft.
//
// 확인 화면(명판·숫돌 라벨)에서 새로고침했는데 저장된 판독이 지금 기준에 맞지 않으면
// 그 판독은 통째로 버려진다(formDraftModel.ts). 그렇게 확정한 점검이 결과 화면에서
// 어떻게 끝나는지를 작업 선택부터 저장까지 이어 본다.
//
// 다른 흐름 테스트와 바꾼 경계가 하나 더 있어 파일을 따로 둔다 — 확인 화면 draft의
// 표다. happy-dom에는 IndexedDB가 없어 그대로 두면 draft가 저장되지 않는다. 표만
// 메모리로 바꾸고 저장·복구 코드(사진의 바이트 변환 포함)는 진짜를 쓴다.
//
// 따로 돌리기: npx vitest run src/e2e

import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  E2E_TEST_TIMEOUT_MS,
  FixtureExtractor,
  GRINDER,
  finishTrialRun,
  inspector,
  mountApp,
  openWheelConfirm,
  reloadApp,
  resetBrowser,
  savedRecords,
  stubPhotoApis,
  wheelLabel,
  type Inspector,
} from './harness';

// 새로고침(모듈 재적재)을 넘어 남아야 한다. 실제 IndexedDB와 같은 조건이다.
const { formDrafts } = vi.hoisted(() => ({
  formDrafts: new Map<string, unknown>(),
}));

vi.mock('next/navigation', async () =>
  (await import('./harness')).navigationModule(),
);
vi.mock('next/link', async () => (await import('./harness')).linkModule());
vi.mock('@/lib/db', async () => (await import('./harness')).dbModule());
vi.mock('dexie-react-hooks', async () =>
  (await import('./liveQuery')).liveQueryModule(),
);
vi.mock('@/lib/draft/draftStore', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@/lib/draft/draftStore')>();
  return {
    ...original,
    formDraftStore: original.createFormDraftStore(() => ({
      get: async (slot) => formDrafts.get(slot),
      put: async (draft) => {
        formDrafts.set((draft as { slot: string }).slot, draft);
      },
      delete: async (slot) => {
        formDrafts.delete(slot);
      },
    })),
  };
});

// 흐름 테스트는 단위 테스트용 기본 제한(5초)으로 재지 않는다. 값과 근거는 harness.tsx.
vi.setConfig({ testTimeout: E2E_TEST_TIMEOUT_MS });

const T0 = new Date('2026-09-16T03:00:00.000Z');

beforeEach(() => {
  resetBrowser('ko');
  formDrafts.clear();
  stubPhotoApis();
  // Date만 멈춘다. 화면 갱신·자동 저장 타이머는 실제로 돌아야 한다.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('점검 흐름 E2E — 저장된 AI 판독을 읽을 수 없게 된 확인 화면 draft', () => {
  /**
   * 숫돌 확인 화면까지 가서 draft가 저장되기를 기다린 뒤, 저장된 판독을 지금 기준에
   * 맞지 않게 바꾸고 새로고침한다. 그 사이 앱이 갱신되어 기준이 달라진 경우와 같은
   * 모양이다. 버렸다는 안내가 뜬 확인 화면에서 직접 확인으로 확정해 결과까지 간다.
   *
   * 값은 규격이 서로 맞는 조합이다 — 판독을 버리지 않았다면 적합으로 끝난다.
   */
  async function confirmWithUnreadableOcr(
    f: Inspector,
    extractor: FixtureExtractor,
  ) {
    const view = await openWheelConfirm(f, extractor);
    await waitFor(() => expect(formDrafts.has('wheel')).toBe(true), {
      timeout: 3000,
    });
    const saved = formDrafts.get('wheel') as Record<string, unknown>;
    // 서버 분석으로 읽은 draft다. 출처는 그대로 두고 판독만 어긋나게 한다.
    expect(saved.analysisSource).toBe('server');
    formDrafts.set('wheel', {
      ...saved,
      // 원문이 문자열이 아니다 — 살릴 뼈대가 없어 통째로 버려진다.
      ocr: { ...(saved.ocr as Record<string, unknown>), rawText: null },
    });

    await reloadApp(view, extractor);
    await screen.findByText(f.t('draft.warn.ocr'), { exact: false });
    // 입력칸의 값은 판독과 따로 저장돼 있어 그대로 돌아온다.
    expect(screen.getByDisplayValue('12200')).toBeInTheDocument();

    await f.user.click(
      screen.getByRole('checkbox', {
        name: new RegExp(f.t('manualConfirm.label')),
      }),
    );
    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');
    await screen.findByText(f.t('result.title'));
  }

  it('직접 확인으로 확정해도 적합이 나오지 않는다 — 판정불가·시험운전 없음으로 저장되고 판독 경로가 남는다', async () => {
    const f = inspector('ko');
    await confirmWithUnreadableOcr(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
    );

    expect(screen.getByText(f.t('verdict.undetermined'))).toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      f.t('result.undetermined.offlineLimited'),
    );
    // 이 점검은 기기가 오프라인이 아니었고 서버 분석까지 거쳤다. 결과 화면은
    // 확인 화면과 같은 사실을 말한다 — 오프라인이었다거나 직접 입력했다고 하지 않는다.
    expect(document.body).toHaveTextContent(
      `${f.t('common.wheel')}: ${f.t('offline.cause.ocrDropped')}`,
    );
    expect(document.body).not.toHaveTextContent('오프라인');
    expect(document.body).not.toHaveTextContent('서버 분석 없이');
    expect(document.body).not.toHaveTextContent(f.t('offline.cause.manual'));
    expect(document.body).not.toHaveTextContent(
      '값이 부족해 판정할 수 없습니다',
    );
    await f.completeChecklist();
    expect(
      screen.queryByRole('heading', { name: f.t('trialRun.title') }),
    ).not.toBeInTheDocument();

    await f.user.click(f.button('result.save'));
    await f.atPath('/history');
    const [record] = savedRecords();
    expect(record.analysisMode).toBe('offline_limited');
    // 확정한 값만 보면 직접 입력과 구분되지 않는다. 까닭을 따로 남겨야 가려진다.
    expect(record.analysisLimitCauses).toEqual({ wheel: 'dropped_ocr' });
    expect(record.result.verdict).toBe('UNDETERMINED');
    expect(record.trialRun).toBeUndefined();
    // 버린 판독은 기록의 OCR 원본으로 남지 않는다. 확정한 값은 직접 입력과 같다.
    expect(record.wheelOcr).toBeUndefined();
    expect(record.wheel.rawText).toBe('');
    // 직접 확인으로 신뢰도는 올라갔다. 적합을 막은 것은 판독 경로 하나다.
    expect(record.wheel.confidence).toBe('high');
    expect(
      record.result.checks
        .filter((check) => check.passed === null && !check.advisory)
        .map((check) => check.detail?.code),
    ).toEqual(['analysisMode.offlineLimited']);
  });

  it('결과 화면에서 서버로 다시 분석해 AI 값이 같음을 확인하면 온라인 대조로 풀리고, 다시 읽은 판독이 재분석 판독으로 기록에 남는다', async () => {
    const f = inspector('ko');
    // 두 번째 라벨 판독은 결과 화면의 재분석이 가져간다.
    await confirmWithUnreadableOcr(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel(), wheelLabel()),
    );
    expect(screen.getByText(f.t('verdict.undetermined'))).toBeInTheDocument();

    await f.user.click(f.button('offline.reanalyze'));
    await f.user.click(
      await screen.findByRole('button', {
        name: f.t('offline.accept'),
      }),
    );

    expect(
      await screen.findByText(f.t('verdict.compatible')),
    ).toBeInTheDocument();
    await f.completeChecklist();
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    await finishTrialRun(f);
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');

    const [record] = savedRecords();
    expect(record.analysisMode).toBe('online');
    expect(record.analysisLimitCauses).toBeUndefined();
    expect(record.result.verdict).toBe('COMPATIBLE');
    // 적합으로 끝난 기록에는 모델이 읽은 판독이 있다 — 재분석이 다시 읽은 값이다.
    // OCR 원본 자리에는 넣지 않는다. 그 자리는 작업자가 확인 화면에서 고치기 전의
    // 원본인데, 이 점검의 확인 화면에는 내놓은 판독이 없었다(버렸다).
    expect(record.wheelOcr).toBeUndefined();
    expect(record.reanalyses).toHaveLength(1);
    expect(record.reanalyses?.[0]?.wheelOcr).toEqual(wheelLabel());
    expect(record.reanalyses?.[0]?.acceptedAt).not.toBeNull();
    // 재분석은 작업자가 확정한 값을 덮어쓰지 않는다.
    expect(record.wheel.maxRPM).toBe(12200);
    expect(record.wheel.rpmSource).toBe('user');
    // 다시 읽은 판독의 원본 표시는 확정값의 빈 자리로 옮겨져 판정에 들어간다
    // (confirm.ts의 withAcceptedReanalysis). 버린 판독의 표시를 건지는 것이 아니라
    // 새로 읽어 받아들인 판독의 표시다. 다시 촬영한 점검처럼 장착 규격 항목이
    // 만들어진다 — 이 라벨에는 m/s 표기가 없어 표기 일치는 대조할 상대가 없다.
    expect(record.reanalyses?.[0]?.wheelOcr?.markings).toBeDefined();
    expect(record.wheel.markings).toEqual(wheelLabel().markings);
    const codes = record.result.checks.map((check) => check.detail?.code);
    expect(codes).toContain('mountingSpec.shown');
    expect(codes).not.toContain('unitConsistency.match');
    // 버린 판독은 손상을 의심하지 않았고 다시 읽은 판독도 그렇다. 의심을 지어내지
    // 않는다.
    expect(record.wheel.visibleDamage).toBe('unknown');
  });

  it('명판 판독을 버린 경우도 같다 — 숫돌을 정상으로 읽어도 점검 전체가 제한 대조로 남는다', async () => {
    const f = inspector('ko');
    const extractor = new FixtureExtractor()
      .grinder(GRINDER)
      .wheel(wheelLabel());
    const view = await mountApp(extractor);
    await f.chooseJob('cutting');
    await f.pickPhoto();
    await screen.findByText(f.t('scan.confirmTitle'));
    await waitFor(() => expect(formDrafts.has('grinder')).toBe(true), {
      timeout: 3000,
    });
    const saved = formDrafts.get('grinder') as Record<string, unknown>;
    expect(saved.analysisSource).toBe('server');
    formDrafts.set('grinder', {
      ...saved,
      // 명판 판독은 어느 값이든 어긋나면 통째로 버려진다.
      ocr: { ...(saved.ocr as Record<string, unknown>), rawText: null },
    });

    await reloadApp(view, extractor);
    await screen.findByText(f.t('draft.warn.ocr'), { exact: false });
    expect(screen.getByDisplayValue('11000')).toBeInTheDocument();

    await f.user.click(
      screen.getByRole('checkbox', {
        name: new RegExp(f.t('manualConfirm.label')),
      }),
    );
    await f.answerGrinderCondition();
    await f.user.click(f.button('scan.grinder.proceed'));
    await f.atPath('/scan/wheel');

    // 숫돌은 서버 분석으로 정상 판독한다. 명판 쪽 제한은 그대로 남아야 한다.
    await f.pickPhoto();
    await screen.findByText(f.t('scan.confirmTitle'));
    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');
    await screen.findByText(f.t('result.title'));

    expect(screen.getByText(f.t('verdict.undetermined'))).toBeInTheDocument();
    await f.completeChecklist();
    expect(
      screen.queryByRole('heading', { name: f.t('trialRun.title') }),
    ).not.toBeInTheDocument();

    await f.user.click(f.button('result.save'));
    await f.atPath('/history');
    const [record] = savedRecords();
    expect(record.analysisMode).toBe('offline_limited');
    // 제한된 것은 명판 단계뿐이다. 서버로 읽은 숫돌 단계에는 까닭이 없다.
    expect(record.analysisLimitCauses).toEqual({ grinder: 'dropped_ocr' });
    expect(record.result.verdict).toBe('UNDETERMINED');
    expect(record.grinderOcr).toBeUndefined();
    expect(record.grinder.confidence).toBe('high');
    // 숫돌 쪽은 정상 판독이다. 원본이 그대로 남는다.
    expect(record.wheelOcr).toEqual(wheelLabel());
    expect(
      record.result.checks
        .filter((check) => check.passed === null && !check.advisory)
        .map((check) => check.detail?.code),
    ).toEqual(['analysisMode.offlineLimited']);
  });
});

// ─────────────────────────────────────────────────────────────
// 이어받은 손상 의심의 출처
//
// 확인 화면 draft가 남긴 의심은 확정한 규격을 의심으로 만든다. 그런데 결과 화면의
// 외관 손상 항목은 규칙엔진 문장 그대로("사진에서 … 보이는 부분이 있습니다")이고,
// 기록에 남는 사진과 OCR 원본은 그 의심을 담고 있지 않다. 출처가 확인 화면에서
// 결과 화면·기록·이력까지 따라가는지를 이어 본다.
// ─────────────────────────────────────────────────────────────

describe('점검 흐름 E2E — 이어받은 손상 의심의 출처', () => {
  const ENGINE_SENTENCE =
    '사진에서 깨짐·균열로 보이는 부분이 있습니다. 이 숫돌을 사용하지 말고 직접 확인하세요.';

  it('사진 없는 draft의 의심을 이어받아 라벨을 다시 찍으면, 결과·기록·이력이 그 의심이 이 사진의 판독이 아님을 밝힌다', async () => {
    const f = inspector('ko');
    // 처음 판독은 손상을 의심한다. 다시 찍은 사진의 판독은 의심하지 않는다 — 다른
    // 숫돌을 찍었을 수도 있다(앱은 구분하지 못한다).
    const extractor = new FixtureExtractor()
      .grinder(GRINDER)
      .wheel(wheelLabel({ visibleDamage: 'suspected' }), wheelLabel());
    const view = await openWheelConfirm(f, extractor);
    await waitFor(() => expect(formDrafts.has('wheel')).toBe(true), {
      timeout: 3000,
    });
    // 저장 공간이 모자라 사진만 빼고 저장된 draft와 같은 모양이다. 대조할 사진이
    // 없어 확인 화면을 되살리지 못한다.
    formDrafts.set('wheel', {
      ...(formDrafts.get('wheel') as Record<string, unknown>),
      photo: null,
    });

    const retaking = await reloadApp(view, extractor);
    await f.pickPhoto();
    await screen.findByText(f.t('draft.warn.carriedDamage'), { exact: false });
    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');
    await screen.findByText(f.t('result.title'));

    // 결과 화면: 엔진 문장은 그대로이고, 같은 항목 안에서 출처가 뒤따른다.
    const note = f.t('damageSource.carried');
    expect(screen.getByText(ENGINE_SENTENCE).closest('li')).toContainElement(
      screen.getByText(note),
    );
    // 외관 손상은 경고라 판정을 움직이지 않는다. 출처를 밝혀도 그대로다.
    expect(screen.getByText(f.t('verdict.compatible'))).toBeInTheDocument();

    // 결과 화면에서 새로고침해도 출처는 규격과 함께 남는다.
    await reloadApp(retaking, extractor);
    await screen.findByText(f.t('result.title'));
    expect(screen.getByText(note)).toBeInTheDocument();

    await f.completeChecklist();
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    await finishTrialRun(f);
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');

    const [record] = savedRecords();
    expect(record.result.verdict).toBe('COMPATIBLE');
    expect(record.wheel.visibleDamage).toBe('suspected');
    expect(record.wheel.visibleDamageSources).toEqual(['carried']);
    // 다시 찍은 사진의 판독은 모델이 읽은 그대로 남는다. 의심도 출처도 섞지 않는다.
    expect(record.wheelOcr).toEqual(wheelLabel());
    // 판정 근거의 사유 문장과 코드는 엔진이 낸 그대로다.
    const damage = record.result.checks.find(
      (check) => check.detail?.code === 'visibleDamage.suspected',
    );
    expect(damage?.reason).toBe(ENGINE_SENTENCE);

    // 이력: 저장된 출처 그대로 다시 보인다.
    await f.user.click(await screen.findByRole('button', { expanded: false }));
    expect(screen.getByText(ENGINE_SENTENCE).closest('li')).toContainElement(
      screen.getByText(note),
    );
  });

  it('읽을 수 없어 버린 판독이 의심했던 숫돌 — 결과 화면이 그 판독이 기록에 없음을 밝힌다', async () => {
    const f = inspector('ko');
    const view = await openWheelConfirm(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(wheelLabel({ visibleDamage: 'suspected' })),
    );
    await waitFor(() => expect(formDrafts.has('wheel')).toBe(true), {
      timeout: 3000,
    });
    const saved = formDrafts.get('wheel') as Record<string, unknown>;
    formDrafts.set('wheel', {
      ...saved,
      // 원문이 문자열이 아니다 — 통째로 버려진다. 외관 값은 의심 그대로다.
      ocr: { ...(saved.ocr as Record<string, unknown>), rawText: null },
    });

    await reloadApp(view, null);
    await screen.findByText(f.t('draft.warn.ocr'), { exact: false });
    await f.user.click(
      screen.getByRole('checkbox', {
        name: new RegExp(f.t('manualConfirm.label')),
      }),
    );
    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');
    await screen.findByText(f.t('result.title'));

    expect(screen.getByText(ENGINE_SENTENCE).closest('li')).toContainElement(
      screen.getByText(f.t('damageSource.droppedOcr')),
    );

    await f.completeChecklist();
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');
    const [record] = savedRecords();
    expect(record.wheel.visibleDamageSources).toEqual(['dropped_ocr']);
    // 그 판독은 기록에 없다 — 출처 문장이 말하는 그대로다.
    expect(record.wheelOcr).toBeUndefined();
  });
});
