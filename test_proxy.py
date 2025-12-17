import requests

# 这里填你确认过的 7897
proxies = {
    "http": "http://127.0.0.1:7897",
    "https": "http://127.0.0.1:7897"
}

try:
    print("正在尝试连接 Google...")
    resp = requests.get("https://www.google.com", proxies=proxies, timeout=5)
    print(f"✅ 连接成功！状态码: {resp.status_code}")
except Exception as e:
    print(f"❌ 连接失败: {e}")