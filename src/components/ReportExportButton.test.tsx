import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveOrShareFile, photoToDataUrl } = vi.hoisted(() => ({
  saveOrShareFile: vi.fn(),
  photoToDataUrl: vi.fn(),
}));

vi.mock('@/lib/record/fileExport', () => ({ saveOrShareFile }));
vi.mock('@/lib/record/reportPhoto', () => ({ photoToDataUrl }));

import { ReportExportButton } from './ReportExportButton';
import type { InspectionRecord } from '@/lib/rules/types';

function record(): InspectionRecord {
  return {
    id: 1,
    createdAt: '2026-09-30T13:38:31.195Z',
    declaredPurpose: 'grinding',
    grinder: {
      model: 'GWS 6-100 E',
      noLoadRPM: 11000,
      maxWheelDiameter: 100,
      rawText: '',
      confidence: 'high',
    },
    wheel: {
      maxRPM: 15300,
      diameter: 100,
      thickness: 3,
      purpose: 'grinding',
      wheelType: 'bonded_abrasive',
      visibleDamage: 'none_visible',
      rawText: '',
      confidence: 'high',
    },
    result: {
      verdict: 'COMPATIBLE',
      checks: [],
      timestamp: '2026-09-30T13:37:18.355Z',
    },
    checklist: {
      guardCover: null,
      auxiliaryHandle: null,
      wheelDamage: null,
      ppe: true,
    },
    grinderImage: new Blob(['plate'], { type: 'image/jpeg' }),
    wheelBoreImage: new Blob(['bore'], { type: 'image/jpeg' }),
  } as InspectionRecord;
}

beforeEach(() => {
  saveOrShareFile.mockReset().mockResolvedValue('shared');
  photoToDataUrl
    .mockReset()
    .mockImplementation(
      async (blob: Blob) => `data:image/jpeg;base64,${await blob.text()}`,
    );
});

describe('점검 기록 문서 저장 버튼', () => {
  it('기록과 사진을 담은 HTML 문서를 폰에 넘기고, 어디로 갔는지 알린다', async () => {
    const user = userEvent.setup();
    render(
      <ReportExportButton
        label="이 기록을 문서로 저장 (사진 포함)"
        loadRecords={async () => [record()]}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: '이 기록을 문서로 저장 (사진 포함)' }),
    );

    expect(saveOrShareFile).toHaveBeenCalledTimes(1);
    const [file, title] = saveOrShareFile.mock.calls[0] as [File, string];
    expect(file.type).toBe('text/html');
    expect(file.name).toMatch(/^wheelmatch-record-\d{8}-\d{4}\.html$/);
    expect(title).toBe('점검 기록');
    const html = await file.text();
    expect(html).toContain('GWS 6-100 E');
    expect(html).toContain('data:image/jpeg;base64,plate');
    expect(html).toContain('<figcaption>그라인더 명판</figcaption>');
    expect(html).toContain('<figcaption>중심구멍·장착부</figcaption>');
    expect(await screen.findByRole('status')).toHaveTextContent(
      '공유 창을 열었습니다. 「파일에 저장」이나 보낼 곳을 고르세요.',
    );
  });

  it('만드는 중에 여러 번 눌러도 한 번만 만든다', async () => {
    let finish: (records: InspectionRecord[]) => void = () => undefined;
    const loadRecords = vi.fn(
      () => new Promise<InspectionRecord[]>((resolve) => (finish = resolve)),
    );
    render(<ReportExportButton label="문서 저장" loadRecords={loadRecords} />);
    const button = screen.getByRole('button', { name: '문서 저장' });

    act(() => {
      button.click();
      button.click();
    });
    expect(loadRecords).toHaveBeenCalledTimes(1);
    await act(async () => finish([record()]));
    expect(saveOrShareFile).toHaveBeenCalledTimes(1);
  });

  it('만들지 못하면 실패를 알린다', async () => {
    const user = userEvent.setup();
    render(
      <ReportExportButton
        label="문서 저장"
        loadRecords={async () => {
          throw new Error('db');
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: '문서 저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '문서를 만들지 못했습니다. 다시 시도하세요.',
    );
    expect(saveOrShareFile).not.toHaveBeenCalled();
  });
});
