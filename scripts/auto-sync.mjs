/**
 * Robot Ideas - Tự động hóa toàn diện (Auto Crawl -> Translate -> Push to Drive & Sheets)
 * 
 * Luồng hoạt động:
 * 1. Tự động cào các bài viết kỹ thuật mới nhất từ RoboMaster BBS / RSS.
 * 2. Lọc bỏ bài viết quảng cáo, tài trợ, thương mại.
 * 3. Tự động dịch tiêu đề, tóm tắt và nội dung sang tiếng Việt (giữ nguyên hình ảnh, mã nguồn).
 * 4. Tạo bố cục song ngữ chuẩn (Tiếng Việt ở trên + Tiếng Trung nguyên tác thu gọn ở dưới).
 * 5. Tự động đẩy thẳng lên Google Drive (lưu HTML) và Google Sheets (bảng Articles) với trạng thái "pending" (Chờ duyệt).
 * 6. Người quản trị chỉ cần mở Web Admin: https://datahub-shark.github.io/news/admin.html -> "Hàng chờ duyệt" -> Bấm "Duyệt đăng"!
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { JSDOM } from 'jsdom';
import { crawlRoboMaster } from './crawl-robomaster.mjs';

const DATA_DIR = path.resolve('data');
const DRAFTS_DIR = path.resolve('drafts');
const PUBLISHED_DIR = path.resolve('published');
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

async function ensureSession() {
  let session = loadSession();
  if (session) return session.token;

  console.log('\n======================================================');
  console.log('🔑 ĐĂNG NHẬP XÁC THỰC LẦN ĐẦU ĐỂ TỰ ĐỘNG ĐẨY LÊN GOOGLE');
  console.log('======================================================\n');

  const codeArgIdx = process.argv.indexOf('--code');
  let code = codeArgIdx !== -1 && process.argv[codeArgIdx + 1] ? process.argv[codeArgIdx + 1] : '';

  if (!code) {
    console.log('Đang gửi mã OTP đến email quản trị...');
    await callApi('requestCode');
    console.log('✅ Đã gửi mã OTP đến email quản trị.');
    code = await ask('\n👉 Nhập mã OTP 6 số từ email: ');
  }

  if (!code) throw new Error('Chưa nhập mã OTP.');

  const res = await callApi('login', { code });
  saveSession({ token: res.token, expiresAt: res.expiresAt });
  console.log('🎉 Đăng nhập thành công! Phiên tự động lưu trong 30 ngày.\n');
  return res.token;
}

/**
 * Dịch một đoạn văn bản từ tiếng Trung (hoặc auto) sang tiếng Việt
 */
async function translateText(text) {
  if (!text || !text.trim()) return text;
  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=' + encodeURIComponent(text);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return text;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map(x => x[0]).join('');
    }
  } catch {
    // Nếu lỗi mạng, giữ nguyên văn bản gốc
  }
  return text;
}

/**
 * Dịch nội dung HTML sang tiếng Việt, giữ nguyên thẻ ảnh, bảng, thẻ code
 */
async function translateHtmlContent(html) {
  if (!html) return '';
  const dom = new JSDOM(`<body>${html}</body>`);
  const body = dom.window.document.body;

  // Lấy các thẻ chứa văn bản nhưng không phải trong pre/code
  const textElements = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th');
  
  for (const el of textElements) {
    // Bỏ qua nếu nằm trong pre hoặc code
    if (el.closest('pre') || el.closest('code')) continue;
    // Bỏ qua nếu chỉ chứa ảnh
    if (!el.textContent.trim()) continue;

    // Nếu chỉ là một đoạn văn bản đơn giản
    if (el.children.length === 0 || (el.children.length === 1 && el.children[0].tagName === 'STRONG')) {
      const original = el.textContent.trim();
      if (original.length > 2) {
        const translated = await translateText(original);
        if (translated && translated !== original) {
          el.textContent = translated;
        }
      }
    }
  }

  return body.innerHTML;
}

