import json
import re
from pathlib import Path

with open('data/crawled_articles.json', encoding='utf-8') as f:
    articles = json.load(f)

art_map = {}
for a in articles:
    art_id = a.get('sourceUrl', '').split('/')[-1]
    art_map[art_id] = a

drafts_dir = Path('drafts')
updated_count = 0

for d in drafts_dir.iterdir():
    if not d.is_dir():
        continue
    index_file = d / 'index.html'
    if not index_file.exists():
        continue
        
    art_id = d.name.split('-')[0]
    art_data = art_map.get(art_id)
    if not art_data:
        continue
        
    content = index_file.read_text(encoding='utf-8')
    meta_match = re.search(r'<!--\s*METADATA([\s\S]*?)-->', content)
    if not meta_match:
        continue
        
    # Build updated metadata block
    clean_title = art_data.get('title', '')
    clean_cat = art_data.get('category', 'Khác')
    clean_author = art_data.get('author', 'Cộng đồng RoboMaster')
    clean_cover = art_data.get('coverImage', '')
    clean_source = art_data.get('sourceUrl', '')
    clean_summary = art_data.get('summary', '')
    clean_robot_idea = art_data.get('robotIdea', '')
    
    # Check if there are attachments
    att_dir = d / 'attachments'
    att_files = list(att_dir.iterdir()) if att_dir.exists() else []
    att_str = ', '.join([f.name for f in att_files]) if att_files else 'Không có'
    
    new_meta = f"""<!-- METADATA
Tiêu đề: {clean_title}
Chuyên mục: {clean_cat}
Tác giả: {clean_author}
Ảnh bìa: {clean_cover}
Nguồn: {clean_source}
Tên nguồn: RoboMaster BBS
Tóm tắt: {clean_summary}
Gợi ý ứng dụng: {clean_robot_idea}
Tệp đính kèm: {att_str}
Trạng thái: READY
-->"""

    # Replace meta block in content
    new_content = content[:meta_match.start()] + new_meta + content[meta_match.end():]
    
    # Update hero cover image if needed (if clean_cover is empty, remove hero cover container)
    if not clean_cover:
        new_content = re.sub(r'<div class="article-hero-cover"[^>]*>[\s\S]*?</div>', '', new_content)
        
    if new_content != content:
        index_file.write_text(new_content, encoding='utf-8')
        updated_count += 1

print(f"🎉 Đã cập nhật metadata và đặt trạng thái READY cho {updated_count} bài viết trong drafts/!")
