// 제공받은 GRINDOK 로고를 설치 아이콘 크기로 맞춘다. 로고 도안은 바꾸지 않는다.
// 실행: node scripts/generate-icons.mjs (Next.js가 설치한 sharp 사용)
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(ROOT, 'public/icons/grindok-logo.png');
for (const size of [192, 512]) {
  const icon = await sharp(source)
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer();
  await sharp(icon).toFile(join(ROOT, `public/icons/grindok-${size}.png`));
  if (size === 192) await sharp(icon).toFile(join(ROOT, 'src/app/icon.png'));
}
