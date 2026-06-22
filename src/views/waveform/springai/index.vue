<template>
  <div class="ai-platform-container">
    <div class="session-sidebar">
      <el-button type="primary" plain class="new-chat-btn" @click="createNewSession">
        + 新建对话
      </el-button>
      <div class="session-list">
        <div v-for="session in sessions" :key="session.id"
          :class="['session-item', currentSessionId === session.id ? 'active-session' : '']"
          @click="switchSession(session.id)">
          <div class="session-info">
            <span class="session-icon">💬</span>
            <span class="session-title" :title="session.title">{{ session.title }}</span>
          </div>
          <span v-if="sessions.length > 1" class="delete-session-btn" @click.stop="deleteSession(session.id)">
            ×
          </span>
        </div>
      </div>
    </div>

    <el-card class="chat-card">
      <template #header>
        <div class="card-header">
          <span>电力系统 AI 专家助手</span>
          <el-tag type="success" effect="plain">已接入 qwen3.7-plus</el-tag>
        </div>
      </template>

      <div class="message-list" ref="messageBox">
        <div v-for="(msg, index) in currentMessages" :key="index"
          :class="['message-item', msg.role === 'user' ? 'msg-user' : 'msg-ai']">
          <div class="avatar">{{ msg.role === 'user' ? '工' : 'AI' }}</div>
          <div class="content-box">
            <div v-if="msg.role === 'assistant'" class="content-text markdown-body"
              v-html="renderMarkdown(msg.content)">
            </div>
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
        <el-input v-model="inputPrompt" type="textarea" :rows="2"
          placeholder="请输入您的问题..." :disabled="isThinking"
          @keyup.enter.prevent="handleSend" />
        <el-button type="primary" :disabled="isThinking" class="send-btn" @click="handleSend">
          发送
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownIt from 'markdown-it'

const inputPrompt = ref('')
const isThinking = ref(false)
const messageBox = ref(null)

// 会话大盘的核心响应式数据
const sessions = ref([])
const currentSessionId = ref('')

// 初始化 Markdown 渲染器
const md = new MarkdownIt({
  html: false, breaks: true, linkify: true
})
const renderMarkdown = (text) => text ? md.render(text) : ''

// 计算属性：动态获取当前高亮会话的消息列表
const currentMessages = computed(() => {
  const active = sessions.value.find(s => s.id === currentSessionId.value)
  return active ? active.messages : []
})

// 核心机制：从本地 LocalStorage 加载或初始化会话列表
const initPlatformSessions = () => {
  const localData = localStorage.getItem('waveform_ai_sessions')
  if (localData) {
    try {
      sessions.value = JSON.parse(localData)
      if (sessions.value.length > 0) {
        currentSessionId.value = sessions.value[0].id
        return
      }
    } catch (e) {
      console.error('解析本地会话历史失败，重置大盘', e)
    }
  }
  // 兜底：如果本地没数据，自动创建一个初始默认会话
  createDefaultSession()
}

// 创建全新的空会话对象
const createDefaultSession = () => {
  const defaultId = 'session_' + Date.now()
  sessions.value.push({
    id: defaultId,
    title: '全新的电力技术咨询',
    messages: [
      { role: 'assistant', content: '您好！我是本平台的 AI 专家助手，您可以向我提问任何问题。您可以随时问我关于 COMTRADE 录波解析、OpenCV 波形识别或电能质量报告自动生成的问题。' }
    ]
  })
  currentSessionId.value = defaultId
  saveSessionsToLocal()
}

// 按钮事件：新建对话
const createNewSession = () => {
  if (isThinking.value) {
    ElMessage.warning('请等待 AI 回复完成后再新建对话')
    return
  }
  createDefaultSession()
  nextTick(() => ElMessage.success('成功创建新对话'))
}

// 切换对话
const switchSession = (id) => {
  if (isThinking.value) {
    ElMessage.warning('AI 正在输出中，请勿频繁切换')
    return
  }
  currentSessionId.value = id
  scrollToBottom()
}

// 删除对话
const deleteSession = (id) => {
  if (isThinking.value && currentSessionId.value === id) {
    ElMessage.warning('当前对话正忙，无法删除')
    return
  }

  const index = sessions.value.findIndex(s => s.id === id)
  if (index !== -1) {
    sessions.value.splice(index, 1)
    // 如果删掉的是当前激活的，自动切到第一个会话
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0].id
    }
    saveSessionsToLocal()
    ElMessage.info('会话历史已清理')
    scrollToBottom()
  }
}

// 持久化保存到浏览器本地
const saveSessionsToLocal = () => {
  localStorage.setItem('waveform_ai_sessions', JSON.stringify(sessions.value))
}

// 自动滚动
const scrollToBottom = async () => {
  await nextTick()
  if (messageBox.value) {
    messageBox.value.scrollTop = messageBox.value.scrollHeight
  }
}

