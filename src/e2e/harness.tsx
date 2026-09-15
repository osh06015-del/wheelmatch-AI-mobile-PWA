// 점검 흐름 E2E의 테스트 경계.
//
// 실제 페이지·규칙엔진·Gate·시험운전·상태 저장소(sessionStorage)·문구 파일은 그대로
// 쓰고, 이 환경(happy-dom)에 없거나 앱 밖에 있는 것만 바꾼다.
//
//   카메라·OCR          → FixtureExtractor. 앱의 setExtractorForTesting 경계로 넣는다
//   사진 디코딩·미리보기 → createImageBitmap·URL.createObjectURL 자리 채움
//   IndexedDB            → 메모리 저장소
//   Next 라우터·Link     → 메모리 라우터
//
// 새로고침은 모듈을 새로 불러와 흉내 낸다. 화면 상태와 모듈 안의 값은 사라지고
// sessionStorage·localStorage만 남는다 — 실제 새로고침과 같은 조건이다. 그래서
// 주소와 메모리 DB는 모듈이 아니라 globalThis에 둔다.
//
// 실제 브라우저가 아니다. 카메라 촬영, 실제 IndexedDB, 실제 OCR, Next의 라우팅과
// 서버 렌더는 여기서 확인되지 않는다 — Browser pane과 실기기가 맡는다.

import {
  act,
  render,
  screen,
  waitFor,
  type RenderResult,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type ComponentType,
} from 'react';
import { expect, vi } from 'vitest';

import type { NewInspection, StoredInspection } from '@/lib/db';
import { translate, type Locale, type MessageKey } from '@/lib/i18n';
import type { ExtractFailure } from '@/lib/ocr/errors';
import type { OCRExtractor } from '@/lib/ocr/extractor';
import { normalizeExpiry } from '@/lib/ocr/parser';
import type { GrinderSpec, WheelSpec } from '@/lib/rules/types';

type Params = Record<string, string | number>;

// ─── 주소와 저장소: 새로고침을 넘어 남아야 해서 globalThis에 둔다 ───

interface BrowserState {
  path: string;
  listeners: Set<() => void>;
  records: StoredInspection[];
}

const STATE_KEY = '__wheelmatchE2e__';

function browser(): BrowserState {
  const holder = globalThis as typeof globalThis & {
    [STATE_KEY]?: BrowserState;
  };
  const existing = holder[STATE_KEY];
  if (existing) return existing;
  const created: BrowserState = {
    path: '/',
    listeners: new Set(),
    records: [],
  };
  holder[STATE_KEY] = created;
  return created;
}

function goTo(path: string): void {
  const state = browser();
  state.path = path;
  for (const listener of [...state.listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  browser().listeners.add(listener);
  return () => {
    browser().listeners.delete(listener);
  };
}

function currentPath(): string {
  return browser().path;
}

const memoryRouter = {
  push: goTo,
  replace: goTo,
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
  prefetch: () => undefined,
};

/** vi.mock('next/navigation')에 넣는 모듈 */
export function navigationModule() {
  return { useRouter: () => memoryRouter };
}

function MemoryLink({
  href,
  children,
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        // 실제 Link처럼 문서를 새로 읽지 않고 화면만 옮긴다.
        event.preventDefault();
        goTo(href);
      }}
    >
      {children}
    </a>
  );
}

/** vi.mock('next/link')에 넣는 모듈 */
export function linkModule() {
  return { default: MemoryLink };
}

/** vi.mock('@/lib/db')에 넣는 모듈. 저장한 기록은 새로고침을 넘어 남는다. */
export function dbModule() {
  return {
    saveInspection: async (record: NewInspection): Promise<number> => {
      const records = browser().records;
      const id = records.length + 1;
      records.push({ ...record, id });
      return id;
    },
    listInspections: async (limit = 50): Promise<StoredInspection[]> =>
      [...browser().records]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
        .slice(0, limit),
    deleteInspection: async (id: number): Promise<void> => {
      const records = browser().records;
      const index = records.findIndex((record) => record.id === id);
      if (index >= 0) records.splice(index, 1);
    },
    clearInspections: async (): Promise<void> => {
      browser().records.length = 0;
    },
  };
}

/** 저장 버튼으로 남은 기록 */
export function savedRecords(): readonly StoredInspection[] {
  return browser().records;
}

// ─── 카메라·OCR 대신 넣는 추출 결과 ───

type Step<T> = T | (() => Promise<T>);

async function take<T>(queue: Step<T>[], what: string): Promise<T> {
  const step = queue.shift();
  if (step === undefined) {
    throw new Error(`E2E fixture has no ${what} result left`);
  }
  if (typeof step === 'function') return (step as () => Promise<T>)();
  return step;
}

/** 사진을 넣을 때마다 정해 둔 결과를 차례로 돌려준다. */
export class FixtureExtractor implements OCRExtractor {
  private readonly grinders: Step<GrinderSpec>[] = [];
  private readonly wheels: Step<WheelSpec>[] = [];

  grinder(...steps: Step<GrinderSpec>[]): this {
    this.grinders.push(...steps);
    return this;
  }

