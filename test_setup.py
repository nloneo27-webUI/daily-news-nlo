import os
import google.generativeai as genai
from dotenv import load_dotenv
os.environ["HTTP_PROXY"] = "http://127.0.0.1:7897"
os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7897"

load_dotenv()
gemini_key = os.environ.get("GEMINI_API_KEY")

if not gemini_key:
    print("❌ 错误: 没找到 GEMINI_API_KEY")
else:
    print("🔍 正在连接 Google 查询可用模型菜单...")
    try:
        genai.configure(api_key=gemini_key)
        
        # 获取所有支持生成内容的模型
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                available_models.append(m.name)
                print(f"✅ 发现可用模型: {m.name}")
        
        if not available_models:
            print("❌ 奇怪，没有发现任何可用模型。可能是 API Key 权限没开通。")
        else:
            print("\n🎉 查询完成！请告诉大师你看到了哪个模型名字。")
            
    except Exception as e:
        print(f"❌ 连接失败: {e}")