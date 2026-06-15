<!-- 稳态值 -->
<template>
    <div class="steady-state-container">
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
                    <h4 class="section-title">物理量标定</h4>
                    <el-form label-position="top">
                        <el-form-item label="通道物理属性识别模式">
                            <el-radio-group v-model="identifyMode" class="mode-radio-group">
                                <el-radio-button value="voltage">电压通道 (输出 V)</el-radio-button>
                                <el-radio-button value="current">电流通道 (输出 A)</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                    </el-form>

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
                    <span class="header-title">稳态值识别数据记录</span>
                    <el-button type="primary" :disabled="flatTableData.length === 0" @click="exportToWord">
                        导出结果到 Word
                    </el-button>
                </div>
            </template>

            <el-table v-loading="submitLoading" :data="flatTableData" border stripe style="width: 100%"
                empty-text="暂无稳态识别数据，请上传图片并触发解析">
                <el-table-column type="index" label="序号" width="70" align="center" />
                <el-table-column prop="fileName" label="原始图像文件名" min-width="180" show-overflow-tooltip />
                <el-table-column prop="phase" label="相别" width="90" align="center">
                    <template #default="scope">
                        <el-tag :type="getPhaseTagType(scope.row.phase)" font-weight="bold">
                            {{ scope.row.phase }} 相
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column prop="steadyPeakV" label="稳态峰值" min-width="130" align="center">
                    <template #default="scope">
                        <span class="value-highlight">
                            {{ formatNumber(scope.row.steadyPeakV) }} {{ scope.row.unit }}
                        </span>
                    </template>
                </el-table-column>

                <el-table-column prop="steadyRmsV" label="理论有效值 (RMS)" min-width="150" align="center">
                    <template #default="scope">
                        <span class="value-rms">
                            {{ formatNumber(scope.row.steadyRmsV) }} {{ scope.row.unit }}
                        </span>
                    </template>
                </el-table-column>

                <el-table-column prop="sampleRmsV" label="采样有效值 (RMS)" min-width="150" align="center">
                    <template #default="scope">
                        <span class="value-sample">
                            {{ formatNumber(scope.row.sampleRmsV) }} {{ scope.row.unit }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column prop="error" label="异常诊断状态" min-width="150">
                    <template #default="scope">
                        <span v-if="scope.row.error" class="error-text">❌ {{ scope.row.error }}</span>
                        <span v-else class="success-text">🟢 解析成功</span>
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
import { identifySteadyStateValue } from '../../../../api/waveform-vision'

// 响应式核心状态
const fileList = ref([])
const identifyMode = ref('voltage')
const submitLoading = ref(false)
const backendRawResults = ref([])


const flatTableData = computed(() => {
    const list = []
    if (Array.isArray(backendRawResults.value)) {
        backendRawResults.value.forEach(fileItem => {
            if (fileItem.phases && fileItem.phases.length > 0) {
                fileItem.phases.forEach(phaseItem => {
                    list.push({
                        fileName: fileItem.fileName,
                        phase: phaseItem.phase,
                        steadyPeakV: phaseItem.steadyPeakV,
                        steadyRmsV: phaseItem.steadyRmsV,
                        sampleRmsV: phaseItem.sampleRmsV,
                        error: phaseItem.error,
                        unit: fileItem.unit // 动态绑定后端回吐的 V 或 A 单位
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
    ElMessage.info('稳态工作台已完全重置')
}

/**
 * 发动 OpenCV 稳态数据提取流
 */
const executeIdentify = async () => {
    if (fileList.value.length === 0) return

    submitLoading.value = true
    const formData = new FormData()

    fileList.value.forEach(item => {
        formData.append('files', item.raw)
    })
    formData.append('mode', identifyMode.value)

    try {
        ElMessage.info('正在提取波形右侧 40% 平稳时间窗数据...')
        const res = await identifySteadyStateValue(formData)

        backendRawResults.value = (res && res.data) ? res.data : (res || [])

        ElMessage.success('批量波形图像稳态值、有效值精准测算全量完成！')
    } catch (error) {
        console.error('稳态提取发生故障阻断: ', error)
    } finally {
        submitLoading.value = false
    }
}

/**
 * 稳态分析报告一键 Word 物理下载
 */
const exportToWord = async () => {
    if (flatTableData.value.length === 0) return

    try {
        ElMessage.info('正在基于客户端内存构建高精稳态分析报告...')

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "原始图像文件名", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "相别", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "稳态峰值", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "理论有效值 (RMS)", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "采样有效值 (RMS)", bold: true })] }),
            ]
        })

        const bodyRows = flatTableData.value.map(item => {
            const u = item.unit || ''

            // 利用formatNumber 函数进行指针安全防御
            const peakVal = formatNumber(item.steadyPeakV)
            const rmsVal = formatNumber(item.steadyRmsV)
            const sampleVal = formatNumber(item.sampleRmsV)

            // 如果解析出来是 '--' 则保持不变；如果是正常数字字符串则追加单位
            const peakStr = peakVal === '--' ? '--' : `${peakVal} ${u}`
            const rmsStr = rmsVal === '--' ? '--' : `${rmsVal} ${u}`
            const sampleStr = sampleVal === '--' ? '--' : `${sampleVal} ${u}`

            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(item.fileName || '')] }),
                    new TableCell({ children: [new Paragraph(`${item.phase} 相`)] }),
                    new TableCell({ children: [new Paragraph(peakStr)] }),
                    new TableCell({ children: [new Paragraph(rmsStr)] }),
                    new TableCell({ children: [new Paragraph(sampleStr)] }),
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
                        text: "波形图像稳态值识别",
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
        a.download = `波形图像稳态值识别报告_${new Date().getTime()}.docx`
        document.body.appendChild(a)
        a.click()

        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        ElMessage.success('稳态值识别 Word 报告已成功生成！')
    } catch (error) {
        console.error('Word 导出失败:', error)
        ElMessage.error('Word 报告转换发生未知溃败')
    }
}

const getPhaseTagType = (phase) => {
    if (phase === 'A') return 'warning'
    if (phase === 'B') return 'success'
    if (phase === 'C') return 'danger'
    return 'info'
}

// 安全格式化数字，防止后端吐出 "NaN" 字符串、null 或特殊文本时发生渲染死锁
const formatNumber = (val) => {
    if (val === null || val === undefined || val === 'NaN' || String(val).trim() === '') return '--'
    const num = Number(val)
    return isNaN(num) ? '--' : num.toFixed(2)
}
</script>

<style scoped>
.steady-state-container {
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

.section-title {
    margin: 0 0 15px 0;
    font-size: 15px;
    font-weight: bold;
    color: #303133;
}

.mode-radio-group {
    margin-bottom: 10px;
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
    color: #e6a23c;
    font-size: 15px;
}

.value-rms {
    font-family: 'Courier New', Courier, monospace;
    font-weight: bold;
    color: #409eff;
    font-size: 15px;
}

.value-sample {
    font-family: 'Courier New', Courier, monospace;
    font-weight: bold;
    color: #67c23a;
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