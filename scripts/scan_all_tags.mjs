// Scan all tag IDs from 1 to 100 and categories
import fs from 'node:fs';

const categories = ['全部', '机械', '嵌入式', '算法', '软件', '硬件', 'AI', '运营', '赛事', '规则'];
const articleMap = new Map();

async function scan() {
  console.log('--- Scanning categories ---');
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
            articleMap.set(a.id, { id: a.id, title: a.title });
          }
        }
        console.log(`Category [${cat}]: found ${list.length} articles (Total unique: ${articleMap.size})`);
      }
    } catch (e) {}
  }

  console.log('\n--- Scanning tag IDs 1 to 120 ---');
  for (let tagId = 1; tagId <= 120; tagId++) {
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
        if (list.length > 0) {
          let added = 0;
          for (const a of list) {
            if (!articleMap.has(a.id)) {
              articleMap.set(a.id, { id: a.id, title: a.title, tagId });
              added++;
            }
          }
          console.log(`Tag [${tagId}]: ${list.length} articles (+${added} new) -> Total unique: ${articleMap.size}`);
        }
      }
    } catch (e) {}
  }

  console.log(`\n========================================`);
  console.log(`TOTAL UNIQUE ARTICLES DISCOVERED: ${articleMap.size}`);
  const sorted = [...articleMap.values()].sort((a, b) => Number(b.id) - Number(a.id));
  
  // Load seen URLs to see how many are new
  let seen = new Set();
  try {
    seen = new Set(JSON.parse(fs.readFileSync('data/seen_urls.json', 'utf8')));
  } catch {}
  
  const uncrawled = sorted.filter(a => !seen.has(`https://bbs.robomaster.com/article/${a.id}`));
  console.log(`Articles already crawled: ${sorted.length - uncrawled.length}`);
  console.log(`Articles NOT yet crawled: ${uncrawled.length}`);
  console.log(`Newest 10 uncrawled:`);
  uncrawled.slice(0, 10).forEach(a => console.log(`  [${a.id}] ${a.title}`));
}

scan();
