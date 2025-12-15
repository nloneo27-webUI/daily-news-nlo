import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

// --- 1. 初始化数据库 ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 60;

// --- 2. 样式辅助函数：流光渐变标签 ---
// 使用高饱和度的渐变色，形成视觉冲击力
function getCategoryStyle(category: string) {
  switch (category) {
    case 'AI':
      return 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-violet-200';
    case 'Tech':
      return 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-blue-200';
    case 'Business':
      return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-200';
    case 'Politics':
      return 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-200';
    default:
      return 'bg-gradient-to-r from-slate-500 to-gray-500 text-white';
  }
}

export default async function Home() {
  const { data: newsList, error } = await supabase
    .from('news')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(50);

  if (error) {
    return <div className="text-slate-500 text-center p-10">暂无数据信号...</div>;
  }

  const today = new Date();

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans selection:bg-fuchsia-100 selection:text-fuchsia-900">
      
      {/* --- 动态背景层 (核心设计：互补渐变光斑) --- */}
      <div className="fixed inset-0 -z-10">
        {/* 基础底色：极淡的浅蓝 */}
        <div className="absolute inset-0 bg-[#b9f9d9]"></div>
        
        {/* 光斑1：左上角 - 梦幻紫 (科技感) */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[100px] mix-blend-multiply animate-pulse"></div>
        
        {/* 光斑2：右下角 - 珊瑚粉 (情感温度) */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-rose-200/40 rounded-full blur-[100px] mix-blend-multiply"></div>
        
        {/* 光斑3：中间 - 天空蓝 (平衡) */}
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-sky-200/40 rounded-full blur-[80px] mix-blend-multiply opacity-70"></div>
      </div>

      {/* --- 顶部导航：全透明磨砂 --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/60 backdrop-blur-xl border-b border-white/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             {/* Logo：使用渐变文字 */}
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-rose-500">
              Global Daily.
            </h1>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-white/50 px-3 py-1 rounded-full border border-white/60 shadow-sm backdrop-blur-md">
            {format(today, 'MMM dd, yyyy')}
          </div>
        </div>
      </nav>

      {/* --- 主体内容 --- */}
      <main className="max-w-7xl mx-auto px-6 pt-28 pb-20">
        
        {/* 头部文案：衬线体，优雅高级 */}
        <header className="mb-12 text-center relative">
          <h2 className="text-5xl md:text-6xl font-serif text-slate-800 mb-4 tracking-tight">
            The World, <span className="italic text-slate-400">Curated.</span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">
            见过什么道理便住此山
          </p>
        </header>

        {/* --- 瀑布流卡片区 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsList?.map((item) => (
            <a 
              key={item.id}
              href={item.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col h-full"
            >
              {/* 卡片本体：高斯模糊 + 白色半透明 = 磨砂玻璃 */}
              <div className="absolute inset-0 bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group-hover:bg-white/80 group-hover:scale-[1.02] group-hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]"></div>
              
              <div className="relative p-6 flex flex-col h-full z-10">
                {/* 顶部标签行 */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md ${getCategoryStyle(item.category)}`}>
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-400 font-medium bg-white/50 px-2 py-1 rounded-md">
                    {format(new Date(item.published_at), 'HH:mm')}
                  </span>
                </div>

                {/* 标题：深灰，更有质感 */}
                <h3 className="text-lg font-bold text-slate-800 leading-snug mb-3 group-hover:text-violet-600 transition-colors">
                  {item.title}
                </h3>

                {/* 摘要：适度的行高 */}
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 flex-1">
                  {item.summary}
                </p>

                {/* 底部信息 */}
                <div className="pt-5 mt-4 border-t border-slate-100/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                    {item.source_name}
                  </span>
                  {/* 有趣的互补色小箭头 */}
                  <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-gradient-to-r group-hover:from-violet-500 group-hover:to-fuchsia-500 flex items-center justify-center transition-all">
                     <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

      </main>

      <footer className="text-center py-10 text-slate-400 text-xs font-medium uppercase tracking-widest border-t border-white/20">
        Designed with ❤️ & AI
      </footer>
    </div>
  );
}