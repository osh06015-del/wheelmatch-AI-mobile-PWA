// 점검 흐름 E2E — 한국어.
//
// 카메라 대신 추출 결과를 넣고, 실제 화면을 작업 선택부터 저장·이력까지 이어 돌린다.
// 페이지·규칙엔진·Gate·시험운전·상태 저장소는 진짜이고, 바꾼 경계는 harness.tsx
// 머리말에 적었다. 실제 브라우저가 아니므로 카메라 촬영·IndexedDB·OCR·Next
// 라우팅은 여기서 확인되지 않는다.
//
// 따로 돌리기: npx vitest run src/e2e

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FixtureExaminer,
  FixtureExtractor,
  GRINDER,
  examNotObserved,
  finishTrialRun,
  inspector,
  mountApp,
  openResult,
  openWheelConfirm,
  pathname,
  reloadApp,
  resetBrowser,
  savedRecords,
  stubPhotoApis,
  visit,
  wheelLabel,
} from './harness';

vi.mock('next/navigation', async () =>
  (await import('./harness')).navigationModule(),
);
vi.mock('next/link', async () => (await import('./harness')).linkModule());
vi.mock('@/lib/db', async () => (await import('./harness')).dbModule());
vi.mock('dexie-react-hooks', async () =>
  (await import('./liveQuery')).liveQueryModule(),
);

const T0 = new Date('2026-09-16T03:00:00.000Z');

const ALL_CONFIRMED = {
  damageFree: true,
  notDeformed: true,
  mountingAreaUndamaged: true,
  labelLegible: true,
  expiryValid: true,
};

