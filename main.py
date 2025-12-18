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
import re # 用于提取图片

# ================= 1. 配置区 =================
load_dotenv()
# os.environ["HTTP_PROXY"] = "http://127.0.0.1:7897" # 你的VPN端口
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

# ================= 2. 扩充后的信源 (更稳定) =================
RSS_SOURCES = {
    "政治": [
        "https://www.zaobao.com.sg/rss/news/china",       # 联合早报
        "http://feeds.bbci.co.uk/news/world/rss.xml",      # BBC
        "http://rss.sina.com.cn/news/china/focus15.xml"   # 新浪国内要闻 (量大管饱)
    ],
    "经济": [
        "http://www.caixin.com/rss/finance.xml",          # 财新
        "https://www.yicai.com/rss/toutiao.xml",           # 第一财经
        "http://rss.sina.com.cn/news/finance/chinalist.xml", # 新浪财经 (补充源)
        "https://feed.36kr.com/tags/finance"                # 36氪金融
    ],
    "科技": [
        "https://www.36kr.com/feed",                      # 36Kr
        "https://sspai.com/feed",                         # 少数派
        "https://www.huxiu.com/rss/0.xml"                 # 虎嗅 (高质量科技评论)
    ],
    "AI": [
        "https://www.jiqizhixin.com/rss",                 # 机器之心
        "https://www.qbitai.com/feed",                    # 量子位
        "https://rsshub.app/36kr/search/article/AI"       # 36Kr AI标签 (备用)
    ]
}

# ================= 3. 图片兜底库 (如果抓不到图，从这里随机选) =================
FALLBACK_IMAGES = {
    "政治": [
        "https://images.unsplash.com/photo-1529101091760-6149d4c46b29?w=800&q=80",
        "https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=800&q=80",
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80"
    ],
    "经济": [
        "https://images.unsplash.com/photo-1611974765270-ca1258634369?w=800&q=80",
        "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80",
        "https://images.unsplash.com/photo-1526304640152-d4619684e484?w=800&q=80"
    ],
    "科技": [
        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
        "https://images.unsplash.com/photo-1531297424005-063400c61634?w=800&q=80"
    ],
    "AI": [
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
        "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",
        "https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&q=80"
    ],
    "段子": [
        "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&q=80",
        "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&q=80"
    ]
}

# ================= 4. 核心工具函数 =================

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

def extract_image(entry):
    """尝试从 RSS 条目中提取图片 URL"""
    # 1. 尝试 media_content
    if 'media_content' in entry:
        return entry.media_content[0]['url']
    # 2. 尝试 links
    if 'links' in entry:
        for link in entry.links:
            if 'image' in link.type:
                return link.href
    # 3. 尝试从 description 的 HTML 中找 <img src="...">
    if 'summary' in entry:
        match = re.search(r'src="(http.*?jpg|png|jpeg)"', entry.summary)
        if match:
            return match.group(1)
    return None

def get_random_image(category):
    """如果没抓到图，随机发一张好看的"""
    images = FALLBACK_IMAGES.get(category, FALLBACK_IMAGES["科技"])
    return random.choice(images)

# --- 智能 AI 调用 ---
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
        print(f"     ⚠️ Gemini 失败 ({e})，切换 Qwen...")
        try:
            # 关代理调 Qwen
            proxies = os.environ.copy()
            if "HTTP_PROXY" in os.environ: del os.environ["http://127.0.0.1:7897"]
            if "HTTPS_PROXY" in os.environ: del os.environ["http://127.0.0.1:7897"]
            
            response = dashscope.Generation.call(
                model=dashscope.Generation.Models.qwen_turbo,
                prompt=prompt
            )
            # 恢复代理
            os.environ["HTTP_PROXY"] = "http://127.0.0.1:7897"
            os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7897"

            if response.status_code == HTTPStatus.OK:
                text = response.output.text.strip()
                if return_json:
                    clean = text.replace("```json", "").replace("```", "").strip()
                    return json.loads(clean)
                return text
        except:
            return None

# ================= 5. 业务逻辑 =================

def generate_daily_quote():
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print("✨ 生成今日哲理...")
    if supabase.table("daily_quotes").select("id").eq("date", today_str).execute().data:
        print("   已存在，跳过")
        return

    prompt = f"""
    今天是 {today_str}。请生成一条内容：
    1. 历史上的今天发生的深意事件。
    2. 或一句富有哲理的名人名言。
    要求：JSON格式 {{"content": "内容+解读", "author": "作者/事件"}}，150字内。
    """
    data = call_ai_smart(prompt, return_json=True)
    if data:
        supabase.table("daily_quotes").insert({
            "date": today_str, "content": data.get("content"), "author": data.get("author")
        }).execute()
        print("   ✅ 哲理入库")

