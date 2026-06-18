<script setup>

</script>


<template>
    <div class="home-wrapper">
        <el-card class="welcome-card">
            <template #header>
                <div class="card-header">
                    <span>系统首页</span>
                </div>
            </template>
            <div class="welcome-content">
                <h1>欢迎使用试验录波文件快速解析平台</h1>
                <p>当前安全通信管道已全线打通，数据加密拦截器运行正常。</p>
                <p style="color: #909399; margin-top: 10px; font-size: 14px;">
                    请通过左侧导航菜单，切换至 <strong>[comtrade格式录波文件读取解析]</strong> 开展COMTRADE格式录波文件读取解析工作。
                </p>
                <p style="color: #909399; margin-top: 10px; font-size: 14px;">
                    请通过左侧导航菜单，切换至 <strong>[波形图像识别关键参数]</strong> 开展波形图像识别解析工作。
                </p>
                <p style="color: #909399; margin-top: 10px; font-size: 14px;">
                    请通过左侧导航菜单，切换至 <strong>[电能质量测试数据自动化读取]</strong> 开展电能质量测试数据自动化读取工作。
                </p>
                <p style="color: #909399; margin-top: 10px; font-size: 14px;">
                    请通过左侧导航菜单，切换至 <strong>[电力系统AI专家助手]</strong> 开展与电力系统AI专家助手的对话。
                </p>
            </div>

            <!-- home-bottom图片 -->
            <div class="home-image-box">
                <img src="../../assets/home-bottom.png" class="home-illustration" alt="试验录波文件快速解析" />
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

.welcome-content h1 {
    color: #5cdd78;
    margin-bottom: 15px;
}

.welcome-content p {
    line-height: 1.8;
    color: #606266;
}

.home-image-box {
  margin-top: 30px;
  text-align: center;
  width: 100%;
  overflow: hidden;
  border-radius: 6px;
}
.home-illustration {
  width: 100%;
  max-width: 1000px; /* 限制最大显示宽度，防止在大屏幕下图片撑得太大变模糊 */
  height: auto;
  object-fit: contain;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); /* 加阴影 */
}
</style>
