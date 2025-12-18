'use client';

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MENU_ITEMS = ["首页", "政治", "经济", "科技", "AI", "段子"];

export default function Home() {
  const [activeTab, setActiveTab] = useState("首页");
  const [quote, setQuote] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date();

  // 1. 获取哲理
  useEffect(() => {
    async function fetchQuote() {
      const { data } = await supabase.from('daily_quotes').select('*').order('created_at', { ascending: false }).limit(1).single();
      if (data) setQuote(data);
    }
    fetchQuote();
  }, []);

  // 2. 获取数据
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data } = await supabase.from('daily_briefs').select('*').eq('category', activeTab).order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) setData(data[0]);
      else setData(null);
      setLoading(false);
    }
    fetchData();
  }, [activeTab]);

  return (
    // 🎨 修改点1：回归暖调米色背景 #F2F0E9，文字深黑 #1A1A1A，高亮国际橙 #FF4D00
    <div className="min-h-screen bg-[#F2F0E9] text-[#1A1A1A] font-sans selection:bg-[#FF4D00] selection:text-white relative">
      
      {/* 噪点层 (增加纸张质感) */}
      <div className="bg-noise opacity-60"></div>

      {/* 🎨 修改点2：背景光斑回归暖色系 (橙 + 金) */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-[#FF4D00] to-[#FFD700] rounded-full blur-[120px] opacity-15 mix-blend-multiply animate-float -z-10"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-[#FF4D00] to-[#FF8800] rounded-full blur-[100px] opacity-10 mix-blend-multiply -z-10"></div>

      <div className="flex flex-col min-h-screen relative z-10">
        
        {/* 
           🏗️ 导航栏：顶部横向排列 (Sticky Top)
           背景用半透明的暖白，保持通透
        */}
        <header className="sticky top-0 z-50 bg-[#F2F0E9]/80 backdrop-blur-xl border-b border-[#1A1A1A]/10">
          <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
            
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="font-serif font-black text-xl md:text-2xl tracking-tighter text-[#1A1A1A]">
                GLOBAL DAILY.
              </div>
              <div className="hidden md:block w-px h-6 bg-[#1A1A1A]/20"></div>
              <div className="hidden md:block text-xs font-mono text-[#1A1A1A]/50">
                {format(today, 'yyyy.MM.dd')}
              </div>
            </div>

            {/* 菜单：横向排列 */}
            <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar pl-4 md:pl-0">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveTab(item)}
                  className={`relative px-3 md:px-5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap uppercase tracking-wider
                    ${activeTab === item 
                      // 🎨 修改点3：选中态变成 橙色文字 + 底部黑线 (杂志风)
                      ? 'text-[#FF4D00] bg-[#1A1A1A]/5' 
                      : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                    }`}
                >
                  {item}
                  {/* 选中时的底部装饰线 */}
                  {activeTab === item && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-0.5 bg-[#FF4D00]"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* === 主内容区 === */}
        <main className="flex-1 p-4 md:p-12">
          <div className="max-w-4xl mx-auto">
            
            {loading ? (
              <div className="h-[50vh] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#1A1A1A]/10 border-t-[#FF4D00] rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-16 animate-fade-in-up">
                
                {/* --- 首页内容 --- */}
                {activeTab === "首页" && (
                  <>
                    {/* Slogan */}
                    <section className="text-center py-10 md:py-20 border-b-2 border-[#1A1A1A] mb-12">
                      <h1 className="text-4xl md:text-7xl font-serif font-black text-[#1A1A1A] leading-[1.1] mb-6">
                        见过什么道理<br/>
                        <span className="text-[#FF4D00]">
                          便住此山
                        </span>
                      </h1>
                      <div className="flex items-center justify-center gap-4">
                        <div className="h-px bg-[#1A1A1A] w-12"></div>
                        <p className="font-mono text-xs md:text-sm text-[#1A1A1A]/60 tracking-[0.2em] uppercase">
                          Seen some truth, then live in this mountain.
                        </p>
                        <div className="h-px bg-[#1A1A1A] w-12"></div>
                      </div>
                    </section>

                    {/* 哲理卡片 */}
                    {quote && (
                      <section className="relative p-8 md:p-12 border-l-4 border-[#FF4D00] bg-white shadow-sm">
                        <span className="absolute top-4 left-4 text-6xl font-serif text-[#F2F0E9] z-0">“</span>
                        <p className="relative text-xl md:text-3xl font-serif text-[#1A1A1A] leading-relaxed mb-6 z-10">
                          {quote.content}
                        </p>
                        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#FF4D00]">
                          — {quote.author}
                        </p>
                      </section>
                    )}

                    {/* 今日总结 */}
                    {data?.summary && (
                      <section className="mt-16 bg-[#1A1A1A] text-[#F2F0E9] p-8 md:p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF4D00] blur-[100px] opacity-20"></div>
                        <h3 className="font-mono text-xs font-bold uppercase text-[#FF4D00] mb-6 flex items-center gap-2 relative z-10">
                          <span className="w-2 h-2 bg-[#FF4D00] rounded-full"></span>
                          DAILY SUMMARY
                        </h3>
                        <p className="text-lg md:text-xl font-sans leading-relaxed text-justify opacity-90 relative z-10">
                          {data.summary}
                        </p>
                      </section>
                    )}
                  </>
                )}

                {/* --- 分类内容 --- */}
                {activeTab !== "首页" && (
                  <div>
                    <header className="mb-12 flex items-end gap-4 border-b-4 border-[#1A1A1A] pb-4">
                      <h1 className="text-6xl md:text-8xl font-serif font-black text-[#1A1A1A]">{activeTab}</h1>
                      <span className="font-mono text-sm mb-3 text-[#FF4D00] font-bold">/ ISSUE {format(today, 'MMdd')}</span>
                    </header>

                    <div className="grid grid-cols-1 gap-10">
                      {data?.cards?.map((card: any, idx: number) => (
                        <article key={idx} className="group relative">
                          {/* 序号 */}
                          <div className="absolute -left-3 -top-3 md:-left-12 md:top-0 text-4xl font-black text-[#1A1A1A]/10 font-serif group-hover:text-[#FF4D00]/20 transition-colors">
                            {String(idx + 1).padStart(2, '0')}
                          </div>

                          <div className="bg-white border-2 border-[#1A1A1A] p-6 md:p-8 hover:translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#FF4D00] transition-all duration-200">
                            <h3 className="text-xl md:text-2xl font-bold mb-4 group-hover:text-[#FF4D00] transition-colors leading-snug">
                              {card.title}
                            </h3>
                            <p className="text-base md:text-lg text-[#1A1A1A]/80 leading-relaxed font-light mb-6 text-justify">
                              {card.content}
                            </p>

                            {card.url && (
                              <div className="flex justify-between items-center border-t border-dashed border-[#1A1A1A]/20 pt-4">
                                <span className="font-mono text-xs uppercase text-[#1A1A1A]/40">{card.source || "Source"}</span>
                                <a 
                                  href={card.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-bold text-sm flex items-center gap-2 hover:underline decoration-2 underline-offset-4 decoration-[#FF4D00]"
                                >
                                  READ STORY
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </a>
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                      
                      {!data?.cards && (
                        <div className="py-20 text-center font-mono text-[#1A1A1A]/40">
                          NO SIGNAL DETECTED.
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}