  wheel(...steps: Step<WheelSpec>[]): this {
    this.wheels.push(...steps);
    return this;
  }

  extractGrinder(): Promise<GrinderSpec> {
    return take(this.grinders, 'grinder');
  }

  extractWheel(): Promise<WheelSpec> {
    return take(this.wheels, 'wheel');
  }
}

/**
 * 분석 실패. 새로고침(모듈 재적재) 뒤에도 화면의 instanceof와 맞도록
 * 부르는 순간에 오류 클래스를 불러와 만든다.
 */
export function failure<T>(
  kind: ExtractFailure,
  status: number | null = null,
): () => Promise<T> {
  return async () => {
    const { ExtractError } = await import('@/lib/ocr/errors');
    throw new ExtractError(kind, status);
  };
}

export const GRINDER: GrinderSpec = {
  model: 'GWS 750-125',
  noLoadRPM: 11000,
  maxWheelDiameter: 125,
  rawText: 'GWS 750-125 n0 11000 min-1 max 125mm',
  confidence: 'high',
};

/** 라벨이 선명한 5인치 절단용 결합숫돌. 시나리오마다 필요한 값만 바꾼다. */
export function wheelLabel(
  overrides: Partial<WheelSpec> = {},
  expiryRaw = '12/2099',
): WheelSpec {
  const maxRPM = overrides.maxRPM === undefined ? 12200 : overrides.maxRPM;
  return {
    maxRPM,
    diameter: 125,
    thickness: 1.6,
    purpose: 'cutting',
    wheelType: 'bonded_abrasive',
    visibleDamage: 'none_visible',
    markings: {
      labeledRPM: maxRPM,
      peripheralSpeedMps: null,
      boreDiameter: 22.23,
      expiryRaw,
    },
    expiry: normalizeExpiry(expiryRaw),
    ...(maxRPM === null ? {} : { rpmSource: 'label' as const }),
    rawText: `125x1.6x22.23 ${maxRPM ?? '?'}rpm ${expiryRaw}`,
    confidence: 'high',
    ...overrides,
  };
}

// ─── 앱 열기 ───

/** happy-dom에 없는 사진 API를 채운다. 사진 내용은 추출기가 보지 않으므로 크기만 준다. */
export function stubPhotoApis(): void {
  vi.stubGlobal('createImageBitmap', async () => ({
    width: 640,
    height: 480,
    close: () => undefined,
  }));
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, {
      createObjectURL: () => 'blob:e2e-photo',
      revokeObjectURL: () => undefined,
    }),
  );
}

/** 새 탭처럼 비운다. 언어는 이 기기에 저장해 둔 값으로 둔다. */
export function resetBrowser(locale: Locale): void {
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem('wheelmatch.locale', locale);
  const state = browser();
  state.path = '/';
  state.records.length = 0;
  document.title = '';
  document.documentElement.lang = '';
}

const PAGES: Record<string, () => Promise<{ default: ComponentType }>> = {
  '/': () => import('@/app/page'),
  '/scan/grinder': () => import('@/app/scan/grinder/page'),
  '/scan/wheel': () => import('@/app/scan/wheel/page'),
  '/result': () => import('@/app/result/page'),
  '/history': () => import('@/app/history/page'),
};

/**
 * 지금 주소로 앱을 연다.
 *
 * 모듈을 새로 불러오므로 새로고침과 같다 — 화면 상태와 모듈 안의 값은 사라지고
 * 브라우저 저장소와 주소만 남는다. 추출기는 새로 불러온 모듈에 넣어야 화면이 쓴다.
 */
export async function mountApp(
  extractor: OCRExtractor | null = null,
): Promise<RenderResult> {
  vi.resetModules();
  const { setExtractorForTesting } = await import('@/lib/ocr/extractor');
  setExtractorForTesting(extractor);

  const pages: Record<string, ComponentType> = {};
  for (const [path, load] of Object.entries(PAGES)) {
    pages[path] = (await load()).default;
  }
  const { DocumentLocale } = await import('@/components/DocumentLocale');

  function App() {
    const path = useSyncExternalStore(subscribe, currentPath, currentPath);
    const Page = pages[path];
    if (!Page) throw new Error(`E2E has no page for ${path}`);
    return (
      <>
        <Page key={path} />
        <DocumentLocale />
      </>
    );
  }

  return render(<App />);
}

/** 새로고침. 같은 주소를 다시 연다. */
export async function reloadApp(
  view: RenderResult,
  extractor: OCRExtractor | null = null,
): Promise<RenderResult> {
  view.unmount();
  return mountApp(extractor);
}

/** 주소창에 주소를 직접 넣은 것처럼 옮긴다. 화면의 Gate를 건너뛰려는 시도다. */
export function visit(path: string): void {
  act(() => goTo(path));
}

export function pathname(): string {
  return currentPath();
}

