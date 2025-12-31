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
from openai import OpenAI
import re
import urllib.parse

# ================= 1. 配置区 =================
load_dotenv()

supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel('gemini-flash-latest')

deepseek_client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"), 
    base_url="https://api.deepseek.com"
)

dashscope.api_key = os.environ.get("DASHSCOPE_API_KEY")

# 本地运行时使用代理，GitHub Actions 上运行时不需要
# 我们通过检查是否有 'GITHUB_ACTIONS' 环境变量来判断
IS_GITHUB_ACTIONS = os.getenv("GITHUB_ACTIONS") == "true"
PROXY_PORT = "7897"

# ================= 2. 优化后的 RSS 源 =================
RSS_SOURCES = {
    "政治": [
        "https://www.chinanews.com.cn/rss/scroll-news.xml", # 中新网 (稳)
        "http://feeds.bbci.co.uk/news/world/rss.xml",       # BBC (GitHub Actions上能抓)
        "https://rsshub.app/zaobao/realtime/china"          # 联合早报 (RSSHub版，更易抓)
    ],
    "经济": [
        "http://www.ftchinese.com/rss/news",                # FT
        "https://rsshub.app/wallstreetcn/news/global",      # 华尔街见闻
        "http://rss.sina.com.cn/news/finance/chinalist.xml" # 新浪
    ],
    "科技": [
        "https://www.36kr.com/feed",
        "https://sspai.com/feed",
        "https://rsshub.app/36kr/newsflashes"               # 36Kr 快讯
    ],
    "AI": [
        "https://www.jiqizhixin.com/rss",
        "https://rsshub.app/36kr/search/article/AI",
        "https://www.qbitai.com/feed"
    ]
}

# ================= 3. 工具函数 =================

def set_proxy(enable=True):
    """GitHub Actions 上禁用代理，本地根据需要开启"""
    if IS_GITHUB_ACTIONS:
        return # 云端环境自带梯子，不需要设代理

    proxy_url = f"http://127.0.0.1:{PROXY_PORT}"
    if enable:
        os.environ["HTTP_PROXY"] = proxy_url
        os.environ["HTTPS_PROXY"] = proxy_url
    else:
        os.environ.pop("HTTP_PROXY", None)
        os.environ.pop("HTTPS_PROXY", None)

def fetch_rss_with_headers(url):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    try:
        # 策略：GitHub Actions 直接抓；本地先代理后直连
        if not IS_GITHUB_ACTIONS: set_proxy(True)
        resp = requests.get(url, headers=headers, timeout=15)
        resp.encoding = 'utf-8'
        return feedparser.parse(resp.content)
    except:
        try:
            if not IS_GITHUB_ACTIONS: set_proxy(False)
            resp = requests.get(url, headers=headers, timeout=15)
            resp.encoding = 'utf-8'
            return feedparser.parse(resp.content)
        except Exception as e:
            print(f"    ❌ 读取失败: {url}")
            return None

def clean_text(text):
    from bs4 import BeautifulSoup
    try: return BeautifulSoup(text, "html.parser").get_text()[:300]
    except: return text[:300]

def extract_image_from_entry(entry):
    """尝试提取原图"""
    try:
        if 'media_content' in entry and entry.media_content: return entry.media_content[0]['url']
        content = entry.get('summary', '') + str(entry.get('content', ''))
        match = re.search(r'<img[^>]+src=["\'](http[^"\']+)["\']', content)
        if match: return match.group(1)
    except: pass
    return None

def generate_ai_image_url(prompt_text):
    """
    使用 Pollinations.ai 生成图片
    无需 Key，免费，根据 prompt 生成
    """
    safe_prompt = urllib.parse.quote(prompt_text)
    # 样式：realistic (写实), width: 800, height: 600
    return f"https://image.pollinations.ai/prompt/{safe_prompt}?width=800&height=600&model=flux&seed={random.randint(1,1000)}"

# --- 智能 AI 调用 ---
def call_ai_smart(prompt, return_json=False):
    # Gemini
    try:
        if not IS_GITHUB_ACTIONS: set_proxy(True)
        response = gemini_model.generate_content(prompt, request_options={'timeout': 30})
        text = response.text.strip()
        if return_json: return json.loads(text.replace("```json", "").replace("```", "").strip())
        return text
    except:
        # DeepSeek
        try:
            if not IS_GITHUB_ACTIONS: set_proxy(False)
            resp = deepseek_client.chat.completions.create(model="deepseek-chat", messages=[{"role": "user", "content": prompt}], stream=False)
            text = resp.choices[0].message.content.strip()
            if return_json: return json.loads(text.replace("```json", "").replace("```", "").strip())
            return text
        except:
            # Qwen
            try:
                if not IS_GITHUB_ACTIONS: set_proxy(False)
                resp = dashscope.Generation.call(model=dashscope.Generation.Models.qwen_turbo, prompt=prompt)
                if resp.status_code == HTTPStatus.OK:
                    text = resp.output.text.strip()
                    if return_json: return json.loads(text.replace("```json", "").replace("```", "").strip())
                    return text
            except: return None

