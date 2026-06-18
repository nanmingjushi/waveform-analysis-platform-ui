<template>
    <div class="ai-chat-container">
        <el-card class="chat-card">
            <template #header>
                <div class="card-header">
                    <span>电力系统AI专家助手</span>
                    <el-tag type="success" effect="plain">大模型在线</el-tag>
                </div>
            </template>

            <div class="message-list" ref="messageBox">
                <div v-for="(msg, index) in messages" :key="index"
                    :class="['message-item', msg.role === 'user' ? 'msg-user' : 'msg-ai']">
                    <div class="avatar">{{ msg.role === 'user' ? '工' : 'AI' }}</div>
                    <div class="content-box">
                        <div v-if="msg.role === 'assistant'" class="content-text markdown-body"
                            v-html="renderMarkdown(msg.content)"></div>
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
                <el-input v-model="inputPrompt" type="textarea" :rows="2" placeholder="请输入您的问题。您可以咨询电力波形文件、波形图像或电能质量测试问题..."
                    :disabled="isThinking" @keyup.enter.prevent="handleSend" />
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
    html: false,        // 安全起见，禁用大模型吐出原生 html 标签
    breaks: true,       // 转换段落里的换行符
    linkify: true       // 自动将 URL 变成超链接
})

// 渲染 Markdown 的核心转化函数
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
    isThinking.value = true // 激活唯一思考气泡
    scrollToBottom()

    let aiMessageIndex = -1 // 记录当前 AI 对话框在数组中的索引
    let streamingText = ''

    try {
        const token = localStorage.getItem('waveform_token') || ''
        const url = `/ai/qwen/stream?prompt=${encodeURIComponent(prompt)}`

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
                    if (cleanText) {
                        // 当大模型吐出第一个字时，立刻将“思考气泡”转化为“真实对话框”
                        if (aiMessageIndex === -1) {
                            isThinking.value = false // 隐去“正在思考中...”气泡
                            // 将真实数据槽推进数组，并抓取当前索引
                            aiMessageIndex = messages.value.push({ role: 'assistant', content: '' }) - 1
                        }

                        streamingText += cleanText
                        messages.value[aiMessageIndex].content = streamingText
                        scrollToBottom()
                    }
                }
            }
        }

        // 兜底冲刷
        if (buffer.startsWith('data:') && aiMessageIndex !== -1) {
            streamingText += buffer.replace('data:', '')
            messages.value[aiMessageIndex].content = streamingText
        }

    } catch (error) {
        console.error('AI流式通信失败:', error)
        ElMessage.error('AI 助手通信中断')
        if (aiMessageIndex !== -1) {
            messages.value[aiMessageIndex].content += '\n\n（连接异常中断）'
        }
    } finally {
        isThinking.value = false // 确保最终关闭思考状态
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

/* 🌟 核心样式：让转换出来的 Markdown HTML 标签变得极其精致规整 */
.markdown-body :deep(h3) {
    font-size: 15px;
    font-weight: bold;
    margin: 12px 0 6px 0;
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
    margin-bottom: 4px;
}

.markdown-body :deep(strong) {
    color: #409eff;
    /* 重点加粗部分给一个清爽的蓝色突出提示 */
}

.markdown-body :deep(hr) {
    border: none;
    border-top: 1px dashed #dcdfe6;
    margin: 12px 0;
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