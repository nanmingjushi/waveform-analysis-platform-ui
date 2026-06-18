<template>
  <div class="ai-chat-container">
    <el-card class="chat-card">
      <template #header>
        <div class="card-header">
          <span> 电力系统 AI 专家助手</span>
          <el-tag type="success" effect="plain">大模型在线</el-tag>
        </div>
      </template>

      <div class="message-list" ref="messageBox">
        <div 
          v-for="(msg, index) in messages" 
          :key="index"
          :class="['message-item', msg.role === 'user' ? 'msg-user' : 'msg-ai']"
        >
          <div class="avatar">{{ msg.role === 'user' ? '工' : 'AI' }}</div>
          <div class="content-box">
            <div 
              v-if="msg.role === 'assistant'" 
              class="content-text markdown-body" 
              v-html="renderMarkdown(msg.content)"
            ></div>
            <div v-else class="content-text user-text">
              {{ msg.content }}
            </div>
          </div>
        </div>

        <div v-if="isThinking" class="message-item msg-ai">
          <div class="avatar">AI</div>
          <div class="content-box-thinking">
            <div class="thinking-dots">
              <span>AI 正在思考中</span>
              <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
            </div>
          </div>
        </div>
      </div>

      <div class="input-area">
        <el-input 
          v-model="inputPrompt" 
          type="textarea" 
          :rows="2" 
          placeholder="请输入您的问题。您可以咨询电力波形文件、波形图像或电能质量测试问题..."
          :disabled="isThinking" 
          @keyup.enter.prevent="handleSend" 
        />
        <el-button type="primary" :disabled="isThinking" class="send-btn" @click="handleSend">
          发送
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../../../stores/user' 
// 引入 Markdown 解析库
import MarkdownIt from 'markdown-it'

const userStore = useUserStore()
const inputPrompt = ref('')
const isThinking = ref(false)
const messageBox = ref(null)

// 初始化 MarkdownIt 实例
const md = new MarkdownIt({
  html: false,        // 禁用大模型吐出原生 html 标签，防止 XSS 攻击
  breaks: true,       // 自动将换行符转换为 <br>
  linkify: true       // 自动将文本中的 URL 转换为可点击的超链接
})

// 格式化与渲染 Markdown 的核心函数
const renderMarkdown = (text) => {
  if (!text) return ''
  return md.render(text)
}

// 初始欢迎语
const messages = ref([
  { role: 'assistant', content: '您好！我是本平台的本地 AI 专家助手，您可以问我任何问题。关于 COMTRADE 录波文件解析、OpenCV 波形图像识别或电能质量报告自动生成的问题，我都能为您解答。' }
])

// 自动滚动到聊天底部
const scrollToBottom = async () => {
  await nextTick()
  if (messageBox.value) {
    messageBox.value.scrollTop = messageBox.value.scrollHeight
  }
}

