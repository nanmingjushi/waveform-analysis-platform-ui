<!-- 暂态最大值 -->
<template>
    <div class="transient-max-container">
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
                                <el-radio-button value="voltage">电压通道 (基准 200kV)</el-radio-button>
                                <el-radio-button value="current">电流通道 (基准 500A)</el-radio-button>
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
                    <span class="header-title">暂态最大值识别数据记录</span>
                    <el-button type="primary" :disabled="flatTableData.length === 0" @click="exportToWord">
                        导出结果到 Word
                    </el-button>
                </div>
            </template>

            <el-table v-loading="submitLoading" :data="flatTableData" border stripe style="width: 100%"
                empty-text="暂无暂态识别数据，请上传图片并触发解析">
                <el-table-column type="index" label="序号" width="70" align="center" />
                <el-table-column prop="fileName" label="原始图像文件名" min-width="180" show-overflow-tooltip />
                <el-table-column prop="phase" label="相别" width="100" align="center">
                    <template #default="scope">
                        <el-tag :type="getPhaseTagType(scope.row.phase)" font-weight="bold">
                            {{ scope.row.phase }} 相
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="value" label="物理量最大值" min-width="140" align="center">
                    <template #default="scope">
                        <span v-if="scope.row.value !== null" class="value-highlight">
                            {{ (scope.row.value / 1000).toFixed(2) }} {{ identifyMode === 'current' ? 'kA' : 'kV' }}
                        </span>
                        <span v-else>--</span>
                    </template>
                </el-table-column>
                <el-table-column prop="waveTopY" label="像素最高点 y (pixel)" width="180" align="center" />
                <el-table-column prop="error" label="异常诊断状态" min-width="160">
                    <template #default="scope">
                        <span v-if="scope.row.error" class="error-text">❌ {{ scope.row.error }}</span>
                        <span v-else class="success-text">🟢 识别成功</span>
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
import { identifyTransientMaxValue } from '../../../../api/waveform-vision'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'

// 响应式核心状态
const fileList = ref([])           // 本地图片上传缓冲池
const identifyMode = ref('voltage') // 默认识别电压
const submitLoading = ref(false)   // 加载锁
const backendRawResults = ref([])  // 后端吐出来的原始嵌套 VO 矩阵


const flatTableData = computed(() => {
    const list = []
    if (Array.isArray(backendRawResults.value)) {
        backendRawResults.value.forEach(fileItem => {
            if (fileItem.phases && fileItem.phases.length > 0) {
                fileItem.phases.forEach(phaseItem => {
                    list.push({
                        fileName: fileItem.fileName,
                        phase: phaseItem.phase,
                        value: phaseItem.value,
                        waveTopY: phaseItem.waveTopY,
                        error: phaseItem.error
                    })
                })
            }
        })
    }
    return list
})

/**
 * 监听图片池变动
 */
const handleFileChange = (file, uploadFiles) => {
    fileList.value = uploadFiles
}

/**
 * 从图片池移除图片
 */
const handleFileRemove = (file, uploadFiles) => {
    fileList.value = uploadFiles
}

/**
 * 清空整个工作台状态
 */
const clearWorkBench = () => {
    fileList.value = []
    backendRawResults.value = []
    ElMessage.info('工作台已重置，缓冲图片及看盘数据全量清空')
}

/**
 * 批量暂态参数提取
 */
const executeIdentify = async () => {
    if (fileList.value.length === 0) return

    submitLoading.value = true
    // 创建标准的 JavaScript FormData 表单流对象
    const formData = new FormData()

    // 抓出所有暂存图片的物理流塞入表单
    fileList.value.forEach(item => {
        formData.append('files', item.raw) // 必须用 item.raw 触碰底层 File 对象
    })
    // 注入物理模式参数
    formData.append('mode', identifyMode.value)

    try {
        ElMessage.info('正在驱动后端 OpenCV 4.9 C++ 矩阵算法提取暂态最高点...')
        const res = await identifyTransientMaxValue(formData)
        backendRawResults.value = (res && res.data) ? res.data : (res || [])
        ElMessage.success('批量波形图像暂态最大值精准识别全量成功！')
    } catch (error) {
        console.error('暂态提取故障熔断: ', error)
    } finally {
        submitLoading.value = false
    }
}

/**
 * 数据无损转换，并生成 Word 报告供下载
 */
const exportToWord = async () => {
    if (flatTableData.value.length === 0) return

    try {
        ElMessage.info('正在驱动客户端内存构建word格式解析结果报告...')

        // 1. 创建标准的报告表头行
        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "原始图像文件名", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "相别", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: `物理量最大值`, bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "像素最高点 y (pixel)", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "异常诊断状态", bold: true })] }),
            ]
        })

        // 2. 循环平坦化数据，组装 Word 表格体
        const bodyRows = flatTableData.value.map(item => {
            const unitStr = identifyMode.value === 'current' ? 'kA' : 'kV'
            const valStr = item.value !== null ? `${(item.value / 1000).toFixed(2)} ${unitStr}` : '--'
            const statusStr = item.error ? `错误: ${item.error}` : '🟢 识别成功'

            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(item.fileName || '')] }),
                    new TableCell({ children: [new Paragraph(`${item.phase} 相`)] }),
                    new TableCell({ children: [new Paragraph(valStr)] }),
                    new TableCell({ children: [new Paragraph(String(item.waveTopY ?? ''))] }),
                    new TableCell({ children: [new Paragraph(statusStr)] }),
                ]
            })
        })

        // 3. 实例化 Word 物理表格
        const table = new Table({
            rows: [headerRow, ...bodyRows],
            width: { size: 100, type: WidthType.PERCENTAGE }
        })

        // 4. 组装整篇 Word 文档排版架构
        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({
                        text: "波形图像暂态最大值识别",
                        heading: "Heading1",
                        alignment: AlignmentType.CENTER
                    }),
                    new Paragraph({ text: "" }), // 优雅注入一个空行间距
                    table
                ]
            }]
        })

        // 5. 将内存对象打包成真实二进制大流，触发浏览器物理下载
        const blob = await Packer.toBlob(doc)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `波形图像暂态最大值识别报告_${new Date().getTime()}.docx`
        document.body.appendChild(a)
        a.click()

        // 6. 卸磨杀驴，彻底释放内存指针，杜绝内存泄漏
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        ElMessage.success('Word 分析报告已成功生成！')
    } catch (error) {
        console.error('Word 导出失败:', error)
        ElMessage.error('Word 报告无损转化发生崩溃')
    }
}

/**
 * 辅助色彩工具：为 A/B/C 三相分配国家电网标准的黄/绿/红质感标签色
 */
const getPhaseTagType = (phase) => {
    if (phase === 'A') return 'warning'
    if (phase === 'B') return 'success'
    if (phase === 'C') return 'danger'
    return 'info'
}
</script>

<style scoped>
.transient-max-container {
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
    justify-content: 间;
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