# 项目：Global Daily (全球日报)

## 1. 技术栈
- **前端**: Next.js (App Router) + Tailwind CSS + Lucide Icons
- **后端**: Python (本地运行) + Google Gemini (Flash) + 阿里通义千问 (备用)
- **数据库**: Supabase (PostgreSQL)
- **部署**: Vercel (前端) + GitHub (代码托管) + Namecheap (域名)

## 2. 数据库结构 (Supabase)
### 表1: daily_briefs (新闻总结)
- id, date, main_menu (一级菜单), sub_menu (二级菜单), content (AI总结), links (JSON源链接)
- 权限: RLS 开启 (Public读, Service写)

### 表2: daily_quotes (每日哲理)
- id, date, content, author
- 权限: 同上

## 3. 核心文件结构
- /main.py: 爬虫脚本 (包含双模AI切换、浏览器伪装)
- /web/app/page.tsx: 前端主页 (扁平化菜单、磨砂红风格)
- /web/.env.local: 前端环境变量
- /.env: 后端环境变量

## 4. 菜单结构
- 政治、经济、科技、AI、段子

## 5. 当前状态
- 网站已上线: www.nloneo.online
- 需要每天本地手动运行 python main.py 更新数据

## 最新数据库结构 (2025-12 Update)
Table: daily_briefs
- id: int8
- date: text (YYYY-MM-DD)
- category: text (首页, 政治, 经济, 科技, AI, 段子)
- summary: text (仅限 category='首页' 时使用，200字总结)
- cards: jsonb (仅限其他分类使用，存新闻卡片数组)
  - 结构: [{title, content, url, source}, ...]

Table: daily_quotes
- id, date, content, author