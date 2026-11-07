import json
import time
import re
import urllib.request
from pathlib import Path
from editorial_auth import (get_editorial_token, get_editorial_api_url,
                            assert_editorial_action, redact_editorial_error)

DATA_FILE = Path('data/crawled_articles.json')
ZH_REGEX = re.compile(r'[\u4e00-\u9fa5]')

def call_api(action, payload=None, retries=3):
    if payload is None:
        payload = {}
    token = get_editorial_token(require_admin=True)
    assert_editorial_action(action, payload)
    data_dict = {'action': action, 'payload': {**payload, 'token': token}}
    req = urllib.request.Request(
        get_editorial_api_url(),
        data=json.dumps(data_dict).encode('utf-8'),
        headers={'Content-Type': 'text/plain;charset=UTF-8'}
    )
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                if not res.get('ok'):
                    raise Exception(redact_editorial_error(res.get('error', 'API error')))
                return res
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1.0 + attempt * 0.5)
            else:
                raise e

def main():
    get_editorial_token(require_admin=True)
    print("======================================================")
    print("☁️ ĐỒNG BỘ NỘI DUNG HTML TIẾNG VIỆT LÊN GOOGLE SHEETS QUEUE")
    print("======================================================")

    if not DATA_FILE.exists():
        print("Không tìm thấy data/crawled_articles.json")
        return

    local_articles = json.load(open(DATA_FILE, encoding='utf-8'))
    print(f"Tổng bài viết cục bộ: {len(local_articles)}")

    # Index local articles by sourceUrl and BBS thread ID
    local_by_url = {}
    local_by_id = {}
    for a in local_articles:
        url = a.get('sourceUrl', '')
        if url:
            local_by_url[url] = a
            sid = url.split('/')[-1]
            if sid:
                local_by_id[sid] = a

    print("📡 Đang tải danh sách bài viết từ Google Sheets...")
    list_res = call_api('list')
    queue_articles = list_res.get('articles', [])
    print(f"Đã tải {len(queue_articles)} bài từ Google Sheets.")

    # Match and prepare update list
    candidates = []
    for qa in queue_articles:
        url = qa.get('sourceUrl', '')
        matched = local_by_url.get(url)
        if not matched and url:
            sid = url.split('/')[-1]
            matched = local_by_id.get(sid)
        if matched and matched.get('html'):
            candidates.append((qa, matched))

    print(f"Khớp được {len(candidates)} bài viết với dữ liệu cục bộ.")

    success_count = 0
    fail_count = 0
    t0 = time.time()

    for i, (qa, local_art) in enumerate(candidates, 1):
        art_id = qa.get('id')
        title = qa.get('title', '')[:35]
        local_html = local_art.get('html', '')
        cn_count = len(ZH_REGEX.findall(local_html))

        # Push clean HTML update directly using version from list
        save_payload = {
            'article': {
                'id': art_id,
                'version': qa.get('version'),
                'status': qa.get('status', 'pending'),
                'title': local_art.get('title') or qa.get('title'),
                'summary': local_art.get('summary') or qa.get('summary'),
                'robotIdea': local_art.get('robotIdea') or qa.get('robotIdea', ''),
                'category': local_art.get('category') or qa.get('category', 'Khác'),
                'tags': local_art.get('tags') or qa.get('tags', ''),
                'coverImage': local_art.get('coverImage') or qa.get('coverImage', ''),
                'sourceName': 'RoboMaster BBS',
                'sourceUrl': local_art.get('sourceUrl') or qa.get('sourceUrl', ''),
                'createdAt': qa.get('createdAt'),
                'html': local_html
            }
        }

        retries = 3
        saved = False
        while retries > 0 and not saved:
            try:
                save_res = call_api('save', save_payload)
                success_count += 1
                saved = True
                if i % 10 == 0 or i == len(candidates):
                    elapsed = time.time() - t0
                    print(f"[{i}/{len(candidates)}] ✅ Cập nhật HTML: {title}... | Chữ Trung HTML: {cn_count} | {elapsed:.1f}s")
                time.sleep(0.3) # Avoid LockService contention
            except Exception as e:
                err_msg = str(e)
                if 'phiên khác' in err_msg:
                    # Version mismatch: refresh version with get
                    try:
                        fresh = call_api('get', {'id': art_id})
                        save_payload['article']['version'] = fresh.get('article', {}).get('version')
                    except Exception:
                        pass
                retries -= 1
                if retries == 0:
                    fail_count += 1
                    print(f"[{i}/{len(candidates)}] ❌ Thất bại {art_id} ({title}): {e}")
                else:
                    time.sleep(1.0)

    elapsed = time.time() - t0
    print("\n======================================================")
    print(f"🎉 HOÀN THÀNH ĐỒNG BỘ HTML LÊN GOOGLE SHEETS TRONG {elapsed:.1f}s!")
    print(f"- Thành công: {success_count}")
    print(f"- Thất bại: {fail_count}")
    print("======================================================")

if __name__ == '__main__':
    main()
