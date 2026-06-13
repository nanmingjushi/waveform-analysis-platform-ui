import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/login/index.vue'),
        meta: { title: '系统登录' }
    },
    {
        path: '/',
        name: 'Layout',
        component: () => import('../layout/index.vue'),
        redirect: '/home',
        children: [
            {
                path: 'home',
                name: 'Home',
                component: () => import('../views/home/index.vue'),
                meta: { title: '首页' }
            },
            {
                path: 'waveform/comtrade',
                name: 'Comtrade',
                component: () => import('../views/waveform/comtrade/index.vue'),
                meta: { title: 'comtrade格式录波文件读取解析' }
            },
            {
                path: 'waveform/waveform-vision',
                name: 'Waveform-vision',
                component: () => import('../views/waveform/waveform-vision/index.vue'),
                meta: { title: '波形图像识别解析' }
            },
            {
                path: 'waveform/power-quality',
                name: 'Power-quality',
                component: () => import('../views/waveform/power-quality/index.vue'),
                meta: { title: '电能质量测试数据自动化读取' }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})


router.beforeEach((to) => {
    const hasToken = localStorage.getItem('waveform_token')

    if (hasToken) {
        if (to.path === '/login') {
            return '/home' // 已登录者强行去登录页，直接重定向到首页
        }
    } else {
        if (to.path !== '/login') {
            return '/login' // 未登录者企图偷跑进系统，一律拦截并送回登录页
        }
    }
    // 没有任何 return 时，Vue Router 会默认放行
})

router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} - 试验录波文件快速解析系统` : '试验录波文件快速解析系统'
})

export default router