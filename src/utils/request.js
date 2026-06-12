import axios from "axios";
import { ElMessage } from "element-plus";
import router from "../router";


// 1. 创建 Axios 实例
const service = axios.create({
    baseURL: '', // 留空或者写 '/'，代表请求直接发给当前前端所在的 5173 端口
    timeout: 20000 // 因为录波文件较大（50MB），超时时间必须放宽到 20 秒以上，防止大文件解析超时
})


// 2. 请求拦截器 (Request Interceptor)
service.interceptors.request.use(
    (config) => {
        // 从本地缓存中安全抓取登录时存入的 Token
        const token = localStorage.getItem('waveform_token')

        // 如果 Token 存在，严格按照后端的安全要求，以 Bearer 格式注入请求头
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        console.error('请求发送失败：', error)
        return Promise.reject(error)
    }
)


// 3. 响应拦截器 (Response Interceptor)
service.interceptors.response.use(
  (response) => {
    // 特殊情况处理：如果后端返回的是二进制大对象 (Blob)，说明是我们的 CSV 文件下载接口
    // 二进制流响应没有 code 状态码，必须直接原汁原味地把整个 response 返回给业务层去解析文件名
    if (response.request.responseType === 'blob' || response.data instanceof Blob) {
      return response
    }

    // 解析后端标准的统一响应体 { code, message, data }
    const res = response.data

    // 如果业务状态码不是 200，说明后端报错了（例如 500 数据库报错）
    if (res.code !== 200) {
      // 触发全局弹窗提示，直接展示后端传过来的具体 message 原因
      ElMessage.error(res.message || '系统繁忙，请稍后再试')

      // 如果后端判定 Token 违法或过期（返回 401）
      if (res.code === 401) {
        localStorage.removeItem('waveform_token') // 清除脏数据
        router.push('/login') // 强行踢回登录页
      }

      return Promise.reject(new Error(res.message || 'Error'))
    }

    // 状态码为 200 时，将包装壳拆开，只把最核心的 data 业务数据扔给前端组件
    return res
  },
  (error) => {
    // 处理 HTTP 状态码级别的崩溃（如网络断开、404、500网络溃败等）
    console.error('网络管道发生不可逆崩溃：', error)
    ElMessage.error(error.message || '网络连接异常，请检查后端服务是否启动')
    return Promise.reject(error)
  }
)

export default service
