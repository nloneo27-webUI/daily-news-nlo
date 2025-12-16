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
import dashscope # 阿里模型库
from http import HTTPStatus

# ================= 1. 配置区 =================
load_dotenv()

# 代理设置 (Google需要)
os.environ["HTTP_PROXY"] = "http://127.0.0.1:7897"
os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7897"

# 初始化 Supabase
supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

# 初始化 Google Gemini (主力)
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
# 使用昨天测试通过的别名，防止404
gemini_model = genai.GenerativeModel('gemini-flash-latest') 

# 初始化 阿里通义千问 (备胎)
dashscope.api_key = os.environ.get("DASHSCOPE_API_KEY")

# ================= 2. 扁平化菜单结构 =================
MENU_STRUCTURE = {
    "政治": [
        "https://www.zaobao.com.sg/rss/news/china",       # 联合早报
        "http://feeds.bbci.co.uk/news/world/rss.xml",      # BBC
        "http://rss.sina.com.cn/news/china/focus15.xml"   # 新浪
    ],
    "经济": [
        "http://www.caixin.com/rss/finance.xml",          # 财新
        "https://www.yicai.com/rss/toutiao.xml",           # 第一财经
        "https://www.cnbc.com/id/10000664/device/rss/rss.html"
    ],
    "科技": [
        "https://www.36kr.com/feed",                      # 36Kr
        "https://www.theverge.com/rss/index.xml",         # The Verge
        "https://sspai.com/feed"                          # 少数派
    ],
    "AI": [
        "https://www.jiqizhixin.com/rss",                 # 机器之心
        "https://techcrunch.com/category/artificial-intelligence/feed/",
        "https://www.qbitai.com/feed"
    ],
    "段子": [] # AI 创作
}

# ================= 3. 核心工具函数 =================

def fetch_rss_with_headers(url):
    """伪装浏览器抓取 RSS (解决无素材问题)"""
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    try:
        # 设置15秒超时
        response = requests.get(url, headers=headers, timeout=15)
        response.encoding = 'utf-8'
        return feedparser.parse(response.content)
    except Exception as e:
        print(f"    ⚠️ 网络抓取失败: {e}")
        return None

def clean_text(text):
    from bs4 import BeautifulSoup
    try:
        return BeautifulSoup(text, "html.parser").get_text()[:300]
    except:
        return text[:300]

# --- 智能 AI 调用函数 (包含备胎逻辑) ---
def call_ai_smart(prompt, return_json=False):
    """
    尝试调用 Gemini，如果失败自动切换到阿里 Qwen
    return_json: 是否强制要求返回 JSON 格式
    """
    # 1. 尝试 Gemini
    try:
        # print("     🤖 呼叫 Google Gemini...")
        response = gemini_model.generate_content(prompt)
        text = response.text.strip()
        # 如果需要JSON，尝试解析一下，解析失败也算失败，转给阿里
        if return_json:
            clean_json = text.replace("```json", "").replace("```", "").strip()
            json.loads(clean_json) # 测试解析
        return text
    
    except Exception as e:
        print(f"     ⚠️ Gemini 遇到困难 ({e})，切换阿里通义千问...")
        
        # 2. 切换 Qwen (备胎)
        try:
            # 临时关闭代理，因为阿里在国内直连更快
            proxies = os.environ.copy()
            if "HTTP_PROXY" in os.environ: del os.environ["HTTP_PROXY"]
            if "HTTPS_PROXY" in os.environ: del os.environ["HTTPS_PROXY"]
            
            response = dashscope.Generation.call(
                model=dashscope.Generation.Models.qwen_turbo,
                prompt=prompt
            )
            
            # 恢复代理
            os.environ["HTTP_PROXY"] = "http://127.0.0.1:7897"
            os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7897"

            if response.status_code == HTTPStatus.OK:
                return response.output.text.strip()
            else:
                print(f"     ❌ 阿里 Qwen 也报错了: {response.message}")
                return None
        except Exception as qwen_e:
            print(f"     ❌ 备用模型调用失败: {qwen_e}")
            return None

