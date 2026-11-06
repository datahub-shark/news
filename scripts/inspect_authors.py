import json
import re

with open('data/crawled_articles.json', encoding='utf-8') as f:
    articles = json.load(f)

weird_authors = []
for i, a in enumerate(articles):
    author = a.get('author', '')
    if any(k in author for k in ['通讯信息', '关于作者', '关注Ta', 'QQ', 'qq', '微信', 'wx', '电话', '邮箱', 'http', '@']):
        weird_authors.append((i, a.get('sourceUrl'), author))

print(f"Total authors needing clean-up: {len(weird_authors)}")
for i, u, auth in weird_authors[:15]:
    print(f"[{u.split('/')[-1]}] {auth}")
