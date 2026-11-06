const categories = ['机械', '嵌入式', '算法', '软件', '硬件', 'AI'];
const tagIds = [
  // Cơ khí
  20, 21, 22, 23, 24, 25, 26, 28,
  // Nhúng & Điều khiển
  30, 31, 32, 33, 34, 35, 36, 37, 39,
  // Phần mềm & Mô phỏng
  40, 41, 42,
  // Phần cứng
  44,
  // Thuật toán & Thị giác
  49, 50, 54, 55, 57,
  // AI
  80
];

const articleMap = new Map(); // id -> basic info

console.log('--- Collecting from categories ---');
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
      console.log(`Cat [${cat}] -> ${list.length} articles (Total unique: ${articleMap.size})`);
    }
  } catch (err) {
    console.error(`Cat ${cat} err:`, err.message);
  }
}

console.log('\n--- Collecting from technical tagIds ---');
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
      let newCount = 0;
      for (const a of list) {
        if (!articleMap.has(a.id)) {
          articleMap.set(a.id, { id: a.id, title: a.title, tagId, headImg: a.headImg });
          newCount++;
        }
      }
      if (newCount > 0) {
        console.log(`Tag [${tagId}] -> +${newCount} new articles (Total unique: ${articleMap.size})`);
      }
    }
  } catch (err) {
    console.error(`Tag ${tagId} err:`, err.message);
  }
}

const sortedArticles = [...articleMap.values()].sort((a, b) => Number(b.id) - Number(a.id));
console.log(`\nTOTAL UNIQUE ARTICLES FOUND: ${sortedArticles.length}`);
console.log('Newest 5:');
sortedArticles.slice(0, 5).forEach(a => console.log(`  [${a.id}] ${a.title.slice(0, 60)}`));
console.log('Oldest 5:');
sortedArticles.slice(-5).forEach(a => console.log(`  [${a.id}] ${a.title.slice(0, 60)}`));
