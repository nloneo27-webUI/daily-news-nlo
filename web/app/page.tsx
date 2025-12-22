'use client';

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

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
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const today = new Date();

  useEffect(() => {
    async function fetchQuote() {
      const { data } = await supabase.from('daily_quotes').select('*').order('created_at', { ascending: false }).limit(1).single();
      if (data) setQuote(data);
    }
    fetchQuote();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      const { data } = await supabase.from('daily_briefs').select('*').eq('category', activeTab).order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) setData(data[0]);
      else setData(null);
      setLoading(false);
    }
    fetchData();
  }, [activeTab]);

  const handleSpeak = (text: string, index: number) => {
    if (typeof window === 'undefined') return;
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;
    utterance.onend = () => setSpeakingIndex(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingIndex(index);
  };

  return (
    <div className="min-h-screen bg-[#F2F0E9] text-[#1A1A1A] font-sans selection:bg-[#FF4D00] selection:text-white relative">
      <div className="bg-noise opacity-60"></div>
      
      {/* 装饰背景 */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-[#FF4D00] to-[#FFD700] rounded-full blur-[120px] opacity-15 mix-blend-multiply animate-float -z-10"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-[#FF4D00] to-[#FF8800] rounded-full blur-[100px] opacity-10 mix-blend-multiply -z-10"></div>

      <div className="flex flex-col md:flex-row h-screen relative z-10">
        {/* 侧边栏 */}
        <aside className="w-full md:w-24 md:h-screen flex-shrink-0 bg-[#1A1A1A] text-[#F2F0E9] flex md:flex-col justify-between items-center py-4 md:py-8 px-4 border-r border-black sticky top-0 z-50">
          <div className="font-serif font-black text-xl md:text-3xl tracking-tighter md:writing-vertical-lr rotate-180 md:rotate-0">GLOBAL DAILY</div>
          <nav className="flex md:flex-col gap-6 md:gap-8 overflow-x-auto md:overflow-visible no-scrollbar">
            {MENU_ITEMS.map((item) => (
              <button key={item} onClick={() => setActiveTab(item)} className={`text-xs md:text-sm font-bold uppercase tracking-widest transition-all duration-300 relative group ${activeTab === item ? 'text-[#FF4D00]' : 'text-gray-500 hover:text-white'}`}>
                <span className="md:writing-vertical-lr md:rotate-180">{item}</span>
                {activeTab === item && <span className="absolute -bottom-2 md:bottom-auto md:-right-3 left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 w-1 h-1 bg-[#FF4D00] rounded-full"></span>}
              </button>
            ))}
          </nav>
          <div className="hidden md:block text-[10px] font-mono opacity-50 rotate-180 writing-vertical-lr">{format(today, 'yyyy.MM.dd')}</div>
        </aside>

        {/* 主内容 */}
        <main className="flex-1 overflow-y-auto p-4 md:p-12 lg:p-20 scroll-smooth">
          <div className="max-w-4xl mx-auto">
            {/* 手机日期 */}
            <div className="md:hidden flex justify-between items-center mb-8 border-b border-black/10 pb-4">
              <span className="font-mono text-xs">{format(today, 'yyyy.MM.dd')}</span>
              <span className="font-serif italic font-bold text-[#FF4D00]">{activeTab}</span>
            </div>

            {loading ? (
              <div className="h-[60vh] flex flex-col items-center justify-center"><div className="text-6xl md:text-8xl font-black animate-pulse opacity-10">LOADING</div></div>
            ) : (
              <div className="space-y-16 animate-fade-in-up">
                
                {/* 首页 */}
                {activeTab === "首页" && (
                  <>
                    <header className="border-b-4 border-black pb-8 mb-12">
                      <h1 className="text-4xl md:text-6xl font-serif font-black text-[#1A1A1A] leading-[1.1]">
                        见过什么道理<br/><span className="text-[#FF4D00]">便住此山</span>
                      </h1>
                      <div className="flex items-center gap-4 mt-4">
                        <div className="h-px bg-black w-12"></div>
                        <p className="font-mono text-sm opacity-60 tracking-widest uppercase">Seen some truth, then live in this mountain.</p>
                      </div>
                    </header>
                    {quote && (
                      <section className="relative mb-20 pl-8 md:pl-16 border-l-2 border-dashed border-gray-300">
                        <span className="absolute top-0 left-[-1rem] md:left-[-1.5rem] text-4xl bg-[#F2F0E9] text-gray-400">“</span>
                        <div>
                          <p className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold leading-tight text-[#1A1A1A] mb-6">{quote.content}</p>
                          <p className="font-mono text-sm font-bold uppercase tracking-widest text-[#FF4D00]">— {quote.author}</p>
                        </div>
                      </section>
                    )}
                    {data?.summary && (
                      <section className="bg-[#1A1A1A] text-[#F2F0E9] p-8 md:p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4D00] blur-[80px] opacity-20"></div>
                        <div className="relative z-10">
                          <h3 className="font-mono text-xs font-bold uppercase text-[#FF4D00] mb-4 flex items-center gap-2"><span className="w-2 h-2 bg-[#FF4D00] rounded-full animate-pulse"></span>AI SUMMARY</h3>
                          <div className="text-lg md:text-xl font-sans leading-relaxed text-justify opacity-90">{data.summary}</div>
                        </div>
                      </section>
                    )}
                  </>
                )}

                {/* 分类页 */}
                {activeTab !== "首页" && (
                  <div>
                    <header className="mb-12 flex items-end gap-4 border-b-4 border-black pb-4">
                      <h1 className="text-6xl md:text-8xl font-serif font-black text-[#1A1A1A]">{activeTab}</h1>
                      <span className="font-mono text-sm mb-2 opacity-60">/ NEWS FEED</span>
                    </header>

                    <div className="flex flex-col gap-12">
                      {data?.cards?.map((card: any, idx: number) => (
                        // 这里是卡片部分，我加上了图片显示逻辑
                        <article key={idx} className="group flex flex-col md:flex-row gap-6 md:gap-10 border-b border-black/10 pb-12 last:border-0 relative">
                          
                          {/* 🖼️ 图片区域 (这里是你之前缺失的！) */}
                          {card.image && (
                            <div className="w-full md:w-1/3 aspect-[4/3] md:aspect-auto overflow-hidden rounded-lg border-2 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A]">
                              <img 
                                src={card.image} 
                                alt={card.title} 
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-105"
                              />
                            </div>
                          )}

                          {/* 内容区域 */}
                          <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-3">
                              <span className="font-mono text-xs font-bold text-[#FF4D00]">0{idx + 1}</span>
                              {card.source && <span className="font-mono text-xs uppercase text-gray-400">{card.source}</span>}
                            </div>
                            
                            <h3 className="text-2xl md:text-3xl font-bold mb-4 leading-tight group-hover:text-[#FF4D00] transition-colors">{card.title}</h3>
                            <p className="text-base text-gray-600 leading-relaxed font-light mb-6 text-justify flex-1">{card.content}</p>
                            
                            <div className="flex items-center justify-between">
                              {/* 听段子按钮 */}
                              {activeTab === "段子" && (
                                <button 
                                  onClick={() => handleSpeak(card.content, idx)}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all font-bold text-sm
                                    ${speakingIndex === idx 
                                      ? 'border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10' 
                                      : 'border-gray-200 text-gray-400 hover:border-[#1A1A1A] hover:text-[#1A1A1A]'
                                    }`}
                                >
                                  {speakingIndex === idx ? (
                                    <>STOP</>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-4 0-.29.27-7 7H1v6h1.71l7 7 .29.27V3.23zm-3 4.41L4.41 10H3v4h1.41l2.59 2.36V7.64z"/></svg>
                                      LISTEN
                                    </>
                                  )}
                                </button>
                              )}

                              {card.url && (
                                <a href={card.url} target="_blank" rel="noopener noreferrer" className="self-start inline-flex items-center gap-2 text-sm font-bold border-b-2 border-[#1A1A1A] pb-1 hover:border-[#FF4D00] hover:text-[#FF4D00] transition-colors">
                                  READ STORY <span className="text-lg">→</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                      {!data?.cards && <div className="text-center py-20 font-mono text-gray-400">NO DATA.</div>}
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