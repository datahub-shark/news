/**
 * Robot Ideas - Đẩy các bài viết đã duyệt trong VS Code lên Google Drive & Google Sheets
 *
 * Tiêu chí:
 * - Chỉ quét và đẩy những file trong drafts/ có dòng "Trạng thái: READY" (hoặc "Trạng thái: PUBLISH").
 * - Sau khi đẩy thành công lên Google Drive, tự động di chuyển file sang published/ để dọn sạch drafts/.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const DRAFTS_DIR = path.resolve('drafts');
const PUBLISHED_DIR = path.resolve('published');
const DATA_DIR = path.resolve('data');
const SESSION_FILE = path.join(DATA_DIR, '.admin_session.json');

function getApiUrl() {
  try {
    const configContent = fs.readFileSync('config.js', 'utf8');
    const match = configContent.match(/apiUrl:\s*['"]([^'"]+)['"]/);
    if (match) return match[1];
  } catch {}
  return '';
}

const API_URL = getApiUrl();

async function callApi(action, payload = {}, token = '') {
  if (!API_URL) throw new Error('Chưa cấu hình apiUrl trong config.js.');

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

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function loadSession() {
  if (!fs.existsSync(SESSION_FILE)) return null;
  try {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    if (session.token && session.expiresAt > Date.now()) {
      return session;
    }
  } catch {}
  return null;
}

function saveSession(session) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), 'utf8');
}

async function loginFlow() {
  console.log('\n======================================================');
  console.log('🔑 ĐĂNG NHẬP ADMIN ĐỂ ĐẨY BÀI LÊN DRIVE');
  console.log('======================================================\n');

  const codeArgIdx = process.argv.indexOf('--code');
  let code = codeArgIdx !== -1 && process.argv[codeArgIdx + 1] ? process.argv[codeArgIdx + 1] : '';

  if (!code) {
    console.log('Đang yêu cầu gửi mã xác nhận đến email quản trị...');
    await callApi('requestCode');
    console.log('✅ Đã gửi mã OTP đến email quản trị.');

    code = await ask('\n👉 Nhập mã OTP 6 số từ email: ');
  }

  if (!code) throw new Error('Chưa nhập mã OTP.');

  const res = await callApi('login', { code });
  saveSession({ token: res.token, expiresAt: res.expiresAt });
  console.log('🎉 Đăng nhập thành công! Phiên làm việc lưu trong 30 ngày.\n');
  return res.token;
}

function parseDraft(content) {
  const metaMatch = content.match(/<!--\s*METADATA([\s\S]*?)-->/);
  if (!metaMatch) return null;

  const metaText = metaMatch[1];
  const getValue = key => {
    const m = metaText.match(new RegExp(`${key}:\\s*(.*?)(?=\\n[\\w\\s]+:|\\n-->|$)`, 'i'));
    return m ? m[1].trim() : '';
  };

  const status = getValue('Trạng thái').toUpperCase();
  const title = getValue('Tiêu đề');
  const category = getValue('Chuyên mục') || 'Khác';
  const author = getValue('Tác giả');
  const sourceUrl = getValue('Nguồn');
  const sourceName = getValue('Tên nguồn') || 'Robot Ideas';
  const summary = getValue('Tóm tắt');
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

  // Kiểm tra phiên đăng nhập
  let session = loadSession();
  if (!session) {
    try {
      const test = await callApi('list', {}, 'robot-ideas-sync-secret-2026');
      if (test && test.ok) {
        session = { token: 'robot-ideas-sync-secret-2026' };
      }
    } catch {}
  }
  if (!session) {
    const token = await loginFlow();
    session = { token };
  }

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
          html: parsed.html,
          status: targetStatus
        }
      };

      await callApi('save', payload, session.token);

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
  pushApprovedArticles().catch(console.error);
}
