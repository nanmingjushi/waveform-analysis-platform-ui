import request from '../utils/request'

/**
 * 上传现场台账表单与 Excel，返回渲染好的 Word 报告文件流
 * @param {FormData} data 包含普通字段和 file
 */
export function generatePowerQualityReport(data) {
  return request({
    url: '/api/power-quality/generate-report',
    method: 'post',
    data: data,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    responseType: 'blob' // 告诉axios直接接收二进制流
  })
}