<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

import { uploadComtradeFiles, getComtradeList, downloadCsvBlob } from '../../../api/comtrade'

// 响应式状态中心
const chosenFiles = ref([])       // 用户当前选中的文件缓冲池
const recordList = ref([])        // 历史表格全量数据
const tableLoading = ref(false)   // 表格加载动画
const uploadLoading = ref(false)  // 上传解析按钮加载动画

/**
 * 核心校验器（计算属性）：实时监控文件池，只有同名的 .cfg 和 .dat 同时集齐，才亮起上传绿灯
 */
const isPairReady = computed(() => {
    if (chosenFiles.value.length !== 2) return false

    const file1 = chosenFiles.value[0].name
    const file2 = chosenFiles.value[1].name

    const prefix1 = file1.substring(0, file1.lastIndexOf('.'))
    const ext1 = file1.substring(file1.lastIndexOf('.')).toLowerCase()

    const prefix2 = file2.substring(0, file2.lastIndexOf('.'))
    const ext2 = file2.substring(file2.lastIndexOf('.')).toLowerCase()

    // 条件：主文件名必须完全一致，且后缀必须是一个 .cfg 一个 .dat
    const isNameMatch = prefix1 === prefix2
    const hasCfg = ext1 === '.cfg' || ext2 === '.cfg'
    const hasDat = ext1 === '.dat' || ext2 === '.dat'

    return isNameMatch && hasCfg && hasDat
})

/**
 * 获取历史解析列表
 */
const fetchRecordList = async () => {
    tableLoading.value = true
    try {
        const res = await getComtradeList()
        // 对齐后端拆壳：如果返回格式是 { code: 200, data: [...] }
        recordList.value = res.data || res
    } catch (error) {
        console.error('获取列表失败', error)
    } finally {
        tableLoading.value = false
    }
}

/**
 * 监听文件池变动（添加文件时触发）
 */
const handleFileChange = (file, fileList) => {
    // 如果选了超过2个文件，强制裁剪，只留最新的2个
    if (fileList.length > 2) {
        ElMessage.warning('多点触控拦截：一次只能处理一对 .cfg 和 .dat 文件')
        chosenFiles.value = fileList.slice(-2)
        return
    }
    chosenFiles.value = fileList
}

/**
 * 移除文件池中的文件
 */
const handleFileRemove = (file, fileList) => {
    chosenFiles.value = fileList
}

/**
 * 清空文件池
 */
const clearFilePool = () => {
    chosenFiles.value = []
}

/**
 * 手工触发：多段表单流提交
 */
const submitUpload = async () => {
    if (!isPairReady.value) return

    uploadLoading.value = true
    // 利用原生 JS 变出一个标准多段表单流对象 (Multipart Form Data)
    const formData = new FormData()

    // 抓出 CFG 和 DAT
    chosenFiles.value.forEach(item => {
        if (item.name.toLowerCase().endsWith('.cfg')) {
            formData.append('cfgFile', item.raw) // 必须用 item.raw 抓取浏览器的物理二进制对象
        } else if (item.name.toLowerCase().endsWith('.dat')) {
            formData.append('datFile', item.raw)
        }
    })

    try {
        await uploadComtradeFiles(formData)
        ElMessage.success('comtrade格式录波文件（.CFG与.DAT）解析成功！数据已实时安全落库')
        clearFilePool()   // 解析成功，洗净文件池
        fetchRecordList() // 联动刷新下层大看板
    } catch (error) {
        console.error('解析失败', error)
    } finally {
        uploadLoading.value = false
    }
}

/**
 * 核心大闭环：无损拦截二进制字节流，还原物理同名 CSV 下载
 */
const handleDownload = async (row) => {
    try {
        ElMessage.info('正在向系统提取无损 CSV 字节流...')
        // 此时拿到的是原始 Axios Response 对象，内部包裹着 Blob
        const response = await downloadCsvBlob(row.id)

        // 1. 从 Axios 的响应体中提取真实的二进制大对象
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })

        // 2. 先给一个安全的默认文件名，防止后端字段不一致导致 substring 崩溃
        let fileName = 'record_data.csv'

        // 尝试从 row 对象中抓取文件名（做安全的健壮性兼容）
        const targetName = row.comtradeName || row.fileName || row.name
        if (targetName && typeof targetName === 'string' && targetName.includes('.')) {
            fileName = `${targetName.substring(0, targetName.lastIndexOf('.'))}.csv`
        }

        // 3. 如果后端在 Header 里塞了 content-disposition，以此为最高优先级
        const contentDisposition = response.headers['content-disposition']
        if (contentDisposition) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
            const matches = filenameRegex.exec(contentDisposition)
            if (matches != null && matches[1]) {
                fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''))
            }
        }

        // 4. 在浏览器内存里虚拟出一个下载网址指针
        const blobUrl = window.URL.createObjectURL(blob)

        // 5. 动态创建隐形 <a> 标签模拟物理点击
        const downloadLink = document.createElement('a')
        downloadLink.href = blobUrl
        downloadLink.download = fileName
        document.body.appendChild(downloadLink)
        downloadLink.click() // 强行触发浏览器物理落盘

        // 6. 彻底销毁内存地址，杜绝大物理文件导致的浏览器内存泄漏
        document.body.removeChild(downloadLink)
        window.URL.revokeObjectURL(blobUrl)
        ElMessage.success(`文件 [${fileName}] 成功安全下载！`)
    } catch (error) {
        console.error('文件流物理转化失败', error)
        ElMessage.error('二进制流无损转化发生致命崩溃，请检查网络或后端日志')
    }
}

