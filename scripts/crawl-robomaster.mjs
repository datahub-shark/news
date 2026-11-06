/**
 * Robot Ideas - RoboMaster Article Aggregator & Filter
 *
 * Chức năng:
 * 1. Cào danh sách bài viết từ https://bbs.robomaster.com/article
 * 2. Lọc trùng lặp theo URL/ID (so khớp với lịch sử và database Robot Ideas)
 * 3. Lọc bỏ bài viết quảng cáo, tài trợ, mua bán linh kiện, giảm giá
 * 4. Tự động phân loại chuyên mục và trích xuất tóm tắt cho Robot Ideas
 * 5. Lưu kết quả ra file JSON sẵn sàng import vào hệ thống
 */

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

// URL cấu hình
const BBS_ARTICLE_LIST_URL = 'https://bbs.robomaster.com/article';
const DATA_DIR = path.resolve('data');
const HISTORY_FILE = path.join(DATA_DIR, 'seen_urls.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'crawled_articles.json');

// 1. Bộ từ khóa Blacklist (Quảng cáo, tài trợ, chiết khấu, mua bán, tuyển dụng)
const BLACKLIST_KEYWORDS = [
  '赞助', '折扣', '购买', '商务', '优惠', '团购', '价格', '促销', 
  '售卖', '抽奖', '招募', '有奖', '福利', '带货', '商机',
  'sponsor', 'discount', 'pricing', 'sale', 'deal', 'commercial', 'recruitment',
  'tài trợ', 'giảm giá', 'chiết khấu', 'quảng cáo', 'ưu đãi', 'tuyển dụng'
];

const BLACKLIST_AUTHORS = [
  'RM商务', 'RoboMaster商务', '商务', 'admin_ad', 'marketing'
];

// 2. Quy tắc phân loại chuyên mục (Categories của Robot Ideas)
const CATEGORY_RULES = [
  { name: 'Thị giác máy', keywords: ['视觉', 'vision', 'camera', 'yolo', 'opencv', 'npu', 'nhận diện', 'target', 'tracking'] },
  { name: 'Robot di động', keywords: ['底盘', 'chassis', 'sentry', '哨兵', 'bộ binh', 'navigation', 'slam', '四足', 'quadruped', 'robot'] },
  { name: 'Điều khiển', keywords: ['电控', 'control', 'pid', 'imu', 'kalman', 'mã hóa', 'động cơ', 'vô tuyến', 'motor', 'uart', 'can'] },
  { name: 'Cơ khí', keywords: ['机械', 'bản vẽ', 'cad', 'solidworks', 'sw', 'chuỗi động học', 'khung', 'bánh đà', 'ma sát', 'kết cấu'] },
  { name: 'AI & ROS', keywords: ['ros', 'ros2', 'mujoco', 'agent', 'mô phỏng', 'simulation', 'ai', 'nơ-ron', 'deep learning'] }
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSeenUrls() {
  ensureDataDir();
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
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([...seenSet], null, 2), 'utf8');
}

/**
 * Kiểm tra xem bài viết có phải quảng cáo/tài trợ cần bỏ qua không
 */
function evaluateArticle(title, author, contentSnippet = '') {
  const lowerTitle = (title || '').toLowerCase();
  const lowerAuthor = (author || '').toLowerCase();
  const lowerSnippet = (contentSnippet || '').toLowerCase();

  // Kiểm tra tác giả
  for (const blAuthor of BLACKLIST_AUTHORS) {
    if (lowerAuthor.includes(blAuthor.toLowerCase())) {
      return { skip: true, reason: `Tác giả quảng cáo/thương mại (${blAuthor})` };
    }
  }

  // Kiểm tra từ khóa trong tiêu đề
  for (const kw of BLACKLIST_KEYWORDS) {
    if (lowerTitle.includes(kw.toLowerCase())) {
      return { skip: true, reason: `Tiêu đề chứa từ khóa quảng cáo/tài trợ [${kw}]` };
    }
  }

  // Kiểm tra từ khóa trong đoạn trích mở đầu
  for (const kw of ['赞助物资', '购买折扣', '限时优惠', '优惠政策']) {
    if (lowerSnippet.includes(kw)) {
      return { skip: true, reason: `Nội dung mở đầu chứa từ khóa tài trợ/giảm giá [${kw}]` };
    }
  }

  return { skip: false };
}

/**
 * Tự động gán chuyên mục dựa trên từ khóa
 */
function detectCategory(title, content = '') {
  const text = (title + ' ' + content).toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return rule.name;
    }
  }
  return 'Khác';
}

/**
 * Làm sạch chuỗi văn bản
 */
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

/**
 * Thu thập và tổng hợp bài viết
 */
