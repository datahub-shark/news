/**
 * Robot Ideas - Cập nhật toàn bộ bài viết trong hàng chờ duyệt trên Google Sheets với bản dịch tiếng Việt chuẩn hóa
 */

import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.resolve('data/crawled_articles.json');
const API_URL = 'https://script.google.com/macros/s/AKfycbzptC6MVeswlOqbKiIVXSohkfdU0aZeAkkKeRB9r1xbX7gZvzf_NKmiLJY3DzT_sSwB/exec';
const SYNC_TOKEN = 'robot-ideas-sync-secret-2026';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callApi(action, payload = {}, token = SYNC_TOKEN) {
  const request = { ...payload, token };
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ action, payload: request })
  });

  if (!res.ok) throw new Error(`Lỗi kết nối máy chủ Google: ${res.status}`);
  const data = await res.json();
  if (!data.ok) {
    const err = new Error(data.error || 'Thao tác thất bại.');
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function updateQueueTranslations() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error('Không tìm thấy tệp crawled_articles.json');
    return;
  }

  const articles = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`\n======================================================`);
  console.log(`🔄 CẬP NHẬT TIÊU ĐỀ & TÓM TẮT TIẾNG VIỆT LÊN GOOGLE SHEETS`);
  console.log(`- Tổng bài viết sạch trong máy: ${articles.length}`);
  console.log(`======================================================\n`);

  // Map crawled articles by sourceUrl and BBS thread ID
  const crawledMapByUrl = new Map();
  const crawledMapById = new Map();
  for (const a of articles) {
    crawledMapByUrl.set(a.sourceUrl, a);
    const id = a.sourceUrl.split('/').pop();
    if (id) crawledMapById.set(id, a);
  }

  // 1. Fetch current articles from Google Sheets
  console.log('📡 Đang tải danh sách bài viết hiện có trên Google Sheets...');
  let sheetArticles = [];
  try {
    const listRes = await callApi('list');
    sheetArticles = listRes.articles || [];
    console.log(`✅ Đã tải ${sheetArticles.length} bài viết từ Google Sheets.\n`);
  } catch (err) {
    console.error('❌ Lỗi khi tải danh sách từ Google Sheets:', err.message);
    return;
  }

  // 2. Identify articles needing updates
  const toUpdate = [];
  for (const sa of sheetArticles) {
    // Match by sourceUrl or by thread id
    let clean = crawledMapByUrl.get(sa.sourceUrl);
    if (!clean && sa.sourceUrl) {
      const id = sa.sourceUrl.split('/').pop();
      clean = crawledMapById.get(id);
    }

    if (!clean) continue;

    // Check if title, summary, robotIdea or coverImage changed
    const titleDiff = (clean.title || '').trim() !== (sa.title || '').trim();
    const summaryDiff = (clean.summary || '').trim() !== (sa.summary || '').trim();
    const coverDiff = (clean.coverImage || '').trim() !== (sa.coverImage || '').trim();
    const ideaDiff = (clean.robotIdea || '').trim() !== (sa.robotIdea || '').trim();

    if (titleDiff || summaryDiff || coverDiff || ideaDiff) {
      toUpdate.push({
        sheetArticle: sa,
        cleanArticle: clean,
        reasons: [
          titleDiff ? 'Tiêu đề' : '',
          summaryDiff ? 'Tóm tắt' : '',
          coverDiff ? 'Ảnh bìa' : '',
          ideaDiff ? 'Gợi ý' : ''
        ].filter(Boolean)
      });
    }
  }

  console.log(`🔍 Tìm thấy ${toUpdate.length} bài viết cần cập nhật nội dung trên Google Sheets.`);
  if (toUpdate.length === 0) {
    console.log('✨ Toàn bộ bài viết trên Google Sheets đã đồng bộ mới nhất!');
    return;
  }

  // 3. Process updates sequentially
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < toUpdate.length; i++) {
    const { sheetArticle, cleanArticle, reasons } = toUpdate[i];
    const progress = `[${i + 1}/${toUpdate.length}]`;

    // Preserve published status if already published, otherwise keep sheet status
    const status = sheetArticle.status || 'pending';

    const payload = {
      id: sheetArticle.id,
      version: sheetArticle.version,
      status: status,
      title: cleanArticle.title,
      summary: cleanArticle.summary,
      robotIdea: cleanArticle.robotIdea,
      category: cleanArticle.category,
      tags: cleanArticle.tags || sheetArticle.tags || '',
      coverImage: cleanArticle.coverImage || '',
      sourceName: 'RoboMaster BBS',
      sourceUrl: cleanArticle.sourceUrl,
      createdAt: sheetArticle.createdAt
    };

    let retries = 3;
    let saved = false;

    while (retries > 0 && !saved) {
      try {
        await callApi('save', { article: payload });
        successCount++;
        saved = true;

        if ((i + 1) % 10 === 0 || i === toUpdate.length - 1) {
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`✅ ${progress} Cập nhật thành công: "${cleanArticle.title.slice(0, 40)}..." (${elapsedSec}s)`);
        }
        await sleep(350); // Safe delay to avoid LockService contention
      } catch (err) {
        retries--;
        if (retries === 0) {
          console.error(`❌ ${progress} Thất bại bài ${sheetArticle.id}: ${err.message}`);
          failCount++;
        } else {
          await sleep(1500);
        }
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN THÀNH CẬP NHẬT TRÊN GOOGLE SHEETS!`);
  console.log(`- Thành công: ${successCount}`);
  console.log(`- Thất bại: ${failCount}`);
  console.log(`- Thời gian xử lý: ${totalTime}s`);
  console.log(`======================================================\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/update_queue_translations.mjs')) {
  updateQueueTranslations().catch(console.error);
}