/**
 * 将 ISO 8601 字符串转换为本地（北京时间） 年-月-日 时:分:秒 格式
 * @param {String} timeStr 后端回吐的原始时间字符串
 */
const formatTime = (timeStr) => {
    if (!timeStr) return ''

    // 传入原始字符串，JS 的 Date 对象会自动将其识别为 UTC 时间并转换为本地浏览器的当前时区
    const date = new Date(timeStr)

    // 健壮性容错：万一后端传了非法的乱码，直接返回原字符串，防止页面崩溃
    if (isNaN(date.getTime())) return timeStr

    const year = date.getFullYear()
    // padStart(2, '0') 的作用是自动补零，比如 6月变成 06月，5秒变成 05秒
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    // 返回标准的工业级时间排版：年-月-日 时:分:秒
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 页面挂载生命周期
onMounted(() => {
    fetchRecordList()
})
</script>

<template>
    <div class="comtrade-container">
        <el-card class="upload-card">
            <template #header>
                <div class="card-header">
                    <span class="header-title">COMTRADE格式录波文件读取解析</span>
                    <el-tag type="warning" effect="dark">标准规范：IEEE Std C37.111-1999</el-tag>
                </div>
            </template>

            <div class="upload-box">
                <el-upload class="comtrade-uploader" drag action="" multiple :auto-upload="false"
                    :file-list="chosenFiles" :on-change="handleFileChange" :on-remove="handleFileRemove"
                    accept=".cfg,.dat">
                    <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                    <div class="el-upload__text">
                        将COMTRADE格式文件的配置 <em>.cfg</em> 文件 和数据 <em>.dat</em> 文件同时拖到此处，或 <em>点击上传</em>
                    </div>
                    <template #tip>
                        <div class="el-upload__tip text-red">
                            * 必须同时上传同一个COMTRADE录波记录的同名 <strong> .cfg 与 .dat </strong>文件，且单文件大小不得超过 50MB。
                        </div>
                    </template>
                </el-upload>

                <div class="action-bar">
                    <el-button type="success" size="large" :loading="uploadLoading" :disabled="!isPairReady"
                        @click="submitUpload">
                        开始读取解析
                    </el-button>
                    <el-button size="large" @click="clearFilePool">清空文件池</el-button>
                </div>
            </div>
        </el-card>

        <el-card class="table-card">
            <template #header>
                <div class="card-header">
                    <span class="header-title">COMTRADE格式文件历史解析记录</span>
                    <el-button type="primary" size="small" :loading="tableLoading" @click="fetchRecordList">
                        刷新数据
                    </el-button>
                </div>
            </template>

            <el-table :data="recordList" v-loading="tableLoading" border stripe style="width: 100%">
                <el-table-column type="index" label="序号" width="70" align="center" />
                <el-table-column prop="fileName" label="原始COMTRADE录波文件名" min-width="200" show-overflow-tooltip />
                <el-table-column prop="stationName" label="厂站名称" min-width="120" show-overflow-tooltip />
                <el-table-column prop="deviceId" label="设备名称" min-width="120" show-overflow-tooltip />
                <el-table-column prop="analogCount" label="模拟通道" width="100" align="center" />
                <el-table-column prop="digitalCount" label="状态通道" width="100" align="center" />
                <el-table-column label="读取解析时间" width="180" align="center">
                    <template #default="scope">
                        <span>{{ formatTime(scope.row.createTime) }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="解析结果数据导出" width="140" align="center" fixed="right">
                    <template #default="scope">
                        <el-button type="primary" size="small" plain @click="handleDownload(scope.row)">
                            导出 CSV
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<style scoped>
.comtrade-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    /* 上下卡片标准 20px 工业间距 */
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-title {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
}

.upload-box {
    padding: 10px 0;
}

.comtrade-uploader {
    width: 100%;
}

/* 强力重写 Element Plus 拖拽框样式，使其更符合工业严谨感 */
:deep(.el-upload-dragger) {
    padding: 40px 20px;
    background-color: #fafafa;
    border: 2px dashed #dcdfe6;
}

:deep(.el-upload-dragger:hover) {
    border-color: #409eff;
}

.action-bar {
    margin-top: 20px;
    display: flex;
    gap: 15px;
    justify-content: flex-start;
}

.table-card {
    margin-bottom: 20px;
}

.text-red {
    color: #f56c6c;
    margin-top: 8px;
    font-size: 13px;
}
</style>