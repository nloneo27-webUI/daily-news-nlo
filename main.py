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

PROXY_PORT = "7897" # 你的VPN端口

# ================= 2. 强力修复的新闻源 (解决政治空白) =================
RSS_SOURCES = {
    "政治": [
        # 换成了国内直连最稳的中新网和澎湃
        "https://www.chinanews.com.cn/rss/scroll-news.xml", 
        "https://www.thepaper.cn/rss/jsp?nodeid=25434", # 澎湃时事
        "http://feeds.bbci.co.uk/news/world/rss.xml"    # 保留一个外媒
    ],
    "经济": [
        "http://rss.sina.com.cn/news/finance/chinalist.xml",
        "https://feed.36kr.com/tags/finance",
        "https://www.ftchinese.com/rss/news"
    ],
    "科技": [
        "https://www.36kr.com/feed",
        "https://sspai.com/feed",
        "https://www.huxiu.com/rss/0.xml"
    ],
    "AI": [
        "https://www.jiqizhixin.com/rss",
        "https://www.qbitai.com/feed",
        "https://rsshub.app/36kr/search/article/AI"
    ]
}

# ================= 3. 兜底图库 (保持不变) =================
FIXED_IMAGES = {
    "政治": ["https://images.unsplash.com/photo-1529101091760-6149d4c46b29?w=800&q=80", "https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=800&q=80"],
    "经济": ["https://images.unsplash.com/photo-1611974765270-ca1258634369?w=800&q=80", "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80"],
    "科技": ["https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80"],
    "AI":   ["https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80", "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80"],
    "段子": ["https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&q=80"]
}

# ================= 4. 核心工具 =================

def set_proxy(enable=True):
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
        set_proxy(True)
        resp = requests.get(url, headers=headers, timeout=10)
        resp.encoding = 'utf-8'
        return feedparser.parse(resp.content)
    except:
        try:
            set_proxy(False) # 关代理重试
            resp = requests.get(url, headers=headers, timeout=10)
            resp.encoding = 'utf-8'
            return feedparser.parse(resp.content)
        except:
            return None

def clean_text(text):
    from bs4 import BeautifulSoup
    try:
        return BeautifulSoup(text, "html.parser").get_text()[:300]
    except:
        return text[:300]

def extract_image_from_entry(entry):
    if 'media_content' in entry and len(entry.media_content) > 0: return entry.media_content[0]['url']
    if 'links' in entry:
        for link in entry.links:
            if 'image' in link.get('type', ''): return link.href
    content = entry.get('summary', '') + entry.get('content', [{'value': ''}])[0].get('value', '')
    match = re.search(r'<img[^>]+src=["\'](http[^"\']+)["\']', content)
    if match: return match.group(1)
    return None

def get_fallback_image(category):
    images = FIXED_IMAGES.get(category, FIXED_IMAGES["科技"])
    return random.choice(images)

def is_url_seen(url):
    try:
        res = supabase.table("news_history").select("id").eq("url", url).execute()
        return len(res.data) > 0
    except: return False

def mark_url_seen(url, title):
    try:
        supabase.table("news_history").insert({"url": url, "title": title}).execute()
    except: pass

def call_ai_smart(prompt, return_json=False):
    # 1. Gemini
    try:
        set_proxy(True)
        response = gemini_model.generate_content(prompt, request_options={'timeout': 25})
        text = response.text.strip()
        if return_json: return json.loads(text.replace("```json", "").replace("```", "").strip())
        return text
    except:
        # 2. DeepSeek
        try:
            set_proxy(False)
            resp = deepseek_client.chat.completions.create(
                model="deepseek-chat", messages=[{"role": "user", "content": prompt}], stream=False
            )
            text = resp.choices[0].message.content.strip()
            if return_json: return json.loads(text.replace("```json", "").replace("```", "").strip())
            return text
        except:
            # 3. Qwen
            try:
                set_proxy(False)
                resp = dashscope.Generation.call(model=dashscope.Generation.Models.qwen_turbo, prompt=prompt)
                if resp.status_code == HTTPStatus.OK:
                    text = resp.output.text.strip()
                    if return_json: return json.loads(text.replace("```json", "").replace("```", "").strip())
                    return text
            except:
                return None

# ================= 5. 业务逻辑 (含年终策划) =================

