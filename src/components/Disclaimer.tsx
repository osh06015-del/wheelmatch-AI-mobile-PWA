// 면책 문구. 메인 화면과 결과 화면에 항상 표시한다.
//
// 이 앱은 라벨에 "표시된 규격"을 서로 대조할 뿐이다.
// 숫돌의 실제 상태, 기계의 마모, 작업 방법까지 판단하지 않는다.

export function Disclaimer() {
  return (
    <p className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-4 text-base leading-relaxed text-slate-400">
      ⚠ 이 앱은 라벨에 표시된 규격의 대조 결과만 제공합니다. 작업 안전성을
      보증하지 않으며, 제조사 취급설명서와 사업장 안전수칙을 대체할 수 없습니다.
    </p>
  );
}
