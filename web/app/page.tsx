'use client'; // 标记为客户端组件，因为我们要用交互式菜单

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

// 客户端初始化 Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 定义菜单结构 (要和 Python 里一致)
const MENU = {
  "国内": ["政治", "经济", "科技", "AI"],
  "国际": ["政治", "经济", "科技", "AI"],
  "创意": ["科技产品", "每日一笑"]
};

export default function Home() {
  const [activeMain, setActiveMain] = useState("国内");
  const [activeSub, setActiveSub] = useState("AI"); // 默认选中
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 获取数据函数
  async function fetchData(main: string, sub: string) {
    setLoading(true);
    // 获取最新的由 Python 生成的那一条
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

  // 当菜单切换时，自动抓取数据
  useEffect(() => {
    fetchData(activeMain, activeSub);
  }, [activeMain, activeSub]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-800 font-sans flex flex-col md:flex-row">
      
      {/* --- 左侧侧边栏菜单 --- */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Global Daily.
          </h1>
          <p className="text-xs text-gray-400 mt-1">AI 驱动的全球简报</p>
        </div>
        
        <nav className="p-4 space-y-8 h-[calc(100vh-100px)] overflow-y-auto">
          {Object.entries(MENU).map(([mainCategory, subCategories]) => (
            <div key={mainCategory}>
              <h3 
                onClick={() => {
                   setActiveMain(mainCategory); 
                   // 切换大类时，默认选中第一个子类
                   setActiveSub((subCategories as string[])[0]);
                }}
                className={`text-xs font-bold uppercase tracking-wider mb-3 cursor-pointer transition-colors ${activeMain === mainCategory ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {mainCategory}
              </h3>
              <div className="space-y-1">
                {(subCategories as string[]).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => {
                      setActiveMain(mainCategory);
                      setActiveSub(sub);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeMain === mainCategory && activeSub === sub
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* --- 右侧内容区 --- */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto h-screen">
        <div className="max-w-3xl mx-auto">
          
          {/* 顶部状态栏 */}
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="px-2 py-1 bg-white rounded border border-gray-200">{activeMain}</span>
                <span>/</span>
                <span className="font-bold text-gray-800">{activeSub}</span>
             </div>
             <div className="text-xs text-gray-400">
               {format(new Date(), 'yyyy-MM-dd')}
             </div>
          </div>

          {/* 内容展示区 */}
          {loading ? (
             <div className="py-20 text-center text-gray-400 animate-pulse">正在读取 AI 简报...</div>
          ) : data ? (
            <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               {/* 装饰顶条 */}
               <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
               
               <div className="p-8 md:p-10">
                 {/* AI 总结内容 */}
                 <div className="prose prose-slate max-w-none mb-10">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900">今日综述</h2>
                    <div className="text-lg leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {data.content}
                    </div>
                 </div>

                 {/* 原始链接区域 (每日一笑除外) */}
                 {activeSub !== "每日一笑" && data.links && data.links.length > 0 && (
                   <div className="bg-gray-50 rounded-xl p-6">
                     <h4 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-wider">
                       REFERENCE / 原始信源
                     </h4>
                     <ul className="space-y-3">
                       {data.links.map((link: any, index: number) => (
                         <li key={index}>
                           <a 
                             href={link.url} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-start gap-2"
                           >
                             <span className="text-gray-400 select-none">{index + 1}.</span>
                             {link.title}
                           </a>
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
               </div>
            </article>
          ) : (
            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-300">
               <div className="text-4xl mb-2">📭</div>
               <p className="text-gray-500">今日 {activeMain} - {activeSub} 板块暂无更新。</p>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}