// ─── 작업자 ───

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 고른 언어의 문구로 화면을 찾아 누르는 작업자. */
export function inspector(locale: Locale) {
  const t = (key: MessageKey, params?: Params) =>
    translate(locale, key, params);
  const user = userEvent.setup();
  const button = (key: MessageKey, params?: Params) =>
    screen.getByRole('button', { name: t(key, params) });
  const buttonsContaining = (key: MessageKey) =>
    screen.getAllByRole('button', { name: new RegExp(escapeRegExp(t(key))) });

  return {
    t,
    user,
    button,

    /** 화면 이동이 끝날 때까지 기다린다. */
    async atPath(path: string) {
      await waitFor(() => expect(currentPath()).toBe(path));
    },

    async chooseJob(job: 'cutting' | 'grinding') {
      const label = t(job === 'cutting' ? 'home.cutting' : 'home.grinding');
      await user.click(
        await screen.findByRole('button', {
          name: new RegExp(escapeRegExp(label)),
        }),
      );
      await waitFor(() => expect(currentPath()).toBe('/scan/grinder'));
    },

    /** 카메라를 쓸 수 없는 환경의 갤러리 입력으로 사진 한 장을 넣는다. */
    async pickPhoto() {
      await screen.findByText(t('camera.pickPhoto'));
      const input =
        document.querySelector<HTMLInputElement>('input[type=file]');
      if (!input) throw new Error('gallery input is missing');
      await user.upload(
        input,
        new File(['label'], 'label.jpg', { type: 'image/jpeg' }),
      );
    },

    /** 그라인더 상태 다섯 항목에 답한다. skip 번째 항목은 비워 둔다. */
    async answerGrinderCondition(skip?: number) {
      await screen.findByText(t('scan.confirmTitle'));
      for (const [index, item] of buttonsContaining(
        'grinderCondition.confirmed',
      ).entries()) {
        if (index !== skip) await user.click(item);
      }
    },

    /** 숫돌 상태 다섯 항목에 답한다. issueAt 번째 항목은 문제 있음으로 답한다. */
    async answerWheelCondition(issueAt?: number) {
      await screen.findByText(t('scan.confirmTitle'));
      const confirmed = buttonsContaining('wheelCondition.confirmed');
      const issues = buttonsContaining('wheelCondition.issue');
      for (const [index, item] of confirmed.entries()) {
        await user.click(index === issueAt ? issues[index] : item);
      }
    },

    async completeChecklist() {
      for (const box of screen.getAllByRole('checkbox')) {
        if (!(box as HTMLInputElement).checked) await user.click(box);
      }
    },

    /** 시계를 앞으로 돌린다. 시험운전 남은 시간은 절대 시각으로 계산된다. */
    passSeconds(seconds: number) {
      act(() => {
        vi.setSystemTime(Date.now() + seconds * 1000);
      });
    },
  };
}

export type Inspector = ReturnType<typeof inspector>;

/** 작업 선택 → 명판 → 장비 상태 → 숫돌 사진까지. 숫돌 값 확인 화면에서 멈춘다. */
export async function openWheelConfirm(
  f: Inspector,
  extractor: FixtureExtractor,
): Promise<RenderResult> {
  const view = await mountApp(extractor);
  await f.chooseJob('cutting');
  await f.pickPhoto();
  await f.answerGrinderCondition();
  await f.user.click(f.button('scan.grinder.proceed'));
  await f.atPath('/scan/wheel');
  await f.pickPhoto();
  await screen.findByText(f.t('scan.confirmTitle'));
  return view;
}

/** 숫돌 상태에 모두 답하고 규격 대조 결과 화면까지 간다. */
export async function openResult(
  f: Inspector,
  extractor: FixtureExtractor,
): Promise<RenderResult> {
  const view = await openWheelConfirm(f, extractor);
  await f.answerWheelCondition();
  await f.user.click(f.button('scan.wheel.proceed'));
  await f.atPath('/result');
  await screen.findByText(f.t('result.title'));
  return view;
}

/** 시험운전 요구 시간을 채우고 이상 없음으로 답한다. */
export async function finishTrialRun(f: Inspector, seconds = 60) {
  f.passSeconds(seconds);
  // 화면은 0.5초마다 다시 그린다. 그 사이 시계가 넘어간 것을 보고 버튼이 열린다.
  await waitFor(
    () => expect(f.button('trialRun.confirmNormal')).toBeEnabled(),
    { timeout: 3000 },
  );
  await f.user.click(f.button('trialRun.confirmNormal'));
}

/**
 * 화면에 한국어가 섞였는지 본다. 보이는 글자뿐 아니라 접힌 내용, aria-label,
 * placeholder, 탭 제목까지 본다. 언어 선택 버튼의 '한국어'는 그 언어를 그 언어로
 * 적은 것이라 뺀다.
 */
export function expectNoKorean(): void {
  const attributes = [
    ...document.querySelectorAll('[aria-label], [placeholder], [alt], [title]'),
  ].flatMap((element) =>
    ['aria-label', 'placeholder', 'alt', 'title'].map(
      (name) => element.getAttribute(name) ?? '',
    ),
  );
  const text = [document.body.textContent ?? '', document.title, ...attributes]
    .join('\n')
    .replaceAll('한국어', '');
  expect(text.match(/[가-힣][^\n]{0,40}/g) ?? []).toEqual([]);
}