export async function runAutoSync() {
  console.log('\n================================================================');
  console.log('🤖 ROBOT IDEAS · TỰ ĐỘNG CÀO, DỊCH & ĐẨY LÊN GOOGLE DRIVE/SHEET');
  console.log('================================================================\n');

  // 1. Xác thực phiên làm việc
  const token = await ensureSession();

  // 2. Chạy crawler thu thập bài viết mới
  console.log('📥 Bước 1: Đang quét bài viết mới từ nguồn kỹ thuật...');
  const crawled = await crawlRoboMaster();
  console.log(`Tìm thấy ${crawled.length} bài viết kỹ thuật đạt tiêu chuẩn.\n`);

  if (crawled.length === 0) {
    console.log('✅ Hệ thống đã cập nhật tất cả bài viết mới nhất. Không có bài tồn đọng.');
    return;
  }

  // 3. Xử lý từng bài: Dịch thuật và đẩy thẳng lên Google Drive & Google Sheets
  let pushedCount = 0;

  for (let i = 0; i < crawled.length; i++) {
    const item = crawled[i];
    console.log(`----------------------------------------------------------------`);
    console.log(`[${i + 1}/${crawled.length}] Xử lý: ${item.title}`);

    try {
      // Dịch tiêu đề & tóm tắt
      console.log('  🌐 Đang tự động dịch tiêu đề và tóm tắt sang tiếng Việt...');
      const viTitle = await translateText(item.title);
      const viSummary = await translateText(item.summary || item.title);
      const viRobotIdea = `Giải pháp kỹ thuật tham khảo từ bài viết: "${viTitle}". Ứng dụng trong phát triển robot thuộc phân mảng ${item.category}.`;

      // Dịch nội dung chi tiết
      console.log('  📄 Đang tự động biên tập và dịch nội dung HTML song ngữ...');
      const viBodyHtml = await translateHtmlContent(item.html || item.content || '');

      // Đóng gói nội dung HTML hoàn chỉnh song ngữ
      const fullHtml = `
<article class="robot-ideas-article">
  <header class="article-header">
    <h1>${viTitle}</h1>
    <div class="article-meta">
      <p><strong>Nguồn:</strong> <a href="${item.url}" target="_blank">${item.sourceName}</a> · <strong>Tác giả:</strong> ${item.author || 'Cộng đồng kỹ sư'}</p>
      <p><strong>Chuyên mục:</strong> <span class="badge">${item.category}</span></p>
    </div>
  </header>

  <hr>

  <!-- Bản dịch tiếng Việt -->
  <div class="article-body vietnamese-content" style="line-height:1.8;font-size:15px;">
    ${viBodyHtml}
  </div>

  <!-- Phần nguyên tác tiếng Trung gập gọn để đối chiếu -->
  <details class="original-content" style="margin-top:40px;background:#f9faf8;border:1px solid #dce1d8;border-radius:8px;padding:16px;">
    <summary style="cursor:pointer;font-weight:600;color:#285e46;">
      🇨🇳 Xem bài viết nguyên tác gốc (Tiếng Trung đối chiếu)
    </summary>
    <div class="chinese-body" style="margin-top:16px;color:#555;font-size:13px;line-height:1.7;">
      <h4>${item.title}</h4>
      ${item.html || item.content || ''}
    </div>
  </details>
</article>
      `.trim();

      // Đẩy thẳng lên Google Drive & Google Sheets với trạng thái "pending" (Chờ duyệt)
      console.log('  ☁️  Đang đẩy lên Google Drive & Google Sheets (Hàng chờ duyệt)...');
      const payload = {
        article: {
          title: viTitle.slice(0, 240),
          summary: viSummary.slice(0, 1000),
          category: item.category,
          sourceName: item.sourceName.slice(0, 200),
          sourceUrl: item.url,
          robotIdea: viRobotIdea.slice(0, 5000),
          html: fullHtml,
          status: 'pending' // Chờ duyệt trên Web Admin
        }
      };

      await callApi('save', payload, token);
      console.log(`  ✅ [THÀNH CÔNG] Đã lưu vào Drive & Sheet với trạng thái: PENDING (Chờ duyệt)!`);
      pushedCount++;

      // Nghỉ ngắn để không dồn dập API
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      if (err.message && err.message.includes('URL nguồn đã có trong thư viện')) {
        console.log(`  ⏭️  Bài viết này đã có trong cơ sở dữ liệu Drive/Sheets.`);
      } else {
        console.warn(`  ❌ [LỖI] ${err.message}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`🎉 HOÀN TẤT TỰ ĐỘNG HÓA!`);
  console.log(`- Đã cào, dịch và đẩy lên Google Drive & Sheets: ${pushedCount} bài viết mới.`);
  console.log(`- Tất cả bài viết hiện đang ở trạng thái: PENDING (Chờ duyệt).`);
  console.log(`👉 BÂY GIỜ ANH CHỈ CẦN:`);
  console.log(`   1. Mở trang quản trị: https://datahub-shark.github.io/news/admin.html`);
  console.log(`   2. Vào mục "◷ Hàng chờ duyệt"`);
  console.log(`   3. Đọc lướt bản dịch song ngữ và bấm "Duyệt đăng"!`);
  console.log('================================================================\n');
}

if (process.argv[1] && process.argv[1].endsWith('auto-sync.mjs')) {
  runAutoSync().catch(console.error);
}
