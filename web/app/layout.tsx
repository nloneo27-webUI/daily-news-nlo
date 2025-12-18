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

// 1. 这里是网站的基础信息 (SEO)
export const metadata: Metadata = {
  title: "Global Daily | 见解与智慧",
  description: "Curated Daily News for the Curious Mind.",
  icons: { icon: "https://fav.farm/🔥" },
};

// 2. 这里是专门的视口设置 (手机适配) - 以前写在上面，现在独立出来了
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // themeColor: "#F2F0E9", // 可选：设置手机浏览器顶栏颜色
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