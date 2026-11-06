import json
import re

with open('data/crawled_articles.json', encoding='utf-8') as f:
    articles = json.load(f)

with open('data/all_bbs_candidates.json', encoding='utf-8') as f:
    candidates = {str(c['id']): c for c in json.load(f)}

empty_title_articles = []
for i, a in enumerate(articles):
    title = a.get('title', '').strip()
    if not title:
        url = a.get('sourceUrl', '')
        art_id = url.split('/')[-1]
        cand = candidates.get(art_id, {})
        empty_title_articles.append((i, art_id, cand.get('title', ''), a.get('summary', '')))

print(f"Found {len(empty_title_articles)} empty title articles:")
for idx, art_id, cand_title, summary in empty_title_articles:
    print(f"[{art_id}] Cand title: {cand_title} | Summary: {summary[:50]}")
