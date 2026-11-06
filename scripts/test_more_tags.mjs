import fs from 'node:fs';

async function scanMoreTags() {
  const discovered = new Map();
  console.log('Scanning tagId from 121 to 250...');
  
  for (let tagId = 121; tagId <= 250; tagId++) {
    try {
      const url = `https://bbs.robomaster.com/forum?page=1&tagId=${tagId}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const html = await res.text();
      const matches = [...html.matchAll(/\/article\/(\d+)/g)].map(m => m[1]);
      if (matches.length > 0) {
        console.log(`TagId ${tagId}: found ${matches.length} articles!`);
        matches.forEach(id => discovered.set(id, true));
      }
    } catch (e) {}
  }
  console.log('Total unique articles found from tags 121..250:', discovered.size);
}

scanMoreTags();
