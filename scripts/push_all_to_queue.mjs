/**
 * Robot Ideas - Đẩy toàn bộ bài viết đã kiểm tra vào hàng chờ duyệt (Pending Queue) trên Google Apps Script & Google Drive
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

export async function pushAllToQueue(batchLimit = 0) {
  if (!fs.existsSync(DATA_FILE)) {
    console.error('Không tìm thấy tệp dữ liệu crawled_articles.json');
    return;
  }

  const articles = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`\n======================================================`);
  console.log(`🚀 BẮT ĐẦU ĐẨY BÀI VIẾT LÊN HÀNG CHỜ DUYỆT (PENDING QUEUE)`);
  console.log(`- Tổng bài viết trong cơ sở dữ liệu: ${articles.length}`);
  console.log(`======================================================\n`);

  // 1. Lấy danh sách URL đã có sẵn trên Google Sheets để bỏ qua trùng lặp
  console.log('📡 Đang truy vấn danh sách bài viết hiện có trên Google Sheets...');
  let existingUrls = new Set();
  try {
    const listRes = await callApi('list');
    if (listRes.ok && Array.isArray(listRes.articles)) {
      listRes.articles.forEach(a => {
        if (a.sourceUrl) existingUrls.add(a.sourceUrl);
      });
      console.log(`✅ Hiện đã có ${existingUrls.size} bài trên Google Sheets.`);
    }
  } catch (err) {
    console.warn(`⚠️ Không thể tải danh sách bài cũ: ${err.message}. Tiếp tục đẩy an toàn...`);
  }

  // 2. Lọc danh sách bài cần đẩy
  const toPush = articles.filter(a => !existingUrls.has(a.sourceUrl));
  console.log(`📋 Số lượng bài cần đẩy vào hàng chờ duyệt: ${toPush.length}\n`);

  if (toPush.length === 0) {
    console.log('🎉 Toàn bộ bài viết đã có trên hàng chờ / xuất bản!');
    return;
  }

  const targetList = batchLimit > 0 ? toPush.slice(0, batchLimit) : toPush;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < targetList.length; i++) {
    const a = targetList[i];
    const artId = a.sourceUrl.split('/').pop();
    const title = (a.title || 'Bài viết chưa có tiêu đề').slice(0, 240);
    const summary = (a.summary || title).slice(0, 1000);
    const category = a.category || 'Cơ khí';
    const sourceName = (a.sourceName || 'RoboMaster BBS').slice(0, 200);
    const sourceUrl = a.sourceUrl;
    const robotIdea = (a.robotIdea || `Giải pháp kỹ thuật từ ${title}`).slice(0, 5000);
    const coverImage = a.coverImage || '';
    const html = a.html || `<p>${summary}</p>`;

    const payload = {
      article: {
        title,
        summary,
        category,
        sourceName,
        sourceUrl,
        robotIdea,
        coverImage,
        html,
        status: 'pending' // Đưa vào hàng chờ duyệt!
      }
    };

    let retries = 2;
    let pushed = false;

    while (retries >= 0 && !pushed) {
      try {
        const res = await callApi('save', payload);
        successCount++;
        pushed = true;
        console.log(`✅ [${i + 1}/${targetList.length}] [ID: ${artId}] [${category}] ${title.slice(0, 48)}...`);
      } catch (err) {
        if (err.message && err.message.includes('URL nguồn đã có trong thư viện')) {
          console.log(`⏭️ [${i + 1}/${targetList.length}] [ID: ${artId}] Đã có trong thư viện, bỏ qua.`);
          pushed = true;
          break;
        }
        retries--;
        if (retries >= 0) {
          console.warn(`⚠️ [Thử lại ${2 - retries}/2] Lỗi bài ${artId}: ${err.message}. Đang đợi 3s...`);
          await sleep(3000);
        } else {
          errorCount++;
          console.error(`❌ [LỖI BỎ QUA] Bài ${artId}: ${err.message}`);
        }
      }
    }

    // Nghỉ nhẹ 400ms giữa các bài để đảm bảo giải phóng ScriptLock trên Google Apps Script
    await sleep(400);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN TẤT ĐẨY BÀI VÀO HÀNG CHỜ DUYỆT!`);
  console.log(`- Thành công: ${successCount} bài`);
  console.log(`- Thất bại:   ${errorCount} bài`);
  console.log(`======================================================\n`);
}

if (process.argv[1] && process.argv[1].endsWith('push_all_to_queue.mjs')) {
  const limitArg = process.argv[2] ? parseInt(process.argv[2], 10) : 0;
  pushAllToQueue(limitArg).catch(console.error);
}
