// 화면 코드에 한국어를 직접 쓰지 않았는지 확인한다.
//
// 번역 파일이 다 있어도 컴포넌트에 한국어가 박혀 있으면, 작업자는 고른 언어로
// 끝까지 진행하지 못한다. 실제로 촬영 화면·값 확인·이력 화면이 그런 상태였다.
//
// 문자열 리터럴·템플릿·JSX 텍스트만 본다. 주석은 문법 트리에 노드로 잡히지
// 않으므로 자동으로 빠지고, 테스트 파일은 한국어 화면을 확인하는 코드라 뺀다.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/** 한국어가 남아도 되는 파일과 그 이유. 이유 없이 늘리지 않는다. */
const ALLOWED: Readonly<Record<string, string>> = {
  'src/lib/i18n/messages/ko.ts': '원본 문구 파일',
  'src/lib/i18n/index.ts': "언어 선택 버튼의 '한국어'는 그 언어로 적는다",
  'src/lib/i18n/checkText.ts':
    '한국어 조사 은/는을 앞 글자에 맞춰 고르는 규칙이다. 문장은 문구 파일에 있다',
  'src/lib/rules/engine.ts':
    '기록·CSV에 남는 한국어 사유와 규칙 이름. 화면은 사유 코드로 번역한다',
  'src/lib/ocr/schema.ts': '모델에게 주는 지시문. 작업자에게 보이지 않는다',
  'src/lib/vision/wheelExamSchema.ts':
    '모델에게 주는 지시문. 작업자에게 보이지 않는다',
  'src/app/api/extract/route.ts':
    '로그·개발자용 오류 문장과 모델 지시문. 화면은 code로 문장을 고른다',
  'src/app/api/wheel-exam/route.ts':
    '로그·개발자용 오류 문장과 모델 지시문. 화면은 code로 문장을 고른다',
  'src/app/layout.tsx':
    '검색·공유 카드용 기본 메타데이터. 탭 제목은 DocumentLocale이 바꾼다',
  'src/app/opengraph-image.tsx': '메신저 공유 카드 이미지',
};

const HANGUL = /[가-힣]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      // 테스트 도구와 흐름 테스트는 한국어 화면을 확인하는 코드다.
      return name === 'test' || name === 'e2e' ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(name) && !name.includes('.test.') ? [path] : [];
  });
}

function hangulLiterals(path: string): string[] {
  const text = readFileSync(path, 'utf-8');
  const file = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isStringLiteralLike(node) ||
        ts.isTemplateLiteralToken(node) ||
        ts.isJsxText(node)) &&
      HANGUL.test(node.text)
    ) {
      const { line } = file.getLineAndCharacterOfPosition(node.getStart());
      found.push(`${line + 1}: ${node.text.trim().slice(0, 60)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

describe('화면 코드의 하드코딩 한국어', () => {
  it('허용한 파일 말고는 문자열과 JSX에 한국어가 없다', () => {
    const offenders = sourceFiles('src')
      .map((path) => relative(process.cwd(), path).split(sep).join('/'))
      .filter((path) => !(path in ALLOWED))
      .flatMap((path) => hangulLiterals(path).map((hit) => `${path}:${hit}`));
    expect(offenders).toEqual([]);
  });

  it('허용 목록의 파일이 실제로 있다 — 지워진 파일을 목록에 남기지 않는다', () => {
    for (const path of Object.keys(ALLOWED)) {
      expect(statSync(path).isFile()).toBe(true);
    }
  });

  it('검사기가 실제로 한국어를 잡는다', () => {
    // 검사가 조용히 아무것도 못 잡는 상태를 막는다. 원본 문구 파일에는 반드시 있다.
    expect(
      hangulLiterals('src/lib/i18n/messages/ko.ts').length,
    ).toBeGreaterThan(100);
  });
});
