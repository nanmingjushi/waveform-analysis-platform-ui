<!-- 阶跃响应时间 -->
<template>
    <div class="step-response-container">
        <div class="workbench-layout">

            <div class="control-wing">
                <el-card class="box-card" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span class="panel-title">阶跃响应时间配置信息</span>
                        </div>
                    </template>

                    <el-form label-position="top">
                        <el-row :gutter="12">
                            <el-col :span="12">
                                <el-form-item label="左边界物理时间 tLeft (s)">
                                    <el-input-number v-model="tLeft" :precision="4" :step="0.01" style="width: 100%" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item label="右边界物理时间 tRight (s)">
                                    <el-input-number v-model="tRight" :precision="4" :step="0.01" style="width: 100%" />
                                </el-form-item>
                            </el-col>
                        </el-row>

                        <el-form-item label="上传单张阶跃波形图" class="upload-item">
                            <el-upload class="single-uploader" drag action="" :limit="1" :auto-upload="false"
                                :file-list="fileList" :on-change="handleFileChange" :on-remove="handleFileRemove"
                                :on-exceed="handleExceed" accept="image/*">
                                <el-icon class="el-icon--upload"><picture-filled /></el-icon>
                                <div class="el-upload__text">
                                    将待识别的单张波形阶跃图像拖到此处，或 <em>点击上传</em>
                                </div>
                                <template #tip>
                                    <div class="el-upload__tip">
                                        支持单张图片递交。格式支持：.jpg, .png, .jpeg，单张大小不超过 20MB。
                                    </div>
                                </template>
                            </el-upload>
                        </el-form-item>

                        <div class="action-bar">
                            <el-button type="success" size="large" class="submit-btn" :loading="submitLoading"
                                :disabled="fileList.length === 0" @click="executeIdentify">
                                开始读取解析
                            </el-button>
                            <el-button size="large" @click="clearWorkBench">
                                清空工作台
                            </el-button>
                        </div>
                    </el-form>
                </el-card>
            </div>

            <div class="dashboard-wing">
                <el-card class="box-card result-card" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span class="panel-title">阶跃响应时间识别数据记录</span>
                            <el-button type="primary" :disabled="!hasResult" @click="exportToWord">
                                导出结果到 Word
                            </el-button>
                        </div>
                    </template>

                    <div class="dashboard-content">
                        <div class="preview-box">
                            <div v-if="previewUrl" class="image-wrapper">
                                <img :src="previewUrl" alt="波形预览" class="wave-img" />

                            </div>
                            <div v-else class="empty-preview">
                                <el-empty description="等待上传波形图像，上传后此处将实时渲染原图预览" :image-size="80" />
                            </div>
                        </div>

                        <div class="statistics-screen" v-loading="submitLoading">
                            <el-row :gutter="20">
                                <el-col :span="8">
                                    <div class="statistic-card">
                                        <div class="stat-label">阶跃前时间 (t5)</div>
                                        <div class="stat-value value-t5">{{ formatNumber(identifyResult.t5, 4) }} <span
                                                class="stat-unit">s</span></div>
                                    </div>
                                </el-col>
                                <el-col :span="8">
                                    <div class="statistic-card">
                                        <div class="stat-label">阶跃后时间 (t95)</div>
                                        <div class="stat-value value-t95">{{ formatNumber(identifyResult.t95, 4) }}
                                            <span class="stat-unit">s</span>
                                        </div>
                                    </div>
                                </el-col>
                                <el-col :span="8">
                                    <div class="statistic-card highlighted-card">
                                        <div class="stat-label">阶跃时间 (tStep)</div>
                                        <div class="stat-value value-step">
                                            {{ formatNumber(identifyResult.tStep || identifyResult.tstep ||
                                                identifyResult.TStep, 4)
                                            }}
                                            <span class="stat-unit">s</span>
                                        </div>
                                    </div>
                                </el-col>
                            </el-row>


                        </div>

                    </div>
                </el-card>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { PictureFilled } from '@element-plus/icons-vue'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'

import { calculateStepResponse } from '../../../../api/waveform-vision'

