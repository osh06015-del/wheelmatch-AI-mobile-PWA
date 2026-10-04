// 결과 화면의 서버 재분석 판독 기록(ReanalysisRecord)을 다루는 순수 함수.
//
// 서버 판독의 뒷받침 없이 확정한 점검은 결과 화면에서 서버로 다시 읽을 수 있다.
// 그 판독은 **받아들였든 아니든 전부** 남긴다. 값이 달라 전환이 막히거나 작업자가
// 취소하면 AI 값은 판정에 쓰지 않지만, 그 판독이 올린 외관 의심은 확정값에 남는다
// (lib/ocr/confirm.ts). 판독을 버리면 의심만 남아 어디서 온 의심인지 기록으로 되짚을
// 수 없다(safety-critical.md 2번 — 원본·정규화·판정근거를 따로 보관한다).
//
// 이 파일은 저장소도 시계도 모른다. 시각은 인자로 받는다. 판정을 하지 않는다 —
// 무엇을 받아들일 수 있는지는 화면(OfflineReanalysisPanel)이, 판정은 규칙엔진이 한다.

import type { NumericMarkingKey } from '@/lib/ocr/confirm';
import type {
  GrinderSpec,
  OcrTelemetry,
  ReanalysisRecord,
  WheelSpec,
} from '@/lib/rules/types';

/**
 * 한 점검에 남기는 재분석 판독의 상한.
 *
 * 판독은 지우지 않고 쌓으므로 끝이 있어야 한다. 끝이 없으면 목록이 백업 검증
 * (recordSanitize.ts)이 받는 길이를 넘는 순간 그 기록이 백업에서 통째로 빠진다.
 * 상한에 닿으면 오래된 판독을 밀어내지 않고 더 받지 않는다(canReanalyze) — 밀어내면
 * 의심을 올린 판독이 먼저 사라진다.
 *
 * **낮추지 않는다.** 백업 검증이 같은 값으로 길이를 본다. 낮추면 그 전에 저장된
 * 기록 가운데 판독이 더 많은 것이 백업 내보내기·가져오기에서 통째로 빠진다.
 */
export const MAX_REANALYSES = 20;

/** 서버가 다시 읽어 온 값. 다시 읽은 단계만 채워진다 */
export interface ReanalysisReading {
  grinderOcr?: GrinderSpec;
  grinderOcrTelemetry?: OcrTelemetry | null;
  wheelOcr?: WheelSpec;
  wheelOcrTelemetry?: OcrTelemetry | null;
}

/**
 * 도착한 판독으로 기록 한 줄을 만든다. 다시 읽은 단계가 하나도 없으면 null이다.
 *
 * 받아들인 시각과 손상 답은 비워 둔다 — 아직 일어나지 않은 일이다. 다시 읽지 않은
 * 단계에는 메타데이터도 남기지 않는다. 판독 없는 측정값은 무엇을 잰 것인지 알 수 없다.
 */
export function reanalysisRecordOf(
  reading: ReanalysisReading,
  analyzedAt: string,
): ReanalysisRecord | null {
  const grinderOcr = reading.grinderOcr ?? null;
  const wheelOcr = reading.wheelOcr ?? null;
  if (grinderOcr === null && wheelOcr === null) return null;
  return {
    analyzedAt,
    grinderOcr,
    grinderOcrTelemetry: grinderOcr
      ? (reading.grinderOcrTelemetry ?? null)
      : null,
    wheelOcr,
    wheelOcrTelemetry: wheelOcr ? (reading.wheelOcrTelemetry ?? null) : null,
    acceptedAt: null,
    damageRecheck: null,
  };
}

/** 남길 자리가 있는가. 없으면 다시 분석하지 않는다 — 남기지 못할 판독은 받지 않는다 */
export function canReanalyze(
  list: readonly ReanalysisRecord[] | null,
): boolean {
  return (list?.length ?? 0) < MAX_REANALYSES;
}

/**
 * 받은 판독을 목록 끝에 붙인다. 앞선 판독은 지우지 않는다.
 *
 * 목록이 없으면(이 기록이 생기기 전 버전에서 시작한 점검) 여기서부터 남긴다.
 * 상한에 닿았으면 붙이지 않는다.
 */
export function appendReanalysis(
  list: readonly ReanalysisRecord[] | null,
  record: ReanalysisRecord,
): ReanalysisRecord[] {
  const current = list ?? [];
  return canReanalyze(current) ? [...current, record] : [...current];
}

