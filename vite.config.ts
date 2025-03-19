import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'docs',  // GitHub Pages에서 인식 가능한 폴더로 변경
  },
});