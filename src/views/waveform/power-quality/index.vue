<template>
  <div class="power-quality-container">
    <el-card class="box-card-wrapper" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="header-title">电能质量测试数据自动化读取</span>
        </div>
      </template>

      <el-form :model="form" ref="formRef" label-width="120px" class="report-form" size="default">
        
        <el-divider content-position="left">基础台账信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="报告编号">
              <el-input v-model="form.reportNo" placeholder="如: DJZXDN202411002" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="委托单位">
              <el-input v-model="form.client" placeholder="输入委托单位" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="委托单位地址">
              <el-input v-model="form.addressOfClient" placeholder="输入委托单位地址" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="被测单位">
              <el-input v-model="form.applicant" placeholder="输入被测单位" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="被测单位地址">
              <el-input v-model="form.addressOfApplicant" placeholder="输入被测单位地址" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="测试地点">
              <el-input v-model="form.testSite" placeholder="输入测试地点" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">测试工况参数</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="开始日期">
              <el-date-picker 
                v-model="startDate" 
                type="date" 
                placeholder="选择开始日期" 
                value-format="YYYY-MM-DD" 
                style="width: 100%" 
                @change="handleStartDate" 
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="结束日期">
              <el-date-picker 
                v-model="endDate" 
                type="date" 
                placeholder="选择结束日期" 
                value-format="YYYY-MM-DD" 
                style="width: 100%" 
                @change="handleEndDate" 
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="电压等级">
              <el-input v-model="form.voltageLevel" placeholder="如: 10kV" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="环境温度(℃)">
              <el-input v-model="form.temperature" placeholder="如: 15" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="相对湿度(%)">
              <el-input v-model="form.humidity" placeholder="如: 50" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="测试原因">
              <el-input v-model="form.testReason" placeholder="如: 电能质量测试" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">测试设备工器具</el-divider>
        <el-row :gutter="20">
          <el-col :span="9">
            <el-form-item label="设备名称">
              <el-input v-model="form.equipmentName" placeholder="如: 电能质量分析仪 FLUKE-1777" />
            </el-form-item>
          </el-col>
          <el-col :span="9">
            <el-form-item label="证书编号">
              <el-input v-model="form.equipmentCode" placeholder="输入证书编号" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="有效期至">
              <el-input v-model="form.equipmentValidDate" placeholder="如: 2025.6.23" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">仪器Excel原始数据上传</el-divider>
        <div class="upload-zone">
          <el-upload
            drag
            action=""
            :show-file-list="true"
            :auto-upload="false"
            :limit="1"
            accept=".xls,.xlsx"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :on-exceed="handleExceed"
            ref="uploadRef"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将仪器导出的 <em>Excel 文件</em> 拖拽到此处，或 <em>点击选择</em>
            </div>
            <template #tip>
              <div class="el-upload__tip text-center">
                源文件须包含 "电压谐波"、"电流谐波"、"功率" 等标准 Sheet 页
              </div>
            </template>
          </el-upload>
        </div>
        <el-divider content-position="left">附图上传</el-divider>
        <div class="upload-zone">
          <el-upload
            drag
            action=""
            :show-file-list="true"
            :auto-upload="false"
            multiple
            accept="image/*"
            :on-change="handleImageChange"
            :on-remove="handleImageRemove"
            ref="imageUploadRef"
          >
            <el-icon class="el-icon--picture"><PictureFilled /></el-icon>
            <div class="el-upload__text">
              将 <em>附图</em> 拖拽到此处，或 <em>点击选择</em> (支持多图)
            </div>
          </el-upload>
        </div>

        <div class="submit-action-bar">
          <el-button type="primary" size="large" :loading="submitLoading" @click="executeGenerateReport" class="generate-btn">
            开始读取解析
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { generatePowerQualityReport } from '@/api/power-quality'
import { UploadFilled, PictureFilled } from '@element-plus/icons-vue' 

const uploadRef = ref(null)
const submitLoading = ref(false)
const imageUploadRef = ref(null)
const imageFiles = ref([]) // 存储多张图片

// 图片变动时更新列表
const handleImageChange = (uploadFile, uploadFiles) => {
  imageFiles.value = uploadFiles.map(f => f.raw)
}
const handleImageRemove = (uploadFile, uploadFiles) => {
  imageFiles.value = uploadFiles.map(f => f.raw)
}


// 辅助绑定的时间组件（初始化给定默认值，方便测试）
const startDate = ref('2025-01-01')
const endDate = ref('2025-01-05')

