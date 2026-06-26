<template>
    <div class="mcp-report-container">
        <el-card class="report-card">
            <template #header>
                <div class="card-header">
                    <span class="title">电能质量报告自动生成（集成MCP）</span>
                    <el-tag type="warning" effect="dark">大语言模型+MCP</el-tag>
                </div>
            </template>

            <div class="upload-section">
                <el-upload drag action="/ai/mcp/qwen/generate-power-report" name="file" :headers="uploadHeaders"
                    :before-upload="beforeExcelUpload" :on-success="handleUploadSuccess" :on-error="handleUploadError"
                    :show-file-list="false" :disabled="loading">
                    <el-icon class="el-icon--upload">
                        <UploadFilled />
                    </el-icon>
                    <div class="el-upload__text">
                        将电能质量原始数据 <em>.xls 文件</em> 拖到此处，或 <em>点击上传</em>
                    </div>
                    <template #tip>
                        <div class="el-upload__tip">
                            系统将自动利用 MCP 协议并由 Qwen3.7-Plus 输出标准结构化数据。
                        </div>
                    </template>
                </el-upload>
            </div>

            <div v-if="loading" class="loading-section" v-loading="loading"
                element-loading-text="Qwen大语言模型模型正通过MCP读取.xls， ，请耐心等待...">
            </div>

            <div v-if="reportData" class="result-section animate-fade-in">

                <div class="mcp-metadata-box">
                    <h4 class="mcp-table-title">📌 报告基础元数据</h4>
                    <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="探测/监测具体位置">
                            <span class="verify-value">{{ reportData.monitoringLocation || '❌ 未能读取到位置' }}</span>
                        </el-descriptions-item>
                        <el-descriptions-item label="系统基波电压等级">
                            <el-tag type="primary" size="small">{{ reportData.baseVoltage || '❌ 未能读取到电压' }}</el-tag>
                        </el-descriptions-item>
                    </el-descriptions>
                </div>

                <div class="mcp-table-box" v-if="reportData.harmonicVoltageTable">
                    <h4 class="mcp-table-title">📈 【表格一】谐波电压</h4>
                    <el-table :data="reportData.harmonicVoltageTable" border stripe size="small" max-height="500">
                        <el-table-column prop="paramName" label="监测项/谐波次数" width="150" align="center" fixed />

                        <el-table-column label="A-B 线电压" align="center">
                            <el-table-column prop="abAvg" label="平均值(%)" align="center" width="90" />
                            <el-table-column prop="ab95" label="95%值(%)" align="center" width="90" />
                        </el-table-column>

                        <el-table-column label="B-C 线电压" align="center">
                            <el-table-column prop="bcAvg" label="平均值(%)" align="center" width="90" />
                            <el-table-column prop="bc95" label="95%值(%)" align="center" width="90" />
                        </el-table-column>

                        <el-table-column label="C-A 线电压" align="center">
                            <el-table-column prop="caAvg" label="平均值(%)" align="center" width="90" />
                            <el-table-column prop="ca95" label="95%值(%)" align="center" width="90" />
                        </el-table-column>

                        <el-table-column prop="limit" label="国标限值" align="center" width="100" />
                        <el-table-column prop="conclusion" label="AI比对" align="center" width="90" fixed="right">
                            <template #default="scope">
                                <el-tag :type="scope.row.conclusion === '超标' ? 'danger' : 'success'" size="small">
                                    {{ scope.row.conclusion }}
                                </el-tag>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>

                <div class="mcp-table-box" v-if="reportData.harmonicCurrentTable">
                    <h4 class="mcp-table-title">⚡ 【表格二】谐波电流</h4>
                    <el-table :data="reportData.harmonicCurrentTable" border stripe size="small" max-height="500">
                        <el-table-column prop="paramName" label="监测项/谐波次数" width="150" align="center" fixed />

                        <el-table-column label="A 相电流" align="center">
                            <el-table-column prop="aAvg" label="平均值(A)" align="center" width="90" />
                            <el-table-column prop="a95" label="95%值(A)" align="center" width="90" />
                        </el-table-column>

                        <el-table-column label="B 相电流" align="center">
                            <el-table-column prop="bAvg" label="平均值(A)" align="center" width="90" />
                            <el-table-column prop="b95" label="95%值(A)" align="center" width="90" />
                        </el-table-column>

                        <el-table-column label="C 相电流" align="center">
                            <el-table-column prop="cAvg" label="平均值(A)" align="center" width="90" />
                            <el-table-column prop="c95" label="95%值(A)" align="center" width="90" />
                        </el-table-column>

                        <el-table-column prop="limit" label="允许注入限值" align="center" width="110" />
                        <el-table-column prop="conclusion" label="AI比对" align="center" width="90" fixed="right">
                            <template #default="scope">
                                <el-tag :type="scope.row.conclusion === '超标' ? 'danger' : 'success'" size="small">
                                    {{ scope.row.conclusion }}
                                </el-tag>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>

                <div class="mcp-table-box" v-if="reportData.mixIndicatorTable">
                    <h4 class="mcp-table-title">🔮 【表格三】频率偏差、三相电压不平衡度及长时间闪变</h4>
                    <el-table :data="reportData.mixIndicatorTable" border stripe size="small">
                        <el-table-column prop="indicatorName" label="评估指标" width="180" align="center" />
                        <el-table-column prop="phaseAB" label="AB线 / A相多指标汇总" align="center" />
                        <el-table-column prop="phaseBC" label="BC线 / B相多指标汇总" align="center" />
                        <el-table-column prop="phaseCA" label="CA线 / C相多指标汇总" align="center" />
                        <el-table-column prop="limitValue" label="标准限值" align="center" width="130" />
                        <el-table-column prop="conclusion" label="结论" align="center" width="110">
                            <template #default="scope">
                                <el-tag :type="scope.row.conclusion === '超标' ? 'danger' : 'success'" size="small">
                                    {{ scope.row.conclusion }}
                                </el-tag>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>

                <div class="mcp-table-box" v-if="reportData.voltageDeviationTable">
                    <h4 class="mcp-table-title">📉 【表格四】电压偏差</h4>
                    <el-table :data="reportData.voltageDeviationTable" border stripe size="small">
                        <el-table-column prop="paramName" label="监测相别" width="180" align="center" />
                        <el-table-column prop="maxValue" label="最大正偏差 (%)" align="center" />
                        <el-table-column prop="minValue" label="最大负偏差 (%)" align="center" />
                        <el-table-column prop="conclusion" label="比对结果" align="center" width="110" />
                    </el-table>
                </div>

                

            </div>


        </el-card>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

