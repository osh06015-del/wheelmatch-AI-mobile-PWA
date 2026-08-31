import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // 상위 폴더에 있는 다른 package-lock.json을 프로젝트 루트로 착각하지 않도록 고정한다.
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
