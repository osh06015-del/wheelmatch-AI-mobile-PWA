// git이 .githooks/ 를 hook 디렉터리로 쓰도록 설정한다.
//
// npm install 후 자동 실행된다(package.json의 prepare). 새로 clone 받은
// 사람도 별도 설치 없이 pre-commit 게이트를 갖게 하기 위해서다.
// Husky나 Lefthook 같은 별도 의존성 없이 git 기본 기능만 쓴다.
//
// git이 없거나 저장소가 아니어도 설치를 실패시키지 않는다.

import { spawnSync } from 'node:child_process';

// git은 실행 파일이라 shell 없이 바로 띄운다.
// shell: true 로 인자를 넘기면 Node가 DEP0190 경고를 낸다.
const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
  stdio: 'ignore',
});

if (result.status === 0) {
  console.log('git hooks: core.hooksPath = .githooks');
}
