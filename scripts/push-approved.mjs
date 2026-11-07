/**
 * Robot Ideas - Đẩy các bài viết đã duyệt trong VS Code lên Google Drive & Google Sheets
 *
 * Tiêu chí:
 * - Chỉ quét và đẩy những file trong drafts/ có dòng "Trạng thái: READY" (hoặc "Trạng thái: PUBLISH").
 * - Sau khi đẩy thành công lên Google Drive, tự động di chuyển file sang published/ để dọn sạch drafts/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createEditorialClient, getEditorialCredential } from './editorial-auth.mjs';

const DRAFTS_DIR = path.resolve('drafts');
const PUBLISHED_DIR = path.resolve('published');
const callApi = createEditorialClient();

function parseDraft(content) {
  const metaMatch = content.match(/<!--\s*METADATA([\s\S]*?)-->/);
  if (!metaMatch) return null;

  const metaText = metaMatch[1];
  const getValue = key => {
    const lines = metaText.split(/\r?\n/);
    const prefix = key.toLowerCase() + ':';
    const line = lines.find(l => l.trim().toLowerCase().startsWith(prefix));
    return line ? line.trim().slice(prefix.length).trim() : '';
  };

  const status = getValue('Trạng thái').toUpperCase();
  const title = getValue('Tiêu đề');
  const category = getValue('Chuyên mục') || 'Khác';
  const author = getValue('Tác giả');
  const sourceUrl = getValue('Nguồn');
  const sourceName = getValue('Tên nguồn') || 'Robot Ideas';
  const summary = getValue('Tóm tắt');
  const coverImage = getValue('Ảnh bìa');
  const robotIdea = getValue('Gợi ý ứng dụng');

  // Lấy toàn bộ nội dung HTML sau thẻ đóng comment -->
  const htmlBody = content.slice(metaMatch.index + metaMatch[0].length).trim();

  return {
    status,
    title,
    category,
    author,
    sourceUrl,
    sourceName,
    summary,
    coverImage,
    robotIdea,
    html: htmlBody
  };
}

export async function pushApprovedArticles(options = {}) {
  if (!fs.existsSync(DRAFTS_DIR)) {
    console.log('Chưa có thư mục drafts/.');
    return;
  }

  if (!fs.existsSync(PUBLISHED_DIR)) {
    fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  }

  const entries = fs.readdirSync(DRAFTS_DIR, { withFileTypes: true });
  if (!entries.length) {
    console.log('Thư mục drafts/ đang trống.');
    return;
  }

  // Lọc các bài viết có trạng thái READY hoặc PUBLISH
  const approved = [];
  for (const entry of entries) {
    let filePath = '';
    let isDir = false;
    let targetName = entry.name;

    if (entry.isDirectory()) {
      filePath = path.join(DRAFTS_DIR, entry.name, 'index.html');
      isDir = true;
    } else if (/\.html?$/i.test(entry.name)) {
      filePath = path.join(DRAFTS_DIR, entry.name);
    }

    if (filePath && fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = parseDraft(content);
      if (parsed && (parsed.status === 'READY' || parsed.status === 'PUBLISH')) {
        approved.push({
          targetName,
          isDir,
          filePath,
          containerPath: isDir ? path.join(DRAFTS_DIR, entry.name) : filePath,
          parsed,
          content
        });
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`🚀 XUẤT BẢN BÀI VIẾT ĐÃ DUYỆT TỪ VS CODE LÊN GOOGLE DRIVE`);
  console.log(`Tìm thấy ${approved.length} bài đã duyệt (Trạng thái: READY).`);
  console.log(`======================================================\n`);

  if (!approved.length) {
    console.log(`💡 Bạn chưa đánh dấu bài nào là "READY".`);
    console.log(`👉 Cách duyệt trong VS Code:`);
    console.log(`   1. Mở file bài viết trong thư mục drafts/`);
    console.log(`   2. Đọc và chỉnh sửa tiêu đề/nội dung theo ý bạn`);
    console.log(`   3. Đổi dòng "Trạng thái: DRAFT" thành "Trạng thái: READY"`);
    console.log(`   4. Chạy lại lệnh này để đẩy lên Drive & Sheets!\n`);
    return;
  }

  // Publishing requires a Google admin session; import keys only create pending items.
  getEditorialCredential({ requireAdmin: !!options.publishImmediately });
  await callApi('list');

  let successCount = 0;

  for (const item of approved) {
    const { parsed, filePath, containerPath, targetName, isDir } = item;
    try {
      console.log(`Đang đẩy: [${parsed.category}] ${parsed.title.slice(0, 50)}...`);

      const targetStatus = options.publishImmediately ? 'published' : 'pending';

      const payload = {
        article: {
          title: parsed.title.slice(0, 240),
          summary: parsed.summary.slice(0, 1000),
          category: parsed.category,
          sourceName: parsed.sourceName.slice(0, 200),
          sourceUrl: parsed.sourceUrl,
          robotIdea: parsed.robotIdea.slice(0, 5000),
          coverImage: parsed.coverImage || '',
          html: parsed.html,
          status: targetStatus
        }
      };

      await callApi('save', payload);

      console.log(`✅ [ĐÃ LÊN GOOGLE DRIVE] Đưa vào hàng chờ duyệt thành công!`);

      // Cập nhật trạng thái trong index.html
      const updatedContent = item.content.replace(
        /Trạng thái:\s*READY/i,
        `Trạng thái: PUBLISHED (${new Date().toLocaleDateString('vi-VN')})`
      );
      fs.writeFileSync(filePath, updatedContent, 'utf8');

      // Di chuyển cả thư mục hoặc file sang published/
      const destPath = path.join(PUBLISHED_DIR, targetName);
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }
      fs.renameSync(containerPath, destPath);

      successCount++;
    } catch (err) {
      if (err.message && err.message.includes('URL nguồn đã có trong thư viện')) {
        console.log(`⏭️  Bài này đã có sẵn trên Drive. Di chuyển sang published/`);
        const destPath = path.join(PUBLISHED_DIR, targetName);
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { recursive: true, force: true });
        }
        fs.renameSync(containerPath, destPath);
      } else {
        console.warn(`❌ [LỖI] ${err.message}`);
      }
    }
  }

  console.log(`\n================ HOÀN TẤT ĐẨY BÀI ================`);
  console.log(`Đã đẩy lên Google Drive: ${successCount} bài`);
  console.log(`Các bài đã chuyển sang:  published/`);
  console.log(`==================================================\n`);
}

if (process.argv[1] && process.argv[1].endsWith('push-approved.mjs')) {
  pushApprovedArticles().catch(error => { console.error(error.message); process.exitCode = 1; });
}
