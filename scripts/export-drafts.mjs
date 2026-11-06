/**
 * Robot Ideas - Xuất bài viết theo thư mục ngắn gọn, súc tích dựa trên nội dung
 *
 * Cấu trúc:
 * drafts/
 * └── [ID]-[chu-de-ngan-gon]/
 *     ├── index.html        (Bài viết song ngữ / tiếng Việt + Metadata)
 *     └── attachments/      (Tự động tải về file .zip, CAD, .pdf đính kèm nếu có)
 */

import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.resolve('data/crawled_articles.json');
const DRAFTS_DIR = path.resolve('drafts');

if (!fs.existsSync(DRAFTS_DIR)) {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  console.log('Chưa có dữ liệu cào. Hãy chạy npm run crawl:robomaster trước.');
  process.exit(0);
}

const articles = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Bộ quy tắc sinh tên thư mục ngắn gọn theo chủ đề cốt lõi của bài viết
const TOPIC_RULES = [
  { match: ['motorbench', '测试台'], slug: 'ban-test-motorbench' },
  { match: ['3508', '全向轮'], slug: 'banh-omni-motor-3508' },
  { match: ['制导镖', 'sg2002', 'licheerv'], slug: 'thi-giac-phi-tieu-sg2002' },
  { match: ['mastiff', '四足'], slug: 'robot-4-chan-mastiff' },
  { match: ['盖格计数器', '哨兵', 'sentry'], slug: 'co-khi-sentry-aim' },
  { match: ['swdescribe', 'solidworks', '闭链'], slug: 'plugin-swdescribe-ros2' },
  { match: ['自定义终端', '终端通信', 'terminal'], slug: 'giao-tiep-terminal-rm2027' },
  { match: ['robodebug', 'debugassistant', '工程变量'], slug: 'cong-cu-robodebug' },
  { match: ['摩擦轮', 'imu', '振动'], slug: 'khac-phuc-rung-imu-banh-da' },
  { match: ['robomark', 'vlm', '标注工具'], slug: 'gan-nhan-vlm-robomark' },
  { match: ['战队运维', '运维入门'], slug: 'van-hanh-chien-doi-rm2026' },
  { match: ['原动机', '标准件', '机械组入门'], slug: 'giao-trinh-dong-co-tieu-chuan' },
  { match: ['无线电', 'iq', 'radar', '雷达'], slug: 'kien-thuc-vo-tuyen-radar' },
  { match: ['报名', '参赛攻略', '攻略'], slug: 'huong-dan-dang-ky-rm2027' },
  { match: ['调车淦曲', '淦曲', '完蛋了'], slug: 'nhac-che-test-xe-rm' }
];

function generateShortSlug(art, id) {
  const text = (art.title + ' ' + (art.summary || '')).toLowerCase();
  for (const r of TOPIC_RULES) {
    if (r.match.some(kw => text.includes(kw))) {
      return `${id}-${r.slug}`;
    }
  }

  // Nếu không khớp từ khóa đặc biệt, lọc lấy các mã tiếng Anh kỹ thuật (như M3508, ROS2...)
  const englishWords = (art.title.match(/[a-zA-Z0-9_\-]+/g) || [])
    .filter(w => !['rm', 'rm2026', 'rm2027', 'beta', 'v1'].includes(w.toLowerCase()))
    .slice(0, 3);

  if (englishWords.length) {
    return `${id}-${englishWords.join('-').toLowerCase()}`;
  }

  return `${id}-bai-viet`;
}

