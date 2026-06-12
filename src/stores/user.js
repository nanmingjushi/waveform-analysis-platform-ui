import { defineStore } from "pinia";
import request from "../utils/request"
import { ref } from "vue";


export const useUserStore = defineStore('user', () => {
  
  // 1. 状态定义 (State)
  // 初始化时优先读取本地缓存
  const token = ref(localStorage.getItem('waveform_token') || '')
  const userInfo = ref(null) // 预留卡槽：后续可用来存储当前登录的用户名、工号等

  // 2. 业务行为定义 (Actions)
  /**
   * 登录核心业务编排
   * @param {Object} loginForm 前端表单传进来的 { username, password } 纯 JS 对象
   */
  const login = async (loginForm) => {
    try {
      // 驱动 request 管道向后端发起真正的凭证验证请求
      // 注意：由于我们在 request.js 响应拦截器里写了 res.data 自动拆壳，这里拿到的 data 直接就是后端回吐的业务数据
      const data = await request({
        url: '/api/auth/login', // 根据后端实际的登录接口路由进行微调对齐
        method: 'post',
        data: loginForm
      })

      // 假设后端验证通过后，回吐的 JSON 中包含名为 token 的安全令牌字符串
      const userToken = data.token

      // 强力同步更新：内存状态与物理硬盘缓存双落盘
      token.value = userToken
      localStorage.setItem('waveform_token', userToken)

      return data // 向上返回，通知页面登录成功
    } catch (error) {
      // 异常直接抛出，request.js 的全局弹窗会自动拦截并把错误拍在屏幕上
      return Promise.reject(error)
    }
  }

  /**
   * 安全退出登录业务
   */
  const logout = () => {
    // 1. 彻底蒸发内存数据，触发 Vue 3 响应式机制，使所有受保护的看板瞬间锁死
    token.value = ''
    userInfo.value = null
    
    // 2. 擦除物理缓存，使下一次 request 彻底失去穿透凭证
    localStorage.removeItem('waveform_token')
  }

  // 3. 统一暴露
  return {
    token,
    userInfo,
    login,
    logout
  }
})