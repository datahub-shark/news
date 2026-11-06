/**
 * Robot Ideas - Batch Crawler for Uncrawled Technical Articles
 * Prioritizes mechanical mechanisms, CAD, robots, and core engineering shares.
 */

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const DATA_DIR = path.resolve('data');
const HISTORY_FILE = path.join(DATA_DIR, 'seen_urls.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'crawled_articles.json');
const CANDIDATES_FILE = path.join(DATA_DIR, 'all_bbs_candidates.json');

const BLACKLIST_KEYWORDS = [
  '赞助', '折扣', '购买', '商务', '优惠', '团购', '价格', '促销', 
  '售卖', '抽奖', '招募', '有奖', '福利', '带货', '商机', '报名参赛攻略',
  '求职', '征集', '调研反馈', '就业通识'
];

const BLACKLIST_AUTHORS = [
  'RM商务', 'RoboMaster商务', '商务', 'admin_ad', 'marketing'
];

const CATEGORY_RULES = [
  { name: 'Cơ khí', keywords: ['机械', 'bản vẽ', 'cad', 'solidworks', 'sw', 'chuỗi động học', 'khung', 'bánh đà', 'ma sát', 'kết cấu', 'gimbal', 'bệ ngắm', 'feed', '舵轮', '轮足', '轮腿', '排球', '夹爪', '减速', '电机', 'step'] },
  { name: 'Robot di động', keywords: ['底盘', 'chassis', 'sentry', '哨兵', 'bộ binh', 'navigation', 'slam', '四足', 'quadruped', 'robot', 'omni', 'mecanum', '登岛'] },
  { name: 'Điều khiển', keywords: ['电控', 'control', 'pid', 'imu', 'kalman', 'mã hóa', 'động cơ', 'vô tuyến', 'motor', 'uart', 'can', 'can bus', 'mpc', 'leso', 'firmware', 'bms', 'freertos', 'stm32'] },
  { name: 'Thị giác máy', keywords: ['视觉', 'vision', 'camera', 'yolo', 'opencv', 'npu', 'nhận diện', 'target', 'tracking', '自瞄', 'aim', 'gán nhãn', 'zeroshot', '雷达', 'pointcloud', 'lidar'] },
  { name: 'AI & ROS', keywords: ['ros', 'ros2', 'mujoco', 'agent', 'mô phỏng', 'simulation', 'ai', 'nơ-ron', 'deep learning', 'vlm', 'llm', '强化学习', 'rl'] }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  return 'Cơ khí'; // Mặc định ưu tiên cơ khí nếu không khớp
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

  return ''; // Quy tắc: bài ko có ảnh thì để trống
}

export async function crawlBatch(limit = 40) {
  const seenUrls = new Set(JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')));
  const candidates = JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf8'));
  let existingArticles = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));

  // Lọc bài chưa cào
  let uncrawled = candidates.filter(c => !seenUrls.has(`https://bbs.robomaster.com/article/${c.id}`));

  // Sắp xếp ưu tiên:
  // 1. Bài chứa từ khóa cơ khí/kết cấu/CAD/động cơ
  // 2. Bài chứa từ khóa thuật toán, kỹ thuật, robot, nguồn mở
  // 3. ID giảm dần (mới nhất)
  const mechKws = ['机械', '结构', '发射', '供弹', '底盘', '云台', '平衡', '步兵', '英雄', '哨兵', '工程', '无人机', '夹爪', '连杆', '减速', '电机', 'cad', 'step', 'sw', 'solidworks', '3d', '舵轮', '轮足', '轮腿'];
  const techKws = ['技术报告', '开源', '设计', '算法', '视觉', '自瞄', '雷达', '电控', '传承', '排球', '飞镖', '仿真', '控制', '上位机', '超级电容', 'mpc', 'slam', 'yolo', 'ros'];

  uncrawled.sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aMech = mechKws.some(k => aTitle.includes(k)) ? 1 : 0;
    const bMech = mechKws.some(k => bTitle.includes(k)) ? 1 : 0;
    if (bMech !== aMech) return bMech - aMech;

    const aTech = techKws.filter(k => aTitle.includes(k)).length;
    const bTech = techKws.filter(k => bTitle.includes(k)).length;
    if (bTech !== aTech) return bTech - aTech;

    return Number(b.id) - Number(a.id);
  });

  console.log(`\n======================================================`);
  console.log(`🚀 BẮT ĐẦU CÀO ĐỢT MỚI: Mục tiêu ${limit} bài viết`);
  console.log(`- Ứng viên chưa cào: ${uncrawled.length}`);
  console.log(`- Ưu tiên: Cơ cấu cơ khí & Kết cấu robot`);
  console.log(`======================================================\n`);

  const results = [];
  const virtualConsole = new VirtualConsole();

  for (const item of uncrawled) {
    if (results.length >= limit) break;

    const url = `https://bbs.robomaster.com/article/${item.id}`;
    if (seenUrls.has(url)) continue;

    const evalRes = evaluateArticle(item.title);
    if (evalRes.skip) {
      console.log(`🚫 [BỎ QUA - ADS] [${item.id}] ${item.title.slice(0, 45)}...`);
      seenUrls.add(url);
      continue;
    }

    try {
      const artRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!artRes.ok) {
        seenUrls.add(url);
        continue;
      }
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

      // Quy tắc ảnh bìa: Nếu không có thì để trống ''
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

      console.log(`📥 [${results.length}/${limit}] [${item.id}] ${title.slice(0, 48)}...`);
      console.log(`   └─ ${category} | Tác giả: ${author} | Bìa: ${coverImage ? '✅' : '⚪ Để trống'}`);

      await sleep(350);
    } catch (err) {
      console.error(`⚠️ Lỗi khi cào ${url}: ${err.message}`);
    }
  }

  // Lưu
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([...seenUrls], null, 2), 'utf8');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingArticles, null, 2), 'utf8');

  console.log(`\n======================================================`);
  console.log(`🎉 ĐÃ CÀO THÀNH CÔNG ${results.length} BÀI VIẾT MỚI!`);
  console.log(`- Tổng bài viết hiện có trong kho: ${existingArticles.length}`);
  console.log(`======================================================\n`);

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('crawl_batch_uncrawled.mjs')) {
  const customLimit = process.argv[2] ? parseInt(process.argv[2], 10) : 40;
  crawlBatch(customLimit);
}
