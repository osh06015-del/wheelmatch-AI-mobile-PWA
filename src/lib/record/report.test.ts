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

  it('제한 대조 기록은 그 한계를 함께 적는다', () => {
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
    // 문서를 받는 사람은 기기가 오프라인이었는지 알 길이 없다. 단정하지 않는다.
    expect(html).not.toContain('오프라인');
    expect(html).not.toContain('작업자가 입력한 값으로만');
  });

  it('제한 대조 기록은 단계별 까닭을 기록된 대로 적는다', () => {
    const html = buildReportHtml(
      [
        {
          record: record({
            analysisMode: 'offline_limited',
            analysisLimitCauses: { grinder: 'manual', wheel: 'dropped_ocr' },
          }),
          photos: [],
        },
      ],
      options,
    );
    expect(html).toContain(
      escapeHtml('그라인더: 서버에 닿지 못해 직접 입력한 값입니다.'),
    );
    expect(html).toContain(
      escapeHtml(
        '숫돌: 저장된 AI 판독을 읽을 수 없어 버린 뒤 확정한 값입니다.',
      ),
    );
  });

  it('제한되지 않은 단계의 까닭은 적지 않는다', () => {
    const html = buildReportHtml(
      [
        {
          record: record({
            analysisMode: 'offline_limited',
            analysisLimitCauses: { wheel: 'local_ocr' },
          }),
          photos: [],
        },
      ],
      options,
    );
    expect(html).toContain(
      escapeHtml('숫돌: 서버가 아니라 이 기기에서 읽은 값입니다.'),
    );
    expect(html).not.toContain(escapeHtml('그라인더: '));
  });

  it('까닭을 남기기 전에 저장된 제한 대조 기록은 까닭이 기록되지 않았다고만 적는다', () => {
    // 어느 단계가 제한됐는지도 그 기록에는 없다. 단계와 까닭을 추정해 적지 않는다.
    const html = buildReportHtml(
      [
        {
          record: record({ analysisMode: 'offline_limited' }),
          photos: [],
        },
      ],
      options,
    );
    expect(html).toContain(escapeHtml('제한된 까닭이 기록되지 않았습니다.'));
    expect(html).not.toContain('직접 입력한 값입니다');
    expect(html).not.toContain(escapeHtml('그라인더: '));
    expect(html).not.toContain(escapeHtml('숫돌: '));
  });

  it('기록에 든 값이 목록에 없어도 문서를 만든다 — 빈 문장이나 undefined를 찍지 않는다', () => {
    // 백업으로 들여온 기록이나 다른 버전이 쓴 기록에는 지금 목록에 없는 규칙 이름·
    // 까닭이 있을 수 있다. 문서 내보내기가 그 한 건 때문에 멈추면 안 된다.
    const base = record();
    const html = buildReportHtml(
      [
        {
          record: record({
            analysisMode: 'offline_limited',
            analysisLimitCauses: {
              grinder: 'server',
            } as unknown as InspectionRecord['analysisLimitCauses'],
            result: {
              ...base.result,
              checks: [
                {
                  rule: 'constructor',
                  passed: null,
                  reason: '알 수 없는 항목',
                  grinderValue: null,
                  wheelValue: null,
                },
              ],
            },
          }),
          photos: [],
        },
      ],
      options,
    );

    expect(html).toContain('constructor');
    expect(html).toContain(
      escapeHtml('그라인더: 제한된 까닭이 기록되지 않았습니다.'),
    );
    expect(html).not.toContain('undefined');
  });

  it('제한 대조가 아닌 기록에는 한계도 까닭도 적지 않는다', () => {
    const html = buildReportHtml(
      [{ record: record({ analysisMode: 'online' }), photos: [] }],
      options,
    );
    expect(html).not.toContain(escapeHtml(t('offline.limit')));
    expect(html).not.toContain('제한된 까닭');
  });

  describe('외관 손상 의심의 출처', () => {
    const ENGINE_SENTENCE =
      '사진에서 깨짐·균열로 보이는 부분이 있습니다. 이 숫돌을 사용하지 말고 직접 확인하세요.';

    /** 의심으로 저장된 기록. 출처는 저장 당시 확정값에 붙어 있던 그대로다 */
    function suspectedRecord(
      sources: InspectionRecord['wheel']['visibleDamageSources'],
    ): InspectionRecord {
      const r = record();
      r.wheel = {
        ...r.wheel,
        visibleDamage: 'suspected',
        ...(sources ? { visibleDamageSources: sources } : {}),
      };
      r.result.checks.push({
        rule: '외관 손상',
        passed: null,
        advisory: true,
        grinderValue: null,
        wheelValue: null,
        reason: ENGINE_SENTENCE,
        detail: { code: 'visibleDamage.suspected' },
      });
      return r;
    }

    it('이어받은 의심이면 사유 바로 아래에 출처를 적는다', () => {
      // 문서는 사진과 함께 다른 사람에게 건너간다. 출처가 없으면 읽는 사람은 그
      // 사진에서 손상이 보였다고만 안다.
      const html = buildReportHtml(
        [{ record: suspectedRecord(['carried']), photos: [] }],
        options,
      );
      const note = escapeHtml(t('damageSource.carried'));

      // 엔진 문장은 그대로 남고, 출처가 그 뒤에 같은 항목 안에 온다.
      expect(html).toContain(
        `${escapeHtml(ENGINE_SENTENCE)}<span class="note">${note}</span></li>`,
      );
    });

    it('이 사진의 판독도 의심했으면 이어받은 출처를 「…에서도」로 적는다 — 빼지 않는다', () => {
      const html = buildReportHtml(
        [
          {
            record: suspectedRecord(['label_photo', 'carried']),
            photos: [],
          },
        ],
        options,
      );

      expect(html).toContain(
        `${escapeHtml(ENGINE_SENTENCE)}<span class="note">${escapeHtml(t('damageSource.carriedAlso'))}</span></li>`,
      );
      expect(html).not.toContain(escapeHtml(t('damageSource.carried')));
    });

    it('이 사진의 판독만 의심했거나 출처가 기록되지 않았으면 적지 않는다', () => {
      for (const sources of [['label_photo'], undefined] as const) {
        const html = buildReportHtml(
          [
            {
              record: suspectedRecord(sources ? [...sources] : undefined),
              photos: [],
            },
          ],
          options,
        );

        expect(html).toContain(`${escapeHtml(ENGINE_SENTENCE)}</li>`);
        expect(html).not.toContain('class="note"');
      }
    });
  });

  it('파일 이름에 시각을 붙여 여러 번 저장해도 덮어쓰지 않는다', () => {
    expect(reportFilename(new Date(2026, 8, 30, 22, 39))).toBe(
      'wheelmatch-record-20260930-2239.html',
    );
  });
});
