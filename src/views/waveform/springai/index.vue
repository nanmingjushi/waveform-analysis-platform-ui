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
          <span> 电力系统 AI 专家助手</span>
          <el-tag type="primary" effect="plain">基于Qwen3.7Plus</el-tag>
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
              <span>AI 正在分析知识库并思考中</span>
              <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bottom-input-wrapper">
        <div v-if="currentUploadedFile" class="rag-status-bar">
          <el-tag type="success" size="default" closable @close="handleClearFile" class="rag-tag">
            📚 已加载背景知识库：{{ currentUploadedFile }} (RAG 增强模式已自动开启)
          </el-tag>
        </div>

        <div class="input-area">
          <el-upload action="/ai/qwen/load" name="file" :headers="uploadHeaders" :before-upload="beforePdfUpload"
            :on-success="handleUploadSuccess" :on-error="handleUploadError" :show-file-list="false"
            class="inline-pdf-uploader">
            <el-button type="info" plain :icon="Paperclip" class="upload-icon-btn" title="上传 PDF 背景知识文档" />
          </el-upload>

          <el-input v-model="inputPrompt" type="textarea" :rows="2" placeholder="请输入您的问题。点击左侧按钮可以上传 PDF 开启知识库增强..."
            :disabled="isThinking" @keyup.enter.prevent="handleSend" />

          <el-button type="primary" :disabled="isThinking" class="send-btn" @click="handleSend">
            发送
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElLoading } from 'element-plus'
import { useUserStore } from '../../../stores/user'
import MarkdownIt from 'markdown-it'  //渲染markdown文本
import markdownItMathjax3 from 'markdown-it-mathjax3'  //渲染latex公式
import { Paperclip } from '@element-plus/icons-vue'


const userStore = useUserStore()
const inputPrompt = ref('')
const isThinking = ref(false)
const messageBox = ref(null)

// 会话数据大盘
const sessions = ref([])
const currentSessionId = ref('')

// 初始化高级具有良好换行特性的 Markdown 转化器
const md = new MarkdownIt({ html: false, breaks: true, linkify: true })
md.use(markdownItMathjax3)
const renderMarkdown = (text) => text ? md.render(text) : ''

// 抓取并计算当前激活会话绑定的已上传文件名
const currentUploadedFile = computed(() => {
  const active = sessions.value.find(s => s.id === currentSessionId.value)
  return active ? active.uploadedFile : ''
})

// 动态提取当前会话的消息序列
const currentMessages = computed(() => {
  const active = sessions.value.find(s => s.id === currentSessionId.value)
  return active ? active.messages : []
})

// 自动向 Upload 注入系统 Bearer Token 头
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('waveform_token') || ''
  return {
    'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
  }
})

// 清除当前会话的 PDF 背景知识（允许切换回普通模式）
const handleClearFile = () => {
  const active = sessions.value.find(s => s.id === currentSessionId.value)
  if (active) {
    active.uploadedFile = ''
    saveSessionsToLocal()
    ElMessage.info('已卸载背景知识库，切换回普通对话模式')
  }
}

// PDF 文件上传前置拦截
const beforePdfUpload = (rawFile) => {
  if (rawFile.type !== 'application/pdf' && !rawFile.name.endsWith('.pdf')) {
    ElMessage.error('系统目前支持 .pdf 格式的知识文档！')
    return false
  }
  ElLoading.service({ text: '正在调动后端解析引擎切片、计算向量并灌入向量数据库...', background: 'rgba(0, 0, 0, 0.7)' })
  return true
}

// PDF 上传向量库库成功
const handleUploadSuccess = (response, uploadFile) => {
  ElLoading.service().close()

  // 查找当前激活的会话，把上传的文件名字绑死在它身上
  const active = sessions.value.find(s => s.id === currentSessionId.value)
  if (active) {
    active.uploadedFile = uploadFile.name // 🌟 自动把名字灌进去
    saveSessionsToLocal()
  }

  ElMessage.success('PDF 背景文本切片计算完成，RAG 增强模式已自动激活！')
}

