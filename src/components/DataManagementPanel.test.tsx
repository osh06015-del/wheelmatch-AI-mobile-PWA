// 로컬 데이터 관리 패널 — 저장공간 표시, 백업 내보내기/가져오기, draft 삭제.
//
// db·savedGrinderStore·draftStore·backupStore·storageUsage를 모두 모킹한다.
// 이 패널이 보는 것은 "무엇을 그리고, 확인 전에는 아무것도 쓰지 않는가"다.

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { liveQueryModule } from '@/e2e/liveQuery';

vi.mock('dexie-react-hooks', () => liveQueryModule());

const {
  inspectionCount,
  photoStorageStats,
  savedList,
  draftLoad,
  draftRemove,
  formDraftLoad,
  formDraftRemove,
  estimateStorageUsage,
  buildBackupFileNow,
  previewImport,
  applyImport,
} = vi.hoisted(() => ({
  inspectionCount: vi.fn(),
  photoStorageStats: vi.fn(),
  savedList: vi.fn(),
  draftLoad: vi.fn(),
  draftRemove: vi.fn(),
  formDraftLoad: vi.fn(),
  formDraftRemove: vi.fn(),
  estimateStorageUsage: vi.fn(),
  buildBackupFileNow: vi.fn(),
  previewImport: vi.fn(),
  applyImport: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ inspectionCount, photoStorageStats }));
vi.mock('@/lib/db/savedGrinderStore', () => ({
  savedGrinderStore: { list: savedList },
}));
vi.mock('@/lib/draft/draftStore', () => ({
  draftStore: { load: draftLoad, remove: draftRemove },
  formDraftStore: { load: formDraftLoad, remove: formDraftRemove },
}));
vi.mock('@/lib/storage/storageUsage', () => ({ estimateStorageUsage }));
vi.mock('@/lib/backup/backupStore', () => ({
  buildBackupFileNow,
  previewImport,
  applyImport,
}));

import { DataManagementPanel } from './DataManagementPanel';