beforeEach(() => {
  resetBrowser('ko');
  stubPhotoApis();
  // Date만 멈춘다. 화면 갱신 타이머는 실제로 돌아야 시험운전 화면이 다시 그려진다.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('점검 흐름 E2E — 결과까지', () => {
  it('정상 호환 — 작업 선택부터 시험운전·저장까지 끝난다', async () => {
    const f = inspector('ko');
    await openResult(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
    );

    expect(screen.getByText(f.t('verdict.compatible'))).toBeInTheDocument();
    expect(screen.queryByText(f.t('action.title'))).not.toBeInTheDocument();
    // 체크리스트와 시험운전을 마치기 전에는 저장이 열리지 않는다.
    expect(f.button('result.save')).toBeDisabled();

    await f.completeChecklist();
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    await finishTrialRun(f);
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');

    expect(savedRecords()).toHaveLength(1);
    const [record] = savedRecords();
    expect(record.result.verdict).toBe('COMPATIBLE');
    expect(record.declaredPurpose).toBe('cutting');
    expect(record.grinderOcr).toEqual(GRINDER);
    expect(record.wheelCondition).toEqual(ALL_CONFIRMED);
    expect(record.trialRun).toMatchObject({
      requiredSeconds: 60,
      outcome: 'normal',
      findings: [],
      completed: true,
    });
  });

  it('RPM 불일치 — 부적합으로 막고 조치를 알리며 시험운전을 열지 않는다', async () => {
    const f = inspector('ko');
    await openResult(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(wheelLabel({ maxRPM: 8500 })),
    );

    expect(screen.getByText(f.t('verdict.incompatible'))).toBeInTheDocument();
    expect(document.body).toHaveTextContent(f.t('action.rpmSafety'));
    expect(document.body).toHaveTextContent(
      '숫돌 최고사용회전속도(8500rpm)가 그라인더 무부하 회전속도(11000rpm)보다 낮습니다. 파손·비산 위험이 있습니다.',
    );

    await f.completeChecklist();
    expect(
      screen.queryByRole('heading', { name: f.t('trialRun.title') }),
    ).not.toBeInTheDocument();

    // 부적합도 기록은 남긴다. 시험운전은 하지 않았으므로 기록에도 없다.
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');
    expect(savedRecords()[0].result.verdict).toBe('INCOMPATIBLE');
    expect(savedRecords()[0].trialRun).toBeUndefined();
  });

  it('지름 불일치 — 부적합과 교체 조치를 보인다', async () => {
    const f = inspector('ko');
    await openResult(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(wheelLabel({ diameter: 150 })),
    );

    expect(screen.getByText(f.t('verdict.incompatible'))).toBeInTheDocument();
    expect(document.body).toHaveTextContent(f.t('action.diameterFit'));
    expect(document.body).toHaveTextContent(
      '숫돌 지름(150mm)이 그라인더 허용 최대 지름(125mm)을 초과합니다.',
    );
  });

  it('작업 목적 불일치 — 절단 작업에 연삭용 숫돌이면 부적합이다', async () => {
    const f = inspector('ko');
    await openResult(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(wheelLabel({ purpose: 'grinding' })),
    );

    expect(screen.getByText(f.t('verdict.incompatible'))).toBeInTheDocument();
    expect(document.body).toHaveTextContent(f.t('action.workPurpose'));
    expect(document.body).toHaveTextContent(
      '오늘 작업은 절단인데 이 숫돌은 연삭용입니다. 용도에 맞지 않는 숫돌은 측면 하중으로 파손될 수 있습니다.',
    );
  });

  it('숫돌 종류 미지원 — 확인 화면에서 알리고 판정불가로 끝나며 시험운전을 열지 않는다', async () => {
    const f = inspector('ko');
    await openWheelConfirm(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(wheelLabel({ wheelType: 'other' })),
    );
    expect(document.body).toHaveTextContent(
      f.t('wheelTypeConfirm.unsupported'),
    );

    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');

    expect(
      await screen.findByText(f.t('verdict.undetermined')),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      '기타는 이 앱이 다루지 않는 종류입니다. 규격 체계가 달라 판정할 수 없으니 제조사 취급설명서를 확인하세요.',
    );
    await f.completeChecklist();
    expect(
      screen.queryByRole('heading', { name: f.t('trialRun.title') }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: f.t('result.retakeWheel') }),
    ).toBeInTheDocument();
  });

  it('숫돌 종류 unknown — 종류를 고르지 않으면 판정불가로 끝난다', async () => {
    const f = inspector('ko');
    await openWheelConfirm(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(wheelLabel({ wheelType: 'unknown' })),
    );
    expect(document.body).toHaveTextContent(f.t('wheelTypeConfirm.unknown'));

    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');

    expect(
      await screen.findByText(f.t('verdict.undetermined')),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      '숫돌 종류가 확인되지 않았습니다. 일반 결합숫돌로 확인된 경우에만 규격을 대조합니다.',
    );
    await f.completeChecklist();
    expect(
      screen.queryByRole('heading', { name: f.t('trialRun.title') }),
    ).not.toBeInTheDocument();
  });

  it('유효기한 만료 — 작업자가 확인함을 눌러도 엔진이 부적합으로 막는다', async () => {
    const f = inspector('ko');
    await openResult(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel({}, '01/2020')),
    );

    expect(screen.getByText(f.t('verdict.incompatible'))).toBeInTheDocument();
    expect(document.body).toHaveTextContent(f.t('action.expiry'));
    expect(document.body.textContent).toMatch(
      /라벨에 표시된 유효기한이 지났습니다\. 표시 01\/2020 \(2020-01-31까지\), 기준일 \d{4}-\d{2}-\d{2}\./,
    );
  });

  it('필수값 판독불가 — 비어 있는 값을 채우지 않고 판정불가로 남긴다', async () => {
    const f = inspector('ko');
    await openWheelConfirm(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(wheelLabel({ maxRPM: null })),
    );

    // 읽지 못한 값은 빈 칸으로 보이고, 라벨을 다시 보라고 알린다.
    expect(screen.getByLabelText(/최고사용회전속도/)).toHaveValue(null);
    expect(document.body).toHaveTextContent(f.t('wheelCondition.labelWarning'));

    await f.completeWheelExam();
    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');

    expect(
      await screen.findByText(f.t('verdict.undetermined')),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(f.t('group.unreadable'));
    expect(document.body).toHaveTextContent(
      '숫돌 최고사용회전속도를 읽지 못했습니다. 재촬영하거나 수동으로 값을 입력하세요.',
    );
    await f.completeChecklist();
    expect(
      screen.queryByRole('heading', { name: f.t('trialRun.title') }),
    ).not.toBeInTheDocument();
  });

  it('다각도 확인에서 손상 의심 — 확인 전에는 막고, 확인 결과가 기록에 남는다', async () => {
    const f = inspector('ko');
    const suspected = {
      ...examNotObserved(),
      status: 'suspected' as const,
      findings: [
        {
          kind: 'edge_break' as const,
          view: 'edge' as const,
          reason: '가장자리 2시 방향에 조각이 떨어진 자국이 보입니다.',
          confidence: 'high' as const,
        },
      ],
    };
    await mountApp(
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
      new FixtureExaminer().result(suspected),
    );

    await f.chooseJob('cutting');
    await f.pickPhoto();
    await f.answerGrinderCondition();
    await f.user.click(f.button('scan.grinder.proceed'));
    await f.atPath('/scan/wheel');
    await f.pickPhoto();
    await screen.findByText(f.t('scan.confirmTitle'));

    // 사진 세 장을 넣고 확인한다.
    const inputs = [
      ...document.querySelectorAll<HTMLInputElement>('input[type=file]'),
    ];
    for (const index of [0, 1, 2]) {
      await f.user.upload(
        inputs[index * 2],
        new File(['x'], `${index}.jpg`, { type: 'image/jpeg' }),
      );
    }
    await f.user.click(f.button('exam.analyze'));

    // 위치와 이유를 보여주고, 확인 전에는 진행을 막는다.
    expect(
      await screen.findByText(
        '가장자리 2시 방향에 조각이 떨어진 자국이 보입니다.',
      ),
    ).toBeInTheDocument();
    await f.answerWheelCondition();
    expect(f.button('scan.wheel.proceed')).toBeDisabled();

    await f.user.click(
      screen.getByRole('checkbox', {
        name: new RegExp(f.t('exam.acknowledge')),
      }),
    );
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');

    // 의심은 규칙엔진의 외관 손상 항목으로 이어진다. 판정 자체는 엔진이 낸
    // 그대로다 — 외관 손상은 경고(advisory)라 전체 판정을 움직이지 않는다.
    expect(
      await screen.findByText(f.t('verdict.compatible')),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      '사진에서 깨짐·균열로 보이는 부분이 있습니다. 이 숫돌을 사용하지 말고 직접 확인하세요.',
    );

    await f.completeChecklist();
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    await finishTrialRun(f);
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');

    // AI 원본 결과와 작업자 확인을 따로 남긴다.
    const saved = savedRecords()[0];
    expect(saved.wheelExam?.status).toBe('suspected');
    expect(saved.wheelExam?.findings[0].kind).toBe('edge_break');
    expect(saved.wheelExamAcknowledged).toBe(true);
    expect(saved.wheel.visibleDamage).toBe('suspected');
  });
});

