import os
import feedparser
import google.generativeai as genai
from supabase import create_client
from dotenv import load_dotenv
import datetime
import time
import json
import requests
import dashscope # 引入阿里模型库
from http import HTTPStatus

# ================= 1. 配置区 =================
load_dotenv()

# 代理设置 (Google需要，阿里不需要，但挂着也无所谓)
os.environ["HTTP_PROXY"] = "http://127.0.0.1:7897"
os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7897"

# 初始化 Supabase
supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

# 初始化 Google Gemini
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel('gemini-flash-latest') # 主力模型

# 初始化 阿里通义千问
dashscope.api_key = os.environ.get("DASHSCOPE_API_KEY") # 备用模型 Key

# ================= 2. 菜单结构 (保持不变) =================
MENU_STRUCTURE = {
    "国内": {
        "政治": ["https://www.zaobao.com.sg/rss/news/china", "http://rss.sina.com.cn/news/china/focus15.xml"],
        "经济": ["http://www.caixin.com/rss/finance.xml", "https://www.yicai.com/rss/toutiao.xml"],
        "科技": ["https://www.36kr.com/feed", "https://www.yicai.com/rss/kechuang.xml"],
        "AI": ["https://www.jiqizhixin.com/rss", "https://www.qbitai.com/feed"]
    },
    "国际": {
        "政治": ["http://feeds.bbci.co.uk/news/world/rss.xml"],
        "经济": ["https://www.cnbc.com/id/10000664/device/rss/rss.html"],
        "科技": ["https://www.theverge.com/rss/index.xml"],
        "AI": ["https://techcrunch.com/category/artificial-intelligence/feed/"]
    },
    "创意": {
        "科技产品": ["https://www.producthunt.com/feed"],
        "每日一笑": [] 
    }
}

# ================= 3. 核心工具函数 =================

def fetch_rss_with_headers(url):
    """伪装浏览器抓取 RSS"""
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.encoding = 'utf-8'
        return feedparser.parse(response.content)
    except Exception as e:
        print(f"    ⚠️ 网络请求失败: {e}")
        return None

def clean_text(text):
    from bs4 import BeautifulSoup
    try:
        return BeautifulSoup(text, "html.parser").get_text()[:500]
    except:
        return text[:500]

# --- 新增：专门调用阿里 Qwen 的函数 ---
def call_qwen_model(prompt):
    print("     🛡️ [备胎启动] 切换到阿里通义千问 (Qwen-Turbo)...")
    try:
        # 临时关闭代理，因为阿里在国内直连更快 (可选，不关也能通)
        # os.environ.pop("HTTP_PROXY", None)
        # os.environ.pop("HTTPS_PROXY", None)

        response = dashscope.Generation.call(
            model=dashscope.Generation.Models.qwen_turbo,
            prompt=prompt
        )
        
        # 恢复代理 (如果刚才关了的话)
        # os.environ["HTTP_PROXY"] = "http://127.0.0.1:7897"
        # os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7897"

        if response.status_code == HTTPStatus.OK:
            return response.output.text
        else:
            print(f"     ❌ Qwen 报错: {response.code} - {response.message}")
            return None
    except Exception as e:
        print(f"     ❌ Qwen 调用失败: {e}")
        return None

def generate_brief_smart(main_cat, sub_cat, articles):
    """
    智能总结函数：优先用 Gemini，失败自动切 Qwen
    """
    print(f"     ⚡ 正在生成 [{main_cat}-{sub_cat}] 的总结...")
    
    # 1. 构建 Prompt (提示词)
    if sub_cat == "每日一笑":
        prompt = "请写一段“每日一笑”，包含3个幽默段子，总字数300字左右。"
        links_data = []
    else:
        combined_text = ""
        links_data = []
        for i, art in enumerate(articles):
            combined_text += f"【新闻{i+1}】标题：{art['title']}\n内容摘要：{art['summary']}\n\n"
            links_data.append({"title": art['title'], "url": art['link']})
            
        prompt = f"""
        你是一个资深新闻主编。请根据以下 {len(articles)} 条素材，写一篇300字的综述。
        要求：不要罗列，融合成通顺文章。提炼核心观点。只返回纯文本。
        
        素材如下：
        {combined_text}
        """

    # 2. 尝试方案 A: Google Gemini
    try:
        response = gemini_model.generate_content(prompt)
        print("     ✅ Gemini 生成成功")
        return response.text.strip(), links_data
    
    except Exception as e:
        # 3. 如果 Gemini 失败 (429/500/TimeOut)，启动方案 B: Alibaba Qwen
        error_msg = str(e)
        if "429" in error_msg or "Quota" in error_msg:
            print(f"     ⚠️ Gemini 额度超限 (429)。")
        else:
            print(f"     ⚠️ Gemini 出错: {error_msg}")
        
        # 调用阿里
        qwen_text = call_qwen_model(prompt)
        if qwen_text:
            return qwen_text.strip(), links_data
        else:
            return None, []

def process_daily_news():
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    print(f"🚀 开始生成 {today_str} 的日报 (双模版)...")

    for main_menu, sub_menus in MENU_STRUCTURE.items():
        for sub_menu, feeds in sub_menus.items():
            
            print(f"\n📂 处理板块: {main_menu} > {sub_menu}")
            
            collected_articles = []
            
            # 抓取素材
            if sub_menu != "每日一笑":
                for url in feeds:
                    print(f"    正在读取: {url} ...")
                    feed = fetch_rss_with_headers(url)
                    if not feed or not feed.entries:
                        print(f"    ⚠️ 未抓取到内容")
                        continue
                    for entry in feed.entries[:3]: 
                        collected_articles.append({
                            "title": entry.title,
                            "link": entry.link,
                            "summary": clean_text(entry.get('summary', '') or entry.get('description', ''))
                        })
                
                if not collected_articles:
                    print("    ⚠️ 无素材，跳过")
                    continue
                collected_articles = collected_articles[:6]

            # 智能总结 (自动切换模型)
            summary_text, links_json = generate_brief_smart(main_menu, sub_menu, collected_articles)
            
            if summary_text:
                data = {
                    "date": today_str,
                    "main_menu": main_menu,
                    "sub_menu": sub_menu,
                    "content": summary_text,
                    "links": links_json
                }
                supabase.table("daily_briefs").insert(data).execute()
                print(f"    ✅ 入库成功！")
            
            # 即使有备胎，也稍微休息一下，保持优雅
            print("    ☕ 休息 5 秒...")
            time.sleep(5)

    print("\n🎉 全部任务完成！")

if __name__ == "__main__":
    process_daily_news()