import sqlite3
import os
import shutil
import json

db_path = os.path.expandvars(r'%LOCALAPPDATA%\Google\DriveFS\101739131345724974215\metadata_sqlite_db')
temp_db = 'temp_metadata.db'
shutil.copy2(db_path, temp_db)
wal = db_path + '-wal'
if os.path.exists(wal): shutil.copy2(wal, temp_db + '-wal')

conn = sqlite3.connect(temp_db)
cur = conn.cursor()

# 1. Fetch all items
cur.execute('SELECT stable_id, id, local_title, is_folder, mime_type, file_size FROM items WHERE trashed = 0;')
items = {r[0]: {'stable_id': r[0], 'id': r[1], 'title': r[2], 'is_folder': bool(r[3]), 'mime_type': r[4], 'size': r[5]} for r in cur.fetchall()}

# 2. Fetch all parent links
cur.execute('SELECT item_stable_id, parent_stable_id FROM stable_parents;')
parents = {r[0]: r[1] for r in cur.fetchall()}

conn.close()
for f in [temp_db, temp_db + '-wal']:
    if os.path.exists(f): os.remove(f)

# Find 'Robot Ideas Articles' root
root_id = None
for s_id, it in items.items():
    if it['title'] == 'Robot Ideas Articles' and it['is_folder']:
        root_id = s_id
        break

print(f"Found 'Robot Ideas Articles' root: stable_id={root_id}, drive_id={items[root_id]['id'] if root_id else 'None'}")

def get_path(stable_id):
    path_parts = []
    curr = stable_id
    visited = set()
    while curr and curr in items and curr not in visited:
        visited.add(curr)
        path_parts.append(items[curr]['title'])
        if curr == root_id:
            break
        curr = parents.get(curr)
    if curr == root_id and len(path_parts) > 1:
        path_parts.reverse()
        return '/'.join(path_parts[1:]) # Drops 'Robot Ideas Articles'
    return None

drive_file_map = {}
for s_id, it in items.items():
    p = get_path(s_id)
    if p:
        drive_file_map[p] = {
            'drive_id': it['id'],
            'title': it['title'],
            'is_folder': it['is_folder'],
            'mime_type': it['mime_type'],
            'size': it['size'],
            'web_view_url': f"https://drive.google.com/file/d/{it['id']}/view?usp=sharing" if not it['is_folder'] else f"https://drive.google.com/drive/folders/{it['id']}?usp=sharing",
            'download_url': f"https://drive.google.com/uc?export=download&id={it['id']}" if not it['is_folder'] else None
        }

print(f"Total mapped files & folders in 'Robot Ideas Articles': {len(drive_file_map)}")

# Attachment files
att_files = {k: v for k, v in drive_file_map.items() if '/attachments/' in k}
print(f"Total attachment files mapped: {len(att_files)}")

# Print 15 samples
print("\nSample 15 mapped attachment files:")
for k in list(att_files.keys())[:15]:
    print(f"  {k} -> {att_files[k]['web_view_url']}")

# Also build index mapping by article id (the leading numeric thread id)
by_article_id = {}
for path_key, val in drive_file_map.items():
    parts = path_key.split('/')
    article_folder = parts[0]
    art_id = article_folder.split('-')[0]
    if art_id not in by_article_id:
        by_article_id[art_id] = {
            'folder_name': article_folder,
            'folder_url': f"https://drive.google.com/drive/folders/{val['drive_id']}?usp=sharing" if val['is_folder'] and len(parts)==1 else None,
            'attachments': {}
        }
    if len(parts) == 1 and val['is_folder']:
        by_article_id[art_id]['folder_url'] = val['web_view_url']
    elif len(parts) == 2 and parts[1] == 'attachments' and val['is_folder']:
        by_article_id[art_id]['attachments_folder_url'] = val['web_view_url']
    elif len(parts) == 3 and parts[1] == 'attachments':
        filename = parts[2]
        by_article_id[art_id]['attachments'][filename] = val

with open('data/drive_file_map.json', 'w', encoding='utf-8') as f:
    json.dump({
        'paths': drive_file_map,
        'by_article_id': by_article_id
    }, f, ensure_ascii=False, indent=2)

print("\nSaved full mapping to data/drive_file_map.json")