def generate_category_cards(category):
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print(f"\n📂 处理分类: {category} ...")

    materials = []
    # 用于临时存储图片映射 {标题: 图片URL}
    image_map = {} 

    if category == "段子":
        # 升级版段子提示词
        prompt_sys = """
        你是一个犀利的脱口秀演员。请创作5个段子。
        要求：
        1. 包含：职场吐槽、科技圈怪现状、或者生活神回复。
        2. 风格：要好笑、稍微带点讽刺、拒绝老梗。
        3. 格式：每个段子独立成段。
        """
        # 段子不需要抓取 RSS
    else:
        feeds = RSS_SOURCES.get(category, [])
        count = 0
        for url in feeds:
            feed = fetch_rss_with_headers(url)
            if feed and feed.entries:
                for entry in feed.entries[:4]: # 每个源多取点，防止重复
                    title = entry.title
                    # 尝试提取图片，提取不到就用兜底图
                    img = extract_image(entry) or get_random_image(category)
                    image_map[title] = img
                    
                    materials.append(f"标题：{title}\n链接：{entry.link}\n摘要：{clean_text(entry.get('summary',''))}")
                    count += 1
        
        if not materials:
            print("   ⚠️ 无素材，跳过")
            return
        
        random.shuffle(materials)
        materials = materials[:12] # 给 AI 喂12条
        prompt_sys = f"你是一个新闻编辑。根据素材总结5条最有价值的【{category}】新闻。每条300字，客观简明。"

    # 构建 Prompt
    prompt = f"""
    {prompt_sys}
    
    【重要】请严格返回 JSON 数组格式，不要 Markdown。
    格式：
    [
        {{"title": "原标题(必须与素材中一致)", "content": "300字摘要...", "url": "原始链接", "source": "来源媒体"}}
    ]
    
    素材如下：
    {chr(10).join(materials)}
    """

    cards_json = call_ai_smart(prompt, return_json=True)
    
    if cards_json:
        # 后处理：把我们刚才在 Python 里准备好的图片塞进去
        final_cards = []
        for card in cards_json:
            # 尝试通过标题匹配图片 (模糊匹配，只要标题包含原标题的一部分即可)
            # 如果是段子，直接随机配图
            if category == "段子":
                card['image'] = get_random_image("段子")
            else:
                # 默认图
                card['image'] = get_random_image(category)
                # 尝试找回真实图
                for raw_title, raw_img in image_map.items():
                    if card.get('title') and (card['title'] in raw_title or raw_title in card['title']):
                        card['image'] = raw_img
                        break
            
            final_cards.append(card)

        # 存入数据库
        supabase.table("daily_briefs").insert({
            "date": today_str,
            "category": category,
            "cards": final_cards
        }).execute()
        print(f"   ✅ [{category}] 卡片入库成功 (含图片)")
        time.sleep(5)

def generate_home_summary():
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print("\n🏠 生成首页总结...")
    
    all_materials = []
    for cat, feeds in RSS_SOURCES.items():
        for url in feeds:
            feed = fetch_rss_with_headers(url)
            if feed and feed.entries:
                all_materials.append(f"[{cat}] {feed.entries[0].title}")
    
    if not all_materials: return

    prompt = f"""
    今天是 {today_str}。根据以下标题写一段200字的全站综述。
    要求：有深度、精辟、适合做导读。只返回纯文本。
    素材：{chr(10).join(all_materials[:15])}
    """
    
    summary = call_ai_smart(prompt)
    if summary:
        supabase.table("daily_briefs").insert({
            "date": today_str, "category": "首页", "summary": summary
        }).execute()
        print("   ✅ 首页总结入库")

if __name__ == "__main__":
    generate_daily_quote()
    
    # 清理当天旧数据(防止重复)，可选
    # today = datetime.datetime.now().strftime('%Y-%m-%d')
    # supabase.table("daily_briefs").delete().eq("date", today).execute()

    for cat in RSS_SOURCES.keys():
        generate_category_cards(cat)
    generate_category_cards("段子")
    generate_home_summary()
    print("\n🎉 完成")