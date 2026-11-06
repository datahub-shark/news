import json
import re
from pathlib import Path

with open('data/crawled_articles.json', encoding='utf-8') as f:
    articles = json.load(f)

with open('data/all_bbs_candidates.json', encoding='utf-8') as f:
    candidates = {str(c['id']): c for c in json.load(f)}

def clean_html_text(text):
    if not text:
        return ""
    # Remove HTML tags
    t = re.sub(r'<[^>]*>', ' ', text)
    # Decode entities
    t = t.replace('&nbsp;', ' ').replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    # Collapse whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def clean_author(raw_author):
    a = raw_author.strip()
    # Check pattern: 关于作者 <name> <digits> 关注Ta...
    m = re.match(r'关于作者\s+([^\s\d]+(?:\s+[^\s\d]+)?)\s+\d+\s+关注Ta', a)
    if m:
        return m.group(1).strip()
    
    # Check pattern: 通讯信息 ...
    if '通讯信息' in a:
        a = re.sub(r'^(?:通讯信息|联系方式)[:：\s]*', '', a)
        # Check if team or person name
        team_m = re.search(r'([\u4e00-\u9fa5A-Za-z0-9_\-]+(?:战队|实验室|团队|学院|大学))', a)
        if team_m:
            return team_m.group(1).strip()
        # Check wx / qq / email
        wx_m = re.search(r'(?:微信|wx|WX)[:：\s]*([a-zA-Z0-9_\-]+)', a)
        if wx_m and len(wx_m.group(1)) > 3:
            return wx_m.group(1).strip()
        name_m = re.search(r'([a-zA-Z][a-zA-Z0-9_\.\-]{2,20})', a)
        if name_m:
            return name_m.group(1).strip()
        return "Cộng đồng RoboMaster"
    
    if len(a) > 50 or any(bad in a.lower() for bad in ['http', 'qq群', '联系qq', '电话及微信']):
        return "Cộng đồng RoboMaster"
        
    return a or "Cộng đồng RoboMaster"

def clean_cover(url):
    if not url or not isinstance(url, str):
        return ""
    url = url.strip()
    if not url.startswith('http'):
        return ""
    if url.endswith('.gif'):
        return ""
    if any(bad in url.lower() for bad in ['avatar', 'icon', 'emoji', 'badge', 'default.0258246']):
        return ""
    return url

# Test title cleaner
for a in articles:
    art_id = a.get('sourceUrl', '').split('/')[-1]
    raw_title = a.get('title', '').strip()
    cand_title = candidates.get(art_id, {}).get('title', '').strip()
    
    # If title is empty, recover from candidate title
    if not raw_title or len(raw_title) < 2:
        title = cand_title
    else:
        title = raw_title
        
    # Clean brackets if not losing content
    clean_t = re.sub(r'^[【\[][^】\]]*(?:战队|大学|联队|高校|AWARD|RM202\d|赛季)[^】\]]*[】\]]\s*', '', title, flags=re.I).strip()
    clean_t = re.sub(r'^[【\[][^】\]]*[】\]]\s*', '', clean_t).strip()
    
    if len(clean_t) >= 4:
        title = clean_t
    else:
        # Strip just the outer brackets
        title = re.sub(r'^[【\[](.*)[】\]]$', r'\1', title).strip()
        
    a['clean_title'] = title
    a['clean_author'] = clean_author(a.get('author', ''))
    a['clean_cover'] = clean_cover(a.get('coverImage', ''))
    a['clean_summary'] = clean_html_text(a.get('summary', ''))[:450]

print("Sample cleaned items:")
for a in articles[20:30]:
    print(f"Title: {a['clean_title'][:40]} | Author: {a['clean_author']} | Cover: {'YES' if a['clean_cover'] else 'EMPTY'}")
