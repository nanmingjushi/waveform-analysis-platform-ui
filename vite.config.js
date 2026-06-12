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
      }
    }
  }

})
