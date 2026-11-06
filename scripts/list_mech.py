import json

with open('data/seen_urls.json', encoding='utf-8') as f:
    seen = set(json.load(f))
with open('data/all_bbs_candidates.json', encoding='utf-8') as f:
    candidates = json.load(f)

uncrawled = [c for c in candidates if f"https://bbs.robomaster.com/article/{c['id']}" not in seen]
mech_kws = ['机械', '结构', '发射', '供弹', '底盘', '云台', '平衡', '步兵', '英雄', '哨兵', '工程', '无人机', '夹爪', '连杆', '减速', '电机', 'cad', 'step', 'sw', 'solidworks', '3d', '舵轮', '轮足', '轮腿']
mech = [c for c in uncrawled if any(k in c['title'].lower() for k in mech_kws)]

print(f"Total uncrawled mechanical: {len(mech)}")
for i, c in enumerate(mech, 1):
    print(f"{i:2d}. [{c['id']}] {c['title']}")