// 发送消息核心逻辑（配合后端 chatId 穿透）
const handleSend = async () => {
  const prompt = inputPrompt.value.trim()
  if (!prompt) return

  // 1. 查找当前激活的会话对象
  const activeSession = sessions.value.find(s => s.id === currentSessionId.value)
  if (!activeSession) return

  // 用户消息立刻上屏，并同步修改左侧会话的标题（取前12个字，显得更专业）
  activeSession.messages.push({ role: 'user', content: prompt })
  if (activeSession.title === '全新/未命名的电力技术咨询' || activeSession.messages.length <= 3) {
    activeSession.title = prompt.length > 12 ? prompt.substring(0, 12) + '...' : prompt
  }

  inputPrompt.value = ''
  isThinking.value = true
  scrollToBottom()
  saveSessionsToLocal()

  let aiMessageIndex = -1
  let streamingText = ''

  try {
    const token = localStorage.getItem('waveform_token') || ''

    // 在此处将前端当前的 currentSessionId 作为参数传入，穿透给后端的 @RequestParam chatId
    const url = `/ai/qwen/stream?prompt=${encodeURIComponent(prompt)}&chatId=${currentSessionId.value}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
      }
    })

    if (!response.ok) throw new Error(`HTTP 异常! 状态码: ${response.status}`)

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const cleanText = line.replace('data:', '')

          if (aiMessageIndex === -1) {
            isThinking.value = false // 关掉思考小动画
            // 向当前会话的历史数组中压入大模型的响应体，获取其索引
            aiMessageIndex = activeSession.messages.push({ role: 'assistant', content: '' }) - 1
          }

          if (line === 'data:') {
            streamingText += '\n'
          } else {
            streamingText += cleanText
          }

          activeSession.messages[aiMessageIndex].content = streamingText
          scrollToBottom()
        }
      }
    }

    if (buffer.startsWith('data:') && aiMessageIndex !== -1) {
      streamingText += buffer.replace('data:', '')
      activeSession.messages[aiMessageIndex].content = streamingText
    }

    // 每次大模型完整输出完毕后，将最新的消息记录固化到本地缓存，防止刷新丢失历史记录
    saveSessionsToLocal()

  } catch (error) {
    console.error('AI多轮通信失败:', error)
    ElMessage.error('AI 通信异常中断')
    if (aiMessageIndex !== -1) {
      activeSession.messages[aiMessageIndex].content += '\n\n（连接异常中断）'
    }
  } finally {
    isThinking.value = false
    scrollToBottom()
  }
}

// 页面挂载时自动初始化会话大盘
onMounted(() => {
  initPlatformSessions()
  scrollToBottom()
})
</script>

<style scoped>
/* 双栏响应式大盘弹性盒架构 */
.ai-platform-container {
  display: flex;
  padding: 20px;
  gap: 20px;
  height: calc(100vh - 120px);
  background-color: #f5f7fa;
}

/* 左侧会话侧边栏样式 */
.session-sidebar {
  width: 260px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 15px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.new-chat-btn {
  width: 100%;
  margin-bottom: 15px;
  font-weight: bold;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  color: #606266;
  font-size: 14px;
}

.session-item:hover {
  background-color: #f2f6fc;
  color: #409eff;
}

.active-session {
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: bold;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 85%;
}

.session-icon {
  font-size: 16px;
}

.session-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-session-btn {
  font-size: 18px;
  color: #909399;
  cursor: pointer;
  padding: 0 4px;
}

.delete-session-btn:hover {
  color: #f56c6c;
}

/* 右侧聊天大盘样式（完美承接原本的精致样式） */
.chat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.message-list {
  flex: 1;
  height: 630px;
  overflow-y: auto;
  padding: 10px 15px;
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
  font-size: 13px;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.content-box-thinking {
  margin: 0 14px;
  padding: 12px 18px;
  border-radius: 12px;
  background-color: #f4f4f5;
  color: #909399;
}

.msg-ai .content-box {
  background-color: #ffffff;
  color: #303133;
  border: 1px solid #ebeef5;
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

/* Markdown 精细化标签注入样式 */
.markdown-body :deep(h3) {
  font-size: 15px;
  font-weight: bold;
  margin: 14px 0 8px 0;
  color: #1f2f3d;
}

.markdown-body :deep(p) {
  margin: 0 0 8px 0;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0 0 8px 0;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin-bottom: 5px;
}

.markdown-body :deep(strong) {
  color: #409eff;
  font-weight: bold;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px dashed #dcdfe6;
  margin: 14px 0;
}

/* 动感思考小动画 */
.thinking-dots {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 2px;
}

@keyframes blink {
  0% {
    opacity: .2;
  }

  20% {
    opacity: 1;
  }

  100% {
    opacity: .2;
  }
}

.dot {
  animation: blink 1.4s infinite both;
  font-weight: bold;
}

.dot:nth-child(2) {
  animation-delay: .2s;
}

.dot:nth-child(3) {
  animation-delay: .4s;
}

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