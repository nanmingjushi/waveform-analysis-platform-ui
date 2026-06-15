<!-- 控制曲线响应时间 -->
<template>
    <div class="control-curve-container">
        <div class="workbench-layout">

            <div class="canvas-wing">
                <el-card class="box-card-wrapper" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span class="header-title">波形图像控制曲线响应时间识别-交互界面（鼠标拖拽即可画框）</span>

                        </div>
                    </template>

                    <div class="workspace-wrapper">
                        <div v-if="!previewUrl" class="upload-trigger-zone">
                            <el-upload drag action="" :show-file-list="false" :auto-upload="false"
                                :on-change="handleFileChange" accept="image/*">
                                <el-icon class="el-icon--upload"><picture-filled /></el-icon>
                                <div class="el-upload__text">
                                    请上传波形图像，此处将激活 <em>交互画布</em>
                                </div>
                            </el-upload>
                        </div>

                        <div v-else class="interactive-stage" ref="stageRef" @mousedown.prevent="startDrawBox"
                            @mousemove.prevent="drawingBox" @mouseup.prevent="endDrawBox">
                            <img ref="imgRef" :src="previewUrl" alt="控制曲线" class="stage-img"
                                @load="calculateScaleFactors" />

                            <div v-for="(box, index) in regions" :key="box.id" class="responsive-roi-box"
                                :class="{ 'active-highlight': activeRowId === box.id }" :style="{
                                    left: box.x + 'px',
                                    top: box.y + 'px',
                                    width: box.w + 'px',
                                    height: box.h + 'px'
                                }" @click.stop="highlightTableRow(box.id)">
                                <div class="roi-badge-tag">
                                    区域 {{ index + 1 }}
                                    <el-icon class="roi-del-icon" @click.stop="removeRegion(index)">
                                        <close />
                                    </el-icon>
                                </div>
                            </div>

                            <div v-if="isDrawing" class="roi-ghost-box" :style="{
                                left: ghostBox.x + 'px',
                                top: ghostBox.y + 'px',
                                width: ghostBox.w + 'px',
                                height: ghostBox.h + 'px'
                            }"></div>
                        </div>
                    </div>
                </el-card>
            </div>

            <div class="table-wing">
                <el-card class="box-card-wrapper" shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span class="header-title">控制曲线响应时间识别数据记录</span>
                            <el-button type="primary" :disabled="flatTableData.length === 0" @click="exportToWord">
                                导出结果到 Word
                            </el-button>
                        </div>
                    </template>

                    <div class="action-top-bar">
                        <el-button type="success" :disabled="regions.length === 0 || submitLoading"
                            :loading="submitLoading" @click="executeIdentify">
                            开始读取解析
                        </el-button>
                        <el-button type="danger" plain @click="clearWorkBench">清空画布重置</el-button>
                    </div>

                    <el-table :data="flatTableData" border stripe highlight-current-row
                        @current-change="handleTableCellClick" style="width: 100%; margin-top: 15px;"
                        height="calc(100vh - 300px)" empty-text="画布空虚。请在左侧图片上用鼠标拖拽划出波形区域">
                        <el-table-column prop="indexLabel" label="选区" width="100" align="center" fixed />

                        <el-table-column label="左时标(s)" width="90" align="center">
                            <template #default="scope">
                                <el-input v-model="regions[scope.$index].tLeftStr" placeholder="时:分:秒" size="small" />
                            </template>
                        </el-table-column>

                        <el-table-column label="右时标(s)" width="90" align="center">
                            <template #default="scope">
                                <el-input v-model="regions[scope.$index].tRightStr" placeholder="时:分:秒" size="small" />
                            </template>
                        </el-table-column>

                        <el-table-column prop="timeBlue" label="目标(蓝)" width="125" align="center">
                            <template #default="scope">
                                <span class="value-blue">{{ secondsToTime(scope.row.timeBlue) }}</span>
                            </template>
                        </el-table-column>

                        <el-table-column prop="timeGreen" label="实际(绿)" width="125" align="center">
                            <template #default="scope">
                                <span class="value-green">{{ secondsToTime(scope.row.timeGreen) }}</span>
                            </template>
                        </el-table-column>

                        <el-table-column prop="responseTime" label="响应时间(s)" width="105" align="center">
                            <template #default="scope">
                                <el-tag v-if="scope.row.responseTime !== null" type="danger" font-weight="bold">
                                    {{ formatNumber(scope.row.responseTime, 4) }} s
                                </el-tag>
                                <span v-else>--</span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="note" label="备注" min-width="80" show-overflow-tooltip />


                    </el-table>
                </el-card>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { PictureFilled, Close } from '@element-plus/icons-vue'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'
