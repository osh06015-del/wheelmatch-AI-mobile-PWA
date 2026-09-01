// 정규식 파서 단위 테스트.
// Phase 2에서 Claude API를 Tesseract.js로 교체할 때 이 테스트가 안전망이 된다.

import { describe, expect, it } from 'vitest';
import {
  parseDiameter,
  parseDimensions,
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

  it('회전속도를 어느 방법으로도 못 구하면 null로 남긴다', () => {
    const spec = parseWheelText('Φ125×1.6mm 절단용');
    expect(spec.maxRPM).toBeNull();
    expect(spec.confidence).toBe('medium');
  });
});
