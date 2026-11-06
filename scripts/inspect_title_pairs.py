import json
import re

with open('data/crawled_articles.json', encoding='utf-8') as f:
    articles = json.load(f)

with open('data/all_bbs_candidates.json', encoding='utf-8') as f:
    candidates = {str(c['id']): c for c in json.load(f)}

sample_pairs = []
for a in articles:
    art_id = a.get('sourceUrl', '').split('/')[-1]
    cand = candidates.get(art_id, {})
    cand_t = cand.get('title', '')
    cur_t = a.get('title', '')
    if len(cur_t) < 15 and len(cand_t) > 20:
        sample_pairs.append((art_id, cur_t, cand_t))

print(f"Total articles where crawled title lost technical topic: {len(sample_pairs)}")
for art_id, cur_t, cand_t in sample_pairs[:20]:
    print(f"[{art_id}] Cur: '{cur_t}' | Cand: '{cand_t}'")