// 响应式状态
const tLeft = ref(0.0)             // 图像左边界物理时间
const tRight = ref(0.5)            // 图像右边界物理时间
const fileList = ref([])           // 限制只能传 1 张的缓冲池
const previewUrl = ref('')         // 本地原图 Blob 预览指针
const submitLoading = ref(false)   // 加载锁
const hasResult = ref(false)       // 是否已产生解析数据

// 承接后端单体 VO 契约结构
const identifyResult = ref({
    fileName: '',
    t5: null,
    t95: null,
    tStep: null,
    error: null
})


const formatNumber = (val, decimals = 4) => {
    if (val === null || val === undefined || val === 'NaN' || String(val).trim() === '') return '--'
    const num = Number(val)
    return isNaN(num) ? '--' : num.toFixed(decimals)
}


const handleFileChange = (file, uploadFiles) => {
    fileList.value = uploadFiles
    if (file && file.raw) {
        // 利用原生 ObjectURL 捕获本地临时图像物理流
        previewUrl.value = URL.createObjectURL(file.raw)
    }
}

/**
 * 移除图片，同步清除预览指针
 */
const handleFileRemove = () => {
    fileList.value = []
    if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value) // 释放内存
        previewUrl.value = ''
    }
    hasResult.value = false
    resetResultObj()
}

/**
 * 数量超限防御：用新拖入的图强行顶替掉老图
 */
const handleExceed = (files) => {
    ElMessage.warning('阶跃响应时间识别为单图模式，已自动为你置换为最新上传图片')
    fileList.value = [{ name: files[0].name, raw: files[0] }]
    previewUrl.value = URL.createObjectURL(files[0])
}

const resetResultObj = () => {
    identifyResult.value = { fileName: '', t5: null, t95: null, tStep: null, error: null }
}

const clearWorkBench = () => {
    handleFileRemove()
    tLeft.value = 0.0
    tRight.value = 0.5
    ElMessage.info('阶跃分析工作台已完全重置')
}

/**
 * OpenCV 阶跃红度权重增强算法
 */
const executeIdentify = async () => {
    if (fileList.value.length === 0) return
    if (tRight.value <= tLeft.value) {
        ElMessage.error('标定硬伤：右边界物理时间必须严格大于左边界时间！')
        return
    }

    submitLoading.value = true
    hasResult.value = false
    resetResultObj()

    const formData = new FormData()
    formData.append('file', fileList.value[0].raw)
    formData.append('tLeft', tLeft.value)
    formData.append('tRight', tRight.value)

    try {
        ElMessage.info('正在驱动后端 OpenCV 4.9 提取红色权重响应曲线...')
        const res = await calculateStepResponse(formData)


        const data = (res && res.data) ? res.data : res

        if (data) {
            identifyResult.value = data
            hasResult.value = true
            if (data.error) {
                ElMessage.error(`算力熔断：${data.error}`)
            } else {
                ElMessage.success('录波图像阶跃响应时间识别成功！')
            }
        }
    } catch (error) {
        console.error('阶跃测算网络崩溃故障: ', error)
    } finally {
        submitLoading.value = false
    }
}

/**
 * 阶跃响应分析专属 Word 报告一键物理下载
 */
