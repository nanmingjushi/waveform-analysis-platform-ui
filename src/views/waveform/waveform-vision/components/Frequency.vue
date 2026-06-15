<!-- 频率 -->
<template>
    <div class="frequency-container">
        <el-card class="control-card" shadow="hover">
            <div class="control-layout">
                <div class="upload-section">
                    <el-upload class="image-uploader" drag action="" multiple :auto-upload="false" :file-list="fileList"
                        :on-change="handleFileChange" :on-remove="handleFileRemove" accept="image/*">
                        <el-icon class="el-icon--upload"><picture-filled /></el-icon>
                        <div class="el-upload__text">
                            将待识别的波形图像拖到此处，或 <em>点击上传</em>
                        </div>
                        <template #tip>
                            <div class="el-upload__tip">
                                支持多张图片批量递交。格式支持：.jpg, .png, .jpeg，单张大小不超过 20MB。
                            </div>
                        </template>
                    </el-upload>
                </div>

                <div class="params-section">
                    <div class="status-alert-box">
                        <h4 class="box-title">物理量标定</h4>
                        <p class="box-desc">
                            本模块专注于稳态波形周期的微小变化分析。频率分析依赖于图像纵向网格的绝对像素间距，建议上传分辨率清晰、无拉伸变形的波形图像。
                        </p>
                    </div>

                    <div class="action-bar">
                        <el-button type="success" size="large" :loading="submitLoading"
                            :disabled="fileList.length === 0" @click="executeIdentify">
                            开始读取解析
                        </el-button>
                        <el-button size="large" @click="clearWorkBench">
                            清空工作台
                        </el-button>
                    </div>
                </div>
            </div>
        </el-card>

        <el-card class="result-card" shadow="hover">
            <template #header>
                <div class="card-header">
                    <span class="header-title">频率计算数据记录</span>
                    <el-button type="primary" :disabled="flatTableData.length === 0" @click="exportToWord">
                        导出结果到 Word
                    </el-button>
                </div>
            </template>

            <el-table v-loading="submitLoading" :data="flatTableData" border stripe style="width: 100%"
                empty-text="暂无频率分析数据，请上传图片并触发解析">
                <el-table-column type="index" label="序号" width="70" align="center" />
                <el-table-column prop="fileName" label="原始图像文件名" min-width="180" show-overflow-tooltip />
                <el-table-column prop="phase" label="相别" width="100" align="center">
                    <template #default="scope">
                        <el-tag :type="getPhaseTagType(scope.row.phase)" font-weight="bold">
                            {{ scope.row.phase }} 相
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column prop="freqHz" label="工频频率" min-width="150" align="center">
                    <template #default="scope">
                        <span v-if="scope.row.freqHz !== '--'" class="value-highlight">
                            {{ scope.row.freqHz }} Hz
                        </span>
                        <span v-else>--</span>
                    </template>
                </el-table-column>

                <el-table-column prop="periodMs" label="波形周期" min-width="150" align="center">
                    <template #default="scope">
                        <span v-if="scope.row.periodMs !== '--'" class="value-period">
                            {{ scope.row.periodMs }} ms
                        </span>
                        <span v-else>--</span>
                    </template>
                </el-table-column>

                <el-table-column prop="error" label="异常诊断状态" min-width="160">
                    <template #default="scope">
                        <span v-if="scope.row.error" class="error-text">❌ {{ scope.row.error }}</span>
                        <span v-else class="success-text">🟢 计算成功</span>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { PictureFilled } from '@element-plus/icons-vue'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'
import { calculateFrequency } from '../../../../api/waveform-vision'

// 响应式核心状态
const fileList = ref([])
const submitLoading = ref(false)
const backendRawResults = ref([])


const formatNumber = (val, decimals = 2) => {
    if (val === null || val === undefined || val === 'NaN' || String(val).trim() === '') return '--'
    const num = Number(val)
    return isNaN(num) ? '--' : num.toFixed(decimals)
}


const flatTableData = computed(() => {
    const list = []
    if (Array.isArray(backendRawResults.value)) {
        backendRawResults.value.forEach(fileItem => {
            if (fileItem.phases && fileItem.phases.length > 0) {
                fileItem.phases.forEach(phaseItem => {
                    list.push({
                        fileName: fileItem.fileName,
                        phase: phaseItem.phase,
                        // 频率保留 3 位精度，周期保留 2 位精度
                        freqHz: formatNumber(phaseItem.freqHz, 3),
                        periodMs: formatNumber(phaseItem.periodMs, 2),
                        error: phaseItem.error
                    })
                })
            }
        })
    }
    return list
})

