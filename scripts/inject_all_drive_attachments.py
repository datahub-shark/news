import json
import re
from pathlib import Path

DRIVE_MAP_FILE = Path('data/drive_file_map.json')
CRAWLED_FILE = Path('data/crawled_articles.json')
DRAFTS_DIR = Path('drafts')
PUBLISHED_DIR = Path('published')

drive_data = json.load(open(DRIVE_MAP_FILE, encoding='utf-8'))
by_art = drive_data.get('by_article_id', {})

def norm(s):
    return re.sub(r'[\s_\-\.]', '', str(s).lower())

def build_drive_attachment_box(art_info):
    att_map = art_info.get('attachments', {})
    if not att_map:
        return ""
        
    folder_url = art_info.get('attachments_folder_url') or art_info.get('folder_url')
    
    items_html = []
    # Sort files: prefer primary files over .original or .before-help
    sorted_files = sorted(att_map.items(), key=lambda x: ('.original' in x[0] or '.before' in x[0], x[0]))
    
    for fname, finfo in sorted_files:
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
            
        items_html.append(f"""      <li style="margin-bottom:10px;padding:10px 14px;background:#ffffff;border:1px solid #c6c6c6;border-radius:6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.4em;">{icon}</span>
          <div>
            <a href="{view_url}" target="_blank" rel="noopener noreferrer" style="color:#0f62fe;font-weight:600;text-decoration:none;font-size:1.02em;">{fname}</a>
            <div style="font-size:0.82em;color:#525252;margin-top:3px;">
              <span style="background:#edf5ff;color:#0043ce;padding:1px 6px;border-radius:3px;font-weight:500;">{badge}</span>
              {f" · {size_mb}" if size_mb else ""} · Lưu trữ Google Drive
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <a href="{view_url}" target="_blank" rel="noopener noreferrer" style="background:#0f62fe;color:#ffffff;padding:6px 14px;border-radius:4px;text-decoration:none;font-size:0.88em;font-weight:500;display:inline-flex;align-items:center;gap:5px;">
            👁️ Xem / Mở
          </a>
          <a href="{dl_url}" target="_blank" rel="noopener noreferrer" style="background:#e8f0fe;color:#0f62fe;border:1px solid #0f62fe;padding:6px 12px;border-radius:4px;text-decoration:none;font-size:0.88em;font-weight:500;display:inline-flex;align-items:center;gap:5px;">
            ⬇️ Tải file
          </a>
        </div>
      </li>""")
      
    folder_btn = ""
    if folder_url:
        folder_btn = f"""    <div style="margin-top:14px;text-align:right;">
      <a href="{folder_url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#ffffff;color:#0f62fe;border:1px solid #0f62fe;padding:7px 16px;border-radius:4px;text-decoration:none;font-size:0.88em;font-weight:600;">
        📂 Mở thư mục tệp đính kèm trên Google Drive ↗
      </a>
    </div>"""

    return f"""  <div class="local-attachments" style="background:#f4f7fb;border:1.5px solid #0f62fe;padding:18px;border-radius:8px;margin:22px 0;">
    <h3 style="margin-top:0;margin-bottom:14px;color:#0f62fe;font-size:1.15em;display:flex;align-items:center;gap:8px;">
      📦 Tệp đính kèm &amp; Bản vẽ CAD / Tài liệu (Google Drive)
    </h3>
    <ul style="list-style:none;padding:0;margin:0;">
{chr(10).join(items_html)}
    </ul>
{folder_btn}
  </div>"""