describe('점검 흐름 E2E — Gate와 시험운전', () => {
  it('Grinder Condition 미완료 — 숫돌 촬영으로 넘어가지 못하고, 주소로 건너뛰어도 되돌린다', async () => {
    const f = inspector('ko');
    await mountApp(new FixtureExtractor().grinder(GRINDER));
    await f.chooseJob('cutting');
    await f.pickPhoto();
    await f.answerGrinderCondition(2);

    expect(f.button('scan.grinder.proceed')).toBeDisabled();
    expect(document.body).toHaveTextContent(
      f.t('grinderCondition.incomplete', { count: 1 }),
    );

    visit('/scan/wheel');
    await f.atPath('/scan/grinder');
    expect(
      await screen.findByText(f.t('camera.pickPhoto')),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem('wheelmatch.grinderCondition')).toBeNull();

    visit('/result');
    await f.atPath('/');
  });

  it('Wheel Condition 문제 있음 — 사용 중지를 알리고 규격 대조로 넘어가지 못한다', async () => {
    const f = inspector('ko');
    await openWheelConfirm(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
    );
    await f.answerWheelCondition(0);

    expect(screen.getByRole('alert')).toHaveTextContent(
      f.t('wheelCondition.stopTitle'),
    );
    expect(f.button('scan.wheel.proceed')).toBeDisabled();

    visit('/result');
    await f.atPath('/scan/wheel');
    expect(savedRecords()).toHaveLength(0);
  });

  it('Trial Run 전 저장 시도 — 요구 시간을 채우고 답하기 전에는 저장되지 않는다', async () => {
    const f = inspector('ko');
    await openResult(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
    );
    await f.completeChecklist();

    expect(f.button('result.save')).toBeDisabled();
    expect(document.body).toHaveTextContent(f.t('trialRun.required'));

    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    // 요구 시간 1초 전이다. 아직 답도 저장도 할 수 없다.
    f.passSeconds(59);
    expect(f.button('trialRun.confirmNormal')).toBeDisabled();
    expect(f.button('result.save')).toBeDisabled();

    // 잠긴 버튼을 억지로 눌러도 기록이 생기지 않는다.
    fireEvent.click(f.button('result.save'));
    expect(savedRecords()).toHaveLength(0);
    expect(pathname()).toBe('/result');
  });

  it('Trial Run 이상 발생 — 이상 없음을 막고 작업 중지를 알린 뒤 중지 결과로 저장한다', async () => {
    const f = inspector('ko');
    await openResult(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
    );
    await f.completeChecklist();
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    f.passSeconds(60);

    const vibration = screen.getByRole('checkbox', {
      name: f.t('trialRun.finding.vibration'),
    });
    await waitFor(() => expect(vibration).toBeEnabled(), { timeout: 3000 });
    await f.user.click(vibration);
    expect(f.button('trialRun.confirmNormal')).toBeDisabled();

    await f.user.click(f.button('trialRun.reportAbnormal'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      f.t('trialRun.stopTitle'),
    );

    await f.user.click(f.button('result.saveStopped'));
    await f.atPath('/history');
    expect(savedRecords()[0].trialRun).toMatchObject({
      outcome: 'abnormal',
      findings: ['vibration'],
    });
  });

  it('저장 후 이력 확인 — 판정·작업·두 소요시간·검사 사유가 남는다', async () => {
    const f = inspector('ko');
    await openResult(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
    );
    await f.completeChecklist();
    f.passSeconds(20);
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    await finishTrialRun(f);
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');

    // 이력 필터가 판정별 <option>도 같은 문구로 내므로, 목록(<ul>) 안에서만 찾는다.
    const list = await screen.findByRole('list');
    expect(
      within(list).getByText(f.t('verdict.compatible')),
    ).toBeInTheDocument();
    expect(within(list).getByText(f.t('home.cutting'))).toBeInTheDocument();
    // 전체 흐름은 시험운전을 포함하고, 사전점검은 시험운전 시작 직전에서 끊긴다.
    expect(
      within(list).getByText(
        f.t('history.elapsedWithTrial', { time: '1분 20초' }),
      ),
    ).toBeInTheDocument();
    expect(
      within(list).getByText(f.t('history.preTrial', { time: '20초' })),
    ).toBeInTheDocument();

    await f.user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText(/RPM 안전/)).toBeInTheDocument();
    expect(
      screen.getByText(
        '숫돌 최고사용회전속도(12200rpm)가 그라인더 무부하 회전속도(11000rpm) 이상입니다.',
      ),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(f.t('ruleVersion.label'));
  });

  it('새 사진을 찍으면 이전 Gate 답과 진행 중인 Trial Run을 버린다', async () => {
    const f = inspector('ko');
    await openResult(
      f,
      new FixtureExtractor()
        .grinder(GRINDER, { ...GRINDER, model: 'GWS 9-125 S' })
        .wheel(wheelLabel(), wheelLabel({ diameter: 115 })),
    );
    await f.completeChecklist();
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    expect(sessionStorage.getItem('wheelmatch.trialRun')).not.toBeNull();

    // 숫돌을 다시 찍는다. 앞 숫돌에 한 직접 확인과 시험운전은 이어 쓰지 않는다.
    visit('/scan/wheel');
    await f.pickPhoto();
    await screen.findByText(f.t('scan.confirmTitle'));
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([]);
    // 라벨을 다시 찍었으므로 다각도 확인도 처음부터 다시 해야 넘어간다.
    expect(f.button('scan.wheel.proceed')).toBeDisabled();
    await f.completeWheelExam();
    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');

    expect(sessionStorage.getItem('wheelmatch.trialRun')).toBeNull();
    expect(document.body).toHaveTextContent(
      '숫돌 지름(115mm)이 그라인더 허용 최대 지름(125mm) 이내입니다.',
    );
    await f.completeChecklist();
    expect(
      f.button('trialRun.startBeforeWork', { seconds: 60 }),
    ).toBeInTheDocument();

    // 그라인더를 다시 찍으면 장비 상태 답과 숫돌 쪽 값까지 모두 버린다.
    visit('/scan/grinder');
    await f.pickPhoto();
    await screen.findByText(f.t('scan.confirmTitle'));
    expect(screen.queryAllByRole('button', { pressed: true })).toEqual([]);
    await f.answerGrinderCondition();
    await f.user.click(f.button('scan.grinder.proceed'));
    await f.atPath('/scan/wheel');

    for (const key of [
      'wheelmatch.wheel',
      'wheelmatch.wheelCondition',
      'wheelmatch.trialRun',
    ]) {
      expect(sessionStorage.getItem(key)).toBeNull();
    }
    visit('/result');
    await f.atPath('/scan/wheel');
  });

  it('새로고침 후 Trial Run 복구 — 절대 시각으로 남은 시간을 이어 간다', async () => {
    const f = inspector('ko');
    const view = await openResult(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
    );
    await f.completeChecklist();
    f.passSeconds(10);
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    f.passSeconds(25);

    await reloadApp(view);
    await screen.findByText(f.t('result.title'));
    expect(pathname()).toBe('/result');

    // 체크리스트는 화면 상태라 새로고침에 사라진다. 다시 답하면 시험운전이
    // 처음부터가 아니라 남은 시간부터 보인다.
    await f.completeChecklist();
    expect(await screen.findByText('00:35')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: f.t('trialRun.startBeforeWork', { seconds: 60 }),
      }),
    ).not.toBeInTheDocument();

    await finishTrialRun(f, 35);
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');

    const [record] = savedRecords();
    expect(record.trialRun?.startedAt).toBe(
      new Date(T0.getTime() + 10_000).toISOString(),
    );
    expect(record.trialRun?.elapsedSeconds).toBe(60);
    expect(record.preTrialElapsedMs).toBe(10_000);
  });
});
