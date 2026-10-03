// 점검 흐름 E2E — 한국어가 아닌 언어.
//
// "번역 파일이 있다"가 아니라, 작업자가 첫 화면에서 언어를 고르면 촬영·값 확인·
// 결과·시험운전·저장·이력까지 그 언어로만 진행되는지 본다. 화면마다 문서 전체의
// 글자(접힌 내용 포함)와 aria-label·placeholder·탭 제목에서 한글을 찾는다.
//
// 따로 돌리기: npx vitest run src/e2e

import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LOCALES } from '@/lib/i18n';
import {
  FixtureExtractor,
  GRINDER,
  expectNoKorean,
  failure,
  finishTrialRun,
  inspector,
  mountApp,
  openResult,
  resetBrowser,
  stubPhotoApis,
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

const HTML_LANG = { en: 'en', vi: 'vi', id: 'id', zh: 'zh-Hans' } as const;
type ForeignLocale = keyof typeof HTML_LANG;

beforeEach(() => {
  resetBrowser('ko');
  stubPhotoApis();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-16T03:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe.each(Object.keys(HTML_LANG) as ForeignLocale[])(
  '%s — 고른 언어로 끝까지 진행한다',
  (locale) => {
    it('첫 화면에서 언어를 고르면 작업 선택부터 저장·이력까지 한국어가 나오지 않는다', async () => {
      const f = inspector(locale);
      await mountApp(
        new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
      );

      // 한국어로 열린 첫 화면에서 작업자가 직접 언어를 고른다.
      const label = LOCALES.find((entry) => entry.code === locale)?.label;
      await f.user.click(screen.getByRole('button', { name: label }));
      await waitFor(() =>
        expect(document.documentElement.lang).toBe(HTML_LANG[locale]),
      );
      expect(document.title).toBe(f.t('meta.title'));
      expectNoKorean();

      await f.chooseJob('cutting');
      await screen.findByText(f.t('camera.pickPhoto'));
      expectNoKorean(); // 명판 촬영 화면과 카메라 오류 안내

      await f.pickPhoto();
      await screen.findByText(f.t('scan.confirmTitle'));
      expectNoKorean(); // 명판 값 확인·항목 설명·Grinder Condition

      await f.answerGrinderCondition();
      await f.user.click(f.button('scan.grinder.proceed'));
      await f.atPath('/scan/wheel');
      await screen.findByText(f.t('camera.pickPhoto'));
      expectNoKorean(); // 필요한 숫돌 조건과 라벨 촬영 화면

      await f.pickPhoto();
      await screen.findByText(f.t('scan.confirmTitle'));
      expectNoKorean(); // 숫돌 값 확인·종류 선택·Wheel Condition

      await f.answerWheelCondition();
      await f.user.click(f.button('scan.wheel.proceed'));
      await f.atPath('/result');
      expect(
        await screen.findByText(f.t('verdict.compatible')),
      ).toBeInTheDocument();
      expectNoKorean(); // 판정·4분류·검사 사유·규칙 근거·위험사항·면책

      await f.completeChecklist();
      await f.user.click(f.button('trialRun.startBeforeWork', { seconds: 60 }));
      expectNoKorean(); // 시험운전 진행 화면
      await finishTrialRun(f);
      await f.user.click(f.button('result.save'));
      await f.atPath('/history');

      await f.user.click(
        await screen.findByRole('button', { expanded: false }),
      );
      expectNoKorean(); // 이력과 펼친 검사 사유
    });

    it('분석 실패와 부적합 조치도 고른 언어로 안내한다', async () => {
      resetBrowser(locale);
      const f = inspector(locale);
      await mountApp(
        new FixtureExtractor()
          .grinder(failure('network'), GRINDER)
          .wheel(wheelLabel({ maxRPM: 8500 })),
      );

      await f.chooseJob('cutting');
      await f.pickPhoto();
      expect(await screen.findByRole('alert')).toHaveTextContent(
        f.t('error.network'),
      );
      expectNoKorean();

      // 같은 사진으로 다시 분석하면 이어서 진행된다.
      await f.user.click(f.button('scan.retryAnalysis'));
      await f.answerGrinderCondition();
      await f.user.click(f.button('scan.grinder.proceed'));
      await f.atPath('/scan/wheel');
      await f.pickPhoto();
      await f.answerWheelCondition();
      await f.user.click(f.button('scan.wheel.proceed'));
      await f.atPath('/result');

      expect(
        await screen.findByText(f.t('verdict.incompatible')),
      ).toBeInTheDocument();
      expect(document.body).toHaveTextContent(f.t('action.rpmSafety'));
      expectNoKorean();
    });
  },
);

describe('영어 판정 문구', () => {
  it('적합을 SPECS MATCH로 적는다 — 사용해도 된다는 말로 읽히지 않게', async () => {
    resetBrowser('en');
    const f = inspector('en');
    await openResult(
      f,
      new FixtureExtractor().grinder(GRINDER).wheel(wheelLabel()),
    );

    expect(screen.getByText('SPECS MATCH')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ok to use|safe to use/i);
  });
});