// Chuyển đổi tên tệp tiếng Trung / có dấu sang tiếng Việt không dấu, chuẩn kebab-case
function cleanAttachmentName(rawName, folderSlug = '') {
  const ext = path.extname(rawName).toLowerCase() || '.bin';
  let base = path.basename(rawName, ext);

  // Tra cứu từ điển nhanh cho các thuật ngữ thường gặp
  const DICT = [
    { match: /全向轮/i, replace: 'banh-xe-omni' },
    { match: /内嵌/i, replace: 'nhung' },
    { match: /减速箱/i, replace: 'hop-so' },
    { match: /电机/i, replace: 'motor' },
    { match: /战队文化建设指南/i, replace: 'cam-nang-van-hanh-doi-robot' },
    { match: /我们的进度已经完蛋了/i, replace: 'nhac-che-test-xe-rm' },
    { match: /指南|手册|文档/i, replace: 'huong-dan' },
    { match: /图纸|开源/i, replace: 'ban-ve' },
    { match: /固件/i, replace: 'firmware' },
    { match: /上位机/i, replace: 'host-app' }
  ];

  for (const item of DICT) {
    base = base.replace(item.match, item.replace);
  }

  // Chuyển ký tự tiếng Việt có dấu sang không dấu
  base = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  base = base.replace(/[đĐ]/g, 'd');

  // Nếu vẫn còn chữ Hán (chưa được dịch), thay bằng tên chủ đề của thư mục bài viết
  if (/[\u4e00-\u9fa5]/.test(base)) {
    const slugTopic = folderSlug.replace(/^\d+-?/, '') || 'tai-lieu-ky-thuat';
    base = `${slugTopic}-tai-nguyen`;
  }

  // Chuẩn hóa ký tự: chỉ giữ a-z, 0-9, dấu gạch nối và dấu chấm phiên bản
  base = base
    .replace(/[^\w\.\-]+/g, '-')
    .replace(/\-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return (base || 'tai-lieu-ky-thuat') + ext;
}

function findAttachments(html) {
  const attachments = [];
  const seenUrls = new Set();

  const rmMatches = [...html.matchAll(/data-w-e-type=["']attachment["'][^>]*href=["']([^"']+)["'][^>]*data-file-name=["']([^"']+)["']/gi)];
  for (const m of rmMatches) {
    const url = m[1];
    const name = m[2];
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      attachments.push({ url, filename: name });
    }
  }

  const genericMatches = [...html.matchAll(/<a[^>]*href=["'](https?:\/\/[^"']+\.(zip|rar|7z|tar|gz|pdf|stl|step|stp|dwg|dxf))["'][^>]*>(.*?)<\/a>/gi)];
  for (const m of genericMatches) {
    const url = m[1];
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      const urlFileName = decodeURIComponent(url.split('/').pop().split('?')[0]);
      attachments.push({ url, filename: urlFileName });
    }
  }

  return attachments;
}

async function downloadAttachment(url, destPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    try {
      const headRes = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal
      });
      const len = Number(headRes.headers.get('content-length') || 0);
      if (len > 50 * 1024 * 1024) {
        clearTimeout(timeout);
        const mb = (len / (1024 * 1024)).toFixed(1);
        console.log(`     -> Tệp rất lớn (${mb} MB), giữ link gốc để không làm chậm máy.`);
        return { isExternal: true, size: `${mb} MB` };
      }
    } catch {}

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destPath, buffer);
    const sizeStr = `${(buffer.length / (1024 * 1024)).toFixed(2)} MB`;
    return { isExternal: false, size: sizeStr };
  } catch (err) {
    clearTimeout(timeout);
    const reason = err.name === 'AbortError' ? 'Hết thời gian chờ (mạng chậm)' : err.message;
    console.warn(`    ⚠️ Giữ link trực tuyến (${reason})`);
    return { isExternal: true, size: 'Trực tuyến' };
  }
}

