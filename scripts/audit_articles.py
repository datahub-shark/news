import json
import re

with open('data/crawled_articles.json', encoding='utf-8') as f:
    articles = json.load(f)

print(f"Total articles in database: {len(articles)}")

issues = []
categories = {}
covers_count = 0
empty_covers_count = 0

for i, a in enumerate(articles):
    # Check title
    title = a.get('title', '').strip()
    if not title:
        issues.append((i, a.get('sourceUrl'), "Tiêu đề rỗng"))
    
    # Check category
    cat = a.get('category', '').strip()
    categories[cat] = categories.get(cat, 0) + 1
    
    # Check coverImage
    cover = a.get('coverImage', '').strip()
    if cover:
        covers_count += 1
        # Check if cover is valid URL
        if not cover.startswith('http'):
            issues.append((i, a.get('sourceUrl'), f"Ảnh bìa không hợp lệ: {cover}"))
        elif any(bad in cover.lower() for bad in ['avatar', 'emoji', 'icon', 'badge', 'default.0258246']):
            issues.append((i, a.get('sourceUrl'), f"Ảnh bìa chứa avatar/icon: {cover}"))
    else:
        empty_covers_count += 1
        
    # Check summary
    summary = a.get('summary', '').strip()
    if not summary:
        issues.append((i, a.get('sourceUrl'), "Tóm tắt rỗng"))
        
    # Check html
    html = a.get('html', '').strip()
    if not html:
        issues.append((i, a.get('sourceUrl'), "Nội dung HTML rỗng"))
    elif len(html.encode('utf-8')) > 1.4 * 1024 * 1024:
        issues.append((i, a.get('sourceUrl'), f"HTML quá lớn: {len(html.encode('utf-8'))/1024/1024:.2f} MB"))

print(f"\nAudit results:")
print(f"- Có ảnh bìa hợp lệ: {covers_count}")
print(f"- Ảnh bìa để trống (chuẩn quy tắc): {empty_covers_count}")
print(f"- Phân loại chuyên mục: {categories}")
print(f"- Tổng số vấn đề phát hiện: {len(issues)}")

for issue in issues[:20]:
    print(f"  ⚠️ Bài {issue[0]} ({issue[1]}): {issue[2]}")
