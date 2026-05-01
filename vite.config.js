import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Vercel 환경에서는 루트(/)를 사용하고, 로컬 빌드(라즈베리파이용)에서는 /ddc-config/ 사용
  base: process.env.VERCEL ? '/' : '/ddc-config/',
})