const loading = ref(false)
const reportData = ref(null)

// 安全提取系统 Bearer Token 鉴权头
const uploadHeaders = computed(() => {
    const token = localStorage.getItem('waveform_token') || ''
    return {
        'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
    }
})

// 上传前的严苛校验
const beforeExcelUpload = (rawFile) => {
    const isExcel = rawFile.name.endsWith('.xls')
    if (!isExcel) {
        ElMessage.error('MCP 解析器目前专门对接国网标准的 .xls 格式三相数据表！')
        return false
    }
    loading.value = true
    reportData.value = null // 清空老旧报告
    return true
}

// 成功拿到后端的 PowerReportOutputDTO 对象
const handleUploadSuccess = (response) => {
    loading.value = false
    reportData.value = response
    ElMessage.success('⚡ 报告模型数据由 Qwen3.7-Plus 原生结构化输出成功！')
}

// 异常捕获
const handleUploadError = (error) => {
    loading.value = false
    console.error('MCP业务流崩溃:', error)
    ElMessage.error('报告生成中断，请检查后端 Python MCP 进程或云端 API 连接')
}

// 将 DTO 晦涩的英文下划线属性字段名 动态翻译为看盘上大气的中文名称
const convertKeyLabel = (key) => {
    const dict = {
        conclusion: '指标合规性比对结果',
        summary: '专家级诊断总结评语',
        stationName: '受检厂站/充电站名称',
        testTime: '原始测试审计时间',
        voltageLevel: '标称电压等级',
        harmonicContent: '谐波总畸变率评估'
    }
    return dict[key] || key
}
</script>

<style scoped>
.mcp-report-container {
    padding: 20px;
    background-color: #f5f7fa;
    min-height: calc(100vh - 120px);
}

.report-card {
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-header .title {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
}

.upload-section {
    margin: 5px 0;
}

.loading-section {
    padding: 40px 0;
}

.result-section {
    margin-top: 30px;
}

.summary-box {
    background-color: #ffffff;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e4e7ed;
    margin-bottom: 20px;
}

.status-indicator {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: bold;
}

.status-tag {
    font-size: 15px;
    padding: 6px 16px;
    height: auto;
}

.detail-data-box {
    background-color: #ffffff;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e4e7ed;
}

.box-title {
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 15px;
    color: #409eff;
}

.descriptions-table {
    margin-top: 10px;
}

.text-danger {
    color: #f56c6c;
    font-weight: bold;
}

.text-success {
    color: #67c23a;
    font-weight: bold;
}

.raw-value {
    white-space: pre-wrap;
    line-height: 1.6;
}

/* 淡入出过场微动画 */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
}

.mcp-summary-alert {
    margin-bottom: 25px;
    padding: 16px;
}

.mcp-table-box {
    margin-bottom: 25px;
}

.mcp-table-title {
    font-size: 14px;
    font-weight: bold;
    color: #606266;
    margin-bottom: 10px;
    padding-left: 6px;
    border-left: 4px solid #409eff;
}

/* 追加在 style scoped 的最后面 */
.mcp-metadata-box {
    margin-bottom: 25px;
}

.verify-value {
    font-weight: bold;
    color: #303133;
}

.mcp-table-box {
    margin-bottom: 30px;
    background-color: #ffffff;
    padding: 10px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.mcp-table-title {
    font-size: 14px;
    font-weight: bold;
    color: #409eff;
    margin-bottom: 12px;
    padding-left: 8px;
    border-left: 4px solid #409eff;
}

.mcp-expert-conclusion-box {
    margin-top: 25px;
    background-color: #fafafa;
    padding: 15px;
    border: 1px solid #eaeaea;
    border-radius: 8px;
}

.expert-text-content {
    font-size: 14px;
    line-height: 1.7;
    color: #4d4d4d;
    white-space: pre-wrap;
}
.el-upload__text{
    height: 1px;
}
</style>