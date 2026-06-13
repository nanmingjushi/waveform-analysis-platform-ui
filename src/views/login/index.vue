<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user' 
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
    username: '',
    password: ''
})

const loginRules = {
    username: [{ required: true, message: '账号不能为空', trigger: 'blur' }],
    password: [{ required: true, message: '密码不能为空', trigger: 'blur' }]
}

const handleLogin = () => {
    loginFormRef.value.validate(async (valid) => {
        if (!valid) return
        loading.value = true
        try {
            // 直接驱动我们的 Pinia 异步 Action，完成落盘与缓存
            await userStore.login(loginForm)
            ElMessage.success('登录成功，正在初始化系统...')
            router.push('/')
        } catch (error) {
            console.error('登录失败', error)
        } finally {
            loading.value = false
        }
    })
}
</script>


<template>
    <div class="login-container">
        <el-card class="login-card">
            <div class="login-title">
                <h2>试验录波文件快速解析平台</h2>
                <p>本系统包含三个模块：<br>1）comtrade格式录波文件读取解析；2）波形图像识别解析；3）电能质量测试报告自动化生成。</p>
            </div>

            <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" size="large">
                <el-form-item prop="username">
                    <el-input v-model="loginForm.username" placeholder="请输入操作员账号" clearable />
                </el-form-item>

                <el-form-item prop="password">
                    <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password />
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
                        登录
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>


<style scoped>
.login-container {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: url("../../assets/login-bg.png") no-repeat center center fixed;
    background-size: cover;
}

.login-card {
    width: 420px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.login-title {
    text-align: center;
    margin-bottom: 30px;
}

.login-title h2 {
    color: #303133;
    margin-bottom: 8px;
}

.login-title p {
    color: #909399;
    font-size: 14px;
}

.login-btn {
    width: 100%;
    background: #243b55;
    border-color: #243b55;
}

.login-btn:hover {
    background: #1c3046;
    border-color: #1c3046;
}
</style>