import { calculateControlCurveResponse } from '../../../../api/waveform-vision'


const fileObj = ref(null)          // 图片物理流备份
const previewUrl = ref('')         // 本地原图 Blob 预览地址
const submitLoading = ref(false)   // 加载锁
const activeRowId = ref(null)      // 当前联动高亮的选区 ID

// 选区矩阵
const regions = ref([])

// 鼠标位置状态
const stageRef = ref(null)
const imgRef = ref(null)
const isDrawing = ref(false)
let startX = 0, startY = 0
const ghostBox = ref({ x: 0, y: 0, w: 0, h: 0 })


let scaleX = 1, scaleY = 1


const flatTableData = computed(() => {
    return regions.value.map((box, index) => ({
        id: box.id,
        indexLabel: `区域 ${index + 1}`,
        timeBlue: box.timeBlue ?? null,
        timeGreen: box.timeGreen ?? null,
        responseTime: box.responseTime ?? null,
        note: box.note ?? '未解析'
    }))
})

const formatNumber = (val, decimals = 4) => {
    if (val === null || val === undefined || val === 'NaN' || String(val).trim() === '') return '--'
    const num = Number(val)
    return isNaN(num) ? '--' : num.toFixed(decimals)
}

// 把 "13:10:24" 翻译成纯数字总秒数送给后端 OpenCV
const timeToSeconds = (str) => {
    if (!str) return 0
    // 自动将中文全角冒号替换为英文半角冒号，防止前端页面用户输入法没切过来导致解析瘫痪
    const normalizedStr = String(str).trim().replace(/：/g, ':')
    const parts = normalizedStr.split(':')
    if (parts.length === 3) {
        const hrs = parseInt(parts[0], 10) || 0
        const mins = parseInt(parts[1], 10) || 0
        const secs = parseFloat(parts[2]) || 0
        return hrs * 3600 + mins * 60 + secs
    }
    return parseFloat(normalizedStr) || 0
}

// 把后端计算出的数字秒数，高精翻译回 13:10:24 时标展示
const secondsToTime = (totalSeconds) => {
    if (totalSeconds === null || totalSeconds === undefined || String(totalSeconds) === 'NaN') return '--'
    const secsNum = Number(totalSeconds)
    if (isNaN(secsNum)) return '--'
    const hrs = Math.floor(secsNum / 3600)
    const mins = Math.floor((secsNum % 3600) / 60)
    const secs = secsNum % 60
    const hStr = String(hrs).padStart(2, '0')
    const mStr = String(mins).padStart(2, '0')
    const sFloor = Math.floor(secs)
    const ms = Math.round((secs - sFloor) * 1000)
    const sStr = String(sFloor).padStart(2, '0')
    return ms > 0 ? `${hStr}:${mStr}:${sStr}.${String(ms).padStart(3, '0')}` : `${hStr}:${mStr}:${sStr}`
}

const handleFileChange = (file) => {
    if (!file || !file.raw) return
    fileObj.value = file.raw
    previewUrl.value = URL.createObjectURL(file.raw)
    regions.value = []
}

/**
 * 实时计算原始图片像素与浏览器展示窗口的投影缩放比例
 */
const calculateScaleFactors = () => {
    nextTick(() => {
        if (!imgRef.value) return
        const naturalW = imgRef.value.naturalWidth
        const naturalH = imgRef.value.naturalHeight
        const clientW = imgRef.value.clientWidth
        const clientH = imgRef.value.clientHeight

        scaleX = naturalW / clientW
        scaleY = naturalH / clientH
        logScaleInfo(naturalW, naturalH, clientW, clientH)
    })
}

const logScaleInfo = (nw, nh, cw, ch) => {
    console.log(`[WAVEFORM-VISION] 亚像素自适应矩阵已激活: Original=[${nw}x${nh}], Screen=[${cw}x${ch}], Scale=[${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}]`)
}

/**
 * 鼠标事件状态机 1：点击按下开始捕捉轨迹
 */
