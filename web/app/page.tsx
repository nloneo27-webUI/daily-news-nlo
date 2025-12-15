'use client';

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

// 初始化 Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MENU = {
  "国内": ["政治", "经济", "科技", "AI"],
  "国际": ["政治", "经济", "科技", "AI"],
  "创意": ["科技产品", "每日一笑"]
};

export default function Home() {
  const [activeMain, setActiveMain] = useState("国内");
  const [activeSub, setActiveSub] = useState("AI");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 获取数据
  async function fetchData(main: string, sub: string) {
    setLoading(true);
    const { data: briefs, error } = await supabase
      .from('daily_briefs')
      .select('*')
      .eq('main_menu', main)
      .eq('sub_menu', sub)
      .order('created_at', { ascending: false })
      .limit(1);

    if (briefs && briefs.length > 0) {
      setData(briefs[0]);
    } else {
      setData(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData(activeMain, activeSub);
  }, [activeMain, activeSub]);

  return (
    // 全局背景：极淡的绯红色，营造氛围
    <div className="min-h-screen bg-[#FFF5F5] text-slate-800 font-sans flex flex-col md:flex-row">
      
      {/* 
        === 导航区域 (核心修改) === 
        手机端：sticky top-0 (吸顶), z-50 (最上层), w-full (全宽)
        电脑端：md:w-64 (固定宽), md:h-screen (全高)
      */}
      <aside className="sticky top-0 z-50 w-full md:relative md:w-64 md:h-screen flex-shrink-0">
        
        {/* 磨砂玻璃容器：透明带点红 */}
        <div className="h-full bg-white/70 md:bg-white/50 backdrop-blur-xl border-b md:border-b-0 md:border-r border-red-200/30 flex flex-col shadow-sm md:shadow-none">
          
          {/* Logo 区 */}
          <div className="px-4 py-3 md:p-6 flex items-center justify-between md:block">
            <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-500">
              Global Daily.
            </h1>
            <p className="text-[10px] text-red-400/80 hidden md:block mt-1">
              RED EDITION
            </p>
            {/* 手机端显示的日期 */}
            <span className="md:hidden text-xs font-mono text-red-400 bg-red-50 px-2 py-1 rounded-full">
               {format(new Date(), 'MM.dd')}
            </span>
          </div>

          {/* 
            菜单区 
            手机端：flex-row (横向), overflow-x-auto (可滑动)
            电脑端：flex-col (纵向)
          */}
          <nav className="flex-1 overflow-x-auto md:overflow-y-auto no-scrollbar pb-2 md:pb-0 px-2 md:px-4">
            <div className="flex md:flex-col gap-6 md:gap-8 px-2">
              {Object.entries(MENU).map(([mainCategory, subCategories]) => (
                <div key={mainCategory} className="flex-shrink-0 flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-2">
                  
                  {/* 一级标题 */}
                  <h3 
                    onClick={() => {
                      setActiveMain(mainCategory); 
                      setActiveSub((subCategories as string[])[0]);
                    }}
                    className={`text-sm font-bold writing-vertical-lr md:writing-horizontal-tb md:w-full cursor-pointer transition-colors whitespace-nowrap
                      ${activeMain === mainCategory ? 'text-red-600' : 'text-gray-400'}`}
                  >
                    {mainCategory}
                  </h3>

                  {/* 二级子菜单 (手机端横排，电脑端竖排) */}
                  <div className={`flex md:flex-col gap-2 p-1 rounded-xl transition-all duration-300
                     ${activeMain === mainCategory ? 'bg-red-500/5' : ''}
                  `}>
                    {(subCategories as string[]).map((sub) => {
                      const isActive = activeMain === mainCategory && activeSub === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => {
                            setActiveMain(mainCategory);
                            setActiveSub(sub);
                          }}
                          className={`px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap
                            ${isActive
                              ? 'bg-red-500 text-white shadow-md shadow-red-500/30 transform scale-105'
                              : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                            }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* 手机端的分隔线 */}
                  <div className="w-px h-8 bg-red-100 md:hidden mx-2"></div>
                </div>
              ))}
            </div>
          </nav>
        </div>
      </aside>

      {/* === 内容区域 === */}
      <main className="flex-1 p-4 md:p-12 overflow-y-auto h-[calc(100vh-120px)] md:h-screen">
        <div className="max-w-3xl mx-auto pb-20">
          
          {/* 电脑端才显示的顶部状态栏 */}
          <div className="hidden md:flex items-center justify-between mb-8">
             <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="px-2 py-1 bg-white/60 rounded border border-red-100">{activeMain}</span>
                <span className="text-red-200">/</span>
                <span className="font-bold text-red-900">{activeSub}</span>
             </div>
             <div className="text-xs font-mono text-red-300">
               {format(new Date(), 'yyyy-MM-dd')}
             </div>
          </div>

          {/* 内容卡片 */}
          {loading ? (
             <div className="py-20 text-center text-red-300 animate-pulse flex flex-col items-center">
               <div className="w-8 h-8 border-2 border-red-200 border-t-red-500 rounded-full animate-spin mb-4"></div>
               正在读取 AI 简报...
             </div>
          ) : data ? (
            <article className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden">
               {/* 装饰顶条 */}
               <div className="h-1.5 bg-gradient-to-r from-red-500 to-rose-400"></div>
               
               <div className="p-6 md:p-10">
                 {/* AI 总结内容 */}
                 <div className="prose prose-slate prose-p:text-slate-600 prose-headings:text-slate-800 max-w-none mb-8">
                    <h2 className="text-xl md:text-2xl font-black mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
                      今日综述
                    </h2>
                    <div className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                      {data.content}
                    </div>
                 </div>

                 {/* 原始链接 */}
                 {activeSub !== "每日一笑" && data.links && data.links.length > 0 && (
                   <div className="bg-red-50/50 rounded-xl p-5 border border-red-100/50">
                     <h4 className="text-[10px] font-bold uppercase text-red-400 mb-3 tracking-widest">
                       SOURCES
                     </h4>
                     <ul className="space-y-3">
                       {data.links.map((link: any, index: number) => (
                         <li key={index}>
                           <a 
                             href={link.url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-sm text-slate-600 hover:text-red-600 hover:underline flex items-start gap-2 transition-colors"
                           >
                             <span className="text-red-300 font-mono text-xs mt-0.5">{index + 1}.</span>
                             <span className="line-clamp-1">{link.title}</span>
                           </a>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
            </article>
          ) : (
            <div className="py-20 text-center">
               <div className="text-4xl mb-2 opacity-50">🍵</div>
               <p className="text-red-300 text-sm">今日 {activeMain} / {activeSub} 暂无更新</p>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}