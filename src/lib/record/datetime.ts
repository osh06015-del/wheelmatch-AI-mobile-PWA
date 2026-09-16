// 기록에 남은 ISO 시각을 화면에 적는 형식.
//
// toLocaleString을 쓰지 않는다 — 실행 환경의 ICU 설정에 따라 결과가 달라져서
// 같은 기록이 기기마다 다르게 보인다. 읽을 수 없는 값은 지어내지 않고 원문을
// 그대로 돌려준다.

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
