/**
 * Robot Ideas - Full Library Crawl (Từ Mới Nhất Đến Cũ Nhất)
 *
 * Chiến lược:
 * 1. Quét toàn bộ chuyên mục kỹ thuật & Tag IDs để phát hiện toàn bộ bài viết
 * 2. Sắp xếp thứ tự ID giảm dần (từ mới nhất đến cũ nhất)
 * 3. Lọc bỏ trùng lặp và bài viết thương mại/quảng cáo
 * 4. Bóc tách ảnh bìa chính thức từ headImg
 * 5. Tự động hóa tệp đính kèm tên tiếng Việt không dấu
 * 6. Lưu dữ liệu, xuất thư mục nháp và đồng bộ lên Google Drive
 */

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const DATA_DIR = path.resolve('data');
const HISTORY_FILE = path.join(DATA_DIR, 'seen_urls.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'crawled_articles.json');

const BLACKLIST_KEYWORDS = [
  '赞助', '折扣', '购买', '商务', '优惠', '团购', '价格', '促销', 
  '售卖', '抽奖', '招募', '有奖', '福利', '带货', '商机', '报名参赛攻略',
  'sponsor', 'discount', 'pricing', 'sale', 'deal', 'commercial', 'recruitment',
  'tài trợ', 'giảm giá', 'chiết khấu', 'quảng cáo', 'ưu đãi', 'tuyển dụng'
];

const BLACKLIST_AUTHORS = [
  'RM商务', 'RoboMaster商务', '商务', 'admin_ad', 'marketing'
];

const CATEGORY_RULES = [
  { name: 'Thị giác máy', keywords: ['视觉', 'vision', 'camera', 'yolo', 'opencv', 'npu', 'nhận diện', 'target', 'tracking', '自瞄', 'aim', 'gán nhãn', 'zeroshot'] },
  { name: 'Robot di động', keywords: ['底盘', 'chassis', 'sentry', '哨兵', 'bộ binh', 'navigation', 'slam', '四足', 'quadruped', 'robot', 'omni', 'mecanum', '轮足', 'bánh xe'] },
  { name: 'Điều khiển', keywords: ['电控', 'control', 'pid', 'imu', 'kalman', 'mã hóa', 'động cơ', 'vô tuyến', 'motor', 'uart', 'can', 'can bus', 'mpc', 'leso', 'firmware'] },
  { name: 'Cơ khí', keywords: ['机械', 'bản vẽ', 'cad', 'solidworks', 'sw', 'chuỗi động học', 'khung', 'bánh đà', 'ma sát', 'kết cấu', 'gimbal', 'bệ ngắm', 'feed'] },
  { name: 'AI & ROS', keywords: ['ros', 'ros2', 'mujoco', 'agent', 'mô phỏng', 'simulation', 'ai', 'nơ-ron', 'deep learning', 'vlm', 'llm'] }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadSeenUrls() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      return new Set(Array.isArray(data) ? data : []);
    } catch {
      return new Set();
    }
  }
  return new Set();
}

function saveSeenUrls(seenSet) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([...seenSet], null, 2), 'utf8');
}

function evaluateArticle(title, author, contentSnippet = '') {
  const lowerTitle = (title || '').toLowerCase();
  const lowerAuthor = (author || '').toLowerCase();
  const lowerSnippet = (contentSnippet || '').toLowerCase();

  for (const blAuthor of BLACKLIST_AUTHORS) {
    if (lowerAuthor.includes(blAuthor.toLowerCase())) {
      return { skip: true, reason: `Tác giả quảng cáo (${blAuthor})` };
    }
  }

  for (const kw of BLACKLIST_KEYWORDS) {
    if (lowerTitle.includes(kw.toLowerCase())) {
      return { skip: true, reason: `Tiêu đề chứa từ khóa quảng cáo/tài trợ [${kw}]` };
    }
  }

  for (const kw of ['赞助物资', '购买折扣', '限时优惠', '优惠政策']) {
    if (lowerSnippet.includes(kw)) {
      return { skip: true, reason: `Nội dung chứa từ khóa tài trợ/giảm giá [${kw}]` };
    }
  }

  return { skip: false };
}