// 匹配后端的 DTO (初始化填入测试数据，省去每次手打的烦恼)
const form = reactive({
  reportNo: '******202501234',
  client: '********有限公司',
  addressOfClient: '**市**区*******',
  applicant: '**市******有限公司',
  addressOfApplicant: '**市**区',
  testSite: '**站',
  startYear: '2025',
  startMonth: '01',
  startDay: '01',
  endMonth: '01',
  endDay: '05',
  temperature: '15',
  humidity: '50',
  voltageLevel: '10kV',
  testReason: '电能质量测试',
  equipmentName: '电能质量分析仪 FLUKE-1777',
  equipmentCode: 'J202309183499-04-0001',
  equipmentValidDate: '2025.6.23',
  file: null
})

// 时间拆解器 (前端选了日期，自动拆成年月给后端，完美适配 Word 模板坑位)
const handleStartDate = (val) => {
  if (val) {
    const parts = val.split('-')
    form.startYear = parts[0]
    form.startMonth = parts[1]
    form.startDay = parts[2]
  } else {
    form.startYear = ''
    form.startMonth = ''
    form.startDay = ''
  }
}

const handleEndDate = (val) => {
  if (val) {
    const parts = val.split('-')
    form.endMonth = parts[1]
    form.endDay = parts[2]
  } else {
    form.endMonth = ''
    form.endDay = ''
  }
}

// ========= 文件流拦截与替换机制 =========
const handleFileChange = (uploadFile) => {
  if (uploadFile && uploadFile.raw) {
    form.file = uploadFile.raw
  }
}

const handleFileRemove = () => {
  form.file = null
}

const handleExceed = (files) => {
  uploadRef.value.clearFiles()
  const file = files[0]
  uploadRef.value.handleStart(file)
  form.file = file
}

/**
 * 发起 FormData 混合请求，接收二进制 Blob 并触发浏览器强下载
 */
const executeGenerateReport = async () => {
  if (!form.file) {
    ElMessage.warning('拒绝执行：请先上传电能质量测试数据源Excel文件！')
    return
  }

  submitLoading.value = true
  
  // 1. 洗装数据为 Multipart/FormData
  const formData = new FormData()
  Object.keys(form).forEach(key => {
    if (form[key] !== null && form[key] !== undefined && form[key] !== '') {
      formData.append(key, form[key])
    }
  })

  imageFiles.value.forEach(img => {
    formData.append('images', img)
  })

  try {
    ElMessage.info('正在驱动后端引擎解析Excel并动态渲染排版，请稍候...')
    
    // 2. 调用API 
    const response = await generatePowerQualityReport(formData)

    // 3. 处理文件下载机制 (兼容 axios 拦截器返回的完整 response 或直接返回的 data blob)
    const blobData = response.data ? response.data : response
    const blob = new Blob([blobData], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    
    // 4. 尝试从 Header 截获后端原生的安全文件名
    let fileName = '电能质量测试数据自动化读取报告.docx'
    const headers = response.headers
    if (headers && headers['content-disposition']) {
      const disposition = headers['content-disposition']
      // 提取 filename*=utf-8''... 的格式
      if (disposition.indexOf('filename*=utf-8\'\'') !== -1) {
        fileName = decodeURIComponent(disposition.split('filename*=utf-8\'\'')[1])
      } else {
        const matches = /filename="([^"]+)"/.exec(disposition)
        if (matches != null && matches[1]) {
          fileName = matches[1]
        }
      }
    }
    
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)

    ElMessage.success('电能质量测试数据自动化读取报告word已成功下载！')
    
  } catch (error) {
    console.error('报告生成失败:', error)
    ElMessage.error('网络通信溃败，或 Excel 源文件解析发生异常！')
  } finally {
    submitLoading.value = false
  }
}
</script>

<style scoped>
.power-quality-container {
  padding: 20px;
  background-color: #f8f9fa; /* 与整体风格保持底色统一 */
  min-height: calc(100vh - 120px);
}

.box-card-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: center;
  align-items: center;
}

.header-title {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
  letter-spacing: 1px;
}

.report-form {
  margin-top: 10px;
  padding: 0 20px;
}

:deep(.el-divider__text) {
  font-size: 15px;
  font-weight: bold;
  color: #409EFF; /* 国网经典科技蓝 */
}

.text-center {
  text-align: center;
  color: #909399;
}

.upload-zone {
  margin: 30px auto;
  width: 70%;
}

:deep(.el-upload-dragger) {
  padding: 40px 10px;
  background-color: #fafafa;
  border: 1.5px dashed #dcdfe6;
  border-radius: 8px;
  transition: all 0.3s;
}

:deep(.el-upload-dragger:hover) {
  border-color: #409EFF;
  background-color: #f0f7ff;
}

.submit-action-bar {
  margin-top: 50px;
  text-align: center;
  padding-bottom: 20px;
}

.generate-btn {
  width: 50%;
  height: 50px;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 1px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  border-radius: 8px;
  transition: all 0.3s;
}

.generate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
}
</style>