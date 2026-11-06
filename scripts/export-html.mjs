/**
 * Xuất các bài viết từ data/crawled_articles.json thành từng file .html riêng biệt
 * để sẵn sàng nhập vào trang Quản trị (Admin) qua nút "Nhập file .html".
 */

import fs from 'node:fs';
import path from 'node:path';

const JSON_FILE = path.resolve('data/crawled_articles.json');
const EXPORT_DIR = path.resolve('data/html');

if (!fs.existsSync(JSON_FILE)) {
  console.error('Chưa có file data/crawled_articles.json. Hãy chạy npm run crawl:robomaster trước.');
  process.exit(1);
}

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

const articles = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

console.log(`Bắt đầu xuất ${articles.length} bài viết sang thư mục data/html/...`);

articles.forEach((art, index) => {
  const match = art.sourceUrl.match(/\/article\/(\d+)/);
  const id = match ? match[1] : (index + 1);
  const safeTitle = art.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 50).trim();
  const filename = `article-${id}-${safeTitle}.html`;
  const filePath = path.join(EXPORT_DIR, filename);

  const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${art.title}</title>
  <meta name="description" content="${art.summary.replace(/"/g, '&quot;')}">
  <meta name="author" content="${art.author}">
  <meta name="category" content="${art.category}">
  <meta name="source-url" content="${art.sourceUrl}">
  <meta name="source-name" content="${art.sourceName}">
  <meta name="robot-idea" content="${(art.robotIdea || '').replace(/"/g, '&quot;')}">
</head>
<body>
  <h1>${art.title}</h1>
  <p><strong>Nguồn:</strong> <a href="${art.sourceUrl}" target="_blank">${art.sourceName}</a> · <strong>Tác giả:</strong> ${art.author}</p>
  <p><strong>Chuyên mục:</strong> ${art.category}</p>
  <hr>
  <div class="article-body">
    ${art.html}
  </div>
</body>
</html>`;

  fs.writeFileSync(filePath, htmlContent, 'utf8');
  console.log(`[${index + 1}/${articles.length}] Đã xuất: ${filename}`);
});

console.log(`\nHoàn thành! Các file HTML đã sẵn sàng tại: ${EXPORT_DIR}`);
