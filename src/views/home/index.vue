<script setup>

</script>


<template>
    <div class="home-wrapper">
        <el-card class="welcome-card">
            <template #header>
                <div class="card-header">
                    <span>工作看板摘要</span>
                </div>
            </template>
            <div class="welcome-content">
                <h3>欢迎使用试验录波文件快速解析平台</h3>
                <p>当前安全通信管道已全线打通，数据加密拦截器运行正常。</p>
                <p style="color: #909399; margin-top: 10px; font-size: 14px;">
                    请通过左侧导航菜单，切换至 <strong>[comtrade格式录波文件读取解析]</strong> 开展COMTRADE格式录波文件读取解析工作。
                </p>
            </div>
        </el-card>
    </div>
</template>


<style scoped>
.home-wrapper {
    padding: 10px;
}

.welcome-card {
    border-radius: 4px;
}

.card-header {
    font-weight: bold;
    color: #303133;
}

.welcome-content h3 {
    color: #304156;
    margin-bottom: 15px;
}

.welcome-content p {
    line-height: 1.8;
    color: #606266;
}
</style>