# ================= 4. 业务逻辑 =================

# --- 生成每日哲理 ---
def generate_daily_quote():
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print("✨ 正在生成今日哲理/历史 (双模版)...")
    
    # 查重
    existing = supabase.table("daily_quotes").select("id").eq("date", today_str).execute()
    if existing.data:
        print("   已存在，跳过。")
        return

    prompt = f"""
    今天是 {today_str}。请随机生成一个富有哲理的内容。
    可以是以下两种之一（随机选一个）：
    1. 历史上的今天发生的有趣或有深意的事情，并附带简短评论。
    2. 一句名人名言，并附带富有深度的现代解读。
    
    要求：
    - 严格返回 JSON 格式，不要多余废话：{{"content": "主要内容", "author": "作者或历史事件标题"}}
    - 字数控制在 150 字以内。
    - 语气优美、有启发性。
    """
    
    result_text = call_ai_smart(prompt, return_json=True)
    
    if result_text:
        try:
            clean_text = result_text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            
            supabase.table("daily_quotes").insert({
                "date": today_str,
                "content": data.get("content"),
                "author": data.get("author", "历史上的今天")
            }).execute()
            print("   ✅ 哲理入库成功")
        except Exception as e:
            print(f"   ❌ 哲理格式解析失败: {e}")

# --- 生成新闻板块 ---
def generate_news_brief(category, feeds):
    print(f"\n📂 处理板块: {category} ...")
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    
    if category == "段子":
        prompt = """
        请写一段“每日一笑”。
        要求：收集3-5个好笑的段子、神回复或者职场/科技圈冷笑话。
        风格：幽默、通俗、解压。
        总字数：300字左右。
        """
        links_data = []
    else:
        # 抓取新闻
        articles = []
        for url in feeds:
            print(f"   读取: {url} ...")
            feed = fetch_rss_with_headers(url) # 使用带伪装的抓取
            if feed and feed.entries:
                for entry in feed.entries[:3]:
                    title = entry.title
                    desc = clean_text(entry.get('summary', '') or entry.get('description', ''))
                    articles.append(f"标题：{title}\n内容：{desc}")
        
        if not articles:
            print("   ⚠️ 无有效素材，跳过")
            return

        # 随机打乱并截取，防止每次都一样
        random.shuffle(articles)
        combined_text = "\n\n".join(articles[:8]) 
        
        prompt = f"""
        你是一个专业主编。请根据以下素材，写一篇【{category}】板块的简报。
        
        要求：
        1. 挑选最重要的5件事（素材不足则全写）。
        2. 将它们融合成一篇通顺、有深度的文章（约300-400字）。
        3. 每段之间逻辑清晰。如果是科技产品，重点介绍功能。
        4. 语气现代、简洁、专业。
        5. 只返回纯文本。
        
        素材：
        {combined_text}
        """
        # 记录第一条链接作为参考（如果有的话）
        links_data = [{"title": "点击查看今日相关热门源文", "url": feeds[0]}] if feeds else []

    # 调用 AI (自动双模切换)
    content = call_ai_smart(prompt)
    
    if content:
        # 入库 (main_menu 固定为 '全站' 以适配新逻辑)
        data = {
            "date": today_str,
            "main_menu": "全站",
            "sub_menu": category,
            "content": content,
            "links": links_data
        }
        supabase.table("daily_briefs").insert(data).execute()
        print(f"   ✅ [{category}] 入库成功")
        
        print("   ☕ 休息 10 秒...")
        time.sleep(10)

# ================= 主程序 =================
if __name__ == "__main__":
    generate_daily_quote()
    for cat, feeds in MENU_STRUCTURE.items():
        generate_news_brief(cat, feeds)
    print("\n🎉 所有任务执行完毕！")