beforeEach(() => {
  inspectionCount.mockReset().mockResolvedValue(3);
  photoStorageStats
    .mockReset()
    .mockResolvedValue({ recordsWithPhotos: 2, totalPhotoBytes: 2048 });
  savedList.mockReset().mockResolvedValue([]);
  draftLoad.mockReset().mockResolvedValue({ status: 'none' });
  draftRemove.mockReset().mockResolvedValue(true);
  formDraftLoad.mockReset().mockResolvedValue({ status: 'none' });
  formDraftRemove.mockReset().mockResolvedValue(true);
  estimateStorageUsage
    .mockReset()
    .mockResolvedValue({ supported: true, usageBytes: 1024, quotaBytes: 2048 });
  buildBackupFileNow.mockReset();
  previewImport.mockReset();
  applyImport.mockReset();
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

describe('DataManagementPanel — 현황 표시', () => {
  it('기록·저장된 그라인더·사진 통계를 보여준다', async () => {
    render(<DataManagementPanel />);
    expect(await screen.findByText('점검 기록 3건')).toBeInTheDocument();
    expect(
      await screen.findByText('사진 있는 기록 2건 · 사진 용량 2.0KB'),
    ).toBeInTheDocument();
  });

  it('저장공간 API를 지원하지 않으면 확인 불가로 표시한다', async () => {
    estimateStorageUsage.mockResolvedValue({
      supported: false,
      usageBytes: null,
      quotaBytes: null,
    });
    render(<DataManagementPanel />);
    expect(
      await screen.findByText(
        '이 브라우저에서는 저장공간 사용량을 확인할 수 없습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('진행 중 draft가 있으면 알리고 지우기 버튼을 확인 후에만 실행한다', async () => {
    draftLoad.mockResolvedValue({ status: 'found', draft: {} });
    const user = userEvent.setup();
    render(<DataManagementPanel />);

    expect(
      await screen.findByText('이어서 하던 점검이 있습니다.'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: '이어서 하던 점검 지우기' }),
    );
    expect(draftRemove).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        '이어서 하던 점검(임시 저장)을 지웁니다. 완료해 저장된 기록에는 영향이 없습니다.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '임시 저장 지우기' }));
    expect(draftRemove).toHaveBeenCalled();
    expect(formDraftRemove).toHaveBeenCalledWith('grinder');
    expect(formDraftRemove).toHaveBeenCalledWith('wheel');
  });
});

describe('DataManagementPanel — 내보내기', () => {
  it('내보내면 건수를 밝힌다', async () => {
    buildBackupFileNow.mockResolvedValue({
      format: 'wheelmatch-backup',
      version: 1,
      exportedAt: 'x',
      records: [{ id: 1 }, { id: 2 }],
      savedGrinders: [],
    });
    const user = userEvent.setup();
    render(<DataManagementPanel />);

    await user.click(screen.getByRole('button', { name: '내보내기' }));
    expect(await screen.findByText('2건을 내보냈습니다.')).toBeInTheDocument();
  });

  it('내보내기가 실패하면 오류를 알린다', async () => {
    buildBackupFileNow.mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();
    render(<DataManagementPanel />);

    await user.click(screen.getByRole('button', { name: '내보내기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '내보내기에 실패했습니다.',
    );
  });
});

describe('DataManagementPanel — 가져오기(미리보기 후 확인)', () => {
  function selectFile(text: string) {
    const input = screen.getByLabelText(
      /백업 파일 가져오기/,
    ) as HTMLInputElement;
    const file = new File([text], 'backup.json', { type: 'application/json' });
    return act(async () => {
      await userEvent.upload(input, file);
    });
  }

  it('미리보기만 하고, 확인 전에는 적용하지 않는다', async () => {
    previewImport.mockResolvedValue({
      status: 'ready',
      validRecords: [{ id: 1 }],
      duplicateRecordCount: 1,
      invalidRecordCount: 0,
      validSavedGrinders: [],
      duplicateSavedGrinderCount: 0,
      invalidSavedGrinderCount: 0,
    });
    const user = userEvent.setup();
    render(<DataManagementPanel />);

    await selectFile('{"format":"wheelmatch-backup"}');

    expect(
      await screen.findByText(
        '점검 기록: 새로 추가 1건 · 이미 있어 건너뜀 1건 · 무효 0건',
      ),
    ).toBeInTheDocument();
    expect(applyImport).not.toHaveBeenCalled();

    applyImport.mockResolvedValue({
      importedRecords: 1,
      importedSavedGrinders: 0,
    });
    await user.click(screen.getByRole('button', { name: '가져오기 적용' }));

    expect(applyImport).toHaveBeenCalledWith([{ id: 1 }], []);
    expect(
      await screen.findByText(
        '점검 기록 1건, 저장된 그라인더 0건을 가져왔습니다.',
      ),
    ).toBeInTheDocument();
  });

  it('취소하면 아무것도 적용하지 않는다', async () => {
    previewImport.mockResolvedValue({
      status: 'ready',
      validRecords: [{ id: 1 }],
      duplicateRecordCount: 0,
      invalidRecordCount: 0,
      validSavedGrinders: [],
      duplicateSavedGrinderCount: 0,
      invalidSavedGrinderCount: 0,
    });
    const user = userEvent.setup();
    render(<DataManagementPanel />);
    await selectFile('{}');

    await screen.findByText('가져오기 미리보기');
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(applyImport).not.toHaveBeenCalled();
    expect(screen.queryByText('가져오기 미리보기')).not.toBeInTheDocument();
  });

  it('손상되거나 지원하지 않는 파일은 오류로 안내한다', async () => {
    previewImport.mockResolvedValue({
      status: 'error',
      error: 'unsupported_version',
    });
    render(<DataManagementPanel />);
    await selectFile('{"version":999}');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '지원하지 않는 백업 버전입니다. 앱을 최신으로 맞춘 뒤 다시 시도하세요.',
    );
  });
});
