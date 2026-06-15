import request from '../utils/request'

/**
 * 1. 暂态最大值识别
 * @param {FormData} formData 包含 files(MultipartFile[]) 和 mode(String) 的多段表单流对象
 */
export function identifyTransientMaxValue(formData) {
  return request({
    url: '/api/waveform-vision/transient/max-value',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' } // 强行锁死多段附件流传输
  })
}

/**
 * 2. 稳态值识别
 * @param {FormData} formData 包含 files(MultipartFile[]) 和 mode(String)
 */
export function identifySteadyStateValue(formData) {
  return request({
    url: '/api/waveform-vision/steady-state/value',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 3. 频率
 * @param {FormData} formData 包含 files(MultipartFile[])
 */
export function calculateFrequency(formData) {
  return request({
    url: '/api/waveform-vision/frequency',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 4. 阶跃响应时间
 * @param {FormData} formData 包含 file(单MultipartFile)、tLeft(double)、tRight(double)
 */
export function calculateStepResponse(formData) {
  return request({
    url: '/api/waveform-vision/step-response',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 5. 控制曲线响应时间
 * @param {FormData} formData 包含 file(单图) 和 regions(List<DTO> 对应的 JSON 字符串)
 */
export function calculateControlCurveResponse(formData) {
  return request({
    url: '/api/waveform-vision/control-curve/response-time',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}