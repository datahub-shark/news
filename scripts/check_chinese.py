import json
import re

articles = json.load(open('data/crawled_articles.json', encoding='utf-8'))
chinese_regex = re.compile(r'[\u4e00-\u9fa5]')

title_with_zh = [a for a in articles if chinese_regex.search(a.get('title', ''))]
summary_with_zh = [a for a in articles if chinese_regex.search(a.get('summary', ''))]

print(f"Total articles: {len(articles)}")
print(f"Titles with Chinese characters: {len(title_with_zh)}/{len(articles)}")
print(f"Summaries with Chinese characters: {len(summary_with_zh)}/{len(articles)}")

print("\nSample 15 titles with Chinese:")
for a in title_with_zh[:15]:
    art_id = a.get('sourceUrl', '').split('/')[-1]
    print(f"[{art_id}] {a.get('title')}")
