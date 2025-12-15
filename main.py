import os
import feedparser
import google.generativeai as genai
from supabase import create_client
from dotenv import load_dotenv
import datetime
import time
import json
import socket

# ================= 1. 基础配置 =================
load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY")

# 【核心重点】
# 这里的逻辑是：只要运行脚本，就全程挂上代理。
# 国内新闻会先经过 VPN 软件，VPN 软件会自动判断让它“直连”访问，不走流量。
# 国外新闻和 Gemini AI 则会走代理。
os.environ["HTTP_PROXY"] = "http://127.0.0.1:7897"
os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7897"

# 初始化
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_KEY)
model = genai.GenerativeModel('gemini-flash-latest')

# ================= 2. 定义新闻源 =================
RSS_SOURCES = {
    # ─── 国内源 (Chinese) ───
    "Tech_CN": ["https://36kr.com/feed", "https://www.ifanr.com/feed"],
    "Business_CN": ["http://www.ftchinese.com/rss/feed"],
    
    # ─── 国外源 (Global) ───
    "AI_Global": ["https://techcrunch.com/category/artificial-intelligence/feed/"],
    "Tech_Global": ["https://www.theverge.com/rss/index.xml"],
    "Business_Global": ["https://www.cnbc.com/id/10001147/device/rss/rss.html"]
}

# ================= 3. 核心逻辑 =================

def clean_html(text):
    from bs4 import BeautifulSoup
    try:
        return BeautifulSoup(text, "html.parser").get_text()[:3000]
    except:
        return text[:3000]

def process_news():
    print(f"🚀 任务启动 (VPN规则模式已接管网络)")
    print(f"{'='*40}")

    for category, feeds in RSS_SOURCES.items():
        print(f"\n📂 分类: {category}")
        
        # 判断一下是不是国内源，仅仅为了给 AI 下达不同的指令
        # 只要分类名里包含 "CN"，我们就认为是国内新闻
        is_domestic = "CN" in category 

        for feed_url in feeds:
            print(f"  └── 读取: {feed_url} ...")
            
            try:
                socket.setdefaulttimeout(15)
                feed = feedparser.parse(feed_url)
                
                if not feed.entries:
                    print("     ⚠️  空内容或读取失败")
                    continue

                for entry in feed.entries[:2]: # 每个源取前2条
                    link = entry.link
                    title_raw = entry.title

                    # 1. 数据库查重
                    try:
                        existing = supabase.table("news").select("id").eq("original_url", link).execute()
                        if existing.data:
                            print(f"     [跳过] 已存在: {title_raw[:15]}...")
                            continue
                    except Exception as e:
                        print(f"     ⚠️  查库小故障 (不影响流程): {e}")
                        continue

                    # 2. 准备发给 AI 的内容
                    content_raw = entry.get('summary', '') or entry.get('description', '')
                    clean_content = clean_html(title_raw + ". " + content_raw)

                    # 3. 动态构建 AI 指令
                    print(f"     ⚡ 呼叫 Gemini 处理...")
                    
                    if is_domestic:
                        # 国内新闻：只总结
                        prompt_sys = "你是一个专业编辑。对中文新闻进行精简摘要。要求：1.标题保持原意。2.摘要100字以内，提取核心事实。3.返回严格JSON格式 {'title': '...', 'summary': '...'}"
                    else:
                        # 国外新闻：翻译 + 总结
                        prompt_sys = "你是一个专业编辑。将英文新闻翻译并总结为中文。要求：1.标题地道中文。2.摘要100字以内。3.返回严格JSON格式 {'title': '...', 'summary': '...'}"

                    final_prompt = f"{prompt_sys}\n\n新闻内容：\n{clean_content}"

                    # 4. 调用 AI
                    try:
                        response = model.generate_content(final_prompt)
                        text_resp = response.text.replace("```json", "").replace("```", "").strip()
                        ai_data = json.loads(text_resp)
                        
                        # 5. 入库
                        new_record = {
                            "title": ai_data.get("title", title_raw),
                            "summary": ai_data.get("summary", "暂无摘要"),
                            "original_url": link,
                            "source_name": feed.feed.get('title', 'Unknown'),
                            "category": category.split('_')[0], # 去掉 _CN 或 _Global 后缀
                            "published_at": datetime.datetime.now().isoformat(),
                            "status": "pending",
                            "image_url": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80"
                        }
                        
                        supabase.table("news").insert(new_record).execute()
                        print(f"     ✅ 入库成功: {ai_data.get('title')[:15]}...")
                        
                        time.sleep(10) # 稍微歇一会，防封

                    except Exception as e:
                        print(f"     ❌ AI处理或入库失败: {e}")
                        continue

            except Exception as e:
                print(f"  ❌ 读取源失败: {e}")
                continue

    print(f"\n🎉 全部完成！请去 Supabase 查看数据。")

if __name__ == "__main__":
    process_news()