export async function crawlRoboMasterArticles(options = {}) {
  const limit = options.limit || 10;
  const seenUrls = loadSeenUrls();
  const virtualConsole = new VirtualConsole(); // Tắt cảnh báo CSS từ jsdom

  console.log(`\n======================================================`);
  console.log(`🤖 ROBOT IDEAS - BỘ THU THẬP & LỌC BÀI TỰ ĐỘNG`);
  console.log(`Đang kiểm tra: ${BBS_ARTICLE_LIST_URL}`);
  console.log(`Lịch sử URL đã đọc: ${seenUrls.size} bài`);
  console.log(`======================================================\n`);

  // 1. Tải trang danh sách
  const listRes = await fetch(BBS_ARTICLE_LIST_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!listRes.ok) {
    throw new Error(`Không thể kết nối bbs.robomaster: ${listRes.status} ${listRes.statusText}`);
  }
  const listHtml = await listRes.text();

  // Bóc tách danh sách link bài dạng /article/123456
  const matchedPaths = listHtml.match(/\/article\/\d+/g) || [];
  const uniqueUrls = [...new Set(matchedPaths)].map(p => `https://bbs.robomaster.com${p}`);

  console.log(`Tìm thấy ${uniqueUrls.length} link bài viết trên trang danh sách.`);

  const results = [];
  let skippedDuplicates = 0;
  let skippedAds = 0;

  for (const url of uniqueUrls) {
    if (results.length >= limit) break;

    // Tầng 1: Lọc trùng lặp URL
    if (seenUrls.has(url)) {
      console.log(`⏭️  [TRÙNG LẶP] Đã đọc trước đó: ${url}`);
      skippedDuplicates++;
      continue;
    }

    try {
      // 2. Tải trang chi tiết bài viết
      const artRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!artRes.ok) continue;
      const artHtml = await artRes.text();

      const dom = new JSDOM(artHtml, { virtualConsole });
      const doc = dom.window.document;

      const rawTitle = doc.querySelector('title')?.textContent || '';
      let title = cleanText(rawTitle.replace(/-RoboMaster.*$/, ''));
      // Chắt lọc tri thức: Loại bỏ các tiền tố tên đội thi, trường học, mùa giải
      title = title.replace(/^[【\[][^】\]]*(?:战队|大学|联队|高校|AWARD|RM202\d|赛季)[^】\]]*[】\]]\s*/i, '')
                   .replace(/^[【\[][^】\]]*[】\]]\s*/, '').trim();
      
      const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const summary = cleanText(metaDesc).slice(0, 500);

      // Tìm tên tác giả
      const authorMatch = doc.querySelector('.author-name, .user-name, [class*="author"]')
        ?.textContent || '';
      const author = cleanText(authorMatch) || 'Cộng đồng RoboMaster';

      // Tầng 2: Lọc bài quảng cáo / tài trợ / chiết khấu
      const evalResult = evaluateArticle(title, author, summary);
      if (evalResult.skip) {
        console.log(`🚫 [BỎ QUA - ADS] ${title.slice(0, 45)}...`);
        console.log(`   └─ Lý do: ${evalResult.reason}`);
        seenUrls.add(url); // Đánh dấu đã duyệt để lần sau không cào lại
        skippedAds++;
        continue;
      }

      // 3. Trích xuất nội dung HTML chính
      // RoboMaster BBS render bài viết bằng Nuxt client-only, nội dung gốc nằm trong htmlContent của Nuxt state
      let bodyHtml = '';
      const nuxtContentMatch = artHtml.match(/htmlContent:\s*"((?:\\.|[^"\\])*)"/);
      if (nuxtContentMatch) {
        try {
          bodyHtml = JSON.parse('"' + nuxtContentMatch[1] + '"');
        } catch {}
      }

      // Fallback nếu không có Nuxt state
      if (!bodyHtml) {
        const contentEl = doc.querySelector('#rick-viewer-container, .library-detail-content-detail, [class*="content-detail"]');
        bodyHtml = contentEl && !contentEl.innerHTML.includes('client-only-placeholder') ? contentEl.innerHTML : '';
      }
      if (!bodyHtml) {
        bodyHtml = `<p>${summary}</p>`;
      }
      const category = detectCategory(title, summary);

      // Trích xuất mốc thời gian xuất bản nguyên tác từ Nuxt SSR
      const createAtMatch = artHtml.match(/createAt:"([^"]+)"/);
      const updateAtMatch = artHtml.match(/updateAt:"([^"]+)"/);
      const createdAt = createAtMatch ? createAtMatch[1] : new Date().toISOString();
      const publishedAt = updateAtMatch ? updateAtMatch[1] : createdAt;

      const articleData = {
        title,
        summary: summary || title,
        category,
        author,
        sourceName: 'RoboMaster BBS',
        sourceUrl: url,
        robotIdea: `Giải pháp kỹ thuật tham khảo từ bài viết: ${title}. Ứng dụng trong phân mảng ${category}.`,
        html: bodyHtml,
        createdAt,
        publishedAt,
        scrapedAt: new Date().toISOString()
      };

      results.push(articleData);
      seenUrls.add(url);

      console.log(`✅ [CHẤP NHẬN] [${category}] ${title.slice(0, 55)}...`);

    } catch (err) {
      console.warn(`⚠️ Lỗi khi đọc bài ${url}:`, err.message);
    }
  }

  // 4. Lưu lại lịch sử duyệt và kết quả
  saveSeenUrls(seenUrls);

  if (results.length > 0) {
    let existingOutputs = [];
    if (fs.existsSync(OUTPUT_FILE)) {
      try { existingOutputs = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); } catch {}
    }
    const combined = [...results, ...existingOutputs];
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combined, null, 2), 'utf8');
  }

  console.log(`\n================ BÁO CÁO THU THẬP ================`);
  console.log(`Tổng bài mới hợp lệ:   ${results.length}`);
  console.log(`Bỏ qua do trùng lặp:    ${skippedDuplicates}`);
  console.log(`Bỏ qua do quảng cáo:   ${skippedAds}`);
  console.log(`Dữ liệu lưu tại:       ${OUTPUT_FILE}`);
  console.log(`==================================================\n`);

  return results;
}

// Chạy trực tiếp nếu gọi từ command line
if (process.argv[1] && process.argv[1].endsWith('crawl-robomaster.mjs')) {
  crawlRoboMasterArticles({ limit: 5 }).catch(console.error);
}