def process_content(content, art_info):
    if not art_info:
        return content
        
    att_map = art_info.get('attachments', {})
    folder_url = art_info.get('attachments_folder_url') or art_info.get('folder_url')
    
    # 1. Replace or insert the attachment box if attachments exist
    if att_map:
        new_box = build_drive_attachment_box(art_info)
        if '<div class="local-attachments"' in content:
            content = re.sub(
                r'<div class="local-attachments"[^>]*>[\s\S]*?<\/div>(?=\s*(?:<hr|<div class="article-body"|$))',
                new_box,
                content,
                count=1
            )
        else:
            if '<div class="article-body">' in content:
                content = content.replace(
                    '<div class="article-body">',
                    new_box + '\n  <hr>\n  <div class="article-body">',
                    1
                )

    # 2. In body, replace all old web attachment links
    def repl_attachment_tag(match):
        full_tag = match.group(0)
        
        # Check href
        href_m = re.search(r'href=["\']([^"\']+)["\']', full_tag)
        if not href_m:
            return full_tag
        old_href = href_m.group(1)
        
        # If it's already a Google Drive link, don't touch
        if 'drive.google.com' in old_href:
            return full_tag
            
        # Get raw file name from data-file-name or link text
        name_m = re.search(r'data-file-name=["\']([^"\']+)["\']', full_tag)
        text_m = re.search(r'>([^<]+)<', full_tag)
        raw_name = (name_m.group(1) if name_m else (text_m.group(1) if text_m else "")).strip()
        
        matched_att = None
        if att_map:
            # Strategy A: Normalized name match
            if raw_name:
                n_raw = norm(raw_name)
                for fname, finfo in att_map.items():
                    n_f = norm(fname)
                    if n_f == n_raw or n_f in n_raw or n_raw in n_f:
                        matched_att = finfo
                        break
                        
            # Strategy B: Extension match
            if not matched_att and raw_name and '.' in raw_name:
                raw_ext = raw_name.lower().split('.')[-1]
                ext_matches = [finfo for fname, finfo in att_map.items() if fname.lower().endswith('.' + raw_ext)]
                if len(ext_matches) == 1:
                    matched_att = ext_matches[0]
                    
            # Strategy C: Single attachment in article
            if not matched_att and len(att_map) == 1:
                matched_att = list(att_map.values())[0]
                
        # Resolve target URL: matched attachment file URL, or folder URL
        target_url = matched_att['web_view_url'] if matched_att else (folder_url or old_href)
        
        if target_url and target_url != old_href:
            new_tag = re.sub(r'href=["\'][^"\']+["\']', f'href="{target_url}" target="_blank" rel="noopener noreferrer"', full_tag)
            if 'Google Drive' not in new_tag and text_m:
                inner_text = text_m.group(1)
                new_tag = new_tag.replace(f'>{inner_text}<', f'>{inner_text} ↗ (Xem / Tải trên Google Drive)<')
            return new_tag
            
        return full_tag

    # Match WangEditor attachments
    content = re.sub(r'<a\b[^>]*data-w-e-type="attachment"[^>]*>[\s\S]*?</a>', repl_attachment_tag, content)
    
    # Match any other <a> tags pointing to aliyuncs files
    content = re.sub(r'<a\b[^>]*href=["\'][^"\']*(?:aliyuncs\.com|bbs\.robomaster\.com)[^"\']*(?:\.zip|\.rar|\.7z|\.step|\.stp|\.pdf|\.html|\.sldprt|\.x_t)[^"\']*["\'][^>]*>[\s\S]*?</a>', repl_attachment_tag, content)

    # Clean any remaining relative ./attachments/<fname>
    for fname, finfo in att_map.items():
        content = content.replace(f'./attachments/{fname}', finfo['web_view_url'])
        content = content.replace(f'attachments/{fname}', finfo['web_view_url'])

    return content

def main():
    print("======================================================")
    print("🚀 BẮT ĐẦU CẬP NHẬT ĐƯỜNG DẪN TỆP ĐÍNH KÈM SANG GOOGLE DRIVE")
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
        if not art_info:
            continue
            
        content = index_file.read_text(encoding='utf-8')
        new_content = process_content(content, art_info)
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
            if not art_info: continue
            content = index_file.read_text(encoding='utf-8')
            new_content = process_content(content, art_info)
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
            if not art_info:
                continue
            old_html = a.get('html', '')
            new_html = process_content(old_html, art_info)
            if new_html != old_html:
                a['html'] = new_html
                updated_crawled += 1
                
        json.dump(articles, open(CRAWLED_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print(f"✅ Đã cập nhật đường dẫn Google Drive cho {updated_crawled} bài viết trong crawled_articles.json!")

if __name__ == '__main__':
    main()
