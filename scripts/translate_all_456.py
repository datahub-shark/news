import json
import re
import html
import urllib.request
import urllib.parse
import time
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

DATA_FILE = Path('data/crawled_articles.json')
CAND_FILE = Path('data/all_bbs_candidates.json')
CACHE_FILE = Path('data/translation_cache.json')

# Load candidates and existing articles
candidates = {str(c['id']): c for c in json.load(open(CAND_FILE, encoding='utf-8'))}
articles = json.load(open(DATA_FILE, encoding='utf-8'))

# Load translation cache if present
if CACHE_FILE.exists():
    try:
        TRANS_CACHE = json.load(open(CACHE_FILE, encoding='utf-8'))
    except Exception:
        TRANS_CACHE = {}
else:
    TRANS_CACHE = {}

ZH_REGEX = re.compile(r'[\u4e00-\u9fa5]')

def translate_zh2vi(text, retries=3):
    text = text.strip()
    if not text:
        return ""
    if not ZH_REGEX.search(text):
        return text
    if text in TRANS_CACHE:
        return TRANS_CACHE[text]

    url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=vi&dt=t&q=' + urllib.parse.quote(text[:1500])
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as res:
                data = json.loads(res.read().decode('utf-8'))
                translated = ''.join([part[0] for part in data[0] if part[0]])
                TRANS_CACHE[text] = translated
                return translated
        except Exception as e:
            if attempt == retries - 1:
                print(f"[WARN] Failed translating: {text[:30]}... ({e})")
                return text
            time.sleep(0.5 + attempt * 0.5)
    return text

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
    (r'\bbộ thái độ\b', 'bộ ước lượng góc tư thế'),
    (r'\bbánh xe ma sát bánh xe\b', 'bánh đà ma sát'),
    (r'\bbánh đà ma sát bánh xe\b', 'bánh đà ma sát'),
    (r'\bbánh xe ma sát\b', 'bánh đà ma sát'),
    (r'\bngười máy\b', 'robot'),
    (r'\bNgười máy\b', 'Robot'),
    (r'\btuần tra\b', 'Sentry'),
    (r'\bTuần tra\b', 'Sentry'),
    (r'\bBộ binh\b', 'Robot Bộ binh'),
    (r'\bbộ binh\b', 'Robot Bộ binh'),
    (r'\bAnh hùng\b', 'Robot Anh hùng'),
    (r'\banh hùng\b', 'Robot Anh hùng'),
    (r'\bKỹ sư\b', 'Robot Kỹ sư'),
    (r'\bkỹ sư\b', 'Robot Kỹ sư'),
    (r'\bvô song\b', 'vô song'),
    (r'\bbộ điều khiển trượt\b', 'bộ điều khiển trượt SMC'),
    (r'\btự ngắm\b', 'tự ngắm Auto-Aim'),
    (r'\bTự ngắm\b', 'Tự ngắm Auto-Aim'),
    (r'\bbảng bọc thép\b', 'tấm giáp mục tiêu'),
    (r'\bBảng bọc thép\b', 'Tấm giáp mục tiêu'),
    (r'\bnhãn bọc thép\b', 'tấm giáp mục tiêu'),
    (r'\btấm bọc thép\b', 'tấm giáp mục tiêu'),
    (r'\btrạm radar\b', 'trạm Radar'),
    (r'\bTrạm radar\b', 'Trạm Radar'),
    (r'\bcơ quan năng lượng\b', 'Power Rune năng lượng'),
    (r'\bcơ chế năng lượng\b', 'Power Rune năng lượng'),
    (r'\bchassis\b', 'khung gầm'),
    (r'\bChassis\b', 'Khung gầm'),
    (r'\bbánh lái\b', 'bánh lái Swerve'),
    (r'\bBánh lái\b', 'Bánh lái Swerve'),
    (r'\bbánh xe đa hướng\b', 'bánh xe Omni'),
    (r'\bBánh xe đa hướng\b', 'Bánh xe Omni'),
    (r'\bvòng trượt\b', 'cổ góp điện trượt (Slip Ring)'),
    (r'\bVòng trượt\b', 'Cổ góp điện trượt (Slip Ring)'),
    (r'\bđộng cơ chung\b', 'động cơ khớp'),
    (r'\bĐộng cơ chung\b', 'Động cơ khớp'),
    (r'\bđộng cơ khớp F8518\b', 'động cơ khớp robot F8518'),
    (r'\bxe tăng\b', 'robot'),
    (r'\bXe tăng\b', 'Robot'),
    (r'\bmã\s+mã\s+nguồn\b', 'mã nguồn'),
    (r'\bnguồn mở\b', 'mã nguồn mở'),
    (r'\bNguồn mở\b', 'Mã nguồn mở'),
    (r'\bmã mã nguồn mở\b', 'mã nguồn mở'),
    (r'\bMã mã nguồn mở\b', 'Mã nguồn mở'),
    (r'\bmã nguồn mở & bản vẽ & bản vẽ\b', 'mã nguồn mở & bản vẽ'),
    (r'\btrọng tài\b', 'trọng tài Referee'),
    (r'\bhệ thống trọng tài Referee hệ thống trọng tài Referee\b', 'hệ thống trọng tài Referee'),
    (r'\bRobot Robot\b', 'Robot'),
    (r'\brobot robot\b', 'robot'),
    (r'【|】|\[|\]', ' '),
    (r'\s+', ' '),
]

