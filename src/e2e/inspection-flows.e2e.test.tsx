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
  E2E_TEST_TIMEOUT_MS,
  FixtureExtractor,
  GRINDER,
  failure,
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

// 흐름 테스트는 단위 테스트용 기본 제한(5초)으로 재지 않는다. 값과 근거는 harness.tsx.
vi.setConfig({ testTimeout: E2E_TEST_TIMEOUT_MS });

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
  it('기한 미표기 — 직접 응답 후 규격 대조·저장·이력까지 미확인을 보존한다', async () => {
    const f = inspector('ko');
    await openWheelConfirm(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(
        wheelLabel({
          expiry: null,
          markings: {
            labeledRPM: null,
            peripheralSpeedMps: null,
            boreDiameter: null,
            expiryRaw: null,
          },
        }),
      ),
    );
    await f.user.click(f.button('expiryReview.not_found'));
    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');
    expect(
      await screen.findByText(f.t('verdict.compatible'), { exact: true }),
    ).toBeInTheDocument();
    expect(f.button('result.save')).toBeDisabled();
    await f.completeChecklist();
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    await finishTrialRun(f);
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');
    const [record] = savedRecords();
    expect(record.wheel.expiry).toBeNull();
    expect(record.wheel.expiryReview).toBe('not_found');
    expect(record.wheelCondition?.expiryValid).toBeNull();
    expect(
      record.result.checks.find((c) => c.detail?.code === 'expiry.notFound'),
    ).toMatchObject({ passed: null, advisory: true });
    expect(
      await screen.findByText(f.t('verdict.compatible'), {
        exact: true,
        selector: 'span',
      }),
    ).toBeInTheDocument();
  });
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
    expect(record.wheelCondition).toEqual({
      ...ALL_CONFIRMED,
      expiryValid: null,
    });
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

  it('숫돌 종류 기타 — RPM·지름은 대조하되 제한적 규격 대조로 판정불가로 끝난다', async () => {
    // 종류를 특정하지 못한 부속품(other)도 이제 대체 Profile로 RPM·지름은
    // 대조한다(scope: 'limited'). 그래도 적합에는 이르지 못한다.
    const f = inspector('ko');
    await openWheelConfirm(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(wheelLabel({ wheelType: 'other' })),
    );
    expect(document.body).toHaveTextContent(
      f.t('wheelTypeConfirm.supportedProfile'),
    );

    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');

    expect(
      await screen.findByText(f.t('verdict.undetermined')),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      'RPM과 지름만 대조했습니다. 작업·덮개·장착 적합성은 확인되지 않아 적합 판정을 제공하지 않습니다.',
    );
    await f.completeChecklist();
    expect(
      screen.queryByRole('heading', { name: f.t('trialRun.title') }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: f.t('result.retakeWheel') }),
    ).toBeInTheDocument();
  });

  it('숫돌 종류 unknown — RPM·지름은 대조하되 제한적 규격 대조로 판정불가로 끝난다', async () => {
    const f = inspector('ko');
    await openWheelConfirm(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(wheelLabel({ wheelType: 'unknown' })),
    );
    expect(document.body).toHaveTextContent(
      f.t('wheelTypeConfirm.supportedProfile'),
    );

    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');

    expect(
      await screen.findByText(f.t('verdict.undetermined')),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      'RPM과 지름만 대조했습니다. 작업·덮개·장착 적합성은 확인되지 않아 적합 판정을 제공하지 않습니다.',
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

  it('라벨 사진에서 손상 의심 — 경고가 결과와 기록에 남고, 판정은 엔진이 낸 그대로다', async () => {
    const f = inspector('ko');
    await openWheelConfirm(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(wheelLabel({ visibleDamage: 'suspected' })),
    );

    // 의심은 작업자 상태 확인 Gate에서 먼저 알린다. Gate는 그대로 사람이 답한다.
    expect(document.body).toHaveTextContent(
      f.t('wheelCondition.aiDamageWarning'),
    );
    await f.answerWheelCondition();
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
    // 이 사진을 읽은 판독이 의심했다. 위 문장이 그대로 사실이라 출처를 덧붙이지 않는다.
    expect(document.body).not.toHaveTextContent('이어받은 것입니다');

    await f.completeChecklist();
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    await finishTrialRun(f);
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');

    const saved = savedRecords()[0];
    expect(saved.wheel.visibleDamage).toBe('suspected');
    expect(saved.wheel.visibleDamageSources).toEqual(['label_photo']);
    // 다각도 외관 확인은 점검 흐름에 없다. 하지 않은 확인을 기록에 남기지 않는다.
    expect(saved).not.toHaveProperty('wheelExam');
    expect(saved).not.toHaveProperty('wheelExamNotRun');
    expect(saved).not.toHaveProperty('wheelBackImage');
  });

  it('숫돌 확인 화면은 라벨 사진 말고 다른 사진을 받지 않는다', async () => {
    // 뒷면·가장자리·중심구멍 사진을 넣는 단계는 뺐다. 확인 화면에 사진을 넣는
    // 자리가 다시 생기면 이 테스트가 알린다.
    const f = inspector('ko');
    await openWheelConfirm(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
    );

    expect(document.querySelectorAll('input[type=file]')).toHaveLength(0);
    expect(f.button('scan.wheel.proceed')).toBeDisabled();

    // 작업자 상태 확인에 답하는 것만으로 다음으로 넘어간다.
    await f.answerWheelCondition();
    expect(f.button('scan.wheel.proceed')).toBeEnabled();
  });
});

describe('점검 흐름 E2E — Gate와 시험운전', () => {
  it('작업 선택 우회 — 이력의 새 점검 시작·주소 직접 입력 모두 작업 선택 화면으로 돌아간다', async () => {
    // 운영판에서 보고된 결함의 회귀 테스트다. 이력 화면의 "새 점검 시작"이 촬영
    // 화면으로 바로 보내, 작업 목적 대조 없이 규격만 맞으면 적합이 나왔다.
    const f = inspector('ko');
    await mountApp(new FixtureExtractor().grinder(GRINDER));
    await f.user.click(screen.getByRole('link', { name: f.t('home.history') }));
    await f.atPath('/history');

    await f.user.click(
      await screen.findByRole('link', { name: f.t('history.newInspection') }),
    );
    await f.atPath('/');
    expect(
      screen.getByRole('heading', { name: f.t('home.question') }),
    ).toBeInTheDocument();

    // 주소로 촬영·결과 화면에 직접 들어와도 작업을 고르기 전에는 되돌린다.
    visit('/scan/grinder');
    await f.atPath('/');
    visit('/scan/wheel');
    await f.atPath('/');
    visit('/result');
    await f.atPath('/');
  });

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
    expect(screen.getByText(/RPM 상한 대조/)).toBeInTheDocument();
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
    // 앞 숫돌에 한 직접 확인을 이어 쓰지 않으므로 아직 넘어갈 수 없다.
    expect(f.button('scan.wheel.proceed')).toBeDisabled();
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

describe('점검 흐름 E2E — 제한 대조와 서버 재분석', () => {
  /** 명판 분석이 네트워크로 실패해 직접 입력으로 넘어가고, 숫돌은 온라인으로 읽어 결과까지 간다 */
  async function openOfflineResult(
    f: ReturnType<typeof inspector>,
    extractor: FixtureExtractor,
  ) {
    await mountApp(extractor);
    await f.chooseJob('cutting');
    await f.pickPhoto();
    await f.user.click(
      await screen.findByRole('button', {
        name: f.t('scan.offline.continue'),
      }),
    );
    await screen.findByText(f.t('scan.offline.notice'), { exact: false });

    // 작업자가 명판을 보고 값을 직접 넣는다. 추정값은 없다.
    const [, rpm, diameter] = screen.getAllByPlaceholderText(
      f.t('field.placeholder'),
    );
    await f.user.type(rpm, '11000');
    await f.user.type(diameter, '125');
    await f.user.click(
      screen.getByRole('checkbox', {
        name: new RegExp(f.t('manualConfirm.label')),
      }),
    );
    await f.answerGrinderCondition();
    await f.user.click(f.button('scan.grinder.proceed'));
    await f.atPath('/scan/wheel');

    await f.pickPhoto();
    await screen.findByText(f.t('scan.confirmTitle'));
    await f.answerWheelCondition();
    await f.user.click(f.button('scan.wheel.proceed'));
    await f.atPath('/result');
    await screen.findByText(f.t('result.title'));
  }

  it('규격이 맞아도 판정불가·시험운전 없음으로 저장되고 판독 경로가 남는다', async () => {
    const f = inspector('ko');
    await openOfflineResult(
      f,
      new FixtureExtractor().grinder(failure('network')).wheel(wheelLabel()),
    );

    expect(screen.getByText(f.t('verdict.undetermined'))).toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      f.t('result.undetermined.offlineLimited'),
    );
    // 왜 제한됐는지를 기록된 대로 적는다 — 명판을 직접 입력했고, 숫돌은 서버로 읽었다.
    expect(document.body).toHaveTextContent(
      `${f.t('common.grinder')}: ${f.t('offline.cause.manual')}`,
    );
    expect(document.body).not.toHaveTextContent(`${f.t('common.wheel')}: `);
    await f.completeChecklist();
    expect(
      screen.queryByRole('heading', { name: f.t('trialRun.title') }),
    ).not.toBeInTheDocument();

    await f.user.click(f.button('result.save'));
    await f.atPath('/history');
    const [record] = savedRecords();
    expect(record.analysisMode).toBe('offline_limited');
    expect(record.analysisLimitCauses).toEqual({ grinder: 'manual' });
    expect(record.result.verdict).toBe('UNDETERMINED');
    expect(record.grinderOcr).toBeUndefined();
    expect(record.trialRun).toBeUndefined();
    const limited = record.result.checks.find(
      (check) => check.detail?.code === 'analysisMode.offlineLimited',
    );
    // 기록에 남는 이름과 사유도 까닭을 단정하지 않는다.
    expect(limited?.rule).toBe('제한 대조');
    expect(limited?.reason).not.toMatch(/오프라인|서버 분석 없이|서버에 닿지/);
  });

  it('재연결 후 작업자가 재분석을 골라 AI 값이 같음을 확인하면 온라인 대조로 바뀐다', async () => {
    const f = inspector('ko');
    await openOfflineResult(
      f,
      new FixtureExtractor()
        .grinder(failure('network'), GRINDER)
        .wheel(wheelLabel()),
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
    // 제한을 푼 점검의 기록에는 까닭이 남지 않는다.
    expect(record.analysisLimitCauses).toBeUndefined();
    expect(record.grinder.noLoadRPM).toBe(11000);
    expect(record.grinderOcr).toEqual(GRINDER);
  });

  /**
   * 명판은 온라인으로 읽고, 숫돌 라벨 분석이 네트워크로 실패해 작업자가 라벨을
   * 보고 직접 넣어 결과까지 간다. 확정값에는 외관 판독도 원본 표시도 없다.
   */
  async function openOfflineWheelResult(
    f: ReturnType<typeof inspector>,
    extractor: FixtureExtractor,
  ) {
    await mountApp(extractor);
    await f.chooseJob('cutting');
    await f.pickPhoto();
    await f.answerGrinderCondition();
    await f.user.click(f.button('scan.grinder.proceed'));
    await f.atPath('/scan/wheel');

    await f.pickPhoto();
    await f.user.click(
      await screen.findByRole('button', {
        name: f.t('scan.offline.continue'),
      }),
    );
    await screen.findByText(f.t('scan.offline.notice'), { exact: false });

    // 작업자가 라벨을 보고 값을 직접 넣는다. 추정값은 없다.
    const [rpm, diameter, thickness] = screen.getAllByPlaceholderText(
      f.t('field.placeholder'),
    );
    await f.user.type(rpm, '12200');
    await f.user.type(diameter, '125');
    await f.user.type(thickness, '1.6');
    const [purpose, wheelType] = screen.getAllByRole('combobox');
    await f.user.selectOptions(purpose, 'cutting');
    await f.user.selectOptions(wheelType, 'bonded_abrasive');
    await f.user.click(f.button('expiryReview.marked'));
    await f.user.type(screen.getByPlaceholderText('MM/YYYY'), '12/2099');
    // 값을 고치면 직접 확인이 풀린다. 맨 마지막에 누른다.
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

  const DAMAGE_SUSPECTED =
    '사진에서 깨짐·균열로 보이는 부분이 있습니다. 이 숫돌을 사용하지 말고 직접 확인하세요.';

  it('직접 넣은 숫돌을 재분석한 AI가 손상을 의심하면 — 손상 항목을 다시 확인해야 온라인 대조로 바뀌고 경고가 기록에 남는다', async () => {
    const f = inspector('ko');
    const reanalyzed = wheelLabel({ visibleDamage: 'suspected' });
    await openOfflineWheelResult(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(failure('network'), reanalyzed),
    );
    expect(screen.getByText(f.t('verdict.undetermined'))).toBeInTheDocument();
    // 서버가 사진을 보기 전이다. 외관은 확인할 수 없다고만 말한다.
    expect(document.body).not.toHaveTextContent(DAMAGE_SUSPECTED);

    await f.user.click(f.button('offline.reanalyze'));

    // 경고는 전환하기 전에 결과에 더해진다. 값이 모두 같아도 전환은 아직 막혀 있다.
    expect(
      await screen.findByText(f.t('offline.damageRecheck')),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(DAMAGE_SUSPECTED);
    expect(f.button('offline.accept')).toBeDisabled();
    expect(screen.getByText(f.t('verdict.undetermined'))).toBeInTheDocument();

    await f.user.click(
      screen.getByRole('button', {
        name: new RegExp(f.t('wheelCondition.confirmed')),
      }),
    );
    await f.user.click(f.button('offline.accept'));

    // 외관 손상은 경고다. 판정은 엔진이 낸 그대로다.
    expect(
      await screen.findByText(f.t('verdict.compatible')),
    ).toBeInTheDocument();
    expect(document.body).toHaveTextContent(DAMAGE_SUSPECTED);
    await f.completeChecklist();
    await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
    await finishTrialRun(f);
    await f.user.click(f.button('result.save'));
    await f.atPath('/history');

    const [record] = savedRecords();
    expect(record.analysisMode).toBe('online');
    expect(record.result.verdict).toBe('COMPATIBLE');
    // AI가 올린 의심과 읽어 온 표시가 확정값에 들어가 판정 근거와 맞는다.
    expect(record.wheel.visibleDamage).toBe('suspected');
    expect(record.wheel.markings).toEqual(reanalyzed.markings);
    const codes = record.result.checks.map((check) => check.detail?.code);
    expect(codes).toContain('visibleDamage.suspected');
    expect(codes).toContain('mountingSpec.shown');
    // 작업자가 넣은 값과 그 출처는 그대로다.
    expect(record.wheel).toMatchObject({
      maxRPM: 12200,
      diameter: 125,
      thickness: 1.6,
      purpose: 'cutting',
      wheelType: 'bonded_abrasive',
      rpmSource: 'user',
      confidence: 'high',
    });
    // 숫돌 상태의 답은 작업자가 한 그대로이고, OCR 원본 자리에는 AI가 읽은 그대로다.
    expect(record.wheelCondition?.damageFree).toBe(true);
    expect(record.wheelOcr).toEqual(reanalyzed);
  });

  it('직접 넣은 숫돌을 재분석한 AI가 손상을 의심하고 작업자가 문제 있음으로 답하면 — 사용 중지를 알리고 저장되지 않으며, 숫돌 확인으로 돌아간다', async () => {
    const f = inspector('ko');
    await openOfflineWheelResult(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(failure('network'), wheelLabel({ visibleDamage: 'suspected' })),
    );

    await f.user.click(f.button('offline.reanalyze'));
    await screen.findByText(f.t('offline.damageRecheck'));
    await f.user.click(
      screen.getByRole('button', {
        name: new RegExp(f.t('wheelCondition.issue')),
      }),
    );

    // 결과 화면을 닫고 사용 중지를 알린다. 판정도 저장 버튼도 없다.
    expect(pathname()).toBe('/result');
    expect(screen.getByRole('alert')).toHaveTextContent(
      f.t('wheelCondition.stopTitle'),
    );
    expect(document.body).not.toHaveTextContent(f.t('result.title'));
    expect(
      screen.queryByRole('button', { name: f.t('result.save') }),
    ).not.toBeInTheDocument();
    expect(
      JSON.parse(sessionStorage.getItem('wheelmatch.wheelCondition') ?? 'null'),
    ).toMatchObject({ damageFree: false });

    await f.user.click(
      screen.getByRole('link', { name: f.t('result.retakeWheel') }),
    );
    await f.atPath('/scan/wheel');
    expect(savedRecords()).toHaveLength(0);
    // 주소로 결과 화면에 들어와도 열리지 않는다.
    visit('/result');
    await f.atPath('/scan/wheel');
  });

  it('직접 넣은 숫돌을 재분석한 AI가 표기를 서로 어긋나게 읽으면 — 온라인 대조로 바꿔도 판정불가이고 시험운전이 열리지 않는다', async () => {
    const f = inspector('ko');
    // Φ125 12,200rpm은 약 80m/s다. 서버가 m/s를 8로 읽었다면 둘 중 하나는 오독이다.
    const reanalyzed = wheelLabel({
      markings: {
        labeledRPM: 12200,
        peripheralSpeedMps: 8,
        boreDiameter: 22.23,
        expiryRaw: '12/2099',
      },
    });
    await openOfflineWheelResult(
      f,
      new FixtureExtractor()
        .grinder(GRINDER)
        .wheel(failure('network'), reanalyzed),
    );

    await f.user.click(f.button('offline.reanalyze'));
    await f.user.click(
      await screen.findByRole('button', { name: f.t('offline.accept') }),
    );

    // 제한 대조는 풀렸다. 막는 것은 표기 일치 규칙이다.
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', {
          name: `⚠ ${f.t('rule.offlineLimited')}`,
        }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText(f.t('verdict.undetermined'))).toBeInTheDocument();
    expect(
      screen.queryByText(f.t('verdict.compatible')),
    ).not.toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      f.t('reason.unitConsistency.mismatch'),
    );
    await f.completeChecklist();
    expect(
      screen.queryByRole('heading', { name: f.t('trialRun.title') }),
    ).not.toBeInTheDocument();

    await f.user.click(f.button('result.save'));
    await f.atPath('/history');
    const [record] = savedRecords();
    expect(record.analysisMode).toBe('online');
    expect(record.result.verdict).toBe('UNDETERMINED');
    expect(record.trialRun).toBeUndefined();
    expect(
      record.result.checks.find(
        (check) => check.detail?.code === 'unitConsistency.mismatch',
      ),
    ).toMatchObject({ passed: null });
  });
});
