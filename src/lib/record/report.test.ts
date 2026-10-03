import { describe, expect, it } from 'vitest';

import { translate } from '@/lib/i18n';
import type { Translate } from '@/lib/i18n';
import type { InspectionRecord } from '@/lib/rules/types';
import { buildReportHtml, escapeHtml, reportFilename } from './report';

const t: Translate = (key, params) => translate('ko', key, params);

function record(overrides: Partial<InspectionRecord> = {}): InspectionRecord {
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
      checks: [
        {
          rule: 'RPM 안전',
          passed: true,
          reason:
            '숫돌 최고사용회전속도(15300rpm)가 그라인더 무부하 회전속도(11000rpm) 이상입니다.',
          grinderValue: '11000rpm',
          wheelValue: '15300rpm',
          detail: {
            code: 'rpmSafety.pass',
            params: { wheel: 15300, grinder: 11000 },
          },
        },
      ],
      timestamp: '2026-09-30T13:37:18.355Z',
    },
    checklist: {
      guardCover: null,
      auxiliaryHandle: null,
      wheelDamage: null,
      ppe: true,
    },
    trialRun: {
      wheelReplaced: false,
      requiredSeconds: 60,
      startedAt: '2026-09-30T13:37:25.861Z',
      finishedAt: '2026-09-30T13:38:27.738Z',
      elapsedSeconds: 62,
      outcome: 'normal',
      findings: [],
      completed: true,
    },
    ruleVersion: '2026.09.29-r1',
    ...overrides,
  } as InspectionRecord;
}

const options = {
  t,
  locale: 'ko' as const,
  generatedAt: new Date('2026-09-30T14:00:00.000Z'),
};

describe('점검 기록 문서 — 사람이 읽는 형태', () => {
  it('문서 제목은 적합이며 사용기한 미확인 사유는 항목에 남긴다', () => {
    const r = record();
    r.result.checks.push({
      rule: '유효기한',
      passed: null,
      advisory: true,
      grinderValue: null,
      wheelValue: null,
      reason: '',
      detail: { code: 'expiry.notFound' },
    });
    const html = buildReportHtml([{ record: r, photos: [] }], options);
    expect(html).toContain('class="badge COMPATIBLE">적합</span>');
    expect(html).not.toContain('규격 적합 — 사용기한 미확인');
    expect(html).toContain('작업자가 사용기한 표시를 찾지 못했습니다.');
  });
  it('판정·요약·검사 항목·시험운전·규칙 버전·면책 문구를 화면과 같은 말로 담는다', () => {
    const html = buildReportHtml([{ record: record(), photos: [] }], options);

    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('>적합</span>');
    expect(html).toContain('GWS 6-100 E');
    expect(html).toContain('RPM 상한 대조');
    expect(html).toContain('15300rpm');
    expect(html).toContain(
      '작업 시작 전 시험운전 62초 (요구 60초) — 이상 없음',
    );
    expect(html).toContain('2026.09.29-r1');
    expect(html).toContain(escapeHtml(t('disclaimer')));
    expect(html).toContain(t('history.noPhoto'));
  });

  it('사진을 data URL 그대로 이름표와 함께 넣는다', () => {
    const html = buildReportHtml(
      [
        {
          record: record(),
          photos: [
            { label: '그라인더 명판', dataUrl: 'data:image/jpeg;base64,AAAA' },
          ],
        },
      ],
      options,
    );
    expect(html).toContain('<img src="data:image/jpeg;base64,AAAA"');
    expect(html).toContain('<figcaption>그라인더 명판</figcaption>');
  });

  it('AI 외관 확인은 검사 항목과 따로, 확인 항목이 아니라는 문구와 함께 싣는다', () => {
    const html = buildReportHtml(
      [
        {
          record: record({
            wheelExam: {
              status: 'suspected',
              findings: [
                {
                  kind: 'other',
                  view: 'bore',
                  reason: '보어 플랜지 변색',
                  confidence: 'low',
                },
              ],
              photoQuality: [],
              model: 'm',
              promptVersion: 'p',
              analyzedAt: '2026-09-30T13:36:28.394Z',
            },
            wheelExamAcknowledged: true,
          }),
          photos: [],
        },
      ],
      options,
    );
    expect(html).toContain(t('exam.evidence.title'));
    expect(html).toContain(t('exam.evidence.suspected'));
    expect(html).toContain('중심구멍·장착부: 보어 플랜지 변색');
    expect(html).toContain(escapeHtml(t('exam.evidence.notCounted')));
  });

  it('기록 안의 문자열은 코드로 실행되지 않게 모두 이스케이프한다', () => {
    const html = buildReportHtml(
      [
        {
          record: record({
            grinder: {
              ...record().grinder,
              model: '<script>alert(1)</script>',
            },
          }),
          photos: [{ label: 'x', dataUrl: 'data:image/png;base64,"onerror=' }],
        },
      ],
      options,
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('"onerror=');
  });

  it('오프라인 제한 대조 기록은 그 한계를 함께 적는다', () => {
    const html = buildReportHtml(
      [
        {
          record: record({ analysisMode: 'offline_limited' }),
          photos: [],
        },
      ],
      options,
    );
    expect(html).toContain(escapeHtml(t('offline.limit')));
  });

  it('파일 이름에 시각을 붙여 여러 번 저장해도 덮어쓰지 않는다', () => {
    expect(reportFilename(new Date(2026, 8, 30, 22, 39))).toBe(
      'wheelmatch-record-20260930-2239.html',
    );
  });
});
