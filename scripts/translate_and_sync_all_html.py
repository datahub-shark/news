import json
import re
import urllib.parse
import urllib.request
import time
import os
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Comment
from concurrent.futures import ThreadPoolExecutor, as_completed
from editorial_auth import (get_editorial_token, get_editorial_api_url,
                            assert_editorial_action, redact_editorial_error)

DATA_FILE = Path('data/crawled_articles.json')
CACHE_FILE = Path('data/translation_cache.json')
DRAFTS_DIR = Path('drafts')

ZH_REGEX = re.compile(r'[\u4e00-\u9fa5]')

# Load cache
if CACHE_FILE.exists():
    try:
        TRANS_CACHE = json.load(open(CACHE_FILE, encoding='utf-8'))
    except Exception:
        TRANS_CACHE = {}
else:
    TRANS_CACHE = {}

# University and team terminology
AFFILIATIONS = [
    (r'哈尔滨工业大学（深圳）|哈工大（深圳）', 'HIT Thâm Quyến'),
    (r'哈尔滨工业大学（威海）|哈工大（威海）', 'HIT Uy Hải'),
    (r'哈尔滨工业大学|哈工大', 'ĐH Công nghiệp Cáp Nhĩ Tân (HIT)'),
    (r'华南理工大学|华南理工', 'ĐH Bách khoa Nam Trung Hoa (SCUT)'),
    (r'北京理工大学|北理工', 'ĐH Bách khoa Bắc Kinh (BIT)'),
    (r'上海交通大学|上交大|上交', 'ĐH Giao thông Thượng Hải (SJTU)'),
    (r'西安交通大学|西交大|西交', 'ĐH Giao thông Tây An (XJTU)'),
    (r'华中科技大学|华科', 'ĐH KH&CN Hoa Trung (HUST)'),
    (r'浙江大学|浙大', 'ĐH Chiết Giang (ZJU)'),
    (r'电子科技大学|成电', 'ĐH ĐK&CN Điện tử (UESTC)'),
    (r'西北工业大学|西工大', 'ĐH Công nghiệp Tây Bắc (NWPU)'),
    (r'同济大学|同济', 'ĐH Đồng Tế (Tongji)'),
    (r'复旦大学|复旦', 'ĐH Phúc Đán (Fudan)'),
    (r'东北大学|东大', 'ĐH Đông Bắc (NEU)'),
    (r'中南大学|中南', 'ĐH Trung Nam (CSU)'),
    (r'大连理工大学|大工', 'ĐH Bách khoa Đại Liên (DUT)'),
    (r'北京航空航天大学|北航', 'ĐH Hàng không Bắc Kinh (BUAA)'),
    (r'南京航空航天大学|南航', 'ĐH Hàng không Nam Kinh (NUAA)'),
    (r'南京理工大学|南理工', 'ĐH KH&CN Nam Kinh (NJUST)'),
    (r'武汉大学|武大', 'ĐH Vũ Hán (WHU)'),
    (r'厦门大学|厦大', 'ĐH Hạ Môn (XMU)'),
    (r'深圳大学|深大', 'ĐH Thâm Quyến (SZU)'),
    (r'南方科技大学|南科大', 'ĐH KH&CN Miền Nam (SUSTech)'),
    (r'中国石油大学（华东）|中国石油大学\(华东\)', 'ĐH Dầu khí TQ - Hoa Đông (UPC)'),
    (r'山东科技大学|山科大', 'ĐH KH&CN Sơn Đông (SDUST)'),
    (r'齐鲁工业大学|齐鲁工大', 'ĐH Công nghiệp Tề Lỗ (QLU)'),
    (r'青岛科技大学|青科大', 'ĐH KH&CN Thanh Đảo (QUST)'),
    (r'南通大学', 'ĐH Nam Thông (NTU)'),
    (r'南通理工学院', 'Học viện Công nghệ Nam Thông'),
    (r'北京科技大学|北科大', 'ĐH KH&CN Bắc Kinh (USTB)'),
    (r'五邑大学', 'ĐH Ngũ Ấp (WYU)'),
    (r'福州大学', 'ĐH Phúc Châu (FZU)'),
    (r'西华大学', 'ĐH Tây Hoa (XHU)'),
    (r'华北科技学院|华北科技', 'ĐH KH&CN Bắc Trung Quốc (NCUT)'),
    (r'黑河学院', 'Học viện Hắc Hà'),
    (r'首都师范大学', 'ĐH Sư phạm Thủ đô (CNU)'),
    (r'合肥工业大学', 'ĐH Công nghiệp Hợp Phì (HFUT)'),
    (r'广州航海学院', 'Học viện Hàng hải Quảng Châu'),
]