/**
 * 숫돌을 다시 확정했을 때 — 숫돌 쪽 판독과 그때 받은 손상 답을 뺀다.
 *
 * 새 사진은 새 숫돌일 수 있다. 이전 사진을 본 판독과 그 경고를 보고 한 답은 지금
 * 숫돌에 대한 것이 아니다. 명판 판독과 그것을 받아들인 시각은 남긴다 — 숫돌을 다시
 * 찍어도 명판 쪽 값은 그대로이기 때문이다(setWheel). 숫돌만 읽은 판독은 통째로 빠진다.
 *
 * 목록이 없으면 없는 채로 둔다. 빈 목록은 「재분석을 하지 않았다」는 뜻이라, 모르는
 * 것을 그렇게 적지 않는다.
 */
export function withoutWheelReanalysis(
  list: readonly ReanalysisRecord[] | null,
): ReanalysisRecord[] | null {
  if (list === null) return null;
  return list
    .filter((record) => record.grinderOcr !== null)
    .map((record) => ({
      ...record,
      wheelOcr: null,
      wheelOcrTelemetry: null,
      damageRecheck: null,
    }));
}

/**
 * 화면이 들고 있는 판독(reading)의 기록이 목록의 몇 번째인가. 없으면 -1.
 *
 * 값이 아니라 **같은 판독 객체**인지로 찾는다. 같은 사진을 두 번 읽으면 값이 같은
 * 판독이 둘 생기는데, 받아들인 시각과 손상 답은 화면에 떠 있는 그 판독의 기록에만
 * 적혀야 한다. 새로고침하면 객체가 달라지지만 그때는 화면도 판독을 들고 있지 않다.
 */
export function indexOfReanalysis(
  list: readonly ReanalysisRecord[] | null,
  reading: ReanalysisReading,
): number {
  if (list === null) return -1;
  const grinderOcr = reading.grinderOcr ?? null;
  const wheelOcr = reading.wheelOcr ?? null;
  if (grinderOcr === null && wheelOcr === null) return -1;
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const record = list[index];
    if (record.grinderOcr === grinderOcr && record.wheelOcr === wheelOcr) {
      return index;
    }
  }
  return -1;
}

function replaceAt(
  list: readonly ReanalysisRecord[],
  index: number,
  update: (record: ReanalysisRecord) => ReanalysisRecord,
): ReanalysisRecord[] {
  return list.map((record, at) => (at === index ? update(record) : record));
}

/** 작업자가 이 판독을 확인하고 온라인 대조로 바꾼 시각을 적는다 */
export function withAcceptedAt(
  list: readonly ReanalysisRecord[],
  index: number,
  acceptedAt: string,
): ReanalysisRecord[] {
  return replaceAt(list, index, (record) => ({ ...record, acceptedAt }));
}

/**
 * 이 판독 뒤 다시 받은 손상 항목의 답을 적는다. 「문제 있음」도 그대로 적는다.
 * 답을 바꾸면 마지막 답이 남는다 — 숫돌 상태 확인의 답과 같다.
 */
export function withDamageRecheck(
  list: readonly ReanalysisRecord[],
  index: number,
  damageFree: boolean,
  answeredAt: string,
): ReanalysisRecord[] {
  return replaceAt(list, index, (record) => ({
    ...record,
    damageRecheck: { damageFree, answeredAt },
  }));
}

/** 화면·기록 문서가 한 줄로 말할 것 */
export interface ReanalysisSummary {
  /**
   * 기록에 남아 있는 판독 수. 숫돌을 다시 확정하면 그 숫돌 사진의 판독은 빠지므로
   * (withoutWheelReanalysis) 서버를 부른 횟수와 다를 수 있다.
   */
  count: number;
  /** 그 가운데 받아들인 판독 수. 받은 수와 따로 센다 — 일부만 받아들인 기록이 있다 */
  accepted: number;
  /**
   * 받아들인 판독이 다시 읽은 단계. **점검 전체가 온라인 대조인지를 말하지 않는다.**
   * 명판·숫돌을 함께 받아들인 뒤 숫돌만 서버 판독 없이 다시 확정하면 숫돌 판독은
   * 빠지고 명판만 남는데, 그 점검은 다시 제한 대조다. 화면이 「온라인 대조로
   * 바꿨다」고만 말하면 그 기록이 실제보다 검증된 것처럼 읽힌다.
   */
  acceptedSteps: { grinder: boolean; wheel: boolean };
  /**
   * 재분석한 AI가 외관 손상을 의심한 판독이 있는가. 뒤의 판독이 의심하지 않아도
   * 앞선 의심은 확정값에 남으므로 하나라도 있으면 true다.
   */
  damageSuspected: boolean;
  /** 마지막으로 받은 손상 재확인의 답. 받은 적이 없으면 null */
  damageRecheck: boolean | null;
}

