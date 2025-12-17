import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Global Daily | 见解与智慧",
  description: "Curated Daily News for the Curious Mind.",
  icons: { icon: "https://fav.farm/🔥" }, // 换个更燃的图标
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
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