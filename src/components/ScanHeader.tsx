// 촬영 화면 상단 헤더. 진행 단계와 뒤로가기를 함께 보여준다.

import Link from 'next/link';

interface ScanHeaderProps {
  step: string;
  title: string;
  /** 확인 화면처럼 이미 좌우 여백이 있는 곳에서는 테두리와 패딩을 뺀다. */
  bare?: boolean;
}

export function ScanHeader({ step, title, bare = false }: ScanHeaderProps) {
  return (
    <header
      className={`flex items-center gap-3 ${bare ? '' : 'border-b border-slate-800 px-6 py-4'}`}
    >
      <Link
        href="/"
        aria-label="처음으로"
        className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl text-slate-300 active:bg-slate-800"
      >
        ←
      </Link>
      <div className="flex flex-col">
        <span className="text-base text-slate-400">{step}</span>
        <h1 className="text-xl font-bold text-slate-100">{title}</h1>
      </div>
    </header>
  );
}