def clean_vi_text(text):
    for pat, rep in ROBOTICS_POST_DICT:
        text = re.sub(pat, rep, text, flags=re.I)
    return text.strip()

def process_title(cand_title, current_title):
    raw = (cand_title or current_title).strip()
    
    # Extract season
    season_match = re.search(r'(?:RM|RC)?\s*(202[0-9])', raw)
    season = f"[RM{season_match.group(1)}] " if season_match else ""
    
    # Extract Affiliation & Team
    affiliation = ""
    team = ""
    for pat, name in AFFILIATIONS:
        if re.search(pat, raw):
            affiliation = name
            raw = re.sub(pat, '', raw)
            break
            
    for pat, tname in TEAM_NAMES:
        if re.search(pat, raw):
            team = tname
            raw = re.sub(pat, '', raw)
            break
            
    # Clean topic
    topic = re.sub(r'^[【\[](?:RM|RC)?\s*(?:202\d)?[A-Za-z0-9_\-\s/]*[】\]\-—\s]*', '', raw)
    topic = re.sub(r'^[【\[](.*)[】\]]$', r'\1', topic)
    topic = re.sub(r'[【】\[\]]', ' ', topic)
    topic = re.sub(r'\b(?:RM|RC)?\s*202\d\b', '', topic)
    topic = topic.replace('战队', ' ').replace('——', ' - ').replace('—', ' - ').strip(' -+:,·')
    
    # Translate topic
    vi_topic = translate_zh2vi(topic)
    
    # If still contains Chinese, translate whole topic again
    if ZH_REGEX.search(vi_topic):
        vi_topic = translate_zh2vi(vi_topic)
        
    vi_topic = clean_vi_text(vi_topic)
    
    # Build clean suffix
    suffix_parts = []
    if team:
        suffix_parts.append(f"Đội {team}")
    if affiliation:
        suffix_parts.append(affiliation)
        
    suffix = f" · {' ('.join(suffix_parts) + (')' if len(suffix_parts)>1 else '')}" if suffix_parts else ""
    
    final_title = f"{season}{vi_topic}{suffix}".strip(' -:,·')
    final_title = re.sub(r'\s+', ' ', final_title).strip()
    if final_title and final_title[0].islower():
        final_title = final_title[0].upper() + final_title[1:]
    return final_title

def extract_clean_text(html_content):
    if not html_content:
        return ""
    text = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', html_content, flags=re.I)
    text = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', text, flags=re.I)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def process_summary(html_content, current_summary):
    # Prefer clean text from body
    body_text = extract_clean_text(html_content)
    clean_curr = extract_clean_text(current_summary)
    source_text = body_text if len(body_text) >= 100 else clean_curr
    
    sample = source_text[:600]
    vi_summary = translate_zh2vi(sample)
    
    # If still contains Chinese, translate untranslated parts
    if ZH_REGEX.search(vi_summary):
        vi_summary = translate_zh2vi(vi_summary)
        
    vi_summary = clean_vi_text(vi_summary)
    
    # Neatly trim around 250-400 chars at sentence end
    if len(vi_summary) > 350:
        dot_idx = vi_summary.find('.', 250)
        if dot_idx != -1 and dot_idx < 450:
            vi_summary = vi_summary[:dot_idx + 1]
        else:
            vi_summary = vi_summary[:350].rsplit(' ', 1)[0] + '...'
            
    return vi_summary