const startDrawBox = (e) => {
    if (!stageRef.value) return
    isDrawing.value = true
    const rect = stageRef.value.getBoundingClientRect()
    startX = e.clientX - rect.left
    startY = e.clientY - rect.top

    ghostBox.value = { x: startX, y: startY, w: 0, h: 0 }
}

/**
 * 鼠标事件状态机 2：拖动中拉出动态虚影
 */
const drawingBox = (e) => {
    if (!isDrawing.value || !stageRef.value) return
    const rect = stageRef.value.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top

    // 全方向拖动拉框
    ghostBox.value.x = Math.min(startX, currentX)
    ghostBox.value.y = Math.min(startY, currentY)
    ghostBox.value.w = Math.abs(currentX - startX)
    ghostBox.value.h = Math.abs(currentY - startY)
}

/**
 * 鼠标事件状态机 3：抬起鼠标瞬间完美组装响应式数据节点
 */
const endDrawBox = () => {
    if (!isDrawing.value) return
    isDrawing.value = false

    // 面积太小的误触，直接物理过滤熔断
    if (ghostBox.value.w < 10 || ghostBox.value.h < 10) return

    // 向 Vue 3 核心状态树中追加高内聚选区
    regions.value.push({
        id: 'box_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        x: ghostBox.value.x,
        y: ghostBox.value.y,
        w: ghostBox.value.w,
        h: ghostBox.value.h,
        tLeftStr: '13:10:24',
        tRightStr: '13:12:00',
        timeBlue: null,
        timeGreen: null,
        responseTime: null,
        note: '等待提取'
    })
}

const removeRegion = (index) => {
    regions.value.splice(index, 1)
}

const highlightTableRow = (id) => {
    activeRowId.value = id
}

const handleTableCellClick = (currentRow) => {
    if (currentRow) activeRowId.value = currentRow.id
}

const clearWorkBench = () => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
    fileObj.value = null
    regions.value = []
    activeRowId.value = null
    ElMessage.info('工作台画布已全量干净重置')
}


const executeIdentify = async () => {
    if (!fileObj.value || regions.value.length === 0) return

    submitLoading.value = true
    const formData = new FormData()
    formData.append('file', fileObj.value)

    // 将屏幕上的视窗坐标，通过上面推导的投影公式，放大还原为图片真实物理像素
    const payloadRegions = regions.value.map(r => ({
        x: Math.round(r.x * scaleX),
        y: Math.round(r.y * scaleY),
        w: Math.round(r.w * scaleX),
        h: Math.round(r.h * scaleY),
        // 无视后端用的是 public 还是 Lombok，全部格式一起发送
        tLeftSec: timeToSeconds(r.tLeftStr),
        tRightSec: timeToSeconds(r.tRightStr),
        TLeftSec: timeToSeconds(r.tLeftStr),  // 专治 Lombok 生成的 getTLeftSec()
        TRightSec: timeToSeconds(r.tRightStr),
        tleftSec: timeToSeconds(r.tLeftStr),
        trightSec: timeToSeconds(r.tRightStr)
    }))

    // 打包成统一无损的 JSON 字符串送入管道
    formData.append('regions', JSON.stringify(payloadRegions))

    try {
        ElMessage.info('正在驱动后端对 N 个自定义选区执行互斥 HSV 颜色隔离与时延测算...')
        const res = await calculateControlCurveResponse(formData)

        // 安全解密响应体外壳
        const data = (res && res.data) ? res.data : res

        if (data && data.results) {
            data.results.forEach((resItem, i) => {
                if (regions.value[i]) {
                    regions.value[i].timeBlue = resItem.timeBlue ?? resItem.tBlue ?? resItem.tblue ?? resItem.timeblue
                    regions.value[i].timeGreen = resItem.timeGreen ?? resItem.tGreen ?? resItem.tgreen ?? resItem.timegreen
                    regions.value[i].responseTime = resItem.responseTime ?? resItem.responsetime ?? resItem.tDelay ?? resItem.tdelay ?? resItem.delay
                    regions.value[i].note = resItem.note || resItem.error || '提取成功'
                }
            })
            ElMessage.success('控制曲线响应时间识别全部完成！')
        }
    } catch (error) {
        console.error('控制曲线网络传输崩溃: ', error)
    } finally {
        submitLoading.value = false
    }
}

