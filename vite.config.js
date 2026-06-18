import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },

  // 服务端代理配置
  server: {
    port: 5173,       // 前端本地启动端口
    open: true,       // 启动时自动在浏览器打开
    proxy: {
      // 当请求以 /api 开头时，代理到后端
      '/api': {
        target: 'http://localhost:8080', // SpringBoot后端的地址
        changeOrigin: true,              // 允许跨域
        // rewrite: (path) => path.replace(/^\/api/, '') // 如果后端接口没写 /api 前缀，这里自动去掉
      },
      // 当请求以 /ai 开头时，代理到后端的 8080 端口
      '/ai': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // 这里不需要写 rewrite，因为后端的 Controller 本身就是以 /ai 开头的
      }
    }
  }

})
