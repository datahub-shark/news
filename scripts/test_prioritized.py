import json

with open('data/seen_urls.json', encoding='utf-8') as f:
    seen = set(json.load(f))
with open('data/all_bbs_candidates.json', encoding='utf-8') as f:
    cand = json.load(f)

uncrawled = [c for c in cand if f"https://bbs.robomaster.com/article/{c['id']}" not in seen]

blacklist = ['赞助', '折扣', '购买', '商务', '优惠', '团购', '价格', '促销', '售卖', '抽奖', '招募', '有奖', '福利', '带货', '商机', '报名参赛攻略', '求职', '征集', '调研反馈', '就业通识']

valid = [c for c in uncrawled if not any(b in c.get('title', '') for b in blacklist)]
print(f"Total uncrawled: {len(uncrawled)}, valid after blacklist: {len(valid)}")

# Sort by technical priority
tech_kws = ['技术报告', '开源', '设计', '机械', '结构', '算法', '视觉', '自瞄', '雷达', '电控', '传承', '排球', '飞镖', '底盘', '步兵', '英雄', '哨兵', '工程', '无人机', '仿真', '控制']

def score(c):
    t = c.get('title', '')
    sc = sum(1 for k in tech_kws if k in t)
    return sc

valid.sort(key=lambda c: (score(c), int(c['id'])), reverse=True)

print("\nTop 40 prioritized uncrawled articles:")
for i, c in enumerate(valid[:40], 1):
    print(f"{i:2d}. [Score {score(c)}] [{c['id']}] {c['title']}")
