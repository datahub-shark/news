/**
 * Robot Ideas - Multi-Source Universal Aggregator & Deduplicator
 *
 * Tính năng:
 * 1. Đọc danh sách các nguồn từ config/sources.json (Dễ dàng thêm/bớt website).
 * 2. Tự động trích xuất nội dung thông minh bằng Mozilla Readability nếu không có selector.
 * 3. Chống trùng lặp chéo giữa tất cả các nguồn qua data/seen_urls.json.
 * 4. Lọc bỏ bài viết quảng cáo, tài trợ, chiết khấu, mua bán linh kiện.
 * 5. Tự động phân loại chuyên mục và chuẩn hóa theo hệ thống Robot Ideas.
 */

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';

const CONFIG_FILE = path.resolve('config/sources.json');
const DATA_DIR = path.resolve('data');
const HISTORY_FILE = path.join(DATA_DIR, 'seen_urls.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'crawled_articles.json');

// Bộ từ khóa quảng cáo / tài trợ / thương mại
const BLACKLIST_KEYWORDS = [
  '赞助', '折扣', '购买', '商务', '优惠', '团购', '价格', '促销', 
  '售卖', '抽奖', '招募', '有奖', '福利', '带货',
  'sponsor', 'discount', 'pricing', 'sale', 'deal', 'commercial', 'recruitment', 'giveaway', 'advertisement',
  'tài trợ', 'giảm giá', 'chiết khấu', 'quảng cáo', 'ưu đãi', 'tuyển dụng', 'khuyến mãi'
];

const BLACKLIST_AUTHORS = [
  'RM商务', 'RoboMaster商务', '商务', 'admin_ad', 'marketing', 'sponsor'
];

// Phân loại chuyên mục theo tiêu chuẩn Robot Ideas
const CATEGORY_RULES = [
  { name: 'Thị giác máy', keywords: ['视觉', 'vision', 'camera', 'yolo', 'opencv', 'npu', 'nhận diện', 'target', 'tracking', 'image'] },
  { name: 'Robot di động', keywords: ['底盘', 'chassis', 'sentry', '哨兵', 'bộ binh', 'navigation', 'slam', '四足', 'quadruped', 'mobile robot', 'wheel', 'bánh xe'] },
  { name: 'Điều khiển', keywords: ['电控', 'control', 'pid', 'imu', 'kalman', 'mã hóa', 'động cơ', 'vô tuyến', 'motor', 'uart', 'can', 'actuator'] },
  { name: 'Cơ khí', keywords: ['机械', 'bản vẽ', 'cad', 'solidworks', 'sw', 'chuỗi động học', 'khung', 'bánh đà', 'ma sát', 'kết cấu', 'mechanical', 'gear', 'mechanism'] },
  { name: 'AI & ROS', keywords: ['ros', 'ros2', 'mujoco', 'agent', 'mô phỏng', 'simulation', 'ai', 'nơ-ron', 'deep learning', 'vlm', 'llm'] }
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
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

function loadSources() {
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error(`Không tìm thấy file cấu hình: ${CONFIG_FILE}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
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

function evaluateArticle(title, author = '', contentSnippet = '') {
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

/**
 * Thu thập một nguồn cụ thể
 */
async function crawlSingleSource(source, seenUrls, maxPerSource = 5) {
  console.log(`\n------------------------------------------------------`);
  console.log(`📡 NGUỒN: ${source.name}`);
  console.log(`   URL: ${source.listUrl}`);
  console.log(`------------------------------------------------------`);

  const virtualConsole = new VirtualConsole();
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

  let listHtml;
  try {
    const res = await fetch(source.listUrl, { headers });
    if (!res.ok) {
      console.warn(`⚠️ Không tải được danh sách ${source.name}: ${res.status}`);
      return [];
    }
    listHtml = await res.text();
  } catch (e) {
    console.warn(`⚠️ Lỗi kết nối nguồn ${source.name}:`, e.message);
    return [];
  }

  // Bóc tách URL bài viết theo Regex pattern
  const pattern = new RegExp(source.linkPattern, 'g');
  const matched = listHtml.match(pattern) || [];
  const rawLinks = [...new Set(matched)];
  const fullLinks = rawLinks.map(link => {
    if (link.startsWith('http')) return link;
    const base = (source.baseUrl || '').replace(/\/$/, '');
    const cleanLink = link.startsWith('/') ? link : '/' + link;
    return base + cleanLink;
  });

  console.log(`Tìm thấy ${fullLinks.length} liên kết ứng viên.`);

  const sourceArticles = [];

  for (const url of fullLinks) {
    if (sourceArticles.length >= maxPerSource) break;

    if (seenUrls.has(url)) {
      console.log(`⏭️  [TRÙNG] Đã đọc: ${url}`);
      continue;
    }

    try {
      const artRes = await fetch(url, { headers });
      if (!artRes.ok) continue;
      const artHtml = await artRes.text();

      const dom = new JSDOM(artHtml, { url, virtualConsole });
      const doc = dom.window.document;

      let title = '';
      let summary = '';
      let bodyHtml = '';
      let author = source.name;

      // Kiểm tra xem trang có Nuxt state chứa htmlContent không (ví dụ: RoboMaster BBS)
      const nuxtContentMatch = artHtml.match(/htmlContent:\s*"((?:\\.|[^"\\])*)"/);
      if (nuxtContentMatch) {
        try {
          bodyHtml = JSON.parse('"' + nuxtContentMatch[1] + '"');
        } catch {}
      }

      if (source.contentSelector) {
        // Cách 1: Bóc tách bằng Selector riêng nếu cấu hình có định nghĩa
        const rawTitle = doc.querySelector(source.titleSelector || 'title')?.textContent || '';
        title = cleanText(rawTitle.replace(/-RoboMaster.*$/, ''));
        if (!bodyHtml) {
          const contentEl = doc.querySelector(source.contentSelector);
          bodyHtml = contentEl && !contentEl.innerHTML.includes('client-only-placeholder') ? contentEl.innerHTML : '';
        }
        const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        summary = cleanText(metaDesc).slice(0, 500);
      } else {
        // Cách 2: Tự động trích xuất thông minh bằng Mozilla Readability
        const reader = new Readability(doc);
        const article = reader.parse();
        if (article) {
          title = cleanText(article.title);
          summary = cleanText(article.excerpt || '').slice(0, 500);
          bodyHtml = article.content || '';
          if (article.byline) author = cleanText(article.byline);
        }
      }

      if (!title || !bodyHtml) {
        seenUrls.add(url);
        continue;
      }

      // Kiểm tra bộ lọc quảng cáo
      const evalResult = evaluateArticle(title, author, summary);
      if (evalResult.skip) {
        console.log(`🚫 [BỎ QUA - ADS] ${title.slice(0, 45)}... (Lý do: ${evalResult.reason})`);
        seenUrls.add(url);
        continue;
      }

      const category = detectCategory(title, summary);
      const articleData = {
        title,
        summary: summary || title,
        category,
        author,
        sourceName: source.name,
        sourceUrl: url,
        robotIdea: `Giải pháp kỹ thuật từ [${source.name}]: ${title}. Thích hợp tham khảo cho phân mảng ${category}.`,
        html: bodyHtml,
        scrapedAt: new Date().toISOString()
      };

      sourceArticles.push(articleData);
      seenUrls.add(url);

      console.log(`✅ [LƯU BÀI] [${category}] ${title.slice(0, 50)}...`);

    } catch (err) {
      console.warn(`⚠️ Lỗi bóc tách bài ${url}:`, err.message);
    }
  }

  return sourceArticles;
}

/**
 * Hàm điều phối toàn bộ các nguồn
 */
export async function crawlAllSources(options = {}) {
  const maxPerSource = options.maxPerSource || 5;
  const sources = loadSources().filter(s => s.enabled);
  const seenUrls = loadSeenUrls();

  console.log(`\n======================================================`);
  console.log(`🌐 HỆ THỐNG TỔNG HỢP ROBOT ĐA NGUỒN (MULTI-SOURCE)`);
  console.log(`Số nguồn đang bật: ${sources.length}`);
  console.log(`Lịch sử URL đã đọc: ${seenUrls.size} bài`);
  console.log(`======================================================`);

  const allResults = [];

  for (const source of sources) {
    const items = await crawlSingleSource(source, seenUrls, maxPerSource);
    allResults.push(...items);
  }

  // Lưu lịch sử
  saveSeenUrls(seenUrls);

  // Lưu bài viết
  if (allResults.length > 0) {
    let existingOutputs = [];
    if (fs.existsSync(OUTPUT_FILE)) {
      try { existingOutputs = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); } catch {}
    }
    const combined = [...allResults, ...existingOutputs];
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combined, null, 2), 'utf8');
  }

  console.log(`\n================ BÁO CÁO TỔNG HỢP ĐA NGUỒN ================`);
  console.log(`Tổng bài mới thu thập: ${allResults.length}`);
  console.log(`Kho lưu trữ:           ${OUTPUT_FILE}`);
  console.log(`===========================================================\n`);

  return allResults;
}

if (process.argv[1] && process.argv[1].endsWith('crawl-multi.mjs')) {
  crawlAllSources({ maxPerSource: 3 }).catch(console.error);
}
