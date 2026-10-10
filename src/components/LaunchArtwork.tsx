import type { CSSProperties } from 'react';

import styles from './AppLaunch.module.css';

// 승인된 V3 시안의 좌표를 유지한다. 덮개는 회전 날과 다른 그룹에 둔다.
const SPARKS = [
  [-9, 101, 1.8],
  [1, 118, 2.2],
  [12, 100, 1.7],
  [26, 81, 1.5],
  [37, 60, 1.2],
  [18, 121, 1.5],
] as const;

function SparkBurst({ second = false }: { second?: boolean }) {
  return (
    <g className={`${styles.sparks} ${second ? styles.secondBurst : ''}`}>
      {SPARKS.map(([angle, length, width], index) => (
        <g
          key={angle}
          transform={`translate(140 206) rotate(${angle + (second ? 6 : 0)})`}
        >
          <path
            className={styles.spark}
            d="M0 0H24"
            fill="none"
            stroke={index % 2 ? '#FBBF24' : '#FB923C'}
            strokeWidth={width}
            strokeLinecap="round"
            style={{ '--travel': `${length - 24}px` } as CSSProperties}
          />
        </g>
      ))}
      <circle cx="140" cy="206" r="2" fill="#FDE68A" />
    </g>
  );
}

export function LaunchArtwork({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <svg
      className={styles.artwork}
      viewBox="0 0 390 844"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g className={styles.ring}>
        <circle
          cx="195"
          cy="315"
          r="135"
          fill="none"
          stroke="#334155"
          strokeWidth="3"
        />
        <path
          className={styles.progress}
          d="M195 180A135 135 0 1 0 195 450A135 135 0 1 0 195 180"
          pathLength="1"
          fill="none"
          stroke="#5EEAD4"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(195 315) scale(.9) translate(-140 -124)">
        <g className={styles.workpiece}>
          <rect x="40" y="206" width="200" height="10" rx="2" fill="#1E293B" />
          <path d="M40 206H240" stroke="#64748B" strokeWidth="2" />
        </g>
        <g className={styles.symbol}>
          <g className={styles.disc}>
            <circle cx="140" cy="124" r="82" fill="#CBD5E1" />
            <circle cx="140" cy="124" r="71" fill="#22C55E" />
            <circle
              cx="140"
              cy="124"
              r="65"
              fill="none"
              stroke="#16A34A"
              strokeWidth="1.5"
              opacity=".45"
            />
            <g stroke="#0F172A" strokeWidth="3" strokeLinecap="round">
              {Array.from({ length: 16 }, (_, index) => (
                <path
                  key={index}
                  d="M140 43V51"
                  transform={`rotate(${index * 22.5} 140 124)`}
                />
              ))}
            </g>
            <g
              stroke="#15803D"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".55"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <path
                  key={index}
                  d="M140 66V77"
                  transform={`rotate(${index * 60 + 8} 140 124)`}
                />
              ))}
            </g>
            <circle cx="140" cy="124" r="22" fill="#0F172A" />
          </g>
          <g transform="rotate(-24 140 124)">
            <path
              d="M44 128A96 96 0 0 1 236 128L229 136H167A29 29 0 0 0 113 136H51Z"
              fill="#25354B"
              stroke="#94A3B8"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M53 110A88 88 0 0 1 227 110"
              fill="none"
              stroke="#475569"
              strokeWidth="2"
            />
            <path
              d="M51 129H111M169 129H229"
              stroke="#64748B"
              strokeWidth="2"
            />
            <path
              d="M234 111H244V137H231"
              fill="#334155"
              stroke="#94A3B8"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <circle cx="79" cy="108" r="3" fill="#94A3B8" />
            <circle cx="201" cy="108" r="3" fill="#94A3B8" />
            <circle cx="140" cy="124" r="20" fill="#0F172A" />
          </g>
        </g>
        <SparkBurst />
        <SparkBurst second />
      </g>
      <g textAnchor="middle" fill="#F1F5F9">
        <text
          className={styles.title}
          x="195"
          y="504"
          fontSize="30"
          fontWeight="700"
          letterSpacing="-.6"
        >
          {title}
        </text>
        <text
          className={styles.subtitle}
          x="195"
          y="541"
          fontSize="15"
          fill="#94A3B8"
          textLength={subtitle.length > 30 ? 342 : undefined}
          lengthAdjust="spacingAndGlyphs"
        >
          {subtitle}
        </text>
      </g>
    </svg>
  );
}
