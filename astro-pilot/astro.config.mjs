// @ts-check
import { defineConfig } from 'astro/config';

// 시범 전환: 기존 사이트의 주소(/engineering/language/C/function.html)를 그대로 쓰도록 .html 파일로 내보낸다.
export default defineConfig({
  site: 'https://iseohyun.com',
  trailingSlash: 'ignore',
  build: {
    format: 'file',
  },
  // 문서 HTML 안의 공백·주석이 의미를 갖는 곳(pre, 인라인 스크립트)이 있어 압축하지 않는다
  compressHTML: false,
  devToolbar: { enabled: false },
});
