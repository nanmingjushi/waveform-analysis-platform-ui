<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessageBox, ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 动态联动：高亮当前浏览器地址栏正在访问的菜单
const activeMenu = computed(() => route.path)

const handleLogout = () => {
    ElMessageBox.confirm('确定要退出当前试验录波文件快速解析平台吗？', '提示', {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(() => {
        userStore.logout()
        ElMessage.success('凭证已被安全擦除')
        router.push('/login')
    }).catch(() => { })
}
</script>


<template>
    <el-container class="layout-container">
        <el-aside width="240px" class="layout-aside">
            <div class="aside-logo">
                <span>试验录波文件快速解析平台</span>
            </div>
            <el-menu :default-active="activeMenu" class="aside-menu" background-color="#304156" text-color="#bfcbd9"
                active-text-color="#409EFF" router>
                <el-menu-item index="/home">
                    <span>系统首页</span>
                </el-menu-item>
                <el-menu-item index="/waveform/comtrade">
                    <span>comtrade格式录波文件读取解析</span>
                </el-menu-item>
                <el-menu-item index="/waveform/waveform-vision">
                    <span>波形图像识别关键参数</span>
                </el-menu-item>
                <el-menu-item index="/waveform/power-quality">
                    <span>电能质量测试数据自动化读取</span>
                </el-menu-item>
            </el-menu>

            
        </el-aside>

        <el-container>
            <el-header class="layout-header">
                <div class="header-left">
                    <span class="system-title">试验录波文件快速解析平台</span>
                </div>
                <div class="header-right">
                    <el-button type="danger" size="small" plain @click="handleLogout">安全退出</el-button>
                </div>
            </el-header>

            <el-main class="layout-main">
                <router-view />
            </el-main>
        </el-container>
    </el-container>
</template>


<style scoped>
.layout-container {
    height: 100vh;
}

.layout-aside {
    background-color: #304156;
    color: #fff;
    display: flex;
    flex-direction: column;
}

.aside-logo {
    height: 60px;
    background: #2b2f3a;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    font-size: 16px;
    letter-spacing: 1px;
    color: #fff;
}

.aside-menu {
    border-right: none;
}

.layout-header {
    background: #fff;
    border-bottom: 1px solid #e6e6e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
}

.system-title {
    font-size: 20px;
    color: #000;
    font-weight: 600;
}

.layout-main {
    background-color: #f0f2f5;
    padding: 20px;
}
</style>
