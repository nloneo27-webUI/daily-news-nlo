import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Global Daily 全球日报', // App 的全名
    short_name: 'Global Daily',    // 桌面图标下的短名字
    description: 'AI 驱动的全球新闻简报，每日更新。',
    start_url: '/',
    display: 'standalone',         // 关键：开启“独立应用模式”，去掉浏览器地址栏
    background_color: '#F2F0E9',   // 启动时的背景色 (配合你的米色主题)
    theme_color: '#F2F0E9',        // 顶部状态栏颜色
    icons: [
      {
        src: '/icon.png',          // 你刚才放在 public 里的图片
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}