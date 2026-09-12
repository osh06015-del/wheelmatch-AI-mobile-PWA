// 정규식 파서 단위 테스트.
// Phase 2에서 Claude API를 Tesseract.js로 교체할 때 이 테스트가 안전망이 된다.

import { describe, expect, it } from 'vitest';
import {
  normalizeExpiry,
  parseDiameter,
  parseDimensions,
  parseExpiry,
  parseGrinderText,
  parseModel,
  parsePeripheralSpeed,
  parsePurpose,
  parseRPM,
  parseThickness,
  parseWheelText,
  rpmFromPeripheralSpeed,
} from './parser';

const GRINDER_LABEL = 'BOSCH GWS 750-125  11000 r/min  Wheel: max Φ125mm';
const WHEEL_LABEL = '최고사용회전속도 12200RPM  Φ125×1.6mm  절단용';
const WHEEL_LABEL_MPS = '3M Cubitron II  80m/s  125 x 1.0 x 22.23mm';

describe('parseRPM', () => {
  it('r/min 표기를 읽는다', () => {
    expect(parseRPM(GRINDER_LABEL)).toBe(11000);
  });

  it('RPM 표기를 읽는다', () => {
    expect(parseRPM(WHEEL_LABEL)).toBe(12200);
  });

  it('천 단위 쉼표를 허용한다', () => {
    expect(parseRPM('최고사용회전속도 12,200 rpm')).toBe(12200);
  });

  it('한국어 "회전/분" 표기를 읽는다', () => {
    expect(parseRPM('11000 회전/분')).toBe(11000);
  });

  it('min⁻¹ 표기를 읽는다', () => {
    expect(parseRPM('8500 min⁻¹')).toBe(8500);
  });

  it('회전속도 표기가 없으면 null', () => {
    expect(parseRPM('Φ125×1.6mm 절단용')).toBeNull();
  });
});

describe('parsePeripheralSpeed / rpmFromPeripheralSpeed', () => {
  it('m/s 표기를 읽는다', () => {
    expect(parsePeripheralSpeed(WHEEL_LABEL_MPS)).toBe(80);
  });

  it('80m/s + Φ125mm → 약 12223rpm으로 환산한다', () => {
    // (80 × 60) / (π × 0.125) = 12223.6...
    expect(rpmFromPeripheralSpeed(80, 125)).toBe(12223);
  });

  it('안전 방향으로 내림한다', () => {
    const exact = (80 * 60) / (Math.PI * 0.125);
    expect(rpmFromPeripheralSpeed(80, 125)).toBeLessThan(exact);
  });

  it('값이 하나라도 없으면 환산하지 않는다', () => {
    expect(rpmFromPeripheralSpeed(null, 125)).toBeNull();
    expect(rpmFromPeripheralSpeed(80, null)).toBeNull();
    expect(rpmFromPeripheralSpeed(0, 125)).toBeNull();
  });
});

describe('parseDimensions / parseDiameter / parseThickness', () => {
  it('Φ125×1.6mm 에서 지름과 두께를 읽는다', () => {
    expect(parseDimensions(WHEEL_LABEL)).toEqual({
      diameter: 125,
      thickness: 1.6,
    });
  });

  it('125 x 1.0 x 22.23mm 에서 지름과 두께를 읽는다 (구멍 지름은 두께가 아니다)', () => {
    expect(parseDimensions(WHEEL_LABEL_MPS)).toEqual({
      diameter: 125,
      thickness: 1.0,
    });
  });

  it('그라인더 명판의 max Φ125mm 를 지름으로 읽는다', () => {
    expect(parseDiameter(GRINDER_LABEL)).toBe(125);
  });

  it('두께 단독 표기도 읽는다', () => {
    expect(parseThickness('Φ180 × 6.0mm 연삭용')).toBe(6.0);
  });

  it('치수 표기가 없으면 null', () => {
    expect(parseDiameter('최고사용회전속도 12200RPM')).toBeNull();
  });
});

describe('parsePurpose', () => {
  it('한국어 "절단용" → cutting', () => {
    expect(parsePurpose(WHEEL_LABEL)).toBe('cutting');
  });

  it('영문 cut-off → cutting', () => {
    expect(parsePurpose('CUT-OFF WHEEL 125x1.6')).toBe('cutting');
  });

  it('한국어 "연삭용" → grinding', () => {
    expect(parsePurpose('Φ125×6.0mm 연삭용')).toBe('grinding');
  });

  it('depressed center → grinding', () => {
    expect(parsePurpose('Depressed Center Wheel Type 27')).toBe('grinding');
  });

  it('키워드가 없으면 unknown', () => {
    expect(parsePurpose(WHEEL_LABEL_MPS)).toBe('unknown');
  });

  it('절단과 연삭이 함께 보이면 확정하지 않는다', () => {
    expect(parsePurpose('절단 및 연삭 겸용')).toBe('unknown');
  });
});

describe('parseModel', () => {
  it('제조사명이 앞에 붙어 있어도 모델명만 골라낸다', () => {
    expect(parseModel(GRINDER_LABEL)).toBe('GWS 750-125');
  });

  it('모델명 패턴이 없으면 null', () => {
    expect(parseModel('무부하 회전속도 11000 회전/분')).toBeNull();
  });
});

describe('parseGrinderText', () => {
  it('명판 전문에서 세 값을 모두 읽으면 confidence high', () => {
    expect(parseGrinderText(GRINDER_LABEL)).toEqual({
      model: 'GWS 750-125',
      noLoadRPM: 11000,
      maxWheelDiameter: 125,
      rawText: GRINDER_LABEL,
      confidence: 'high',
    });
  });

  it('일부만 읽히면 confidence medium', () => {
    expect(parseGrinderText('GWS 750-125').confidence).toBe('medium');
  });

  it('아무것도 못 읽으면 confidence low, 값은 null로 남긴다', () => {
    const spec = parseGrinderText('판독 불가');
    expect(spec.confidence).toBe('low');
    expect(spec.noLoadRPM).toBeNull();
    expect(spec.maxWheelDiameter).toBeNull();
  });
});

