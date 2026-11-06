/**
 * Robot Ideas - Tự động đồng bộ bài viết đã cào lên Google Drive & Google Sheets
 *
 * Chức năng:
 * 1. Xác thực bằng phiên quản trị (Session Token 30 ngày).
 * 2. Gọi backend Google Apps Script để tạo file HTML riêng tư trên Google Drive.
 * 3. Đưa bài vào mục "Hàng chờ duyệt" (status: 'pending') trên Google Sheets.
 * 4. Tự động bỏ qua các bài đã có trong hệ thống.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const DATA_DIR = path.resolve('data');
const SESSION_FILE = path.join(DATA_DIR, '.admin_session.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'crawled_articles.json');

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
  if (!API_URL) throw new Error('Chưa tìm thấy apiUrl trong config.js.');

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

/**
 * Đăng nhập để lấy session token (chỉ làm 1 lần, lưu 30 ngày)
 */
async function loginFlow() {
  console.log('\n======================================================');
  console.log('🔑 ĐĂNG NHẬP QUẢN TRỊ VIÊN ROBOT IDEAS');
  console.log('Hệ thống sẽ gửi mã xác nhận 6 số đến email quản trị.');
  console.log('======================================================\n');

  console.log('Đang yêu cầu gửi mã xác nhận...');
  await callApi('requestCode');
  console.log('✅ Mã OTP đã được gửi về email quản trị (có hiệu lực 10 phút).');

  const code = await ask('\n👉 Nhập mã OTP 6 số từ email của bạn: ');
  if (!code) throw new Error('Chưa nhập mã OTP.');

  console.log('Đang xác thực...');
  const res = await callApi('login', { code });
  saveSession({ token: res.token, expiresAt: res.expiresAt });
  console.log('🎉 Đăng nhập thành công! Phiên làm việc đã được lưu trong 30 ngày.\n');
  return res.token;
}

/**
 * Đồng bộ toàn bộ bài viết trong data/crawled_articles.json lên Drive & Sheets
 */
export async function syncToDrive(options = {}) {
  let session = loadSession();

  // Kiểm tra cờ --login hoặc nếu chưa có session
  if (options.forceLogin || !session) {
    if (process.argv.includes('--non-interactive')) {
      console.log('⚠️ Chưa có phiên đăng nhập Admin. Chạy "npm run sync:drive -- --login" trước.');
      return;
    }
    const token = await loginFlow();
    session = { token };
  }

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

      const result = await callApi('save', payload, session.token);
      console.log(`✅ [ĐÃ LÊN DRIVE & SHEETS] [${art.category}] ${art.title.slice(0, 50)}...`);
      uploaded++;

    } catch (err) {
      if (err.message && err.message.includes('URL nguồn đã có trong thư viện')) {
        console.log(`⏭️  [ĐÃ CÓ TRÊN DRIVE] ${art.title.slice(0, 50)}...`);
        skipped++;
      } else if (err.code === 'AUTH_REQUIRED' || (err.message && err.message.includes('Phiên đăng nhập'))) {
        console.warn('⚠️ Phiên đăng nhập hết hạn. Cần đăng nhập lại.');
        if (!options.isRetrying) {
          const newToken = await loginFlow();
          session.token = newToken;
          options.isRetrying = true;
          // Thử lại bài này
          return syncToDrive(options);
        }
        break;
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
  const forceLogin = process.argv.includes('--login');
  syncToDrive({ forceLogin }).catch(console.error);
}