# ================= 5. 业务逻辑 =================

def generate_category_cards(category):
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print(f"\n📂 处理分类: {category} ...")

    materials = []
    image_pool = {}

    if category == "段子":
        prompt_sys = "你是一个脱口秀演员。写5个关于科技、AI、职场、生活的爆笑段子。"
    else:
        feeds = RSS_SOURCES.get(category, [])
        for url in feeds:
            feed = fetch_rss_with_headers(url)
            if not feed or not feed.entries: continue
            print(f"    ✅ 抓取: {url} - {len(feed.entries)}条")
            for entry in feed.entries[:5]: # 多抓点
                title = entry.title
                img = extract_image_from_entry(entry)
                if img: image_pool[title] = img
                materials.append(f"标题：{title}\n链接：{entry.link}\n摘要：{clean_text(entry.get('summary',''))}")

    # 如果实在没素材，如果是段子就硬写，如果是新闻就跳过
    if not materials and category != "段子":
        print("    ❌ 无素材")
        return
        
    random.shuffle(materials)
    materials = materials[:15]
    
    prompt_sys = f"你是一个资深新闻主编。挑选5条最有价值的【{category}】新闻。"

    # 【关键升级】要求 AI 返回 image_prompt (英文绘图提示词)
    prompt = f"""
    {prompt_sys}
    
    【重要】请严格返回 JSON 数组格式。
    对于每条新闻，请生成一个 `image_prompt` (英文)，描述新闻画面，用于AI绘图。
    例如： "A futuristic robot shaking hands with a human, realistic style, 8k"
    
    格式：
    [
        {{
            "title": "中文标题",
            "content": "300字中文摘要...",
            "url": "原始链接",
            "source": "来源媒体",
            "image_prompt": "An abstract 3d render of artificial intelligence neural network, blue and orange lighting"
        }}
    ]
    
    素材如下：
    {chr(10).join(materials)}
    """

    cards_json = call_ai_smart(prompt, return_json=True)
    
    if cards_json:
        final_cards = []
        for card in cards_json:
            # 1. 优先用原图 (如果能匹配到)
            has_original_image = False
            if category != "段子":
                for raw_title, raw_img in image_pool.items():
                    if card['title'][:5] in raw_title or raw_title[:5] in card['title']:
                        card['image'] = raw_img
                        has_original_image = True
                        break
            
            # 2. 如果没有原图，或者板块是段子，使用 AI 生成图
            if not has_original_image:
                img_prompt = card.get('image_prompt', f"{category} news abstract concept art")
                # 拼接 Pollinations URL
                card['image'] = generate_ai_image_url(img_prompt)
            
            final_cards.append(card)

        # 删掉今天的旧数据，防止重复
        supabase.table("daily_briefs").delete().eq("date", today_str).eq("category", category).execute()
        
        supabase.table("daily_briefs").insert({
            "date": today_str, "category": category, "cards": final_cards
        }).execute()
        print(f"   🎉 [{category}] 入库成功 (AI配图已生成)")
        time.sleep(3)

def generate_daily_quote():
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print("✨ 生成哲理...")
    # 允许每天更新覆盖
    supabase.table("daily_quotes").delete().eq("date", today_str).execute()
    
    prompt = "随机生成一句富有哲理的名人名言或历史上的今天。返回JSON: {\"content\":..., \"author\":...}"
    data = call_ai_smart(prompt, return_json=True)
    if data: supabase.table("daily_quotes").insert({"date": today_str, "content": data.get("content"), "author": data.get("author")}).execute()

def generate_home_summary():
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print("\n🏠 生成首页总结...")
    supabase.table("daily_briefs").delete().eq("date", today_str).eq("category", "首页").execute()
    
    today = datetime.datetime.now()
    if today.month == 12 and today.day >= 24:
        prompt = f"今天是2025年12月{today.day}日。写一篇250字的【2025年终科技与世界局势评述】。只返回纯文本。"
    else:
        prompt = "写一段200字的今日全球新闻综述。"
    
    summary = call_ai_smart(prompt)
    if summary:
        supabase.table("daily_briefs").insert({"date": today_str, "category": "首页", "summary": summary}).execute()

if __name__ == "__main__":
    generate_daily_quote()
    for cat in ["政治", "经济", "科技", "AI", "段子"]: generate_category_cards(cat)
    generate_home_summary()
    print("\n🚀 全部完成！")