def generate_category_cards(category):
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print(f"\n📂 处理分类: {category} ...")

    materials = []
    image_pool = {}

    if category == "段子":
        prompt_sys = "你是一个脱口秀演员。写5个关于科技、AI、职场、生活的爆笑段子，风格犀利幽默，拒绝老梗。每个段子100字左右。"
    else:
        feeds = RSS_SOURCES.get(category, [])
        for url in feeds:
            feed = fetch_rss_with_headers(url)
            if not feed or not feed.entries: continue
            
            print(f"    ✅ 抓取: {url}")
            for entry in feed.entries:
                link = entry.link
                if is_url_seen(link): continue # 去重
                
                title = entry.title
                img = extract_image_from_entry(entry)
                if img: image_pool[title] = img
                
                materials.append(f"标题：{title}\n链接：{link}\n摘要：{clean_text(entry.get('summary',''))}")
                if len(materials) >= 15: break
            if len(materials) >= 15: break

        if not materials:
            print("    ❌ 无新素材")
            return
        
        random.shuffle(materials)
        materials = materials[:12]
        prompt_sys = f"你是一个新闻编辑。挑选5条最有价值的【{category}】新闻。每条200-300字。"

    prompt = f"""
    {prompt_sys}
    请严格返回 JSON 数组格式：
    [
        {{"title": "原标题", "content": "内容...", "url": "链接", "source": "来源媒体"}}
    ]
    素材：
    {chr(10).join(materials)}
    """

    cards_json = call_ai_smart(prompt, return_json=True)
    
    if cards_json:
        final_cards = []
        for card in cards_json:
            card['image'] = get_fallback_image(category)
            if category != "段子":
                if card.get('url'): mark_url_seen(card['url'], card['title'])
                for raw_title, raw_img in image_pool.items():
                    if card['title'][:5] in raw_title or raw_title[:5] in card['title']:
                        card['image'] = raw_img
                        break
            final_cards.append(card)

        supabase.table("daily_briefs").insert({
            "date": today_str, "category": category, "cards": final_cards
        }).execute()
        print(f"   🎉 [{category}] 入库成功")
        time.sleep(3)

def generate_daily_quote():
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print("✨ 生成哲理...")
    if supabase.table("daily_quotes").select("id").eq("date", today_str).execute().data:
        return
    prompt = "随机生成一句富有哲理的名人名言或历史上的今天。返回JSON: {\"content\":..., \"author\":...}"
    data = call_ai_smart(prompt, return_json=True)
    if data:
        supabase.table("daily_quotes").insert({"date": today_str, "content": data.get("content"), "author": data.get("author")}).execute()

# --- 新增：年末特别策划逻辑 ---
def generate_home_summary():
    today = datetime.datetime.now()
    today_str = today.strftime('%Y-%m-%d')
    print("\n🏠 生成首页【年终特别版】...")

    # 判断是否是最后一天
    if today.month == 12 and today.day == 31:
        # 12月31日：年度终极总结
        prompt = f"""
        今天是2025年12月31日，这一年的最后一天。
        请作为历史记录者，写一篇【2025全球年度大事件回顾】。
        要求：
        1. 宏大叙事，回顾今年在AI、地缘政治、经济、科技领域的里程碑事件。
        2. 语气深沉、充满希望与反思。
        3. 字数300字左右。只返回纯文本。
        """
    else:
        # 平常日：随机选取年度话题
        topics = ["AI重塑世界", "全球经济震荡", "太空探索新纪元", "地缘政治格局", "气候与能源", "生物科技突破"]
        topic = random.choice(topics)
        prompt = f"""
        今天是2025年12月{today.day}日，临近年终。
        请以【2025年终评述：{topic}】为主题，写一篇深度短评。
        要求：
        1. 回顾今年该领域的关键变化。
        2. 展望2026年的趋势。
        3. 字数250字左右。
        4. 语气专业、有洞见。只返回纯文本。
        """

    summary = call_ai_smart(prompt)
    if summary:
        supabase.table("daily_briefs").insert({
            "date": today_str, "category": "首页", "summary": summary
        }).execute()
        print("   ✅ 首页年终评述入库")

if __name__ == "__main__":
    generate_daily_quote()
    for cat in ["政治", "经济", "科技", "AI", "段子"]:
        generate_category_cards(cat)
    generate_home_summary()
    print("\n🚀 全部完成！")