import type { Metadata, Viewport } from "next";
// 引入两个性格强烈的字体
import { Playfair_Display, Space_Grotesk } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: '--font-serif', // 定义变量名
  weight: ['400', '700', '900'], // 要最粗的
});

const space = Space_Grotesk({ 
  subsets: ["latin"],
  variable: '--font-sans',
  weight: ['300', '400', '500', '700'],
});

// 1. 网站基础信息 + PWA 配置
export const metadata: Metadata = {
  title: "Global Daily | 见解与智慧",
  description: "Curated Daily News for the Curious Mind.",
  
  // PWA 核心配置
  manifest: "/manifest.json", // 指向你的 manifest 文件
  
  // 针对 iOS 的特殊配置
  appleWebApp: {
    capable: true, // 允许添加到主屏幕
    statusBarStyle: "black-translucent", // 状态栏样式
    title: "Global Daily", // 主屏幕下的文字
  },
  
  // 图标配置 (建议在 public 文件夹放一个 icon.png)
  icons: { 
    icon: "/icon.png",       // 浏览器标签页图标
    apple: "/icon.png",      // iOS 主屏幕图标 (关键！)
    shortcut: "/icon.png",
  },
};

// 2. 视口设置 (手机适配 + 主题色)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // 设置为你的米色背景，让状态栏融为一体
  themeColor: "#F2F0E9", 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      {/* 应用字体变量 */}
      <body className={`${playfair.variable} ${space.variable} antialiased bg-[#F2F0E9]`}>
        {children}
      </body>
    </html>
  );
}