TEAM_NAMES = [
    (r'华南虎战队|华南虎', 'South China Tiger'),
    (r'追梦战队|追梦', 'DreamChaser'),
    (r'交龙战队|交龙', 'JiaoLong'),
    (r'笃行战队|笃行', 'Duxing'),
    (r'星云EGA战队|星云战队|星云EGA', 'Nebula EGA'),
    (r'苍穹战队|苍穹', 'Thương Khung'),
    (r'凌峰战队|凌峰', 'Lăng Phong'),
    (r'狼牙战队|狼牙', 'WolfTooth'),
    (r'风暴战队|风暴', 'Storm Team'),
    (r'RobotPilots战队|RobotPilots', 'RobotPilots'),
    (r'ARTINX战队|ARTINX', 'ARTINX'),
    (r'IMCA战队|IMCA', 'IMCA'),
    (r'HERO战队|HERO', 'HERO Team'),
    (r'TDT战队|TDT', 'TDT Team'),
    (r'SmartRM战队|SmartRM', 'SmartRM'),
    (r'RPS战队|RPS', 'RPS Team'),
    (r'NSE战队|NSE', 'NSE Team'),
    (r'WPIE战队|PIE战队|WPIE|PIE', 'PIE Team'),
    (r'Alliance战队|Alliance', 'Alliance Team'),
    (r'ARES战队|ARES', 'ARES Team'),
    (r'创界RC战队|创界', 'Chuangjie Team'),
    (r'紫琅战队|紫琅', 'Tử Lang (Zilang)'),
    (r'ICBK破冰船战队|ICBK破冰船|ICBK', 'ICBK Icebreaker'),
]

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
]

def translate_raw(text, retries=3):
    text = text.strip()
    if not text:
        return ""
    if not ZH_REGEX.search(text):
        return text
    if text in TRANS_CACHE:
        return TRANS_CACHE[text]

    for pat, rep in AFFILIATIONS:
        text = re.sub(pat, rep, text)
    for pat, rep in TEAM_NAMES:
        text = re.sub(pat, rep, text)

    if not ZH_REGEX.search(text):
        TRANS_CACHE[text] = text
        return text

    if len(text) > 1200:
        chunks = re.split(r'([。\n\.\!\?])', text)
        translated_chunks = []
        buf = ""
        for c in chunks:
            if len(buf) + len(c) < 1000:
                buf += c
            else:
                if buf:
                    translated_chunks.append(translate_raw(buf))
                buf = c
        if buf:
            translated_chunks.append(translate_raw(buf))
        res = "".join(translated_chunks)
        TRANS_CACHE[text] = res
        return res

    url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=vi&dt=t&q=' + urllib.parse.quote(text)
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as res:
                data = json.loads(res.read().decode('utf-8'))
                translated = ''.join([part[0] for part in data[0] if part and part[0]])
                for pat, rep in ROBOTICS_POST_DICT:
                    translated = re.sub(pat, rep, translated, flags=re.IGNORECASE)
                TRANS_CACHE[text] = translated
                return translated
        except Exception:
            if attempt == retries - 1:
                return text
            time.sleep(0.3)
    return text

