import request from '../utils/request'

/**
 * 1. comtrade录波文件上传
 * @param {FormData} formData 包含 cfgFile 和 datFile 的原生数据对象
 */
export function uploadComtradeFiles(formData) {
  return request({
    url: '/api/comtrade/upload',
    method: 'post',
    data: formData,
    //上传大体量二进制dat文件时，必须显式告诉 Axios 不要序列化为 JSON，保持原生多段表单流
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 2. 获取当前操作员名下的comtrade录波解析历史卡片列表
 */
export function getComtradeList() {
  return request({
    url: '/api/comtrade/list',
    method: 'get'
  })
}

/**
 * 3. comtrade格式文件解析出的数据用 同名CSV文件输出
 * @param {Long|String} id 录波记录的唯一主键 ID
 */
export function downloadCsvBlob(id) {
  return request({
    url: `/api/comtrade/download/${id}`,
    method: 'get',
    // 原始字节大附件，前端必须用响应式的二进制大对象 (Blob) 来全量无损接收
    responseType: 'blob' 
  })
}