def process_article(idx_art):
    idx, a = idx_art
    sid = a['sourceUrl'].split('/')[-1]
    cand = candidates.get(sid, {})
    
    # 1. Title
    new_title = process_title(cand.get('title'), a.get('title'))
    
    # 2. Summary
    new_summary = process_summary(a.get('html', ''), a.get('summary', ''))
    
    # 3. Category & RobotIdea
    cat = a.get('category', 'Khác')
    new_idea = f"Giải pháp kỹ thuật tham khảo từ bài viết: {new_title}. Ứng dụng thực tế và tối ưu hóa hệ thống trong phân mảng {cat}."
    
    # Strict rule: "bài ko có ảnh thì để trống"
    cover = a.get('coverImage', '').strip()
    if not cover.startswith('https://') or 'placeholder' in cover.lower() or 'default' in cover.lower():
        cover = ""
        
    return idx, {
        'title': new_title,
        'summary': new_summary,
        'robotIdea': new_idea,
        'coverImage': cover,
    }

def main():
    print(f"======================================================")
    print(f"BẮT ĐẦU DỊCH VÀ CHUẨN HÓA 100% TIẾNG VIỆT TOÀN BỘ 456 BÀI VIẾT")
    print(f"======================================================")
    
    total = len(articles)
    tasks = list(enumerate(articles))
    completed = 0
    t0 = time.time()
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_idx = {executor.submit(process_article, item): item[0] for item in tasks}
        
        for future in as_completed(future_to_idx):
            try:
                idx, res = future.result()
                articles[idx]['title'] = res['title']
                articles[idx]['summary'] = res['summary']
                articles[idx]['robotIdea'] = res['robotIdea']
                articles[idx]['coverImage'] = res['coverImage']
                completed += 1
                
                if completed % 25 == 0 or completed == total:
                    elapsed = time.time() - t0
                    print(f"[{completed}/{total}] ({completed*100/total:.1f}%) Đã dịch xong - {elapsed:.1f}s")
                    # Save intermediate cache and progress
                    json.dump(articles, open(DATA_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
                    json.dump(TRANS_CACHE, open(CACHE_FILE, 'w', encoding='utf-8'), ensure_ascii=False)
            except Exception as e:
                print(f"[ERR] Error processing article: {e}")
                
    # Final save
    json.dump(articles, open(DATA_FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    json.dump(TRANS_CACHE, open(CACHE_FILE, 'w', encoding='utf-8'), ensure_ascii=False)
    
    print(f"\n HOÀN TẤT DỊCH VÀ CHUẨN HÓA TOÀN BỘ {total} BÀI VIẾT TRONG {time.time()-t0:.1f}s!")
    
    # Audit final Chinese check
    zh_titles = [a for a in articles if ZH_REGEX.search(a.get('title', ''))]
    zh_summaries = [a for a in articles if ZH_REGEX.search(a.get('summary', ''))]
    zh_ideas = [a for a in articles if ZH_REGEX.search(a.get('robotIdea', ''))]
    
    print(f"\n--- KẾT QUẢ KIỂM TRA CHỮ TRUNG CÒN LẠI ---")
    print(f"- Tiêu đề còn chữ Trung: {len(zh_titles)}/{total}")
    print(f"- Tóm tắt còn chữ Trung: {len(zh_summaries)}/{total}")
    print(f"- Gợi ý còn chữ Trung:  {len(zh_ideas)}/{total}")
    
    if zh_titles:
        print("\nMột số tiêu đề còn sót:")
        for a in zh_titles[:5]:
            print("  *", a.get('title'))

if __name__ == '__main__':
    main()
