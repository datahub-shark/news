import requests
import re

r = requests.get('https://bbs.robomaster.com/forum', headers={'User-Agent': 'Mozilla/5.0'})
scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', r.text)
print(f"Total scripts: {len(scripts)}")

for js_url in scripts:
    try:
        res = requests.get(js_url, timeout=5)
        matches = set(re.findall(r'["\'](/[a-zA-Z0-9_\-]+/(?:article|post|topic|bbs|comment)[^"\']*)["\']', res.text))
        if matches:
            print(f"Matched in {js_url[-25:]}:", matches)
        base = re.findall(r'baseURL:\s*["\']([^"\']+)["\']', res.text)
        if base:
            print(f"baseURL in {js_url[-25:]}:", base)
    except Exception as e:
        pass
