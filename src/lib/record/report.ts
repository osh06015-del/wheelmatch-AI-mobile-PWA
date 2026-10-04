// 사람이 읽는 점검 기록 문서(HTML 한 파일).
//
// 백업 파일(JSON)은 앱에 다시 넣는 복원용이라 사람이 읽을 수 없다. 이 문서는
// 이력 화면에 보이는 것 — 판정, 검사 항목과 사유, AI 외관 확인 기록, 시험운전,
// 규칙 버전 — 과 사진을 한 파일에 담아, 휴대폰 브라우저로 열거나 카카오톡으로
// 보낼 수 있게 한다.
//
// 문장은 모두 화면과 같은 문구 키로 만든다. 판정을 다시 계산하지 않는다 —
// 저장 당시 엔진이 낸 결과를 그대로 옮긴다. 이 파일은 순수 함수다(사진 변환은
// reportPhoto.ts, 파일 저장은 fileExport.ts).

import type { Locale, MessageKey, Translate } from '@/lib/i18n';
import { checkReasonText, damageSourceNotes } from '@/lib/i18n/checkText';
import { ruleLabelText } from '@/lib/i18n/ruleLabel';
import { formatDateTime } from './datetime';
import type {
  InspectionRecord,
  Verdict,
  WheelExamView,
  WorkPurpose,
} from '@/lib/rules/types';

/** 문서에 넣을 사진 한 장. 파일 하나로 열리도록 data URL로 넣는다 */
export interface ReportPhoto {
  label: string;
  dataUrl: string;
}

export interface ReportEntry {
  record: InspectionRecord;
  photos: ReportPhoto[];
}

const VERDICT_TEXT: Record<Verdict, MessageKey> = {
  COMPATIBLE: 'verdict.compatible',
  INCOMPATIBLE: 'verdict.incompatible',
  UNDETERMINED: 'verdict.undetermined',
};

const PURPOSE_TEXT: Record<WorkPurpose, MessageKey> = {
  cutting: 'home.cutting',
  grinding: 'home.grinding',
};

const VIEW_TEXT: Record<WheelExamView, MessageKey> = {
  front: 'exam.view.front',
  back: 'exam.view.back',
  edge: 'exam.view.edge',
  bore: 'exam.view.bore',
};

const EXAM_STATUS_TEXT: Record<string, MessageKey> = {
  suspected: 'exam.evidence.suspected',
  not_observed: 'exam.evidence.notObserved',
  unassessable: 'exam.evidence.unassessable',
};

const FINDING_TEXT: Record<string, MessageKey> = {
  vibration: 'trialRun.finding.vibration',
  noise: 'trialRun.finding.noise',
  wobble: 'trialRun.finding.wobble',
  wheelDamage: 'trialRun.finding.wheelDamage',
  equipment: 'trialRun.finding.equipment',
};

/** HTML에 넣는 모든 글자는 이 함수를 거친다. 기록 안의 문자열도 믿지 않는다 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function summary(record: InspectionRecord, t: Translate): string {
  const model = record.grinder.model ?? t('history.unknownModel');
  const grinderRpm =
    record.grinder.noLoadRPM === null ? '—' : `${record.grinder.noLoadRPM}rpm`;
  const wheelDiameter =
    record.wheel.diameter === null
      ? t('history.unknownDiameter')
      : `Φ${record.wheel.diameter}mm`;
  const wheelRpm =
    record.wheel.maxRPM === null ? '—' : `${record.wheel.maxRPM}rpm`;
  return t('history.summary', { model, grinderRpm, wheelDiameter, wheelRpm });
}

function checkIcon(passed: boolean | null): string {
  return passed === true ? '✅' : passed === false ? '❌' : '⚠';
}

function renderPhotos(photos: ReportPhoto[], t: Translate): string {
  if (photos.length === 0) {
    return `<p class="muted">${escapeHtml(t('history.noPhoto'))}</p>`;
  }
  return `<div class="photos">${photos
    .map(
      (photo) =>
        `<figure><img src="${escapeHtml(photo.dataUrl)}" alt="${escapeHtml(photo.label)}"><figcaption>${escapeHtml(photo.label)}</figcaption></figure>`,
    )
    .join('')}</div>`;
}

function renderChecks(
  record: InspectionRecord,
  t: Translate,
  locale: Locale,
): string {
  const items = record.result.checks
    .map((check) => {
      // 외관 의심이 이 점검의 라벨 사진 판독 밖에서 왔으면 출처를 사유 아래에 적는다.
      // 문서는 사진과 함께 다른 사람에게 건너간다 — 출처가 없으면 읽는 사람은 그
      // 사진에서 손상이 보였다고만 안다.
      const notes = damageSourceNotes(check, record.wheel, locale)
        .map((note) => `<span class="note">${escapeHtml(note)}</span>`)
        .join('');
      return `<li><strong>${checkIcon(check.passed)} ${escapeHtml(ruleLabelText(check.rule, t))}</strong><br>${escapeHtml(checkReasonText(check, locale))}${notes}</li>`;
    })
    .join('');
  return `<h3>${escapeHtml(t('report.checks'))}</h3><ul class="checks">${items}</ul>`;
}

/** AI가 사진에서 본 것. 검사 항목과 따로 두고, 확인 항목이 아님을 함께 적는다 */
function renderExam(record: InspectionRecord, t: Translate): string {
  const exam = record.wheelExam;
  const notRun = record.wheelExamNotRun;
  if (!exam && !notRun) return '';
  const lines: string[] = [];
  if (exam) {
    const statusKey = EXAM_STATUS_TEXT[exam.status];
    if (statusKey)
      lines.push(`<p><strong>${escapeHtml(t(statusKey))}</strong></p>`);
    if (exam.findings.length > 0) {
      lines.push(
        `<ul>${exam.findings
          .map((finding) => {
            const view = VIEW_TEXT[finding.view];
            return `<li>${view ? `${escapeHtml(t(view))}: ` : ''}${escapeHtml(finding.reason)}</li>`;
          })
          .join('')}</ul>`,
      );
    }
    if (record.wheelExamAcknowledged) {
      lines.push(`<p>${escapeHtml(t('exam.evidence.acknowledged'))}</p>`);
    }
  } else if (notRun) {
    lines.push(
      `<p><strong>${escapeHtml(t('exam.evidence.notRun'))}</strong></p>`,
    );
  }
  lines.push(
    `<p class="muted">${escapeHtml(t('exam.evidence.notCounted'))}</p>`,
  );
  return `<h3>${escapeHtml(t('exam.evidence.title'))}</h3>${lines.join('')}`;
}

