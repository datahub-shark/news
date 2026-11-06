/**
 * Robot Ideas - Weekly Auto Crawler
 *
 * Chạy định kỳ 1 tuần 1 lần để:
 * 1. Quét tìm các bài viết kỹ thuật mới nhất vừa xuất bản trên RoboMaster BBS
 * 2. Tự động bỏ qua các bài đã có trong hệ thống (lọc theo seen_urls.json)
 * 3. Bóc tách ảnh bìa chính thức từ headImg
 * 4. Tải và đổi tên tệp đính kèm tiếng Việt không dấu
 * 5. Xuất bản nháp (drafts/) và đồng bộ sang G:\My Drive\Robot Ideas Articles
 */

import { crawlFullLibrary } from './crawl-full-library.mjs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log(`\n======================================================`);
console.log(`⏱️  ROBOT IDEAS - ĐỒNG BỘ ĐỊNH KỲ TUẦN`);
console.log(`Thời gian: ${new Date().toLocaleString('vi-VN')}`);
console.log(`======================================================\n`);

try {
  // 1. Cào tối đa 20 bài mới nhất
  const newArticles = await crawlFullLibrary({ limit: 20 });

  if (newArticles.length === 0) {
    console.log(`ℹ️  Không có bài viết mới nào kể từ lần quét trước.`);
  } else {
    console.log(`\n📦 Phát hiện ${newArticles.length} bài viết mới. Đang tạo thư mục bản nháp...`);
    execSync('node scripts/export-drafts.mjs', { stdio: 'inherit' });

    console.log(`\n☁️  Đang đồng bộ sang Google Drive...`);
    execSync('node scripts/sync-local-drive.mjs', { stdio: 'inherit' });

    console.log(`\n✅ Hoàn tất đồng bộ tuần! Các bài mới đã sẵn sàng trong thư mục drafts/ và trên Google Drive.`);
  }
} catch (err) {
  console.error(`❌ Lỗi trong quá trình quét tuần:`, err.message);
  process.exit(1);
}
