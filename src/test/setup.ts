// Vitest 전역 셋업. vitest.config.mts의 setupFiles가 불러온다.

// toBeInTheDocument, toBeDisabled 같은 DOM matcher를 expect에 등록한다.
import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 각 테스트가 끝나면 렌더된 DOM을 지운다.
// 안 지우면 이전 테스트의 화면이 남아서 getByText가 엉뚱한 걸 찾는다.
afterEach(() => {
  cleanup();
});