/**
 * 控制曲线响应时间报告一键 Word 物理下载
 */
const exportToWord = async () => {
    if (regions.value.length === 0) return

    try {
        ElMessage.info('正在驱动客户端内存排版控制曲线响应时间识别报告...')

        const headerRow = new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "选区序号", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "配置时标轴 [tLeft ~ tRight]", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "目标 (蓝)", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "实际 (绿)", bold: true })] }),
                new TableCell({ children: [new Paragraph({ text: "响应时间 (tDelay)", bold: true })] }),

            ]
        })

        const bodyRows = regions.value.map((item, i) => {
            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(`区域 ${i + 1}`)] }),
                    new TableCell({ children: [new Paragraph(`[${item.tLeftStr} ~ ${item.tRightStr}]`)] }),
                    new TableCell({ children: [new Paragraph(formatNumber(item.timeBlue, 4) + ' s')] }),
                    new TableCell({ children: [new Paragraph(formatNumber(item.timeGreen, 4) + ' s')] }),
                    new TableCell({ children: [new Paragraph(formatNumber(item.responseTime, 4) + ' s')] }),
                    new TableCell({ children: [new Paragraph(item.note || '--')] }),
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
                        text: "波形图像控制曲线响应时间识别",
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
        a.download = `波形图像控制曲线响应时间识别报告_${new Date().getTime()}.docx`
        document.body.appendChild(a)
        a.click()

        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        ElMessage.success('波形图像控制曲线响应时间识别 Word 报告已安全下载！')
    } catch (error) {
        console.error('Word 导出崩溃:', error)
        ElMessage.error('Word 报告转换发生未知溃败')
    }
}
</script>

<style scoped>
.control-curve-container {
    padding: 10px 0;
}

.workbench-layout {
    display: flex;
    gap: 20px;
    align-items: flex-start;
}

.canvas-wing {
    flex: 1.2;
    min-width: 450px;
}

.table-wing {
    flex: 1;
    min-width: 780px;
}

.box-card-wrapper {
    background: #ffffff;
    border-radius: 4px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.header-title {
    font-size: 15px;
    font-weight: bold;
    color: #303133;
}

.action-top-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}

/* 工作台舞台大排版 */
.workspace-wrapper {
    background: #f8f9fa;
    border: 1px solid #eaeaea;
    border-radius: 4px;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.upload-trigger-zone {
    width: 100%;
    padding: 20px;
}

:deep(.el-upload-dragger) {
    padding: 50px 10px;
    background-color: #fafafa;
    border: 1.5px dashed #e0e0e0;
}

.interactive-stage {
    position: relative;
    cursor: crosshair;
    /* 变成十字准星，充满视觉科幻感 */
    user-select: none;
    display: inline-block;
}

.stage-img {
    max-width: 100%;
    display: block;
    object-fit: contain;
}

/* 数据驱动的响应式选区 DOM 样式 */
.responsive-roi-box {
    position: absolute;
    border: 2px dashed #409eff;
    background: rgba(64, 158, 255, 0.12);
    box-sizing: border-box;
    transition: border-color 0.2s, background-color 0.2s;
}

.responsive-roi-box:hover,
.responsive-roi-box.active-highlight {
    border-style: solid;
    border-color: #f56c6c;
    background: rgba(245, 108, 108, 0.18);
}

.roi-badge-tag {
    position: absolute;
    top: -24px;
    left: -2px;
    background: #409eff;
    color: #ffffff;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px 3px 0 0;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: bold;
}

.responsive-roi-box:hover .roi-badge-tag,
.responsive-roi-box.active-highlight .roi-badge-tag {
    background: #f56c6c;
}

.roi-del-icon {
    cursor: pointer;
    border-radius: 50%;
}

.roi-del-icon:hover {
    background: rgba(0, 0, 0, 0.2);
}

/* 拖拽时的虚影框 */
.roi-ghost-box {
    position: absolute;
    border: 2px dashed #67c23a;
    background: rgba(103, 194, 58, 0.15);
    box-sizing: border-box;
    pointer-events: none;
}

/* 数字色彩语义高亮 */
.value-blue {
    font-family: 'Courier New', monospace;
    font-weight: bold;
    color: #409eff;
}

.value-green {
    font-family: 'Courier New', monospace;
    font-weight: bold;
    color: #67c23a;
}
</style>