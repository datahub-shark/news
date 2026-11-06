import json
from translations_part1 import TRANSLATIONS_PART1
from translations_part2 import TRANSLATIONS_PART2
from translations_part3 import TRANSLATIONS_PART3
from translations_part4 import TRANSLATIONS_PART4

MASTER_TRANSLATIONS = {}
MASTER_TRANSLATIONS.update(TRANSLATIONS_PART1)
MASTER_TRANSLATIONS.update(TRANSLATIONS_PART2)
MASTER_TRANSLATIONS.update(TRANSLATIONS_PART3)
MASTER_TRANSLATIONS.update(TRANSLATIONS_PART4)

with open("grouped_chinese.json", "r", encoding="utf-8") as f:
    pages = json.load(f)

total_items = 0
missing_items = []

for p in pages:
    pno = p["page"]
    p_trans = MASTER_TRANSLATIONS.get(pno, {})
    for idx, it in enumerate(p["items"]):
        total_items += 1
        if idx not in p_trans:
            missing_items.append((pno, idx, it["text"][:40]))

print(f"Total grouped Chinese items: {total_items}")
print(f"Translated items: {total_items - len(missing_items)}")
print(f"Missing items: {len(missing_items)}")

if missing_items:
    print("\nSample missing items:")
    for m in missing_items[:15]:
        print(f"  Page {m[0]} Item {m[1]}: {repr(m[2])}")
