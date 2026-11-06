import fs from 'node:fs';

// Load seen URLs
let seen = new Set();
try {
  seen = new Set(JSON.parse(fs.readFileSync('data/seen_urls.json', 'utf8')));
} catch {}

const categories = ['全部', '机械', '嵌入式', '算法', '软件', '硬件', 'AI', '运营', '赛事', '规则'];
const tagIds = Array.from({ length: 120 }, (_, i) => i + 1);

async function collectAll() {
  const articleMap = new Map();

  for (const cat of categories) {
    try {
      const url = `https://bbs.robomaster.com/article?category=${encodeURIComponent(cat)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const html = await res.text();
      const nuxtScript = html.match(/<script>\s*window\.__NUXT__\s*=([\s\S]*?)<\/script>/);
      if (nuxtScript) {
        const code = nuxtScript[1].trim().replace(/;$/, '');
        const data = eval(code);
        const list = data.data[1]?.articleList || [];
        for (const a of list) {
          if (!articleMap.has(a.id)) {
            articleMap.set(a.id, { id: a.id, title: a.title, category: cat, headImg: a.headImg });
          }
        }
      }
    } catch (e) {}
  }

  for (const tagId of tagIds) {
    try {
      const url = `https://bbs.robomaster.com/article?tagId=${tagId}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const html = await res.text();
      const nuxtScript = html.match(/<script>\s*window\.__NUXT__\s*=([\s\S]*?)<\/script>/);
      if (nuxtScript) {
        const code = nuxtScript[1].trim().replace(/;$/, '');
        const data = eval(code);
        const list = data.data[1]?.articleList || [];
        for (const a of list) {
          if (!articleMap.has(a.id)) {
            articleMap.set(a.id, { id: a.id, title: a.title, tagId, headImg: a.headImg });
          }
        }
      }
    } catch (e) {}
  }

  const sorted = [...articleMap.values()].sort((a, b) => Number(b.id) - Number(a.id));
  fs.writeFileSync('data/all_bbs_candidates.json', JSON.stringify(sorted, null, 2), 'utf8');
  console.log(`Saved ${sorted.length} total candidates to data/all_bbs_candidates.json`);
  
  const uncrawled = sorted.filter(a => !seen.has(`https://bbs.robomaster.com/article/${a.id}`));
  console.log(`Uncrawled: ${uncrawled.length}`);
}

collectAll();