function detectCategory(title, content = '') {
  const text = (title + ' ' + content).toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return rule.name;
    }
  }
  return 'Khác';
}

function cleanText(str) {
  let s = String(str || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractOfficialCover(artHtml, bodyHtml) {
  try {
    const nuxtScript = (artHtml || '').match(/<script>\s*window\.__NUXT__\s*=([\s\S]*?)<\/script>/);
    if (nuxtScript) {
      const code = nuxtScript[1].trim().replace(/;$/, '');
      const data = eval(code);
      const jsonStr = JSON.stringify(data);
      const headMatch = jsonStr.match(/"headImg":\s*("\[.*?\]")/);
      if (headMatch) {
        const parsed = JSON.parse(JSON.parse(headMatch[1]));
        const valid = parsed.find(img => img.url && !img.url.endsWith('.gif')) || parsed[0];
        if (valid && valid.url && valid.url.startsWith('http')) {
          return valid.url;
        }
      }
    }
  } catch {}

  if (bodyHtml) {
    const matches = [...bodyHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
    const valid = matches.filter(url => {
      if (!url.startsWith('http')) return false;
      if (/emoji|avatar|icon|badge/i.test(url)) return false;
      return true;
    });
    if (valid.length > 0) return valid[0];
  }

  return '';
}

export async function crawlFullLibrary(options = {}) {
  const limit = options.limit || 30;
  const seenUrls = loadSeenUrls();
  const virtualConsole = new VirtualConsole();

  console.log(`\n======================================================`);
  console.log(`🤖 ROBOT IDEAS - BỘ THU THẬP TỔNG HỢP (MỚI NHẤT -> CŨ NHẤT)`);
  console.log(`Mục tiêu cào đợt này: ${limit} bài viết mới nhất`);
  console.log(`Số bài đã có trong lịch sử: ${seenUrls.size}`);
  console.log(`======================================================\n`);

  // 1. Quét tìm toàn bộ ID bài viết từ các chuyên mục & Tag kỹ thuật
  const categories = ['机械', '嵌入式', '算法', '软件', '硬件', 'AI'];
  const tagIds = [20, 21, 22, 23, 24, 25, 26, 28, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 44, 49, 50, 54, 55, 57, 80];

  const articleCandidateMap = new Map();

  console.log(`🔍 Đang quét danh sách bài viết từ RoboMaster BBS...`);

  // Quét theo categories
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
          if (!articleCandidateMap.has(a.id)) {
            articleCandidateMap.set(a.id, { id: a.id, title: a.title });
          }
        }
      }
      await sleep(150);
    } catch (e) {}
  }

  // Quét theo tagIds
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
          if (!articleCandidateMap.has(a.id)) {
            articleCandidateMap.set(a.id, { id: a.id, title: a.title });
          }
        }
      }
      await sleep(150);
    } catch (e) {}
  }

  // 2. SẮP XẾP TỪ MỚI NHẤT ĐẾN CŨ NHẤT (ID GIẢM DẦN)
  const sortedCandidates = [...articleCandidateMap.values()]
    .sort((a, b) => Number(b.id) - Number(a.id));

  console.log(`✅ Đã tìm thấy tổng cộng ${sortedCandidates.length} bài viết kỹ thuật.`);
  console.log(`👉 Bắt đầu cào chi tiết từ bài mới nhất xuống cũ nhất...\n`);

  let existingArticles = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingArticles = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    } catch {
      existingArticles = [];
    }
  }

  const results = [];
  let processed = 0;
  let skippedDuplicates = 0;
  let skippedAds = 0;

  for (const item of sortedCandidates) {
    if (results.length >= limit) break;

    const url = `https://bbs.robomaster.com/article/${item.id}`;

    if (seenUrls.has(url)) {
      skippedDuplicates++;
      continue;
    }

    try {
      processed++;
      const artRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!artRes.ok) continue;
      const artHtml = await artRes.text();

      const dom = new JSDOM(artHtml, { virtualConsole });
      const doc = dom.window.document;

      const rawTitle = doc.querySelector('title')?.textContent || item.title || '';
      let title = cleanText(rawTitle.replace(/-RoboMaster.*$/, ''));
      title = title.replace(/^[【\[][^】\]]*(?:战队|大学|联队|高校|AWARD|RM202\d|赛季)[^】\]]*[】\]]\s*/i, '')
                   .replace(/^[【\[][^】\]]*[】\]]\s*/, '').trim();

      const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const summary = cleanText(metaDesc).slice(0, 500);

      const authorMatch = doc.querySelector('.author-name, .user-name, [class*="author"]')?.textContent || '';
      const author = cleanText(authorMatch) || 'Cộng đồng RoboMaster';

      const evalResult = evaluateArticle(title, author, summary);
      if (evalResult.skip) {
        console.log(`🚫 [BỎ QUA - ADS] [${item.id}] ${title.slice(0, 45)}...`);
        console.log(`   └─ Lý do: ${evalResult.reason}`);
        seenUrls.add(url);
        skippedAds++;
        continue;
      }

      let bodyHtml = '';
      const nuxtContentMatch = artHtml.match(/htmlContent:\s*"((?:\\.|[^"\\])*)"/);
      if (nuxtContentMatch) {
        try {
          bodyHtml = JSON.parse('"' + nuxtContentMatch[1] + '"');
        } catch {}
      }
      if (!bodyHtml) {
        const contentEl = doc.querySelector('#rick-viewer-container, .library-detail-content-detail, [class*="content-detail"]');
        bodyHtml = contentEl && !contentEl.innerHTML.includes('client-only-placeholder') ? contentEl.innerHTML : '';
      }
      if (!bodyHtml) {
        bodyHtml = `<p>${summary}</p>`;
      }

      const category = detectCategory(title, summary);
      const createAtMatch = artHtml.match(/createAt:"([^"]+)"/);
      const updateAtMatch = artHtml.match(/updateAt:"([^"]+)"/);
      const createdAt = createAtMatch ? createAtMatch[1] : new Date().toISOString();
      const publishedAt = updateAtMatch ? updateAtMatch[1] : createdAt;

      const coverImage = extractOfficialCover(artHtml, bodyHtml);

      const articleData = {
        title,
        summary: summary || title,
        category,
        author,
        coverImage,
        sourceName: 'RoboMaster BBS',
        sourceUrl: url,
        robotIdea: `Giải pháp kỹ thuật tham khảo từ bài viết: ${title}. Ứng dụng trong phân mảng ${category}.`,
        html: bodyHtml,
        createdAt,
        publishedAt,
        scrapedAt: new Date().toISOString()
      };

      results.push(articleData);
      existingArticles.push(articleData);
      seenUrls.add(url);

      console.log(`📥 [${results.length}/${limit}] (Mới) [${item.id}] ${title.slice(0, 50)}...`);
      console.log(`   └─ Chuyên mục: ${category} | Ảnh bìa: ${coverImage ? '✅ Có' : '❌ Chưa có'}`);

      // Nghỉ nhẹ 350ms để không bị CDN bóp nghẽn
      await sleep(350);
    } catch (err) {
      console.error(`⚠️ Lỗi khi cào ${url}: ${err.message}`);
    }
  }

  // 3. Lưu kết quả
  saveSeenUrls(seenUrls);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingArticles, null, 2), 'utf8');

  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN THÀNH CÀO DỮ LIỆU!`);
  console.log(`- Bài viết mới thu nạp: ${results.length}`);
  console.log(`- Đã bỏ qua trùng lặp: ${skippedDuplicates}`);
  console.log(`- Đã lọc bài quảng cáo: ${skippedAds}`);
  console.log(`- Tổng kho bài hiện tại: ${existingArticles.length} bài viết`);
  console.log(`======================================================\n`);

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('crawl-full-library.mjs')) {
  const customLimit = process.argv[2] ? parseInt(process.argv[2], 10) : 50;
  crawlFullLibrary({ limit: customLimit });
}