def translate_html_soup(html_str):
    if not html_str or not ZH_REGEX.search(html_str):
        return html_str

    # If it's already an article with Vietnamese editorial header, don't re-translate
    if 'robot-ideas-article' in html_str and 'Lời nói đầu' in html_str:
        return html_str

    soup = BeautifulSoup(html_str, 'html.parser')

    for node in soup.find_all(string=True):
        if isinstance(node, Comment):
            continue
        if node.parent and node.parent.name in ['code', 'pre', 'script', 'style']:
            continue
        text = str(node)
        if ZH_REGEX.search(text):
            leading_space = text[:len(text) - len(text.lstrip())]
            trailing_space = text[len(text.rstrip()):]
            stripped = text.strip()
            if stripped:
                translated = translate_raw(stripped)
                node.replace_with(NavigableString(leading_space + translated + trailing_space))

    for img in soup.find_all('img'):
        for attr in ['alt', 'title']:
            if img.has_attr(attr) and ZH_REGEX.search(img[attr]):
                img[attr] = translate_raw(img[attr])

    return str(soup)

def call_api(action, payload):
    token = get_editorial_token(require_admin=True)
    assert_editorial_action(action, payload)
    req = urllib.request.Request(
        get_editorial_api_url(),
        data=json.dumps({'action': action, 'payload': {**payload, 'token': token}}).encode('utf-8'),
        headers={'Content-Type': 'text/plain;charset=UTF-8'}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode('utf-8'))
        if result.get('error'):
            result['error'] = redact_editorial_error(result['error'])
        return result

def process_one_article(idx_art):
    idx, a = idx_art
    raw_html = a.get('html', '')
    if not raw_html or len(ZH_REGEX.findall(raw_html)) < 10:
        return idx, raw_html, False

    trans_html = translate_html_soup(raw_html)
    return idx, trans_html, True

