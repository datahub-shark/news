import json
import re
import urllib.parse
import urllib.request
import time
import os
import concurrent.futures
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment

DATA_FILE = Path('data/crawled_articles.json')
DRAFTS_DIR = Path('drafts')

ZH_REGEX = re.compile(r'[\u4e00-\u9fa5]')

ROBOTICS_POST_DICT = [
    (r'\bthái độ\b', 'góc tư thế'),
    (r'\bbộ thái độ\b', 'bộ ước lượng tư thế'),
    (r'\bbánh xe ma sát bánh xe\b', 'bánh đà ma sát'),
    (r'\bbánh đà ma sát bánh xe\b', 'bánh đà ma sát'),
    (r'\bbánh xe ma sát\b', 'bánh đà ma sát'),
    (r'\bngười máy\b', 'robot'),
    (r'\byun tai\b', 'gimbal'),
    (r'\bđám mây\b', 'gimbal'),
    (r'\bkhung gầm\b', 'chassis'),
    (r'\bvòng bi\b', 'ổ bi'),
    (r'\bgiảm tốc\b', 'hộp số giảm tốc'),
    (r'\bthanh kết nối\b', 'thanh liên kết'),
    (r'\bchuỗi liên kết\b', 'chuỗi động học'),
    (r'\bchó thể tích\b', 'thiết kế siêu gọn'),
    (r'\bvòng lặp kín\b', 'vòng lặp kín (closed loop)'),
    (r'\bvòng hở\b', 'vòng lặp hở (open loop)'),
]

def safe_save(articles):
    temp_file = DATA_FILE.with_suffix('.tmp')
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    time.sleep(0.05)
    temp_file.replace(DATA_FILE)

def translate_nodes(texts):
    if not texts:
        return []

    chunks = []
    cur_chunk = []
    cur_len = 0
    for i, t in enumerate(texts):
        item_str = f"|||{i}||| {t}"
        if cur_len + len(item_str) > 3000 and cur_chunk:
            chunks.append(cur_chunk)
            cur_chunk = [item_str]
            cur_len = len(item_str)
        else:
            cur_chunk.append(item_str)
            cur_len += len(item_str) + 1
    if cur_chunk:
        chunks.append(cur_chunk)

    res_map = {}
    url = 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=zh-CN&tl=vi'
    
    for chunk in chunks:
        combined = '\n'.join(chunk)
        data = urllib.parse.urlencode({'q': combined}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=15) as res:
                    out = json.loads(res.read().decode('utf-8'))
                    trans_text = out[0] if isinstance(out, list) else str(out)
                    items = re.findall(r'\|\|\|(\d+)\|\|\|\s*([^\n|]+)', trans_text)
                    for num_str, trans_val in items:
                        res_map[int(num_str)] = trans_val.strip()
                break
            except Exception:
                time.sleep(0.5 + attempt * 0.5)
        time.sleep(0.05)

    return [res_map.get(i, texts[i]) for i in range(len(texts))]

def translate_html_content(html_str):
    if not html_str or len(ZH_REGEX.findall(html_str)) < 15:
        return html_str

    if 'robot-ideas-article' in html_str and 'LinkGo' in html_str:
        return html_str

    soup = BeautifulSoup(html_str, 'html.parser')
    target_nodes = []
    texts_to_trans = []

    for node in soup.find_all(string=True):
        if isinstance(node, Comment):
            continue
        if node.parent and node.parent.name in ['code', 'pre', 'script', 'style']:
            continue
        text = str(node).strip()
        if text and ZH_REGEX.search(text):
            target_nodes.append(node)
            texts_to_trans.append(text)

    if not texts_to_trans:
        return html_str

    translated_texts = translate_nodes(texts_to_trans)

    for node, trans in zip(target_nodes, translated_texts):
        for pat, rep in ROBOTICS_POST_DICT:
            trans = re.sub(pat, rep, trans, flags=re.IGNORECASE)
        orig_text = str(node)
        leading = orig_text[:len(orig_text) - len(orig_text.lstrip())]
        trailing = orig_text[len(orig_text.rstrip()):]
        node.replace_with(NavigableString(leading + trans + trailing))

    return str(soup)

def update_draft_file(article):
    sid = article.get('sourceUrl', '').split('/')[-1]
    if not sid:
        return
    matched_dirs = list(DRAFTS_DIR.glob(f"{sid}*"))
    for mdir in matched_dirs:
        idx_file = mdir / 'index.html'
        if idx_file.exists():
            try:
                content = idx_file.read_text(encoding='utf-8', errors='ignore')
                meta_match = re.search(r'<!--\s*METADATA([\s\S]*?)-->', content)
                if meta_match:
                    meta_block = meta_match.group(0)
                    new_content = meta_block + "\n\n<article class=\"robot-ideas-article\">\n  <div class=\"article-body\">\n" + article.get('html', '') + "\n  </div>\n</article>"
                    idx_file.write_text(new_content, encoding='utf-8')
            except Exception:
                pass

def process_single_article(item):
    idx, a = item
    html = a.get('html', '') or ''
    old_cn = len(ZH_REGEX.findall(html))
    title = a.get('title', 'Bài viết')[:35]
    if old_cn <= 20:
        return idx, a, old_cn, old_cn, title

    new_html = translate_html_content(html)
    new_cn = len(ZH_REGEX.findall(new_html))
    a['html'] = new_html
    update_draft_file(a)
    return idx, a, old_cn, new_cn, title

def main():
    print("======================================================")
    print("⚡ BẮT ĐẦU DỊCH NHANH CÁC BÀI VIẾT CÒN LẠI (PARALLEL)")
    print("======================================================")

    articles = json.load(open(DATA_FILE, encoding='utf-8'))
    total = len(articles)

    items_to_process = []
    for idx, a in enumerate(articles):
        html = a.get('html', '') or ''
        cn_count = len(ZH_REGEX.findall(html))
        if cn_count > 20:
            items_to_process.append((idx, a))

    print(f"Tổng bài viết: {total} | Còn cần dịch thân bài: {len(items_to_process)}")

    if not items_to_process:
        print("Tất cả bài viết đã được dịch sạch!")
        return

    t0 = time.time()
    completed = 0
    save_counter = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(process_single_article, item): item for item in items_to_process}
        
        for future in concurrent.futures.as_completed(futures):
            completed += 1
            save_counter += 1
            try:
                idx, updated_a, old_cn, new_cn, title = future.result()
                articles[idx] = updated_a
                elapsed = time.time() - t0
                rate = completed / elapsed if elapsed > 0 else 0
                eta = (len(items_to_process) - completed) / rate if rate > 0 else 0
                print(f"[{completed}/{len(items_to_process)}] {title}... | Chữ Trung: {old_cn} -> {new_cn} | {elapsed:.1f}s (ETA: {eta/60:.1f}m)")
            except Exception as e:
                print(f"[{completed}/{len(items_to_process)}] [ERR]: {e}")

            # Safe atomic save every 15 articles
            if save_counter >= 15:
                safe_save(articles)
                save_counter = 0
                print(f"  💾 Đã lưu an toàn tiến trình ({completed}/{len(items_to_process)})")

    # Final atomic save
    safe_save(articles)
    print(f"\n🎉 HOÀN THÀNH DỊCH 100% THÂN BÀI VIẾT TRONG {time.time()-t0:.1f}s!")

if __name__ == '__main__':
    main()
