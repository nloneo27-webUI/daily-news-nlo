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

  const today = new Date();

  return (
    // 背景色：暖调的米白色 (Paper Color)
    <div className="min-h-screen bg-[#F2F0E9] text-[#1A1A1A] font-sans selection:bg-[#FF4D00] selection:text-white overflow-hidden relative">
      
      {/* --- 全局噪点层 --- */}
      <div className="bg-noise"></div>

      {/* --- 背景流体装饰 --- */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-[#FF4D00] to-[#FFD700] rounded-full blur-[120px] opacity-20 mix-blend-multiply animate-float -z-10"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-[#2E5CFF] to-[#00FFFF] rounded-full blur-[100px] opacity-20 mix-blend-multiply -z-10"></div>

      <div className="flex flex-col md:flex-row h-screen relative z-10">
        
        {/* === 左侧导航 === */}
        <aside className="w-full md:w-24 md:h-screen flex-shrink-0 bg-[#1A1A1A] text-[#F2F0E9] flex md:flex-col justify-between items-center py-4 md:py-8 px-4 border-r border-black">
          {/* Logo */}
          <div className="font-serif font-black text-xl md:text-3xl tracking-tighter md:writing-vertical-lr rotate-180 md:rotate-0">
            GLOBAL DAILY
          </div>

          {/* 菜单 */}
          <nav className="flex md:flex-col gap-6 md:gap-8 overflow-x-auto md:overflow-visible no-scrollbar">
            {MENU_ITEMS.map((item) => (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                className={`text-xs md:text-sm font-bold uppercase tracking-widest transition-all duration-300 relative group
                  ${activeTab === item ? 'text-[#FF4D00]' : 'text-gray-500 hover:text-white'}
                `}
              >
                <span className="md:writing-vertical-lr md:rotate-180">{item}</span>
                {activeTab === item && (
                  <span className="absolute -bottom-2 md:bottom-auto md:-right-3 left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 w-1 h-1 bg-[#FF4D00] rounded-full"></span>
                )}
              </button>
            ))}
          </nav>

          <div className="hidden md:block text-[10px] font-mono opacity-50 rotate-180 writing-vertical-lr">
            {format(today, 'yyyy.MM.dd')}
          </div>
        </aside>

        {/* === 右侧主内容区 === */}
        <main className="flex-1 overflow-y-auto p-4 md:p-12 lg:p-20 scroll-smooth">
          <div className="max-w-4xl mx-auto">
            
            {/* 顶部手机日期 */}
            <div className="md:hidden flex justify-between items-center mb-8 border-b border-black/10 pb-4">
              <span className="font-mono text-xs">{format(today, 'yyyy.MM.dd')}</span>
              <span className="font-serif italic font-bold text-[#FF4D00]">{activeTab}</span>
            </div>

            {loading ? (
              <div className="h-[60vh] flex flex-col items-center justify-center">
                <div className="text-6xl md:text-8xl font-black animate-pulse opacity-10">LOADING</div>
              </div>
            ) : (
              <div className="space-y-16 animate-fade-in-up">
                
                {/* --- 场景 A: 首页 --- */}
                {activeTab === "首页" && (
                  <>
                    {/* 0. 全站 Slogan (这里加回来了！) */}
                    <header className="border-b-4 border-black pb-8 mb-12">
                      <h1 className="text-4xl md:text-6xl font-serif font-black text-[#1A1A1A] leading-[1.1]">
                        见过什么道理<br/>
                        <span className="text-[#FF4D00]">便住此山</span>
                      </h1>
                      <div className="flex items-center gap-4 mt-4">
                        <div className="h-px bg-black w-12"></div>
                        <p className="font-mono text-sm opacity-60 tracking-widest uppercase">
                          Seen some truth, then live in this mountain.
                        </p>
                      </div>
                    </header>

                    {/* 1. 每日随机哲理 (Hero Section) */}
                    <section className="relative mb-20 pl-8 md:pl-16 border-l-2 border-dashed border-gray-300">
                      <span className="absolute top-0 left-[-1rem] md:left-[-1.5rem] text-4xl bg-[#F2F0E9] text-gray-400">“</span>
                      {quote ? (
                        <div>
                          <p className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold leading-tight text-[#1A1A1A] mb-6">
                            {quote.content}
                          </p>
                          <p className="font-mono text-sm font-bold uppercase tracking-widest text-[#FF4D00]">
                            — {quote.author}
                          </p>
                        </div>
                      ) : (
                        <p className="text-2xl font-serif opacity-50">Waiting for daily wisdom...</p>
                      )}
                    </section>

                    {/* 2. 今日全站导读 */}
                    {data?.summary && (
                      <section className="bg-[#1A1A1A] text-[#F2F0E9] p-8 md:p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4D00] blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        
                        <div className="relative z-10">
                          <h3 className="font-mono text-xs font-bold uppercase text-[#FF4D00] mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#FF4D00] rounded-full animate-pulse"></span>
                            AI SUMMARY
                          </h3>
                          <div className="text-lg md:text-xl font-sans leading-relaxed text-justify opacity-90">
                            {data.summary}
                          </div>
                        </div>
                      </section>
                    )}
                  </>
                )}

                {/* --- 场景 B: 分类页 --- */}
                {activeTab !== "首页" && (
                  <div>
                    {/* 分类标题 */}
                    <header className="mb-12 flex items-end gap-4 border-b-4 border-black pb-4">
                      <h1 className="text-6xl md:text-8xl font-serif font-black text-[#1A1A1A]">{activeTab}</h1>
                      <span className="font-mono text-sm mb-2 opacity-60">/ NEWS FEED</span>
                    </header>

                    {/* 新闻列表 */}
                    <div className="flex flex-col gap-8">
                      {data?.cards?.map((card: any, idx: number) => (
                        <article key={idx} className="group relative bg-white border-2 border-black p-6 md:p-8 hover:translate-x-2 hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_#1A1A1A] transition-all duration-300">
                          <div className="absolute top-0 right-0 bg-black text-white font-mono text-xs px-3 py-1">
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          <h3 className="text-xl md:text-2xl font-bold mb-4 group-hover:text-[#FF4D00] transition-colors leading-snug">
                            {card.title}
                          </h3>
                          <p className="text-base md:text-lg text-gray-600 leading-relaxed font-light mb-6 text-justify">
                            {card.content}
                          </p>
                          {card.url && (
                            <div className="flex justify-between items-center border-t border-dashed border-gray-300 pt-4">
                              <span className="font-mono text-xs uppercase text-gray-400">{card.source || "Source"}</span>
                              <a href={card.url} target="_blank" rel="noopener noreferrer" className="font-bold text-sm flex items-center gap-2 hover:underline decoration-2 underline-offset-4 decoration-[#FF4D00]">
                                READ FULL STORY <span className="text-lg">→</span>
                              </a>
                            </div>
                          )}
                        </article>
                      ))}
                      {!data?.cards && (
                        <div className="text-center py-20 font-mono text-gray-400">NO DATA AVAILABLE.</div>
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