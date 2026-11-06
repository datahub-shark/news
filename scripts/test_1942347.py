import json
import re

with open('data/crawled_articles.json', 'r', encoding='utf-8') as f:
    arts = json.load(f)

for a in arts:
    if '1942347' in a['sourceUrl']:
        print('Title:', a['title'])
        for m in re.finditer(r'<a[^>]+href=([^\s>]+)', a['html']):
            print('  Link:', m.group(1))
