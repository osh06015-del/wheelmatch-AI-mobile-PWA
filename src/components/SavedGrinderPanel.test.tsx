// 저장된 그라인더 패널 — 선택은 확인 후에만 적용되고, 수정·삭제는 한 번 더 묻는다.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { list, add, update, remove } = vi.hoisted(() => ({
  list: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

// 실제 구독 대신, 테스트가 setItems로 미리 넣어 둔 최신 목록을 그대로 돌려준다.
// querier(=store.list)는 호출은 해 두되(모듈 형태를 실제와 맞추기 위해) 반환값은 쓰지 않는다.
let currentItems: SavedGrinder[] = [];
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (querier: () => Promise<unknown>) => {
    void querier();
    return currentItems;
  },
}));

vi.mock('@/lib/db/savedGrinderStore', () => ({
  savedGrinderStore: { list, add, update, remove },
}));

import { SavedGrinderPanel } from './SavedGrinderPanel';
import type {
  SavedGrinder,
  SavedGrinderFields,
} from '@/lib/db/savedGrinderModel';

function item(overrides: Partial<SavedGrinder> = {}): SavedGrinder {
  return {
    id: 1,
    schemaVersion: 1,
    alias: '1번 그라인더',
    savedAt: '2026-09-17T00:00:00.000Z',
    model: 'GWS 750-125',
    noLoadRPM: '11000',
    maxWheelDiameter: '125',
    spindleThread: 'M14',
    guardType: 'grinding',
    guardSize: '125',
    ...overrides,
  };
}

const CURRENT: SavedGrinderFields = {
  model: 'GWS 750-125',
  noLoadRPM: '11000',
  maxWheelDiameter: '125',
  spindleThread: 'M14',
  guardType: 'grinding',
  guardSize: '125',
};

beforeEach(() => {
  list.mockReset();
  add.mockReset();
  update.mockReset();
  remove.mockReset();
});

function setItems(items: SavedGrinder[]) {
  currentItems = items;
  list.mockResolvedValue(items);
}

describe('저장된 그라인더 목록 — 선택은 확인 후에만 적용된다', () => {
  it('선택 버튼을 눌러도 곧바로 입력칸이 바뀌지 않는다 — 적용을 눌러야 바뀐다', async () => {
    const user = userEvent.setup();
    setItems([item()]);
    const onApply = vi.fn();
    render(<SavedGrinderPanel currentFields={CURRENT} onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: '선택' }));
    expect(onApply).not.toHaveBeenCalled();

    // 적용 확인 문구가 뜬다.
    expect(
      screen.getByText('이 값을 입력칸에 적용할까요?', { exact: false }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '적용' }));
    expect(onApply).toHaveBeenCalledWith({
      model: 'GWS 750-125',
      noLoadRPM: '11000',
      maxWheelDiameter: '125',
      spindleThread: 'M14',
      guardType: 'grinding',
      guardSize: '125',
    });
  });

  it('지금 값과 다르면 다르다는 문구로 경고하고, 취소하면 적용하지 않는다', async () => {
    const user = userEvent.setup();
    setItems([item({ noLoadRPM: '8500' })]);
    const onApply = vi.fn();
    render(<SavedGrinderPanel currentFields={CURRENT} onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: '선택' }));
    expect(
      screen.getByText('지금 읽은 값과 다릅니다', { exact: false }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(
      screen.queryByText('지금 읽은 값과 다릅니다', { exact: false }),
    ).not.toBeInTheDocument();
  });
});

describe('저장된 그라인더 목록 — 수정·삭제는 한 번 더 확인한다', () => {
  it('수정 후 저장을 눌러도 곧바로 반영되지 않고, 한 번 더 확인해야 한다', async () => {
    const user = userEvent.setup();
    setItems([item()]);
    render(<SavedGrinderPanel currentFields={CURRENT} onApply={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '수정' }));
    const modelInput = screen.getByDisplayValue('GWS 750-125');
    await user.clear(modelInput);
    await user.type(modelInput, 'GWS 800');

    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(update).not.toHaveBeenCalled();
    expect(
      screen.getByText('덮어쓸까요?', { exact: false }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '덮어쓰기' }));
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, model: 'GWS 800' }),
    );
  });

  it('삭제 버튼을 눌러도 곧바로 지워지지 않고, 한 번 더 확인해야 한다', async () => {
    const user = userEvent.setup();
    setItems([item()]);
    render(<SavedGrinderPanel currentFields={CURRENT} onApply={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '삭제' }));
    expect(remove).not.toHaveBeenCalled();
    expect(
      screen.getByText('되돌릴 수 없습니다', { exact: false }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '삭제' }));
    expect(remove).toHaveBeenCalledWith(1);
  });
});

describe('저장된 그라인더 목록 — 현재 값 저장', () => {
  it('별칭 없이 저장을 누르면 막히고, 별칭을 채우면 현재 값만 저장한다', async () => {
    const user = userEvent.setup();
    setItems([]);
    render(<SavedGrinderPanel currentFields={CURRENT} onApply={vi.fn()} />);

    await user.click(
      screen.getByRole('button', { name: '현재 입력값을 새로 저장' }),
    );
    expect(add).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('별칭을 입력하세요');

    const aliasInputs = screen.getAllByLabelText('별칭');
    await user.type(aliasInputs[aliasInputs.length - 1], '2번 그라인더');
    await user.click(
      screen.getByRole('button', { name: '현재 입력값을 새로 저장' }),
    );

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: '2번 그라인더',
        ...CURRENT,
      }),
    );
    // 사진·OCR·Gate·판정 관련 키는 저장 형태 자체에 없다.
    const saved = add.mock.calls[0][0];
    expect(saved).not.toHaveProperty('photo');
    expect(saved).not.toHaveProperty('ocr');
    expect(saved).not.toHaveProperty('condition');
    expect(saved).not.toHaveProperty('userConfirmed');
  });
});
