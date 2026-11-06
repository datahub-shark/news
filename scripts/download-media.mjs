/**
 * Robot Ideas - Tải toàn bộ Ảnh, Video và Tệp đính kèm về cục bộ
 * 
 * Mục tiêu:
 * 1. Tải toàn bộ ảnh minh họa, ảnh bìa và video thực nghiệm trong bài viết
 * 2. Đổi tên tệp sang tiếng Việt không dấu chuẩn kebab-case
 * 3. Tổ chức cấu trúc thư mục tự chứa (Self-contained):
 *    [ID]-[slug]/
 *    ├── index.html
 *    ├── attachments/  (Bản vẽ CAD, STEP, ZIP, PDF...)
 *    ├── images/       (Toàn bộ ảnh bìa và ảnh minh họa)
 *    └── videos/       (Video chạy thực nghiệm MP4)
 * 4. Tự động đồng bộ toàn bộ ảnh & video sang Google Drive (G:\My Drive\Robot Ideas Articles)
 */

import fs from 'node:fs';
import path from 'node:path';

const DICT = [
  { match: /封面|headimg|cover|da\.jpg|overview/i, replace: 'anh-bia' },
  { match: /装配|assembly/i, replace: 'lap-ghep' },
  { match: /初始化|init/i, replace: 'khoi-tao' },
  { match: /连续运动|motion|continuous/i, replace: 'chuyen-dong-lien-tuc' },
  { match: /完赛|match|game/i, replace: 'thi-dau' },
  { match: /测试|test|exp/i, replace: 'thuc-nghiem' },
  { match: /发射器|发射|shoot/i, replace: 'co-cau-phong' },
  { match: /供弹|拨盘|feed/i, replace: 'cap-dan' },
  { match: /云台|gimbal/i, replace: 'be-ngam-gimbal' },
  { match: /底盘|chassis/i, replace: 'khung-gam' },
  { match: /轮足|wheel-leg/i, replace: 'robot-banh-chan' },
  { match: /四足|quadruped|dog/i, replace: 'robot-4-chan' },
  { match: /轴|shaft/i, replace: 'truc-co-khi' },
  { match: /键|key/i, replace: 'then-co-khi' },
  { match: /联轴器|coupling/i, replace: 'khop-noi-truc' },
  { match: /机械臂|arm/i, replace: 'canh-tay-robot' },
  { match: /图|image|fig|photo|screenshot|屏幕截图/i, replace: 'hinh' }
];

export function cleanMediaName(rawName, defaultPrefix = 'media', ext = '') {
  let cleanExt = ext || path.extname(rawName).toLowerCase() || '.jpg';
  let base = path.basename(rawName, path.extname(rawName));

  try {
    base = decodeURIComponent(base);
  } catch {}

  for (const item of DICT) {
    base = base.replace(item.match, item.replace);
  }

  // Chuyển ký tự tiếng Việt có dấu sang không dấu
  base = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  base = base.replace(/[đĐ]/g, 'd');

  // Nếu vẫn còn chữ Hán, thay bằng tiền tố mặc định
  if (/[\u4e00-\u9fa5]/.test(base) || !base.trim() || /^[0-9a-f]{20,}$/i.test(base)) {
    base = defaultPrefix;
  }

  base = base
    .replace(/[^\w\.\-]+/g, '-')
    .replace(/\-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return (base || defaultPrefix) + cleanExt;
}

async function downloadFile(url, destPath, maxSizeMb = 80) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
    return { ok: true, cached: true, size: fs.statSync(destPath).size };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);

  try {
    // Kiểm tra dung lượng trước
    try {
      const head = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal });
      const len = Number(head.headers.get('content-length') || 0);
      if (len > maxSizeMb * 1024 * 1024) {
        clearTimeout(timeout);
        return { ok: false, tooLarge: true, sizeMb: (len / 1024 / 1024).toFixed(1) };
      }
    } catch {}

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buffer);
    return { ok: true, size: buffer.length };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err.message };
  }
}