/**
 * 재분석 판독 목록을 요약한다. 판독이 없으면 null이다 — 빈 목록(하지 않음)에도,
 * 칸이 없는 기록(알 수 없음)에도 말을 지어내지 않는다.
 */
export function summarizeReanalyses(
  list: readonly ReanalysisRecord[] | null | undefined,
): ReanalysisSummary | null {
  if (!list || list.length === 0) return null;
  const accepted = list.filter((record) => record.acceptedAt !== null);
  const rechecked = list.filter((record) => record.damageRecheck !== null);
  return {
    count: list.length,
    accepted: accepted.length,
    acceptedSteps: {
      grinder: accepted.some((record) => record.grinderOcr !== null),
      wheel: accepted.some((record) => record.wheelOcr !== null),
    },
    damageSuspected: list.some(
      (record) => record.wheelOcr?.visibleDamage === 'suspected',
    ),
    damageRecheck: rechecked.at(-1)?.damageRecheck?.damageFree ?? null,
  };
}

/**
 * 판독과 확정값을 견주는 숫자 값 하나 — 회전속도와 지름. AI가 반드시 읽어 줘야 하는
 * 값이다. 용도·유효기한·종류는 confirm.ts의 confirmedValueAgreement가 견준다.
 */
export interface ReanalysisComparison {
  field: 'noLoadRPM' | 'maxWheelDiameter' | 'maxRPM' | 'diameter';
  /** 작업자가 확정한 값 */
  worker: number | null;
  /** 서버가 다시 읽은 값 */
  ai: number | null;
}

/**
 * 다시 읽은 단계의 회전속도·지름을 확정값과 나란히 놓는다. 명판이 먼저다.
 *
 * 결과 화면이 전환을 열어 줄지 정할 때(OfflineReanalysisPanel)와 기록이 그때의
 * 「같음/다름」을 다시 보여줄 때 같은 함수를 쓴다(둘 다 lib/i18n/reanalysisText.ts의
 * reanalysisCompareRows를 거친다). 따로 계산하면 한쪽만 고쳐졌을 때 기록이 화면과
 * 다른 말을 한다.
 */
export function compareReanalysis(
  reading: ReanalysisReading | ReanalysisRecord,
  grinder: GrinderSpec,
  wheel: WheelSpec,
): ReanalysisComparison[] {
  const rows: ReanalysisComparison[] = [];
  if (reading.grinderOcr) {
    rows.push(
      {
        field: 'noLoadRPM',
        worker: grinder.noLoadRPM,
        ai: reading.grinderOcr.noLoadRPM,
      },
      {
        field: 'maxWheelDiameter',
        worker: grinder.maxWheelDiameter,
        ai: reading.grinderOcr.maxWheelDiameter,
      },
    );
  }
  if (reading.wheelOcr) {
    rows.push(
      { field: 'maxRPM', worker: wheel.maxRPM, ai: reading.wheelOcr.maxRPM },
      {
        field: 'diameter',
        worker: wheel.diameter,
        ai: reading.wheelOcr.diameter,
      },
    );
  }
  return rows;
}

/**
 * 확정값의 라벨 표기 칸들이 모두 **받아들인** 재분석 판독이 읽은 값인가.
 *
 * 판정 근거 화면이 「판정에 쓴 표기가 OCR 원본과 다르다」고 알릴 때, 그 값이 어디서
 * 왔는지를 기록으로 답한다. 재분석을 받아들이면 확정값 표기의 빈 자리가 그 판독의
 * 값으로 채워지고 OCR 원본 자리는 그대로이므로, 채워진 칸은 OCR 원본과 다르다.
 * 그 칸의 값이 받아들인 판독의 같은 칸과 같으면 출처는 그 판독이다.
 *
 * 받아들이지 않은 판독은 보지 않는다 — 그 판독의 표기는 확정값으로 옮긴 적이 없다.
 * 한 칸이라도 설명되지 않으면 거짓이다. 일부만 맞는 것을 「재분석에서 왔다」고
 * 적으면 나머지 칸의 출처를 지어내게 된다.
 */
export function readByAcceptedReanalysis(
  list: readonly ReanalysisRecord[] | null | undefined,
  markings: readonly { key: NumericMarkingKey; used: number }[],
): boolean {
  if (!list || markings.length === 0) return false;
  const accepted = list.filter(
    (record) => record.acceptedAt !== null && record.wheelOcr !== null,
  );
  return markings.every((marking) =>
    accepted.some(
      (record) =>
        (record.wheelOcr?.markings?.[marking.key] ?? null) === marking.used,
    ),
  );
}

/** AI가 읽지 못한 값(null)은 같다고 보지 않는다 — 확인한 값이 없다 */
export function sameValue(row: ReanalysisComparison): boolean {
  return row.ai !== null && row.ai === row.worker;
}