def main():
    get_editorial_token(require_admin=True)
    print("======================================================")
    print("BẮT ĐẦU DỊCH THÂN BÀI VIẾT (HTML BODY) TOÀN BỘ 456 BÀI")
    print("======================================================")

    articles = json.load(open(DATA_FILE, encoding='utf-8'))
    total = len(articles)
    tasks = list(enumerate(articles))

    # Identify articles that actually need translation
    need_trans = [item for item in tasks if len(ZH_REGEX.findall(item[1].get('html', ''))) >= 10]
    print(f"Tổng bài viết: {total} | Cần dịch thân bài HTML: {len(need_trans)}\n")

    t0 = time.time()
    completed = 0

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_one_article, item): item[0] for item in need_trans}

        for future in as_completed(futures):
            try:
                idx, trans_html, changed = future.result()
                if changed:
                    articles[idx]['html'] = trans_html
                completed += 1

                if completed % 15 == 0 or completed == len(need_trans):
                    elapsed = time.time() - t0
                    pct = completed * 100 / len(need_trans)
                    print(f"[{completed}/{len(need_trans)}] ({pct:.1f}%) Đã dịch xong - {elapsed:.1f}s")
                    json.dump(articles, open(DATA_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
                    json.dump(TRANS_CACHE, open(CACHE_FILE, 'w', encoding='utf-8'), ensure_ascii=False)
            except Exception as e:
                print(f"[ERR] Error in translation: {e}")

    # Final save
    json.dump(articles, open(DATA_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    json.dump(TRANS_CACHE, open(CACHE_FILE, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f"\n✅ ĐÃ DỊCH XONG TOÀN BỘ THÂN BÀI HTML TRONG {time.time()-t0:.1f}s!")

    # Update drafts folder
    print("\n📂 Đang đồng bộ thân bài đã dịch sang thư mục drafts/...")
    synced_drafts = 0
    for a in articles:
        sid = a.get('sourceUrl', '').split('/')[-1]
        if not sid:
            continue
        # find folder starting with sid
        matched_dirs = list(DRAFTS_DIR.glob(f"{sid}*"))
        for mdir in matched_dirs:
            idx_file = mdir / 'index.html'
            if idx_file.exists():
                try:
                    content = idx_file.read_text(encoding='utf-8', errors='ignore')
                    # If this draft is not already translated
                    meta_match = re.search(r'<!--\s*METADATA([\s\S]*?)-->', content)
                    if meta_match and 'robot-ideas-article' not in content:
                        meta_block = meta_match.group(0)
                        new_content = meta_block + "\n\n<article class=\"robot-ideas-article\">\n  <div class=\"article-body\">\n" + a.get('html', '') + "\n  </div>\n</article>"
                        idx_file.write_text(new_content, encoding='utf-8')
                        synced_drafts += 1
                except Exception:
                    pass
    print(f"✅ Đã đồng bộ {synced_drafts} thư mục draft.")

    # Now sync to Google Sheets
    print("\n📡 ĐANG ĐỒNG BỘ NỘI DUNG ĐÃ DỊCH LÊN HÀNG CHỜ GOOGLE SHEETS...")
    try:
        sheet_list = call_api('list', {})
        sheet_articles = sheet_list.get('articles', [])
        print(f"✅ Đã tải danh sách {len(sheet_articles)} bài từ Google Sheets.")
    except Exception as e:
        print(f"❌ Không thể lấy danh sách Google Sheets: {e}")
        return

    # Map by sourceUrl
    crawled_map = {a.get('sourceUrl'): a for a in articles}
    to_sync = []
    for sa in sheet_articles:
        ca = crawled_map.get(sa.get('sourceUrl'))
        if ca and ca.get('html'):
            to_sync.append((sa, ca))

    print(f"🚀 Bắt đầu cập nhật {len(to_sync)} bài viết lên Google Sheets...")
    success_sync = 0
    err_sync = 0

    for i, (sa, ca) in enumerate(to_sync):
        art_id = sa.get('id')
        try:
            # Get latest version first
            cur = call_api('get', {'id': art_id})
            cur_art = cur.get('article', {})
            version = cur_art.get('version', 1)

            save_payload = {
                'article': {
                    'id': art_id,
                    'version': version,
                    'title': ca.get('title') or sa.get('title'),
                    'summary': ca.get('summary') or sa.get('summary'),
                    'category': ca.get('category') or sa.get('category', 'Khác'),
                    'sourceName': ca.get('sourceName') or sa.get('sourceName', 'RoboMaster BBS'),
                    'sourceUrl': ca.get('sourceUrl') or sa.get('sourceUrl'),
                    'robotIdea': ca.get('robotIdea') or sa.get('robotIdea'),
                    'coverImage': ca.get('coverImage') or sa.get('coverImage', ''),
                    'html': ca.get('html'),
                    'status': cur_art.get('status', 'pending')
                }
            }
            res = call_api('save', save_payload)
            if res.get('ok'):
                success_sync += 1
                if success_sync % 20 == 0 or success_sync == len(to_sync):
                    print(f"  [Sheets: {success_sync}/{len(to_sync)}] Đã cập nhật thành công bài #{i+1} ({ca.get('title')[:40]}...)")
            else:
                err_sync += 1
                print(f"  [WARN] Failed to save {art_id}: {res.get('error')}")
            # Brief pause to respect Google Apps Script concurrency lock
            time.sleep(0.3)
        except Exception as e:
            err_sync += 1
            print(f"  [ERR] Exception saving {art_id}: {e}")
            time.sleep(1.0)

    print(f"\n======================================================")
    print(f"🎉 HOÀN TẤT ĐỒNG BỘ LÊN GOOGLE SHEETS!")
    print(f"- Thành công: {success_sync}")
    print(f"- Lỗi/Bỏ qua: {err_sync}")
    print(f"======================================================")

if __name__ == '__main__':
    main()
