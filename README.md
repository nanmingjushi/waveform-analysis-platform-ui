## Waveform Analysis Platform - UI

#### 项目简介

Waveform Analysis Platform-UI是[试验录波文件快速解析平台](https://github.com/nanmingjushi/waveform-analysis-platform)的前端交互界面。项目采用Vue3前端框架开发，包含用户登录、COMTRADE格式录波文件读取解析、波形图像关键参数识别、以及电能质量测试数据报告自动化生成等功能页面。

#### 页面模块说明

- **登录页 (`views/login`)**：提供平台统一的用户身份验证登录界面，对接后端进行账号密码校验并存储Token。
- **工作台主页 (`views/home`)**：展示系统欢迎页以及各类功能模块的快捷入口导航。
- **comtrade格式录波文件读取解析 (`views/waveform/comtrade`)**：提供 `.cfg` 和 `.dat` 录波文件的拖拽上传槽，用于向后端发起解析请求并展示多通道模拟量和状态量的数据。
- **波形图像识别关键参数 (`views/waveform/waveform-vision`)**：下设五个独立子组件（暂态最大值、稳态值、阶跃响应时间等），用于上传波形图象并展示后端的视觉识别判定结果。
- **电能质量测试数据自动化读取 (`views/waveform/power-quality`)**：包含基础台账信息表单输入框与源Excel数据上传框，支持一键提交并触发浏览器下载Word报告。

#### 技术选型

本平台前端基于Vue框架与Vite构建工具进行开发，应用界面采用Element Plus组件库进行组件拼装，应用状态管理与路由控制分别选用Pinia和Vue Router组织结构，网络通信层则基于Axios进行二次封装。

#### 环境要求

本平台前端的日常开发与运行需要本地配置好Node.js运行环境，并使用npm作为依赖包管理及项目脚本驱动工具。

#### 示例

comtrade格式录波文件读取解析

![](https://github.com/nanmingjushi/waveform-analysis-platform/blob/master/%E7%A4%BA%E4%BE%8B/comtrade%E6%A0%BC%E5%BC%8F%E5%BD%95%E6%B3%A2%E6%96%87%E4%BB%B6%E8%AF%BB%E5%8F%96%E8%A7%A3%E6%9E%90.png?raw=true)

波形图像识别关键参数

![](https://github.com/nanmingjushi/waveform-analysis-platform/blob/master/%E7%A4%BA%E4%BE%8B/%E6%B3%A2%E5%BD%A2%E5%9B%BE%E5%83%8F%E8%AF%86%E5%88%AB%E5%85%B3%E9%94%AE%E5%8F%82%E6%95%B0.png?raw=true)

电能质量测试数据自动化读取

![](https://github.com/nanmingjushi/waveform-analysis-platform/blob/master/%E7%A4%BA%E4%BE%8B/%E7%94%B5%E8%83%BD%E8%B4%A8%E9%87%8F%E6%B5%8B%E8%AF%95%E6%95%B0%E6%8D%AE%E8%87%AA%E5%8A%A8%E5%8C%96%E8%AF%BB%E5%8F%96.png?raw=true)