const handleFileChange = (file, uploadFiles) => {
    fileList.value = uploadFiles
}

const handleFileRemove = (file, uploadFiles) => {
    fileList.value = uploadFiles
}

const clearWorkBench = () => {
    fileList.value = []
    backendRawResults.value = []
    ElMessage.info('频率工作台已清空重置')
}

/**
 * 递交表单，发动自相关频率分析引擎
 */
const executeIdentify = async () => {
    if (fileList.value.length === 0) return

    submitLoading.value = true
    const formData = new FormData()

    fileList.value.forEach(item => {
        formData.append('files', item.raw)
    })

    try {
        ElMessage.info('正在驱动后端自相关能量函数进行波形周期锁相测算...')
        const res = await calculateFrequency(formData)

        backendRawResults.value = (res && res.data) ? res.data : (res || [])

        ElMessage.success('批量录波图像工频频率精准测算全部成功！')
    } catch (error) {
        console.error('频率提取故障阻断: ', error)
    } finally {
        submitLoading.value = false
    }
}

/**
 * 工频分析审计报告一键 Word 下载
 */
const exportToWord = async () => {
    if (flatTableData.value.length === 0) return

    try {
        ElMessage.info('正在构建工频分析审计报告明细...')

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "原始图像文件名", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "相别", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "工频频率 (Hz)", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "波形周期 (ms)", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "异常诊断状态", bold: true })] }),
            ]
        })

        const bodyRows = flatTableData.value.map(item => {
            const freqStr = item.freqHz === '--' ? '--' : `${item.freqHz} Hz`
            const periodStr = item.periodMs === '--' ? '--' : `${item.periodMs} ms`
            const statusStr = item.error ? `错误: ${item.error}` : '🟢 测算成功'

            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(item.fileName || '')] }),
                    new TableCell({ children: [new Paragraph(`${item.phase} 相`)] }),
                    new TableCell({ children: [new Paragraph(freqStr)] }),
                    new TableCell({ children: [new Paragraph(periodStr)] }),
                    new TableCell({ children: [new Paragraph(statusStr)] }),
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
                        text: "波形图像频率识别",
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
        a.download = `波形图像频率识别报告_${new Date().getTime()}.docx`
        document.body.appendChild(a)
        a.click()

        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        ElMessage.success('频率识别 Word 报告已安全下载！')
    } catch (error) {
        console.error('Word 导出失败:', error)
        ElMessage.error('Word 报告转换发生崩溃')
    }
}

const getPhaseTagType = (phase) => {
    if (phase === 'A') return 'warning'
    if (phase === 'B') return 'success'
    if (phase === 'C') return 'danger'
    return 'info'
}
</script>

<style scoped>
.frequency-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 10px 0;
}

.control-layout {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}

.upload-section {
    flex: 1;
    min-width: 320px;
}

.params-section {
    flex: 1;
    min-width: 320px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.image-uploader {
    width: 100%;
}

:deep(.el-upload-dragger) {
    padding: 30px 10px;
    background-color: #fafafa;
    border: 1.5px dashed #e0e0e0;
}

.status-alert-box {
    background-color: #f4f4f5;
    border-left: 4px solid #909399;
    padding: 15px;
    border-radius: 4px;
}

.box-title {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: bold;
    color: #303133;
}

.box-desc {
    margin: 0;
    font-size: 13px;
    color: #606266;
    line-height: 1.6;
}

.action-bar {
    margin-top: 20px;
    display: flex;
    gap: 12px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-title {
    font-size: 15px;
    font-weight: bold;
    color: #303133;
}

.value-highlight {
    font-family: 'Courier New', Courier, monospace;
    font-weight: bold;
    color: #67c23a;
    font-size: 16px;
}

.value-period {
    font-family: 'Courier New', Courier, monospace;
    font-weight: bold;
    color: #409eff;
    font-size: 15px;
}

.error-text {
    color: #f56c6c;
    font-weight: bold;
}

.success-text {
    color: #67c23a;
}
</style>