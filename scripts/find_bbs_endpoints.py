import requests
import re
import json

r = requests.get('https://bbs.robomaster.com/article', headers={'User-Agent': 'Mozilla/5.0'})
scripts = re.findall(r'src=["\']([^"\']+\.js)["\']', r.text)
print('Found scripts:', len(scripts))

for s in scripts:
    s_url = s if s.startswith('http') else 'https://bbs.robomaster.com' + s
    try:
        s_res = requests.get(s_url, timeout=5)
        endpoints = re.findall(r'["\'](/[^"\']*(?:article|post|list|forum)[^"\']*)["\']', s_res.text)
        if endpoints:
            print(f'Script {s_url[-30:]} endpoints:', set(endpoints[:5]))
    except Exception as e:
        pass
