'use client';

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORIES = ["政治", "经济", "科技", "AI", "段子"];

export default function Home() {
  const [activeTab, setActiveTab] = useState("科技");
  const [quote, setQuote] = useState<any>(null);
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. 获取顶部的哲理/历史
  useEffect(() => {
    async function fetchQuote() {
      const { data } = await supabase
        .from('daily_quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) setQuote(data);
    }
    fetchQuote();
  }, []);

  // 2. 获取底部的新闻
  useEffect(() => {
    async function fetchNews() {
      setLoading(true);
      const { data } = await supabase
        .from('daily_briefs')
        .select('*')
        .eq('sub_menu', activeTab)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) setNews(data[0]);
      else setNews(null);
      setLoading(false);
    }
    fetchNews();
  }, [activeTab]);

  const today = new Date();

  return (
    // 全局背景：高级渐变色 (莫兰迪色系：极淡紫 -> 极淡蓝)
    <div className="min-h-screen bg-gradient-to-br from-[#fdfbfb] via-[#ebedee] to-[#f3e7e9] font-sans text-slate-800 pb-10">
      
      <div className="max-w-md mx-auto min-h-screen bg-white/40 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* === Part 1: 顶部哲理区 === */}
        <header className="pt-12 pb-8 px-6 text-center relative z-10">
          {/* 日期装饰 */}
          <div className="inline-block mb-4 px-3 py-1 rounded-full border border-slate-300/50 bg-white/50 text-xs font-mono text-slate-500 shadow-sm">
            {format(today, 'yyyy年MM月dd日 · EEEE', { locale: zhCN })}
          </div>

          {/* 标题 */}
          <h1 className="text-xl font-serif font-bold text-slate-800 tracking-widest mb-6">
            见过什么道理<br/>便住此山
          </h1>

          {/* 哲理卡片 */}
          <div className="bg-white/60 p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 backdrop-blur-sm">
            {quote ? (
              <>
                <p className="text-sm md:text-base leading-relaxed text-slate-700 font-light mb-4">
                  “{quote.content}”
                </p>
                <div className="text-right text-xs text-slate-400 font-bold uppercase tracking-widest">
                  — {quote.author}
                </div>
              </>
            ) : (
              <div className="h-20 flex items-center justify-center text-slate-400 text-xs animate-pulse">
                正在寻找今日灵感...
              </div>
            )}
          </div>
        </header>

        {/* === 分割线 === */}
        <div className="px-6 flex items-center gap-4 opacity-50">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1"></div>
          <div className="text-[10px] text-slate-400 tracking-[0.2em] uppercase">Daily Brief</div>
          <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1"></div>
        </div>

        {/* === 菜单栏 (Sticky吸顶) === */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20 px-2 py-3 mt-4">
          <div className="flex justify-between items-center px-2 overflow-x-auto no-scrollbar gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex-1 min-w-[60px] py-2 rounded-lg text-sm font-bold transition-all duration-300 relative overflow-hidden group
                  ${activeTab === cat 
                    ? 'text-white shadow-lg shadow-blue-500/30 scale-105' 
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                  }`}
              >
                {/* 选中态的背景渐变 */}
                {activeTab === cat && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 -z-10"></div>
                )}
                {cat}
              </button>
            ))}
          </div>
        </nav>

        {/* === Part 2: 下部 AI 总结区 === */}
        <main className="flex-1 p-6 relative">
          {loading ? (
            <div className="space-y-4 animate-pulse pt-4">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            </div>
          ) : news ? (
            <div className="animate-fade-in-up">
              {/* 内容卡片 */}
              <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-7 font-light text-justify">
                {/* 简单的 Markdown 渲染替代方案：直接显示文本，保留换行 */}
                <div className="whitespace-pre-wrap">{news.content}</div>
              </div>

              {/* 底部链接卡片 */}
              {activeTab !== "段子" && (
                <div className="mt-8 pt-6 border-t border-slate-200/60">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Original Sources</span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {news.links?.map((link: any, idx: number) => (
                      <a 
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer"
                      >
                        <span className="text-xs font-medium text-slate-700 truncate max-w-[240px] group-hover:text-blue-700 transition-colors">
                          {link.title || "点击查看相关报道源文"}
                        </span>
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                           <svg className="w-3 h-3 text-blue-600 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                           </svg>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <span className="text-4xl mb-2">🍃</span>
              <span className="text-xs tracking-widest">今日暂无内容</span>
            </div>
          )}
        </main>

        {/* 底部装饰 */}
        <footer className="py-6 text-center">
           <div className="text-[10px] text-slate-300 font-mono">
             DESIGNED BY AI & HUMAN
           </div>
        </footer>

      </div>
    </div>
  );
}