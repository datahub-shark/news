import json
import re
from pathlib import Path

DRIVE_MAP_FILE = Path('data/drive_file_map.json')
CRAWLED_FILE = Path('data/crawled_articles.json')
DRAFTS_DIR = Path('drafts')
PUBLISHED_DIR = Path('published')

drive_data = json.load(open(DRIVE_MAP_FILE, encoding='utf-8'))
by_art = drive_data.get('by_article_id', {})

def build_drive_attachment_box(art_info):
    att_map = art_info.get('attachments', {})
    if not att_map:
        return ""
        
    folder_url = art_info.get('attachments_folder_url') or art_info.get('folder_url')
    
    items_html = []
    for fname, finfo in att_map.items():
        view_url = finfo['web_view_url']
        dl_url = finfo.get('download_url') or view_url
        size_mb = f"{finfo['size'] / (1024*1024):.2f} MB" if finfo.get('size') else ""
        
        ext = fname.lower().split('.')[-1] if '.' in fname else ''
        if ext in ['step', 'stp', 'sldprt', 'x_t', 'stl']:
            icon = '⚙️'
            badge = 'CAD 3D'
        elif ext in ['zip', 'rar', '7z']:
            icon = '📦'
            badge = 'Archive'
        elif ext == 'pdf':
            icon = '📄'
            badge = 'PDF'
        elif ext in ['html', 'htm']:
            icon = '🌐'
            badge = 'HTML App'
        else:
            icon = '📎'
            badge = ext.upper()
            
        items_html.append(f"""      <li style="margin-bottom:10px;padding:8px 12px;background:#fff;border:1px solid #d0e2ff;border-radius:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.3em;">{icon}</span>
          <div>
            <a href="{view_url}" target="_blank" rel="noopener noreferrer" style="color:#0f62fe;font-weight:600;text-decoration:none;font-size:1.02em;">{fname}</a>
            <div style="font-size:0.82em;color:#525252;margin-top:2px;">
              <span style="background:#edf5ff;color:#0043ce;padding:1px 6px;border-radius:3px;font-weight:500;">{badge}</span>
              {f" · {size_mb}" if size_mb else ""} · Lưu trữ Google Drive
            </div>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <a href="{view_url}" target="_blank" rel="noopener noreferrer" style="background:#0f62fe;color:#fff;padding:5px 12px;border-radius:4px;text-decoration:none;font-size:0.88em;font-weight:500;display:inline-flex;align-items:center;gap:4px;">
            👁️ Xem / Mở
          </a>
          <a href="{dl_url}" target="_blank" rel="noopener noreferrer" style="background:#e8f0fe;color:#0f62fe;border:1px solid #0f62fe;padding:5px 10px;border-radius:4px;text-decoration:none;font-size:0.88em;font-weight:500;display:inline-flex;align-items:center;gap:4px;">
            ⬇️ Tải file
          </a>
        </div>
      </li>""")
      
    folder_btn = ""
    if folder_url:
        folder_btn = f"""    <div style="margin-top:12px;text-align:right;">
      <a href="{folder_url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#f4f4f4;color:#161616;border:1px solid #8d8d8d;padding:6px 14px;border-radius:4px;text-decoration:none;font-size:0.88em;font-weight:500;">
        📂 Mở toàn bộ thư mục tệp đính kèm trên Google Drive ↗
      </a>
    </div>"""

    return f"""  <div class="local-attachments" style="background:#f8f9fa;border:1px solid #0f62fe;padding:16px;border-radius:8px;margin:20px 0;">
    <h3 style="margin-top:0;margin-bottom:12px;color:#0f62fe;font-size:1.1em;display:flex;align-items:center;gap:8px;">
      📦 Tệp đính kèm &amp; Bản vẽ kỹ thuật (Google Drive)
    </h3>
    <ul style="list-style:none;padding:0;margin:0;">
{chr(10).join(items_html)}
    </ul>
{folder_btn}
  </div>"""