async function exportAll() {
  const force = process.argv.includes('--force');

  console.log(`\n======================================================`);
  console.log(`📁 TẠO THƯ MỤC NGẮN GỌN CHO TỪNG BÀI VIẾT (DRAFTS)`);
  console.log(`Tổng số bài: ${articles.length}`);
  console.log(`======================================================\n`);

  for (const art of articles) {
    const match = art.sourceUrl.match(/\/article\/(\d+)/);
    const id = match ? match[1] : Date.now();
    const folderName = generateShortSlug(art, id);
    const articleDir = path.join(DRAFTS_DIR, folderName);
    const indexPath = path.join(articleDir, 'index.html');
    const attachmentsDir = path.join(articleDir, 'attachments');

    // 1. Kiểm tra xem có thư mục cũ nào chứa ID này không để đổi tên (giữ nguyên bản dịch đang sửa dở)
    const existingDirs = fs.readdirSync(DRAFTS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.includes(id) && d.name !== folderName);

    if (existingDirs.length > 0) {
      const oldDir = path.join(DRAFTS_DIR, existingDirs[0].name);
      console.log(`🔄 [ĐỔI TÊN THƯ MỤC NGẮN GỌN] ${existingDirs[0].name} -> ${folderName}`);
      fs.renameSync(oldDir, articleDir);
      continue;
    }

    if (!force && fs.existsSync(articleDir) && fs.existsSync(indexPath)) {
      console.log(`⏭️  [GIỮ NGUYÊN BẢN ĐANG SỬA] ${folderName}`);
      continue;
    }

    if (!fs.existsSync(articleDir)) {
      fs.mkdirSync(articleDir, { recursive: true });
    }

    // 2. Quét và tải các file đính kèm
    const attachments = findAttachments(art.html);
    const downloadedFiles = [];

    if (attachments.length > 0) {
      if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
      }
      for (const att of attachments) {
        const cleanName = cleanAttachmentName(att.filename, folderName);
        const destFile = path.join(attachmentsDir, cleanName);
        if (!fs.existsSync(destFile)) {
          console.log(`  ⬇️  Đang tải file đính kèm: ${cleanName}...`);
          const dlResult = await downloadAttachment(att.url, destFile);
          if (dlResult) {
            downloadedFiles.push({
              name: cleanName,
              size: dlResult.size,
              url: dlResult.isExternal ? att.url : `./attachments/${cleanName}`,
              isLocal: !dlResult.isExternal
            });
          }
        } else {
          downloadedFiles.push({
            name: cleanName,
            size: 'đã có sẵn trên máy',
            url: `./attachments/${cleanName}`,
            isLocal: true
          });
        }
      }
    }

    // 3. Tạo phần hiển thị file đính kèm trong HTML
    let attachmentsHtml = '';
    let attachmentsMeta = 'Không có';
    if (downloadedFiles.length > 0) {
      attachmentsMeta = downloadedFiles.map(d => `${d.name} (${d.isLocal ? 'Cục bộ' : 'Trực tuyến'} - ${d.size})`).join(', ');
      attachmentsHtml = `
  <div class="local-attachments" style="background:#f0f7ff;border:1px solid #1b85ff;padding:14px;border-radius:8px;margin:18px 0;">
    <h3 style="margin-top:0;color:#1b85ff;">📦 File đính kèm / Mã nguồn CAD:</h3>
    <ul style="margin-bottom:0;">
      ${downloadedFiles.map(d => `<li><a href="${d.url}" target="_blank"><strong>${d.name}</strong></a> (${d.isLocal ? '📁 Đã tải trong thư mục attachments/' : '🌐 Link tải trực tiếp'} - ${d.size})</li>`).join('\n      ')}
    </ul>
  </div>`;
    }

    // 4. Nội dung index.html
    const coverHtml = art.coverImage ? `
  <div class="article-hero-cover" style="margin:20px 0;border-radius:8px;overflow:hidden;max-height:400px;border:1px solid #dce1d8;">
    <img src="${art.coverImage}" alt="${art.title}" style="width:100%;height:100%;object-fit:cover;display:block;">
  </div>` : '';

    const content = `<!-- METADATA
Tiêu đề: ${art.title}
Chuyên mục: ${art.category}
Tác giả: ${art.author}
Ảnh bìa: ${art.coverImage || ''}
Nguồn: ${art.sourceUrl}
Tên nguồn: ${art.sourceName}
Tóm tắt: ${art.summary}
Gợi ý ứng dụng: ${art.robotIdea || ''}
Tệp đính kèm: ${attachmentsMeta}
Trạng thái: DRAFT
HƯỚNG DẪN: 
- Bạn có thể chỉnh sửa tự do Tiêu đề, Tóm tắt, Gợi ý ứng dụng và Nội dung bên dưới.
- Tệp đính kèm (.zip, .pdf...) nằm trong thư mục attachments/ cùng cấp.
- Khi duyệt xong bài này, đổi dòng "Trạng thái: DRAFT" thành "Trạng thái: READY" rồi bấm publish.bat để đẩy lên web!
-->

<article class="robot-ideas-article">
  <h1>${art.title}</h1>
  <div class="article-meta">
    <p><strong>Nguồn:</strong> <a href="${art.sourceUrl}" target="_blank">${art.sourceName}</a> · <strong>Tác giả:</strong> ${art.author}</p>
    <p><strong>Chuyên mục:</strong> ${art.category}</p>
  </div>
  ${coverHtml}
  ${attachmentsHtml}
  <hr>
  <div class="article-body">
${art.html}
  </div>
</article>
`;

    fs.writeFileSync(indexPath, content, 'utf8');
    const attInfo = downloadedFiles.length ? ` (Kèm ${downloadedFiles.length} file đính kèm)` : '';
    console.log(`✅ [TẠO THƯ MỤC BÀI VIẾT] ${folderName}${attInfo}`);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 HOÀN THÀNH! Danh sách thư mục ngắn gọn đã sẵn sàng trong drafts/`);
  console.log(`======================================================\n`);
}

exportAll().catch(console.error);
