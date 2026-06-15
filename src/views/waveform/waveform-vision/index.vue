<template>
    <div class="vision-dashboard-container">
        <div class="dashboard-header">
            <h2 class="header-title">波形图像识别关键参数</h2>
            <el-tag type="success" effect="dark" class="header-tag">
                基于OpenCV实现
            </el-tag>
        </div>

        <el-tabs v-model="activeModule" type="border-card" class="module-tabs">

            <el-tab-pane name="transient" label="暂态最大值">
                <TransientMax />
            </el-tab-pane>

            <el-tab-pane name="steady" label="稳态值">
                <SteadyState />
            </el-tab-pane>

            <el-tab-pane name="frequency" label="频率">
                <Frequency />
            </el-tab-pane>

            <el-tab-pane name="step" label="阶跃响应时间">
                <StepResponse />
            </el-tab-pane>

            <el-tab-pane name="control" label="控制曲线响应时间">
                <ControlCurve />
            </el-tab-pane>

        </el-tabs>
    </div>
</template>

<script setup>
import { ref } from 'vue'

// 相对路径寻址，将 5 个预留业务积木强类型引入进来
import TransientMax from './components/TransientMax.vue'
import SteadyState from './components/SteadyState.vue'
import Frequency from './components/Frequency.vue'
import StepResponse from './components/StepResponse.vue'
import ControlCurve from './components/ControlCurve.vue'

// 当前默认高亮激活的业务子标签卡片，初始锚定到第一个暂态功能
const activeModule = ref('transient')
</script>

<style scoped>
.vision-dashboard-container {
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ffffff;
    padding: 15px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.header-title {
    margin: 0;
    font-size: 18px;
    font-weight: bold;
    color: #303133;
    letter-spacing: 0.5px;
}

.header-tag {
    font-weight: bold;
}

/* 强力微调标签页外观，使其显得更加厚重和严谨 */
.module-tabs {
    background: #ffffff;
    border-radius: 4px;
    min-height: calc(100vh - 160px);
}

:deep(.el-tabs__item) {
    font-size: 14px !important;
    font-weight: bold !important;
    height: 45px !important;
    line-height: 45px !important;
}
</style>