// 上传失败
const handleUploadError = (error) => {
  ElLoading.service().close()
  console.error(error)
  ElMessage.error('文档向量化失败，请检查网络或后端环境')
}

// 加载/重构本地LocalStorage会话列表
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
      console.error(e)
    }
  }
  createDefaultSession()
}

// 创建新会话默认结构（新增 uploadedFile 属性）
const createDefaultSession = () => {
  const defaultId = 'session_' + Date.now()
  sessions.value.push({
    id: defaultId,
    title: '新对话',
    uploadedFile: '', // 
    messages: [
      { role: 'assistant', content: '您好！我是本平台的 AI 专家助手，您可以问我任何问题。您可以上传 PDF 文件，上传成功后系统将自动激活 RAG 背景知识检索。' }
    ]
  })
  currentSessionId.value = defaultId
  saveSessionsToLocal()
}

const createNewSession = () => {
  if (isThinking.value) return
  createDefaultSession()
}

const switchSession = (id) => {
  if (isThinking.value) return
  currentSessionId.value = id
  scrollToBottom()
}

const deleteSession = (id) => {
  if (isThinking.value && currentSessionId.value === id) return
  const index = sessions.value.findIndex(s => s.id === id)
  if (index !== -1) {
    sessions.value.splice(index, 1)
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0].id
    }
    saveSessionsToLocal()
    scrollToBottom()
  }
}

const saveSessionsToLocal = () => {
  localStorage.setItem('waveform_ai_sessions', JSON.stringify(sessions.value))
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageBox.value) {
    messageBox.value.scrollTop = messageBox.value.scrollHeight
  }
}

// 核心对话发送逻辑
const handleSend = async () => {
  const prompt = inputPrompt.value.trim()
  if (!prompt) return

  const activeSession = sessions.value.find(s => s.id === currentSessionId.value)
  if (!activeSession) return

  activeSession.messages.push({ role: 'user', content: prompt })
  if (activeSession.title === '新对话' || activeSession.messages.length <= 3) {
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

    // 判定 RAG 状态：只要当前会话身上绑着 uploadedFile，那就给后端穿透传 useRag=true
    const isRagActive = activeSession.uploadedFile ? 'true' : 'false'
    const url = `/ai/qwen/stream?prompt=${encodeURIComponent(prompt)}&chatId=${currentSessionId.value}&useRag=${isRagActive}`

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
            isThinking.value = false
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

onMounted(() => {
  initPlatformSessions()
  scrollToBottom()
})
</script>

<style scoped>
.ai-platform-container {
  display: flex;
  padding: 20px;
  gap: 20px;
  height: calc(100vh - 120px);
  background-color: #f5f7fa;
}

/* 左侧会话侧边栏 */
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

/* 右侧聊天核心卡片 */
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
  height: 600px;
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

/* 底部复合输入区高级排版样式 */
.bottom-input-wrapper {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rag-status-bar {
  display: flex;
  padding-left: 66px;
  /* 完美对齐下方左移后的输入框起始位置 */
}

.rag-tag {
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(103, 194, 58, 0.15);
}

.input-area {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}
.input-area :deep(.el-textarea) {
  flex: 1;
}

.inline-pdf-uploader {
  display: inline-block;
  flex-shrink: 0;
}
.inline-pdf-uploader :deep(.el-upload) {
  display: block;
}

/* 回形针按钮样式 */
.upload-icon-btn {
  height: 47px;                
  width: 45px;                 
  border: none !important;     
  color: #24b906 !important;   
  font-size: 20px;             
  cursor: pointer;
  transition: all 0.25s ease;  /* 丝滑的过场动画 */
}
/*  鼠标指针移上去时的视觉反馈 */
.upload-icon-btn:hover {
  color: #db6763 !important;          /* 悬浮时图标高亮变为主题蓝 */
  background-color: #f4f4f5 !important; /* 悬浮时泛起一层若隐若现的浅灰阴影 */
}

.send-btn {
  width: 90px;
  border-radius: 8px;
}

/* Markdown 精细化格式渲染 */
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
</style>