function renderTrialRun(record: InspectionRecord, t: Translate): string {
  const run = record.trialRun;
  if (!run) return '';
  const mode = t(
    run.wheelReplaced ? 'trialRun.modeReplaced' : 'trialRun.modeBeforeWork',
  );
  const outcome = t(
    run.outcome === 'normal'
      ? 'report.trialRunNormal'
      : 'report.trialRunAbnormal',
  );
  const findings = run.findings
    .map((finding) => FINDING_TEXT[finding])
    .filter((key): key is MessageKey => Boolean(key))
    .map((key) => t(key));
  return `<h3>${escapeHtml(t('trialRun.title'))}</h3><p>${escapeHtml(
    t('report.trialRunResult', {
      mode,
      elapsed: run.elapsedSeconds,
      required: run.requiredSeconds,
      outcome,
    }),
  )}</p>${findings.length > 0 ? `<p>${escapeHtml(findings.join(', '))}</p>` : ''}`;
}

function renderRecord(
  entry: ReportEntry,
  t: Translate,
  locale: Locale,
): string {
  const { record } = entry;
  const verdict = record.result.verdict;
  const purpose = record.declaredPurpose
    ? t(PURPOSE_TEXT[record.declaredPurpose])
    : null;
  const heading = [formatDateTime(record.createdAt), purpose]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
  const meta = `${t('ruleVersion.label')}: ${record.ruleVersion ?? t('ruleVersion.missing')}`;
  const offline =
    record.analysisMode === 'offline_limited'
      ? `<p class="warn">${escapeHtml(t('offline.limit'))}</p>`
      : '';
  return `<section class="record"><h2><span class="badge ${verdict}">${escapeHtml(
    t(VERDICT_TEXT[verdict]),
  )}</span> ${escapeHtml(heading)}</h2><p class="summary">${escapeHtml(
    summary(record, t),
  )}</p><p class="muted">${escapeHtml(meta)}</p>${offline}${renderPhotos(
    entry.photos,
    t,
  )}${renderChecks(record, t, locale)}${renderExam(record, t)}${renderTrialRun(
    record,
    t,
  )}</section>`;
}

const STYLE = `
body{font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;margin:0;padding:16px;color:#0f172a;background:#fff;line-height:1.5}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:18px;margin:0 0 6px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
h3{font-size:16px;margin:16px 0 6px}
.disclaimer{border:1px solid #eab308;background:#fefce8;padding:10px 12px;border-radius:8px}
.record{border-top:2px solid #cbd5e1;padding:16px 0;break-inside:avoid-page}
.badge{padding:2px 10px;border-radius:6px;font-weight:700}
.badge.COMPATIBLE{background:#22c55e;color:#052e16}
.badge.INCOMPATIBLE{background:#ef4444;color:#fff}
.badge.UNDETERMINED{background:#eab308;color:#1c1917}
.summary{font-weight:600;margin:0 0 4px}
.muted{color:#475569;font-size:14px;margin:4px 0}
.warn{background:#fef9c3;padding:8px 10px;border-radius:6px}
.note{display:block;margin-top:4px;padding-left:8px;border-left:3px solid #eab308}
.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:10px}
figure{margin:0}
img{width:100%;height:auto;border-radius:6px;border:1px solid #cbd5e1}
figcaption{font-size:13px;color:#475569}
ul{padding-left:20px;margin:4px 0}
li{margin-bottom:6px}
`;

/**
 * 기록들을 HTML 한 파일로 만든다.
 *
 * 기록 안의 모든 문자열(모델명·AI 사유 등)은 escapeHtml을 거친다 — 파일을 연
 * 사람의 브라우저에서 기록 내용이 코드로 실행되지 않게 한다.
 */
export function buildReportHtml(
  entries: ReportEntry[],
  options: { t: Translate; locale: Locale; generatedAt: Date },
): string {
  const { t, locale, generatedAt } = options;
  const title = t('report.title');
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    title,
  )}</title><style>${STYLE}</style></head><body><h1>WheelMatch AI · ${escapeHtml(
    title,
  )}</h1><p class="muted">${escapeHtml(
    t('report.generatedAt', {
      time: formatDateTime(generatedAt.toISOString()),
      count: entries.length,
    }),
  )}</p><p class="disclaimer">⚠ ${escapeHtml(t('disclaimer'))}</p>${entries
    .map((entry) => renderRecord(entry, t, locale))
    .join('')}</body></html>`;
}

/** 문서 파일 이름. 시각을 붙여 여러 번 저장해도 덮어쓰지 않는다 */
export function reportFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `wheelmatch-record-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate(),
  )}-${pad(now.getHours())}${pad(now.getMinutes())}.html`;
}