def replace_attachment_links(html_content, art_info):
    if not art_info or not art_info.get('attachments'):
        return html_content

    att_map = art_info['attachments']
    
    # 1. Replace or insert the attachment box
    new_box = build_drive_attachment_box(art_info)
    
    # If existing local-attachments box exists, replace it
    if '<div class="local-attachments"' in html_content:
        html_content = re.sub(
            r'<div class="local-attachments"[\s\S]*?<\/div>\s*<\/div>',
            new_box,
            html_content,
            count=1
        )
        if '<div class="local-attachments"' not in html_content: # in case nested div regex missed
            html_content = re.sub(
                r'<div class="local-attachments"[\s\S]*?<\/ul>[\s\S]*?<\/div>',
                new_box,
                html_content,
                count=1
            )
    else:
        # Insert before <hr> or before <div class="article-body">
        if '<div class="article-body">' in html_content:
            html_content = html_content.replace(
                '<div class="article-body">',
                new_box + '\n  <hr>\n  <div class="article-body">',
                1
            )

    # 2. In body, replace old web attachment links
    # Map by filename lowercase or extension
    # First, if only 1 attachment exists for this article, any attachment link maps to it
    first_att = list(att_map.values())[0] if len(att_map) == 1 else None
    
    def repl_we_link(match):
        full_tag = match.group(0)
        # Extract href and data-file-name
        href_m = re.search(r'href=["\']([^"\']+)["\']', full_tag)
        old_href = href_m.group(1) if href_m else ""
        
        name_m = re.search(r'data-file-name=["\']([^"\']+)["\']', full_tag)
        raw_name = name_m.group(1) if name_m else ""
        
        # Match with att_map
        matched_att = None
        if raw_name:
            for fname, finfo in att_map.items():
                if fname.lower() in raw_name.lower() or raw_name.lower() in fname.lower():
                    matched_att = finfo
                    break
        if not matched_att and first_att:
            matched_att = first_att
            
        if matched_att:
            new_url = matched_att['web_view_url']
            # Replace href in the tag
            new_tag = re.sub(r'href=["\'][^"\']+["\']', f'href="{new_url}" target="_blank" rel="noopener noreferrer"', full_tag)
            return new_tag
        return full_tag

    # Replace WangEditor tags
    html_content = re.sub(r'<a\b[^>]*data-w-e-type="attachment"[^>]*>[\s\S]*?</a>', repl_we_link, html_content)
    
    # Also replace any href pointing to ./attachments/<filename> with the Drive link
    for fname, finfo in att_map.items():
        html_content = html_content.replace(f'./attachments/{fname}', finfo['web_view_url'])
        html_content = html_content.replace(f'attachments/{fname}', finfo['web_view_url'])
        
    return html_content

def main():
    print("======================================================")
    print("BẮT ĐẦU CẬP NHẬT ĐƯỜNG DẪN TỆP ĐÍNH KÈM TỪ GOOGLE DRIVE")
    print("======================================================")

    # 1. Update drafts
    updated_drafts = 0
    all_draft_dirs = [d for d in DRAFTS_DIR.iterdir() if d.is_dir()]
    for d in all_draft_dirs:
        index_file = d / 'index.html'
        if not index_file.exists():
            continue
        art_id = d.name.split('-')[0]
        art_info = by_art.get(art_id)
        if not art_info or not art_info.get('attachments'):
            continue
            
        content = index_file.read_text(encoding='utf-8')
        new_content = replace_attachment_links(content, art_info)
        if new_content != content:
            index_file.write_text(new_content, encoding='utf-8')
            updated_drafts += 1
            
    print(f"✅ Đã cập nhật đường dẫn Google Drive trong {updated_drafts} thư mục drafts/!")

    # 2. Update published
    updated_pub = 0
    if PUBLISHED_DIR.exists():
        for d in PUBLISHED_DIR.iterdir():
            if not d.is_dir(): continue
            index_file = d / 'index.html'
            if not index_file.exists(): continue
            art_id = d.name.split('-')[0]
            art_info = by_art.get(art_id)
            if not art_info or not art_info.get('attachments'): continue
            content = index_file.read_text(encoding='utf-8')
            new_content = replace_attachment_links(content, art_info)
            if new_content != content:
                index_file.write_text(new_content, encoding='utf-8')
                updated_pub += 1
    print(f"✅ Đã cập nhật đường dẫn Google Drive trong {updated_pub} thư mục published/!")

    # 3. Update crawled_articles.json
    if CRAWLED_FILE.exists():
        articles = json.load(open(CRAWLED_FILE, encoding='utf-8'))
        updated_crawled = 0
        for a in articles:
            sid = a.get('sourceUrl', '').split('/')[-1]
            art_info = by_art.get(sid)
            if not art_info or not art_info.get('attachments'):
                continue
            old_html = a.get('html', '')
            new_html = replace_attachment_links(old_html, art_info)
            if new_html != old_html:
                a['html'] = new_html
                updated_crawled += 1
                
        json.dump(articles, open(CRAWLED_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print(f"✅ Đã cập nhật đường dẫn Google Drive cho {updated_crawled} bài viết trong crawled_articles.json!")

if __name__ == '__main__':
    main()
