/**
 * Robot Ideas - Tự động đồng bộ bài viết đã cào lên Google Drive & Google Sheets
 *
 * Chức năng:
 * 1. Xác thực bằng biến môi trường của chủ website, không lưu token vào file.
 * 2. Gọi backend Google Apps Script để tạo file HTML riêng tư trên Google Drive.
 * 3. Đưa bài vào mục "Hàng chờ duyệt" (status: 'pending') trên Google Sheets.
 * 4. Tự động bỏ qua các bài đã có trong hệ thống.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createEditorialClient, getEditorialCredential } from './editorial-auth.mjs';

const DATA_DIR = path.resolve('data');
const ARTICLES_FILE = path.join(DATA_DIR, 'crawled_articles.json');
const callApi = createEditorialClient();

/**
 * Đồng bộ toàn bộ bài viết trong data/crawled_articles.json lên Drive & Sheets
 */
export async function syncToDrive() {
  getEditorialCredential();

  // Đọc danh sách bài đã cào
  if (!fs.existsSync(ARTICLES_FILE)) {
    console.log('Chưa có bài viết nào trong data/crawled_articles.json. Hãy cào bài trước.');
    return;
  }

  const articles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf8'));
  console.log(`\n======================================================`);
  console.log(`☁️ ĐỒNG BỘ LÊN GOOGLE DRIVE & GOOGLE SHEETS`);
  console.log(`Tổng số bài chờ đồng bộ: ${articles.length}`);
  console.log(`======================================================\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const art of articles) {
    try {
      const payload = {
        article: {
          title: art.title.slice(0, 240),
          summary: art.summary.slice(0, 1000),
          category: art.category,
          sourceName: art.sourceName,
          sourceUrl: art.sourceUrl,
          robotIdea: art.robotIdea || '',
          html: art.html,
          status: 'pending' // Lưu vào Hàng chờ duyệt
        }
      };

      await callApi('save', payload);
      console.log(`✅ [ĐÃ LÊN DRIVE & SHEETS] [${art.category}] ${art.title.slice(0, 50)}...`);
      uploaded++;

    } catch (err) {
      if (err.message && err.message.includes('URL nguồn đã có trong thư viện')) {
        console.log(`⏭️  [ĐÃ CÓ TRÊN DRIVE] ${art.title.slice(0, 50)}...`);
        skipped++;
      } else if (err.code === 'AUTH_REQUIRED' || (err.message && err.message.includes('Phiên đăng nhập'))) {
        throw new Error('Phiên hết hạn hoặc khóa không hợp lệ. Cập nhật biến môi trường theo GOOGLE-AUTH-SETUP.md rồi chạy lại.');
      } else {
        console.warn(`❌ [LỖI] ${art.title.slice(0, 40)}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\n================ KẾT QUẢ ĐỒNG BỘ ================`);
  console.log(`Tạo mới thành công trên Drive & Sheets: ${uploaded}`);
  console.log(`Đã có sẵn trong thư viện (bỏ qua):     ${skipped}`);
  console.log(`Gặp lỗi:                                ${errors}`);
  console.log(`==================================================\n`);
  console.log(`👉 Bạn có thể vào trang Quản trị (Admin) để duyệt công khai các bài trên!`);
}

// Chạy trực tiếp từ CLI
if (process.argv[1] && process.argv[1].endsWith('sync-to-drive.mjs')) {
  syncToDrive().catch(error => { console.error(error.message); process.exitCode = 1; });
}