describe('parseWheelText', () => {
  it('rpm 표기가 있는 라벨을 읽는다', () => {
    expect(parseWheelText(WHEEL_LABEL)).toEqual({
      maxRPM: 12200,
      diameter: 125,
      thickness: 1.6,
      purpose: 'cutting',
      // Tesseract는 글자만 읽으므로 숫돌 형태와 손상은 판별할 수 없다.
      wheelType: 'unknown',
      visibleDamage: 'unknown',
      markings: {
        labeledRPM: 12200,
        peripheralSpeedMps: null,
        boreDiameter: null,
        expiryRaw: null,
      },
      rpmSource: 'label',
      expiry: null,
      rawText: WHEEL_LABEL,
      confidence: 'high',
    });
  });

  it('m/s만 적힌 라벨은 환산해서 maxRPM을 채운다', () => {
    const spec = parseWheelText(WHEEL_LABEL_MPS);
    expect(spec.maxRPM).toBe(12223);
    expect(spec.diameter).toBe(125);
    expect(spec.thickness).toBe(1.0);
    // 용도 키워드가 없으므로 확정하지 않는다.
    expect(spec.purpose).toBe('unknown');
  });

  it('환산해도 라벨 원본 표시를 버리지 않는다', () => {
    // 덮어쓰면 "라벨에 뭐라고 적혀 있었는지"와 "두 표기가 어긋났는지"를
    // 둘 다 잃는다. 뒤엣것은 OCR 오독의 신호다.
    const spec = parseWheelText(WHEEL_LABEL_MPS);
    expect(spec.markings?.peripheralSpeedMps).toBe(80);
    expect(spec.markings?.labeledRPM).toBeNull();
    expect(spec.rpmSource).toBe('converted');
  });

  it('D×T×H 표기에서 내경을 읽는다', () => {
    const spec = parseWheelText(WHEEL_LABEL_MPS);
    expect(spec.markings?.boreDiameter).toBe(22.23);
  });

  it('D×T 표기에서는 두께를 내경으로 잘못 읽지 않는다', () => {
    // 값이 두 개뿐인데 마지막을 내경으로 집으면 두께가 내경으로 둔갑한다.
    const spec = parseWheelText(WHEEL_LABEL);
    expect(spec.markings?.boreDiameter).toBeNull();
  });

  it('회전속도를 어느 방법으로도 못 구하면 null로 남긴다', () => {
    const spec = parseWheelText('Φ125×1.6mm 절단용');
    expect(spec.maxRPM).toBeNull();
    expect(spec.confidence).toBe('medium');
  });

  it('라벨에 찍힌 유효기한을 읽고 정규화한다', () => {
    const spec = parseWheelText('125x1.6 12200RPM 절단용 V 04/2027');
    expect(spec.markings?.expiryRaw).toBe('04/2027');
    expect(spec.expiry).toEqual({ year: 2027, month: 4 });
  });

  it('유효기한이 없으면 제조일이나 다른 숫자로 지어내지 않는다', () => {
    const spec = parseWheelText(WHEEL_LABEL);
    expect(spec.markings?.expiryRaw).toBeNull();
    expect(spec.expiry).toBeNull();
  });
});

describe('parseExpiry — 라벨 평문에서 찾기', () => {
  it('MM/YYYY 표기를 찾는다', () => {
    expect(parseExpiry('EXP 04/2027')).toBe('04/2027');
    expect(parseExpiry('V 12/2025 A46KV')).toBe('12/2025');
  });

  it('연도가 두 자리면 찾지 않는다', () => {
    // 04/23이 2023인지 1923인지 확정할 수 없다.
    expect(parseExpiry('EXP 04/23')).toBeNull();
  });

  it('치수·속도 표기를 유효기한으로 잘못 읽지 않는다', () => {
    expect(parseExpiry('125 × 1.6 × 22.23')).toBeNull();
    expect(parseExpiry('80 m/s 12200 r/min')).toBeNull();
  });
});

describe('normalizeExpiry — 정규화와 거부', () => {
  it('구분자가 달라도 같은 값으로 읽는다', () => {
    // 라벨마다 /, ., - 로 다르게 찍힌다.
    expect(normalizeExpiry('04/2023')).toEqual({ year: 2023, month: 4 });
    expect(normalizeExpiry('04.2023')).toEqual({ year: 2023, month: 4 });
    expect(normalizeExpiry('04-2023')).toEqual({ year: 2023, month: 4 });
    expect(normalizeExpiry(' 4 / 2023 ')).toEqual({ year: 2023, month: 4 });
  });

  it('존재하지 않는 달은 거부한다', () => {
    expect(normalizeExpiry('13/2023')).toBeNull();
    expect(normalizeExpiry('00/2023')).toBeNull();
  });

  it('형식이 모호하면 거부한다', () => {
    // 확정할 수 없는 값을 통과시키면 그 값으로 만료가 판정된다.
    expect(normalizeExpiry(null)).toBeNull();
    expect(normalizeExpiry('')).toBeNull();
    expect(normalizeExpiry('04/23')).toBeNull(); // 두 자리 연도
    expect(normalizeExpiry('2023/04')).toBeNull(); // 연/월인지 월/연인지
    expect(normalizeExpiry('04/2023 이후')).toBeNull(); // 잘리거나 섞임
    expect(normalizeExpiry('2023')).toBeNull(); // 연도만
    expect(normalizeExpiry('04/2023/15')).toBeNull();
  });
});
