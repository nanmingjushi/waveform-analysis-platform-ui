⚡ 试验录波快速解析平台 - 前端 

基于 Vue 3 生态打造的现代化、响应式数据交互与波形可视化分析工作台。本项目为 试验录波快速解析平台 的前端部分，采用前后端分离架构。

🛠️ 核心技术栈

- 核心框架: Vue 3 (Composition API) + Vite
- 状态管理: Pinia
- 路由控制: Vue Router
- UI 组件库: Element-Plus
- 数据可视化: ECharts
- 网络请求: Axios

📁 核心目录结构说明

    src/
    ├── api/                  # 统一接口管理
    │   ├── comtrade.js       # comtrade格式录波解析模块接口
    │   ├── power-quality.js  # 电能质量模块接口
    │   └── waveform-vision.js# 波形图像识别模块接口
    ├── assets/               # 静态资源 (图片、全局样式、Iconfont)
    ├── components/           # 全局公用组件 (自定义图表、通用上传组件等)
    ├── layout/               # 平台整体布局 (侧边栏、顶栏)
    ├── router/               # 路由配置中心
    ├── store/                # Pinia 状态管理
    ├── utils/                # 全局工具类 (如request.js拦截器)
    └── views/                # 业务视图页面
        ├── dashboard/        # 首页数据总览
        ├── comtrade/         # COMTRADE格式文件读取解析视图
        ├── power-quality/    # 电能质量测试数据解析视图
        └── waveform-vision/  # 波形图像识别与参数展示视图