const exportToWord = async () => {
    if (!hasResult.value) return

    try {
        ElMessage.info('正在构建阶跃响应时间分析报告...')
        const res = identifyResult.value

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "分析参数/指标", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "标定值 / 测算结果", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "物理单位", bold: true })] }),
            ]
        })

        const rowsData = [
            { label: '原始图像文件名', val: res.fileName || '', unit: '--' },
            { label: '图像左边界物理时间 (tLeft)', val: tLeft.value.toFixed(4), unit: 's' },
            { label: '图像右边界物理时间 (tRight)', val: tRight.value.toFixed(4), unit: 's' },
            { label: '阶跃前时间 (t5)', val: formatNumber(res.t5, 4), unit: 's' },
            { label: '阶跃后时间 (t95)', val: formatNumber(res.t95, 4), unit: 's' },
            { label: '阶跃时间 (tStep)', val: formatNumber(res.tStep || res.tstep || res.TStep, 4), unit: 's' },

        ]

        const bodyRows = rowsData.map(item => {
            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(item.label)] }),
                    new TableCell({ children: [new Paragraph(item.val)] }),
                    new TableCell({ children: [new Paragraph(item.unit)] }),
                ]
            })
        })

        const table = new Table({
            rows: [headerRow, ...bodyRows],
            width: { size: 100, type: WidthType.PERCENTAGE }
        })

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        text: "波形图像阶跃响应时间识别",
                        heading: "Heading1",
                        alignment: AlignmentType.CENTER
                    }),
                    new Paragraph({ text: "" }),
                    table
                ]
            }]
        })

        const blob = await Packer.toBlob(doc)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `波形图像阶跃响应时间识别报告_${new Date().getTime()}.docx`
        document.body.appendChild(a)
        a.click()

        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        ElMessage.success('阶跃响应时间识别 Word 报告已安全下载！')
    } catch (error) {
        console.error('Word 导出失败:', error)
        ElMessage.error('Word 报告无损生成崩溃')
    }
}
</script>

<style scoped>
.step-response-container {
    padding: 10px 0;
}

.workbench-layout {
    display: flex;
    gap: 20px;
    align-items: flex-start;
}

.control-wing {
    flex: 1;
    min-width: 340px;
    max-width: 420px;
}

.dashboard-wing {
    flex: 2;
    min-width: 500px;
}

.panel-title {
    font-size: 15px;
    font-weight: bold;
    color: #303133;
}

.upload-item {
    margin-top: 15px;
}

:deep(.el-upload-dragger) {
    padding: 40px 10px;
    background-color: #fafafa;
    border: 1.5px dashed #e0e0e0;
}

.action-bar {
    margin-top: 25px;
    display: flex;
    gap: 12px;
}

.submit-btn {
    flex: 1;
}

/* 右侧看板内部布局 */
.dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.preview-box {
    width: 100%;
    background: #f8f9fa;
    border: 1px solid #eaeaea;
    border-radius: 4px;
    min-height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.image-wrapper {
    position: relative;
    width: 100%;
    padding: 10px;
    display: flex;
    justify-content: center;
}

.wave-img {
    max-width: 100%;
    max-height: 260px;
    object-fit: contain;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    border-radius: 2px;
}

.roi-badge {
    position: absolute;
    top: 15px;
    right: 15px;
    background: rgba(230, 162, 44, 0.9);
    color: #ffffff;
    padding: 4px 8px;
    font-size: 11px;
    border-radius: 4px;
    font-weight: bold;
}

.empty-preview {
    width: 100%;
}

/* 指标大屏 */
.statistics-screen {
    background: #ffffff;
}

.statistic-card {
    background: #fdfdfd;
    border: 1px solid #ebeef5;
    padding: 15px;
    border-radius: 4px;
    text-align: center;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
}

.highlighted-card {
    background: #f0f9eb;
    border-color: #c2e7b0;
}

.stat-label {
    font-size: 13px;
    color: #909399;
    margin-bottom: 8px;
    font-weight: bold;
}

.stat-value {
    font-family: 'Courier New', Courier, monospace;
    font-size: 24px;
    font-weight: bold;
}

.stat-unit {
    font-size: 14px;
    font-weight: normal;
    color: #606266;
}

.value-t5 {
    color: #e6a23c;
}

.value-t95 {
    color: #409eff;
}

.value-step {
    color: #67c23a;
}

.diagnosis-bar {
    margin-top: 20px;
    padding: 12px 15px;
    background: #f4f4f5;
    border-radius: 4px;
    font-size: 13px;
}

.diagnosis-bar.has-error {
    background: #fef0f0;
}

.diagnosis-label {
    font-weight: bold;
    color: #303133;
}

.error-text {
    color: #f56c6c;
    font-weight: bold;
}

.success-text {
    color: #67c23a;
    font-weight: bold;
}

.info-text {
    color: #909399;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}
</style>