// 发送消息核心逻辑
const handleSend = async () => {
  const prompt = inputPrompt.value.trim()
  if (!prompt) return

  // 用户消息立刻上屏
  messages.value.push({ role: 'user', content: prompt })
  inputPrompt.value = ''
  isThinking.value = true // 激活唯一动画气泡，此时先不往 messages 数组里推空对象
  scrollToBottom()

  let aiMessageIndex = -1 // 用来精准定位后续动态追加文本的 AI 数据索引
  let streamingText = ''

  try {
    // 从本地缓存安全抓取 'waveform_token'
    const token = localStorage.getItem('waveform_token') || ''
    const url = `/ai/qwen/stream?prompt=${encodeURIComponent(prompt)}`

    // 使用原生 fetch 发起响应式流请求
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP 错误! 状态码: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    
    // 行缓冲区，完美应对网络抖动引发的 TCP 拆包黏包
    let buffer = '' 

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // 将最后一行不完整的碎片扣留在大盘缓冲区内

      for (const line of lines) {
        // 判定标准 SSE 协议行
        if (line.startsWith('data:')) {
          const cleanText = line.replace('data:', '')

          // 当大模型开始吐出第一个字符或换行时
          if (aiMessageIndex === -1) {
            isThinking.value = false // 关掉“正在思考中...”动画
            // 此时才正式创建真实的 AI 气泡并塞入数组，无缝平滑切换！
            aiMessageIndex = messages.value.push({ role: 'assistant', content: '' }) - 1
          }

          // 如果行纯粹是 "data:"，说明大模型发射了一个显式换行符 \n
          if (line === 'data:') {
            streamingText += '\n'
          } else {
            streamingText += cleanText
          }

          // 实时将恢复完毕的 Markdown 文本灌入消息体
          messages.value[aiMessageIndex].content = streamingText
          scrollToBottom()
        }
      }
    }

    // 循环结束，做最后一次缓冲区残留数据冲刷
    if (buffer.startsWith('data:') && aiMessageIndex !== -1) {
      if (buffer === 'data:') {
        streamingText += '\n'
      } else {
        streamingText += buffer.replace('data:', '')
      }
      messages.value[aiMessageIndex].content = streamingText
    }

  } catch (error) {
    console.error('AI流式通信失败:', error)
    ElMessage.error('AI 助手通信中断')
    if (aiMessageIndex !== -1) {
      messages.value[aiMessageIndex].content += '\n\n（连接异常中断）'
    }
  } finally {
    isThinking.value = false // 兜底确保关闭思考状态
    scrollToBottom()
  }
}
</script>

<style scoped>
.ai-chat-container {
  padding: 20px;
  height: calc(100vh - 120px);
  display: flex;
  justify-content: center;
}
.chat-card {
  width: 100%;
  max-width: 950px;
  display: flex;
  flex-direction: column;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}
.message-list {
  flex: 1;
  height: 520px;
  overflow-y: auto;
  padding: 15px;
  border-bottom: 1px solid #ebeef5;
}
.message-item {
  display: flex;
  margin-bottom: 22px;
  align-items: flex-start;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}
.msg-ai .avatar {
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #d9ecff;
}
.msg-user {
  flex-direction: row-reverse;
}
.msg-user .avatar {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}
.content-box {
  max-width: 80%;
  margin: 0 14px;
  padding: 12px 18px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.content-box-thinking {
  margin: 0 14px;
  padding: 12px 18px;
  border-radius: 12px;
  background-color: #f4f4f5;
  color: #909399;
}
.msg-ai .content-box {
  background-color: #f4f4f5;
  color: #303133;
}
.msg-user .content-box {
  background-color: #409eff;
  color: #ffffff;
}
.content-text {
  font-size: 14px;
  line-height: 1.6;
}
.user-text {
  white-space: pre-wrap;
}

/* 🌟 精细化美化渲染出来的 Markdown HTML 标签标签样式 */
.markdown-body :deep(h3) {
  font-size: 16px;
  font-weight: bold;
  margin: 16px 0 8px 0;
  color: #1f2f3d;
}
.markdown-body :deep(p) {
  margin: 0 0 10px 0;
}
.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}
.markdown-body :deep(ul), .markdown-body :deep(ol) {
  margin: 0 0 10px 0;
  padding-left: 22px;
}
.markdown-body :deep(li) {
  margin-bottom: 6px;
}
.markdown-body :deep(strong) {
  color: #409eff; /* 给电力名词、加粗部分穿上清爽的高亮蓝色外衣 */
  font-weight: bold;
}
.markdown-body :deep(hr) {
  border: none;
  border-top: 1px dashed #dcdfe6;
  margin: 16px 0;
}

/* 呼吸思考小动画 */
.thinking-dots {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 2px;
}
@keyframes blink {
  0% { opacity: .2; }
  20% { opacity: 1; }
  100% { opacity: .2; }
}
.dot {
  animation: blink 1.4s infinite both;
  font-weight: bold;
}
.dot:nth-child(2) { animation-delay: .2s; }
.dot:nth-child(3) { animation-delay: .4s; }

.input-area {
  margin-top: 15px;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
.send-btn {
  height: 54px;
  width: 90px;
}
</style>