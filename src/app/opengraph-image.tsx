// 카카오톡·슬랙 등 메신저 링크 미리보기 카드 이미지.
//
// Next가 빌드 시점에 생성한다. 이미지 파일을 커밋하지 않으므로
// 디자인을 바꾸면 코드만 고치면 된다.
//
// 이미지 안에는 한글을 쓰지 않는다. ImageResponse(Satori)는 지정한 폰트의
// 글리프만 그릴 수 있어서, 한글을 넣으려면 한글 폰트 파일을 함께 넣어야 한다.
// 폰트를 빌드 때 네트워크로 받아오면 빌드가 외부 서비스에 묶인다.
// 한글은 og:title / og:description으로 들어가고 메신저가 텍스트로 보여주므로,
// 이미지는 도형과 로마자만으로 구성한다.

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'GRINDOK — 그라인더·숫돌 규격 대조';

const SLATE_900 = '#0F172A';
const SLATE_100 = '#F1F5F9';
const SLATE_400 = '#94A3B8';

// 판정 3색. 앱의 결과 화면과 같은 색을 쓴다.
const VERDICT_COLORS = ['#22C55E', '#EF4444', '#EAB308'];

export default async function OpengraphImage() {
  const logo = await readFile(
    join(process.cwd(), 'public/icons/grindok-logo.png'),
  );
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: SLATE_900,
        padding: '0 90px',
      }}
    >
      {/* ImageResponse는 next/image 대신 원본 이미지 데이터를 사용한다. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/png;base64,${logo.toString('base64')}`}
        alt=""
        width={320}
        height={297}
        style={{ borderRadius: 32, flexShrink: 0 }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginLeft: 80,
        }}
      >
        <div style={{ fontSize: 84, fontWeight: 700, color: SLATE_100 }}>
          GRINDOK
        </div>
        <div style={{ fontSize: 38, color: SLATE_400, marginTop: 16 }}>
          Grinder / Wheel spec check
        </div>

        {/* 적합 · 부적합 · 판정불가 세 가지 판정을 색 막대로 표현한다.
              글자를 쓰지 않아 어떤 언어에서도 그대로 읽힌다. */}
        <div style={{ display: 'flex', marginTop: 48 }}>
          {VERDICT_COLORS.map((color) => (
            <div
              key={color}
              style={{
                width: 132,
                height: 18,
                borderRadius: 9,
                backgroundColor: color,
                marginRight: 18,
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
