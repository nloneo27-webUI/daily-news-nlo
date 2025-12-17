import os
import feedparser
import google.generativeai as genai
from supabase import create_client
from dotenv import load_dotenv
import datetime
import time
import json
import requests
import random
import dashscope
from http import HTTPStatus

# ================= 配置区 =================
load_dotenv()
# os.environ["HTTP_PROXY"] = "http://127.0.0.1:7897" 
# os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7897"

supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))
# 引入 transport 模块
from google.api_core import client_options as client_options_lib

# 配置超时时间为 10 秒 (而不是默认的 600 秒)
genai.configure(
    api_key=os.environ.get("GEMINI_API_KEY"),
    transport="rest", # 强制使用 REST 协议，有时候能解决 gRPC 连接问题
    client_options=client_options_lib.ClientOptions(
        api_endpoint="generativelanguage.googleapis.com"
    )
)
gemini_model = genai.GenerativeModel('gemini-flash-latest') 
dashscope.api_key = os.environ.get("DASHSCOPE_API_KEY")

# ================= 菜单与信源 =================
RSS_SOURCES = {
    "政治": ["https://www.zaobao.com.sg/rss/news/china", "http://feeds.bbci.co.uk/news/world/rss.xml"],
    "经济": ["http://www.caixin.com/rss/finance.xml", "https://www.yicai.com/rss/toutiao.xml"],
    "科技": ["https://www.36kr.com/feed", "https://sspai.com/feed"],
    "AI":   ["https://www.jiqizhixin.com/rss", "https://www.qbitai.com/feed"]
}

# ================= 核心工具 =================

def fetch_rss_with_headers(url):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36'}
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.encoding = 'utf-8'
        return feedparser.parse(response.content)
    except:
        return None

def clean_text(text):
    from bs4 import BeautifulSoup
    try:
        return BeautifulSoup(text, "html.parser").get_text()[:300]
    except:
        return text[:300]

# --- 智能 AI 调用 (返回文本或JSON) ---
def call_ai_smart(prompt, return_json=False):
    # 尝试 Gemini
    try:
        response = gemini_model.generate_content(prompt)
        text = response.text.strip()
        if return_json:
            clean = text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean)
        return text
    except Exception as e:
        print(f"     ⚠️ Gemini 失败 ({e})，切换阿里 Qwen...")
        # 尝试 Qwen
        try:
            proxies = os.environ.copy()
            if "HTTP_PROXY" in os.environ: del os.environ["http://127.0.0.1:7897"]
            if "HTTPS_PROXY" in os.environ: del os.environ["http://127.0.0.1:7897"]
            
            response = dashscope.Generation.call(
                model=dashscope.Generation.Models.qwen_turbo,
                prompt=prompt
            )
            # 恢复代理
            os.environ["HTTP_PROXY"] = ["http://127.0.0.1:7897"]
            os.environ["HTTPS_PROXY"] = ["http://127.0.0.1:7897"]

            if response.status_code == HTTPStatus.OK:
                text = response.output.text.strip()
                if return_json:
                    clean = text.replace("```json", "").replace("```", "").strip()
                    return json.loads(clean)
                return text
        except:
            return None

# ================= 业务逻辑 =================

# 1. 生成每日哲理 (保持不变)
def generate_daily_quote():
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print("✨ 生成今日哲理...")
    
    # 查重
    if supabase.table("daily_quotes").select("id").eq("date", today_str).execute().data:
        print("   已存在，跳过")
        return

    prompt = f"""
    今天是 {today_str}。随机生成一条内容：
    1. 历史上的今天发生的深意事件+简短评论。
    2. 或一句名人名言+深度解读。
    要求：JSON格式 {{"content": "内容+解读", "author": "作者/事件"}}，150字内。
    """
    data = call_ai_smart(prompt, return_json=True)
    if data:
        supabase.table("daily_quotes").insert({
            "date": today_str, "content": data.get("content"), "author": data.get("author")
        }).execute()
        print("   ✅ 哲理入库")

# 2. 生成【分类页】的新闻卡片 (政治/经济/科技/AI/段子)
def generate_category_cards(category):
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print(f"\n📂 处理分类卡片: {category} ...")

    # 准备素材
    materials = []
    if category == "段子":
        prompt_sys = "你是一个幽默大师。写5个好笑的段子或科技圈冷笑话。"
    else:
        feeds = RSS_SOURCES.get(category, [])
        for url in feeds:
            feed = fetch_rss_with_headers(url)
            if feed and feed.entries:
                for entry in feed.entries[:3]:
                    materials.append(f"标题：{entry.title}\n链接：{entry.link}\n摘要：{clean_text(entry.get('summary',''))}")
        
        if not materials:
            print("   ⚠️ 无素材，跳过")
            return
        
        random.shuffle(materials)
        materials = materials[:10]
        prompt_sys = f"你是一个新闻编辑。根据素材总结5条最有价值的新闻。每条新闻写300字左右的摘要，客观、简明扼要。"

    # 构建 Prompt
    prompt = f"""
    {prompt_sys}
    
    【重要】请严格返回 JSON 数组格式，不要包含 Markdown 标记。
    格式示例：
    [
        {{"title": "新闻标题1", "content": "300字摘要...", "url": "原始链接", "source": "来源媒体"}},
        {{"title": "新闻标题2", "content": "300字摘要...", "url": "原始链接", "source": "来源媒体"}}
    ]
    
    对于“段子”板块，url 和 source 可以留空。
    
    素材如下：
    {chr(10).join(materials)}
    """

    cards_json = call_ai_smart(prompt, return_json=True)
    
    if cards_json:
        # 存入数据库 (category=分类名, cards=JSON数据)
        supabase.table("daily_briefs").insert({
            "date": today_str,
            "category": category,
            "cards": cards_json
        }).execute()
        print(f"   ✅ [{category}] 卡片入库成功")
        time.sleep(5)

# 3. 生成【首页】全站总结
def generate_home_summary():
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print("\n🏠 生成首页全站总结...")
    
    # 收集全站素材（每个分类抓一点）
    all_materials = []
    for cat, feeds in RSS_SOURCES.items():
        for url in feeds:
            feed = fetch_rss_with_headers(url)
            if feed and feed.entries:
                all_materials.append(f"[{cat}] {feed.entries[0].title}")
    
    if not all_materials: return

    prompt = f"""
    今天是 {today_str}。请根据以下今日全球新闻标题，写一段高度概括的综述。
    要求：
    1. 字数200字左右。
    2. 包含政治、经济、科技等领域的关键动态。
    3. 语言精辟、有深度，适合放在首页作为“今日导读”。
    4. 只返回纯文本。
    
    素材：
    {chr(10).join(all_materials[:15])}
    """
    
    summary = call_ai_smart(prompt, return_json=False)
    if summary:
        supabase.table("daily_briefs").insert({
            "date": today_str,
            "category": "首页",
            "summary": summary
        }).execute()
        print("   ✅ 首页总结入库成功")

if __name__ == "__main__":
    generate_daily_quote()
    
    # 先生成各个子版块
    for cat in RSS_SOURCES.keys():
        generate_category_cards(cat)
    generate_category_cards("段子")
    
    # 最后生成首页
    generate_home_summary()
    print("\n🎉 全部完成")