export async function processArticleMedia(articleDir) {
  const htmlFile = path.join(articleDir, 'index.html');
  if (!fs.existsSync(htmlFile)) return;

  const folderName = path.basename(articleDir);
  console.log(`\n📂 Đang xử lý media cho: ${folderName}`);

  let html = fs.readFileSync(htmlFile, 'utf8');
  const imgDir = path.join(articleDir, 'images');
  const vidDir = path.join(articleDir, 'videos');

  // 1. Tìm tất cả ảnh
  const imgMatches = [...html.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi)];
  const coverMatch = html.match(/Ảnh bìa:\s*(https?:\/\/\S+)/i);
  const allImgUrls = new Set();
  
  if (coverMatch && coverMatch[1]) allImgUrls.add(coverMatch[1]);
  imgMatches.forEach(m => allImgUrls.add(m[1]));

  let imgIdx = 1;
  const imgUrlMap = new Map();

  for (const url of allImgUrls) {
    const rawName = url.split('/').pop().split('?')[0];
    const isCover = coverMatch && coverMatch[1] === url;
    const prefix = isCover ? 'anh-bia' : `hinh-${imgIdx}`;
    const cleanName = cleanMediaName(rawName, prefix);
    const destPath = path.join(imgDir, cleanName);

    process.stdout.write(`   🖼️  Ảnh [${prefix}] ${cleanName}... `);
    const dl = await downloadFile(url, destPath, 30);
    if (dl.ok) {
      console.log(`✅ ${(dl.size / 1024).toFixed(1)} KB`);
      imgUrlMap.set(url, `./images/${cleanName}`);
      if (!isCover) imgIdx++;
    } else if (dl.tooLarge) {
      console.log(`⏭️ Tệp quá lớn (${dl.sizeMb} MB), giữ link online`);
    } else {
      console.log(`⚠️ ${dl.error || 'Lỗi tải'}`);
    }
  }

  // 2. Tìm tất cả video
  const vidMatches = [
    ...html.matchAll(/<source[^>]+src=["'](https?:\/\/[^"']+\.mp4[^"']*)["']/gi),
    ...html.matchAll(/<video[^>]+src=["'](https?:\/\/[^"']+\.mp4[^"']*)["']/gi)
  ];
  const allVidUrls = new Set(vidMatches.map(m => m[1]));

  let vidIdx = 1;
  const vidUrlMap = new Map();

  for (const url of allVidUrls) {
    const rawName = url.split('/').pop().split('?')[0];
    const cleanName = cleanMediaName(rawName, `video-thuc-nghiem-${vidIdx}`, '.mp4');
    const destPath = path.join(vidDir, cleanName);

    process.stdout.write(`   🎥 Video [video-${vidIdx}] ${cleanName}... `);
    const dl = await downloadFile(url, destPath, 50); // Cho phép tải video tới 50MB
    if (dl.ok) {
      console.log(`✅ ${(dl.size / 1024 / 1024).toFixed(2)} MB`);
      vidUrlMap.set(url, `./videos/${cleanName}`);
      vidIdx++;
    } else if (dl.tooLarge) {
      console.log(`⏭️ Video rất lớn (${dl.sizeMb} MB), giữ link gốc để không nghẽn ổ đĩa`);
    } else {
      console.log(`⚠️ ${dl.error || 'Lỗi tải'}`);
    }
  }

  // 3. Cập nhật đường dẫn trong index.html
  let updatedHtml = html;

  // Cập nhật ảnh bìa trong metadata
  if (coverMatch && imgUrlMap.has(coverMatch[1])) {
    const localCover = imgUrlMap.get(coverMatch[1]);
    updatedHtml = updatedHtml.replace(coverMatch[0], `Ảnh bìa: ${coverMatch[1]}`); // Giữ URL online trong metadata để đồng bộ web
  }

  // Cập nhật ảnh trong thẻ <img> với fallback an toàn
  for (const [onlineUrl, localUrl] of imgUrlMap.entries()) {
    // Chỉ thay thế thuộc tính src="onlineUrl" của thẻ html (không thay bên trong onerror="this.src=...")
    const escapedUrl = onlineUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeRegex = new RegExp(`(?<!this\\.)src=["']${escapedUrl}["']`, 'g');
    if (!updatedHtml.includes(`src="${localUrl}"`)) {
      updatedHtml = updatedHtml.replace(safeRegex, `src="${localUrl}" onerror="this.onerror=null;this.src='${onlineUrl}'"`);
    }
  }

  // Cập nhật video
  for (const [onlineUrl, localUrl] of vidUrlMap.entries()) {
    const safeRegex = new RegExp(`src=["']${onlineUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g');
    updatedHtml = updatedHtml.replace(safeRegex, `src="${localUrl}"`);
  }

  if (updatedHtml !== html) {
    fs.writeFileSync(htmlFile, updatedHtml, 'utf8');
    console.log(`   ✨ Đã cập nhật liên kết hình ảnh và video cục bộ trong index.html`);
  }
}

async function run() {
  console.log(`======================================================`);
  console.log(`🚀 ROBOT IDEAS - BỘ TẢI VÀ ĐỔI TÊN TOÀN BỘ ẢNH & VIDEO`);
  console.log(`======================================================`);

  const pubDir = path.resolve('published');
  if (fs.existsSync(pubDir)) {
    for (const d of fs.readdirSync(pubDir)) {
      const full = path.join(pubDir, d);
      if (fs.statSync(full).isDirectory()) {
        await processArticleMedia(full);
      }
    }
  }

  console.log(`\n☁️  Đang đồng bộ toàn bộ ảnh, video và tệp đính kèm sang Google Drive...`);
  const { execSync } = await import('node:child_process');
  execSync('node scripts/sync-local-drive.mjs', { stdio: 'inherit' });

  console.log(`\n🎉 HOÀN THÀNH TẢI & ĐỒNG BỘ MEDIA LÊN GOOGLE DRIVE!`);
}

if (process.argv[1] && process.argv[1].endsWith('download-media.mjs')) {
  run().catch(console.error);
}
