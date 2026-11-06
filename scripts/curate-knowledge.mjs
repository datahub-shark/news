/**
 * Robot Ideas - Cập nhật lại các bài viết theo tôn chỉ:
 * - Tập trung 100% vào tri thức kỹ thuật, giải pháp, sơ đồ, thông số.
 * - Loại bỏ các chi tiết thừa về đội thi, nhật ký cá nhân, than thở giải đấu của tác giả gốc.
 * - Giọng văn: "Người biên tập tổng hợp & chia sẻ giải pháp kỹ thuật thực chiến".
 */

import fs from 'node:fs';

const API_URL = 'https://script.google.com/macros/s/AKfycbzptC6MVeswlOqbKiIVXSohkfdU0aZeAkkKeRB9r1xbX7gZvzf_NKmiLJY3DzT_sSwB/exec';
const SYNC_TOKEN = 'robot-ideas-sync-secret-2026';

async function updateArticle(id, articleData) {
  // Lấy version hiện tại
  const getRes = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ action: 'get', payload: { id, token: SYNC_TOKEN } })
  });
  const current = await getRes.json();
  if (!current.ok) throw new Error(current.error);

  const payload = {
    article: {
      id,
      version: current.article.version,
      status: current.article.status,
      category: articleData.category || current.article.category,
      sourceName: articleData.sourceName || current.article.sourceName,
      sourceUrl: articleData.sourceUrl || current.article.sourceUrl,
      title: articleData.title,
      summary: articleData.summary,
      coverImage: articleData.coverImage || current.article.coverImage || '',
      robotIdea: articleData.robotIdea,
      html: articleData.html
    }
  };

  const saveRes = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ action: 'save', payload: { ...payload, token: SYNC_TOKEN } })
  });
  const result = await saveRes.json();
  if (!result.ok) throw new Error(result.error);
  return result;
}

// 1. Dữ liệu chuẩn hóa bài RoboMark
const robomarkData = {
  title: 'RoboMark: Nền tảng tự động gán nhãn Dataset cho Robot bằng mô hình thị giác VLM',
  category: 'Thị giác máy',
  sourceName: 'RoboMaster BBS (AIM Lab)',
  sourceUrl: 'https://bbs.robomaster.com/article/1972431',
  coverImage: 'https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/3adff5fc389b42269a9041284d7285511793168673738/03-model-eval.png',
  summary: 'Giải pháp ứng dụng các mô hình ngôn ngữ thị giác lớn (VLM như GLM-5.3, Claude Sonnet) qua giao thức OpenAI / vLLM để tự động gán nhãn sơ bộ (pre-annotation) cho dữ liệu hình ảnh robot. Giúp giảm hơn 80% thời gian vẽ nhãn thủ công, hỗ trợ kiểm tra nhãn góc giáp xe 4-8 điểm và xuất dataset trực tiếp sang chuẩn YOLOv8, Darknet, COCO.',
  robotIdea: 'Áp dụng vào pipeline huấn luyện mô hình nhận diện cho xe tự hành (AGV/AMR) và robot thi đấu. Tận dụng sức mạnh suy luận của mô hình ngôn ngữ thị giác lớn để vẽ khung ứng viên tự động, kỹ sư chỉ cần ngồi kiểm tra và tinh chỉnh lại các góc lệch, tăng tốc độ hoàn thiện dataset từ vài tuần xuống vài ngày.',
  html: `
<article class="robot-ideas-article">
  <header class="article-header">
    <h1>RoboMark: Nền tảng tự động gán nhãn Dataset cho Robot bằng mô hình thị giác VLM</h1>
    <div class="article-meta">
      <p><strong>Chuyên mục:</strong> <span class="badge">Thị giác máy</span> · <strong>Mã nguồn:</strong> <a href="https://github.com/unnc-aim/RoboMark" target="_blank" rel="noopener">GitHub unnc-aim/RoboMark ↗</a></p>
      <p><strong>Nguồn tham khảo:</strong> <a href="https://bbs.robomaster.com/article/1972431" target="_blank" rel="noopener">RoboMaster BBS</a></p>
    </div>
  </header>

  <div class="resource-box" style="background:#f0f7ff;border:1px solid #1b85ff;padding:16px;border-radius:8px;margin:20px 0;">
    <h3 style="margin-top:0;color:#1b85ff;">📦 Tài nguyên & Trải nghiệm trực tuyến</h3>
    <ul style="margin-bottom:0;line-height:1.8;">
      <li><strong>Mã nguồn mở trên GitHub:</strong> <a href="https://github.com/unnc-aim/RoboMark" target="_blank" rel="noopener">https://github.com/unnc-aim/RoboMark ↗</a></li>
      <li><strong>Bản trải nghiệm trực tiếp (Public Demo):</strong> <a href="https://robomark.lijie.space" target="_blank" rel="noopener">https://robomark.lijie.space ↗</a></li>
      <li><strong>Tài khoản Demo:</strong> <code>demo</code> | <strong>Mật khẩu:</strong> <code>RoboMark2026!</code> (Xem ảnh, nhãn, kết quả suy luận AI)</li>
      <li><strong>Tài khoản Admin:</strong> <code>admin</code> | <strong>Mật khẩu:</strong> <code>RoboMark2026!</code> (Trải nghiệm quản trị dataset, cấu hình model)</li>
    </ul>
  </div>

  <div class="article-body" style="line-height:1.8;font-size:15px;">
    <h2>1. Bài toán: Nút thắt khi gán nhãn dữ liệu cho Robot</h2>
    <p>Trong quá trình phát triển hệ thống thị giác máy tính cho robot (như nhận diện tấm giáp, bệ radar, chướng ngại vật hay drone), khâu tiêu tốn nhiều nhân lực và thời gian nhất chính là <strong>gán nhãn thủ công hàng chục nghìn khung hình</strong>.</p>
    <p>Nếu dùng các công cụ truyền thống (như LabelImg, CVAT, Roboflow), kỹ sư phải dùng chuột kéo từng hộp bao, căn chỉnh 4 góc giáp xe trong điều kiện ánh sáng thay đổi. Điều này dẫn đến:</p>
    <ul>
      <li>Tốn hàng trăm giờ làm việc thủ công dễ sai sót.</li>
      <li>Khó kiểm soát chất lượng khi nhiều người cùng gán nhãn.</li>
      <li>Khó khăn trong việc truy xuất vết suy luận khi mô hình nhận diện bị lỗi.</li>
    </ul>

    <h2>2. Giải pháp RoboMark: Dùng VLM gán nhãn tự động (Pre-annotation)</h2>
    <p>RoboMark giải quyết vấn đề này bằng mô hình <strong>Human-in-the-loop (Người kiểm duyệt kết hợp AI)</strong>. Thay vì con người vẽ từ đầu:</p>
    <ol>
      <li><strong>VLM tự động vẽ trước:</strong> Sử dụng các mô hình ngôn ngữ thị giác lớn (như Claude 3.5 Sonnet, GLM-4V, Qwen-VL hoặc các mô hình chạy local qua vLLM) để nhận diện đối tượng và tự động điền hộp bao tọa độ.</li>
      <li><strong>Lưu vết suy luận (Traceability):</strong> Hệ thống lưu lại toàn bộ câu prompt, thời gian suy luận (TPS), số token tiêu thụ để kiểm soát chất lượng đầu ra.</li>
      <li><strong>Con người chỉ đóng vai trò Review:</strong> Kỹ sư mở giao diện Web, kiểm tra kết quả AI vẽ, chỉ cần kéo chỉnh các góc lệch nhỏ rồi bấm Xác nhận.</li>
    </ol>
    <p><img src="https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/3adff5fc389b42269a9041284d7285511793168673738/03-model-eval.png" alt="Đánh giá mô hình VLM trên RoboMark" style="max-width:100%;border-radius:6px;margin:15px 0;"></p>

    <h2>3. Kiến trúc kỹ thuật của hệ thống</h2>
    <p>RoboMark được thiết kế theo kiến trúc module hóa phân tán:</p>
    <ul>
      <li><strong>Frontend (Giao diện Web):</strong> Viết bằng Vue 3 / Vite, hỗ trợ thao tác kéo thả mượt mà, phóng to thu nhỏ ảnh độ phân giải cao và phím tắt nhanh.</li>
      <li><strong>Backend API:</strong> Xây dựng trên nền Python FastAPI / Node.js, cung cấp REST API quản lý dataset, user và tiến độ công việc.</li>
      <li><strong>Worker suy luận AI:</strong> Hỗ trợ kết nối linh hoạt tới:
        <ul>
          <li>OpenAI API format (gọi các dịch vụ VLM đám mây).</li>
          <li>Local Inference: Máy chủ cục bộ chạy <code>vLLM</code> hoặc <code>Ollama</code> với GPU NVIDIA để gán nhãn hoàn toàn offline, bảo mật dữ liệu nội bộ.</li>
        </ul>
      </li>
      <li><strong>Cơ sở dữ liệu:</strong> Lưu trữ phân cấp thông tin ảnh, phiên bản nhãn và nhật ký đánh giá.</li>
    </ul>

    <p><img src="https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/7b7fc80e9202492193b22e11894d03971793168853177/10-qa-compare.png" alt="So sánh chất lượng nhãn trước và sau kiểm định" style="max-width:100%;border-radius:6px;margin:15px 0;"></p>

    <h2>4. Xuất Dataset chuẩn hóa cho Machine Learning</h2>
    <p>Sau khi hoàn tất quá trình duyệt nhãn, RoboMark hỗ trợ xuất thẳng sang các định dạng thông dụng nhất trong ngành robot:</p>
    <ul>
      <li><strong>Ultralytics YOLO (YOLOv5 / v7 / v8 / v11):</strong> Tự động tổ chức ảnh, file nhãn txt chuẩn hóa tọa độ và file cấu hình <code>data.yaml</code> theo tỉ lệ train / val / test.</li>
      <li><strong>YOLO Darknet:</strong> Danh mục nhãn và file danh sách phân chia dữ liệu.</li>
      <li><strong>COCO JSON:</strong> Tương thích với các thư viện MMDetection, Detectron2.</li>
    </ul>
    <p><img src="https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/e048e2230b6b404b89a44a93366f8e7f1793168895308/12-export.png" alt="Giao diện xuất Dataset trên RoboMark" style="max-width:100%;border-radius:6px;margin:15px 0;"></p>

    <h2>5. Lưu ý thực tế: Phòng tránh rò rỉ dữ liệu (Data Leakage)</h2>
    <div style="background:#fff9e6;border-left:4px solid #f59e0b;padding:14px;border-radius:4px;margin:15px 0;">
      <strong>⚠️ Kinh nghiệm thực chiến khi làm Dataset cho Robot:</strong>
      <p style="margin:8px 0 0;">Khi cắt khung hình từ video thi đấu, các khung hình liền kề thường có góc nhìn rất giống nhau. Nếu chia tập <code>train</code> và <code>val</code> ngẫu nhiên theo từng ảnh, mô hình sẽ gặp hiện tượng <strong>Data Leakage</strong> (độ chính xác trên tập kiểm tra rất cao nhưng khi đem ra sân thi đấu thực tế lại không nhận diện được).<br>
      👉 <strong>Nguyên tắc:</strong> Hãy phân chia tập dữ liệu theo <em>đợt quay, bối cảnh môi trường hoặc video riêng biệt</em> thay vì chia ngẫu nhiên từng frame.</p>
    </div>

    <h2>6. Hướng dẫn tự triển khai hệ thống (Self-host)</h2>
    <p>Nếu không muốn dùng bản public demo mà muốn triển khai nội bộ trên máy trạm của phòng Lab:</p>
    <pre style="background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:6px;overflow:auto;"><code># 1. Tải mã nguồn
git clone https://github.com/unnc-aim/RoboMark.git
cd RoboMark

# 2. Khởi tạo cơ sở dữ liệu MySQL
mysql -u root -p &lt; database/init.sql

# 3. Cấu hình thông số môi trường
cp backend/.env.example backend/.env
# Điền thông tin kết nối Database và khóa API VLM trong backend/.env

# 4. Chạy dịch vụ backend & worker
cd backend && pip install -r requirements.txt
python main.py</code></pre>
  </div>
</article>
  `.trim()
};

// 2. Dữ liệu chuẩn hóa bài Bánh xe Omni nhúng motor 3508
const omniWheelData = {
  title: 'Thiết kế bánh xe Omni nhúng trực tiếp động cơ DJI 3508: Không cần độ hộp số, tối ưu chi phí gia công',
  category: 'Robot di động',
  sourceName: 'RoboMaster BBS (铃谷Suzu)',
  sourceUrl: 'https://bbs.robomaster.com/article/1972643',
  coverImage: 'https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/8ed9054d5f6c4facaf249d6bddeddefc1792746121460/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202026-10-23%20170145.png',
  summary: 'Giải pháp thiết kế cụm bánh xe đa hướng (Omni wheel) nhúng trực tiếp động cơ DJI M3508 nguyên bản mà không cần gia công lại hộp giảm tốc. Giúp hạ thấp trọng tâm robot, thu gọn kích thước cụm bánh xe và tối ưu hóa các chi tiết cơ khí để có thể tự gia công qua in 3D kết hợp cắt CNC tấm kim loại chi phí thấp.',
  robotIdea: 'Ứng dụng trong việc chế tạo khung gầm robot di động đa hướng (Omni mobile robot) cho các robot thi đấu hoặc xe tự hành AGV trong phòng Lab. Giúp thu gọn kích thước cụm bánh xe, hạ thấp trọng tâm khung gầm và chế tạo dễ dàng bằng phương pháp gia công tấm CNC kết hợp in 3D.',
  html: `
<article class="robot-ideas-article">
  <header class="article-header">
    <h1>Thiết kế bánh xe Omni nhúng trực tiếp động cơ DJI 3508: Không cần độ hộp số, tối ưu chi phí gia công</h1>
    <div class="article-meta">
      <p><strong>Chuyên mục:</strong> <span class="badge">Robot di động</span> · <strong>Phần cứng:</strong> DJI M3508 P19 / Bánh xe Omni</p>
      <p><strong>Nguồn tham khảo:</strong> <a href="https://bbs.robomaster.com/article/1972643" target="_blank" rel="noopener">RoboMaster BBS</a></p>
    </div>
  </header>

  <div class="resource-box" style="background:#f4fbf7;border:1px solid #2e7d32;padding:16px;border-radius:8px;margin:20px 0;">
    <h3 style="margin-top:0;color:#2e7d32;">📁 Tệp thiết kế cơ khí 3D CAD đính kèm</h3>
    <ul style="margin-bottom:0;line-height:1.8;">
      <li><strong>Link tải công khai trực tiếp:</strong> <a href="https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/4da01f2023f84829959b9362b7c855c61793281373157/%E5%86%85%E5%B5%8C%E5%85%A8%E5%90%91%E8%BD%AE1.2.zip" target="_blank" rel="noopener" style="font-weight:bold;color:#2e7d32;">Tải file 内嵌全向轮1.2.zip (9.94 MB) ↗</a></li>
      <li><strong>Bao gồm:</strong> Toàn bộ chi tiết gia công tấm kim loại, file in 3D nắp bánh con lăn và file lắp ráp hoàn chỉnh (.STEP, SolidWorks).</li>
    </ul>
  </div>

  <div class="article-body" style="line-height:1.8;font-size:15px;">
    <h2>1. Bài toán: Hạn chế của cụm bánh xe Omni truyền thống</h2>
    <p>Đối với các robot di động sử dụng bánh xe đa hướng (Omni-directional wheel), động cơ thường được gắn nhô ra ngoài thông qua các khớp nối trục hoặc hộp số độ chế. Cách bố trí này gây ra nhiều nhược điểm:</p>
    <ul>
      <li><strong>Tốn không gian khung gầm:</strong> Động cơ chìa ra chiếm diện tích lớn ở 4 góc gầm xe.</li>
      <li><strong>Trọng tâm bị nâng cao:</strong> Khiến robot dễ bị lắc lư, mất ổn định khi di chuyển gia tốc lớn hoặc leo dốc.</li>
      <li><strong>Chi phí gia công cao:</strong> Việc độ lại vỏ hộp số hoặc gia công trục đặc biệt đòi hỏi máy phay CNC 4-5 trục đắt tiền.</li>
    </ul>

    <h2>2. Giải pháp: Nhúng trực tiếp motor DJI M3508 nguyên bản</h2>
    <p>Thiết kế này đưa toàn bộ thân động cơ DJI M3508 (loại giảm tốc hành tinh P19 tích hợp sẵn) vào <strong>bên trong lòng của bánh xe đa hướng</strong>.</p>
    <p><strong>Ưu điểm cốt lõi của giải pháp:</strong></p>
    <ul>
      <li><strong>Không cần độ chế động cơ:</strong> Dùng trực tiếp động cơ DJI M3508 nguyên bản, giữ nguyên hộp số hành tinh và vòng bi sẵn có của nhà sản xuất.</li>
      <li><strong>Cấu trúc cực kỳ gọn nhẹ:</strong> Bánh xe và động cơ tạo thành một cụm duy nhất, độ dày cụm bánh chỉ tương đương chiều dài thân motor.</li>
      <li><strong>Tối ưu hóa gia công:</strong> Các chi tiết khung đỡ được thiết kế thành các tấm phẳng (Sheet metal) có thể cắt laser CNC đơn giản, các gối đỡ con lăn nhỏ có thể in 3D bằng nhựa kỹ thuật chịu lực.</li>
    </ul>

    <div style="text-align:center;margin:24px 0;">
      <img src="https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/8ed9054d5f6c4facaf249d6bddeddefc1792746121460/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202026-10-23%20170145.png" alt="Mô hình 3D cụm bánh xe Omni nhúng motor 3508" style="max-width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <p style="font-size:0.85em;color:#666;margin-top:6px;"><em>Hình 1: Mô hình 3D cụm bánh xe đa hướng sau khi tối ưu hóa kết cấu</em></p>
    </div>

    <h2>3. Phân tích kết cấu lắp ráp chi tiết (Exploded View)</h2>
    <p>Dưới đây là hình vẽ phân rã (Exploded view) toàn bộ các chi tiết cấu thành cụm bánh xe:</p>
    
    <div style="text-align:center;margin:24px 0;">
      <img src="https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/095c52ccf6ff4c15ad2eaec93a2dbf4f1792898030898/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202026-10-24%20223321.png" alt="Bản vẽ phân rã chi tiết cụm bánh xe đa hướng" style="max-width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <p style="font-size:0.85em;color:#666;margin-top:6px;"><em>Hình 2: Bản vẽ bóc tách từng chi tiết (Exploded view) thể hiện rõ vị trí lắp đặt motor DJI M3508</em></p>
    </div>

    <p><strong>Nguyên lý chịu lực:</strong></p>
    <ol>
      <li>Mặt bích đầu ra của hộp số P19 liên kết trực tiếp với đĩa truyền lực chính của bánh xe bằng ốc vít chìm.</li>
      <li>Toàn bộ tải trọng tĩnh và xung lực khi robot va chạm được truyền qua vòng bi cỡ lớn đỡ ngoài, không dồn trực tiếp làm cong trục motor.</li>
      <li>Các con lăn phụ (Sub-rollers) được xếp sole 2 hàng với góc lệch tính toán chính xác để khi bánh xe quay tròn, bề mặt tiếp xúc với mặt đất luôn liên tục, giảm thiểu tối đa hiện tượng rung lắc (vibration) cho cảm biến IMU.</li>
    </ol>

    <div style="text-align:center;margin:24px 0;">
      <img src="https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/a4ad9e738e014f90a505dd951377004d1792745813891/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20261023165423_15_459.jpg" alt="Thử nghiệm xe Sentry thực tế trên sân đấu" style="max-width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <p style="font-size:0.85em;color:#666;margin-top:6px;"><em>Hình 3: Xe robot thực tế lắp đặt cụm 4 bánh đa hướng chạy thử nghiệm</em></p>
    </div>

    <h2>4. Lưu ý về vật liệu chế tạo</h2>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      <thead>
        <tr style="background:#f4f6ef;border-bottom:2px solid #dce1d8;">
          <th style="padding:10px;text-align:left;">Chi tiết</th>
          <th style="padding:10px;text-align:left;">Phương pháp gia công</th>
          <th style="padding:10px;text-align:left;">Vật liệu khuyến nghị</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #e5e9df;">
          <td style="padding:10px;">Đĩa đỡ chính & vành bánh</td>
          <td style="padding:10px;">Cắt Laser CNC tấm</td>
          <td style="padding:10px;">Nhôm 6061 dày 2.5 - 3mm</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e9df;">
          <td style="padding:10px;">Gối đỡ bánh con lăn</td>
          <td style="padding:10px;">In 3D FDM / SLA</td>
          <td style="padding:10px;">PETG, PA-CF (Nylon Carbon) hoặc nhựa resin dẻo</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e9df;">
          <td style="padding:10px;">Con lăn phụ (Sub-rollers)</td>
          <td style="padding:10px;">In 3D / Đúc</td>
          <td style="padding:10px;">TPU 95A hoặc bọc cao su chịu mài mòn</td>
        </tr>
        <tr>
          <td style="padding:10px;">Trục con lăn</td>
          <td style="padding:10px;">Tiện tiêu chuẩn</td>
          <td style="padding:10px;">Thép không gỉ SUS304 / Thép tôi cứng</td>
        </tr>
      </tbody>
    </table>
  </div>
</article>
  `.trim()
};

// 3. Dữ liệu chuẩn hóa bài RM-MotorBench
const motorbenchData = {
  title: 'RM-MotorBench: Bàn test động cơ đa năng cho phòng Lab Robot (Không cần nạp lại Firmware)',
  category: 'Điều khiển',
  sourceName: 'RoboMaster BBS (wbz2006)',
  sourceUrl: 'https://bbs.robomaster.com/article/1971904',
  coverImage: 'https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/ef7d49f3d6244a59b7395bff229315b31792844524622/overview-photo.png',
  summary: 'Tôi tổng hợp giải pháp bàn thử nghiệm và cân chỉnh động cơ RM-MotorBench phục vụ phòng Lab: Cho phép thêm động cơ trực tiếp trên giao diện Web UI theo ID gạt mã ESC, đặt tốc độ vòng quay và gửi lệnh qua USB CDC xuống bo điều khiển để lái bus CAN. Điểm mạnh vượt trội là thay đổi động cơ và tinh chỉnh PID tức thì mà không cần sửa code hay nạp lại firmware, đồng thời hiển thị đồ thị thời gian thực về tốc độ, dòng điện và nhiệt độ.',
  robotIdea: 'Áp dụng ngay cho phòng Lab hoặc xưởng chế tạo robot: Căn chỉnh thông số PID và kiểm tra tải thực tế cho các dòng động cơ DJI (M3508, M2006, GM6020) và Đạt Diệu Damiao (DM4310, DM8009P). Tiết kiệm hàng chục giờ nạp code lặp đi lặp lại khi kiểm tra cơ cấu nạp đạn, bánh đà hoặc khớp quay robot.',
  html: `
<article class="robot-ideas-article">
  <header class="article-header">
    <h1>RM-MotorBench: Bàn test động cơ đa năng cho phòng Lab Robot (Không cần nạp lại Firmware)</h1>
    <div class="article-meta">
      <p><strong>Chuyên mục:</strong> <span class="badge">Điều khiển</span> · <strong>Mã nguồn:</strong> <a href="https://github.com/wbz2006/RM-MotorBench" target="_blank" rel="noopener">GitHub wbz2006/RM-MotorBench ↗</a></p>
      <p><strong>Nguồn tham khảo:</strong> <a href="https://bbs.robomaster.com/article/1971904" target="_blank" rel="noopener">RoboMaster BBS</a></p>
    </div>
  </header>

  <div class="resource-box" style="background:#f0f7ff;border:1px solid #1b85ff;padding:16px;border-radius:8px;margin:20px 0;">
    <h3 style="margin-top:0;color:#1b85ff;">📦 Tài nguyên & Tải phần mềm</h3>
    <ul style="margin-bottom:0;line-height:1.8;">
      <li><strong>Mã nguồn mở trên GitHub:</strong> <a href="https://github.com/wbz2006/RM-MotorBench" target="_blank" rel="noopener">https://github.com/wbz2006/RM-MotorBench ↗</a></li>
      <li><strong>Bản cài đặt Desktop Windows:</strong> <a href="https://github.com/wbz2006/RM-MotorBench/releases/download/host-v1.2.0/MotorBench-1.2.0-Windows-x64.exe" target="_blank" rel="noopener">MotorBench-1.2.0-Windows-x64.exe ↗</a> (Chạy trực tiếp, không cần cấu hình Node.js hay Python)</li>
      <li><strong>Dòng động cơ hỗ trợ:</strong> DJI M3508, DJI M2006, DJI GM6020, Damiao DM4310, DM8009P.</li>
    </ul>
  </div>

  <div class="article-body" style="line-height:1.8;font-size:15px;">
    <h2>1. Bài toán: Nỗi ám ảnh nạp code khi test động cơ</h2>
    <p>Khi thiết kế cơ cấu robot (như cơ cấu cấp đạn, bệ gimbal, cụm bánh đà hay cơ cấu kẹp), khâu thử nghiệm động cơ thường tốn rất nhiều thời gian lãng phí:</p>
    <ul>
      <li>Mỗi lần đổi động cơ hoặc đổi ID CAN, kỹ sư phải mở IDE, sửa code, biên dịch lại rồi nạp lại firmware.</li>
      <li>Khó quan sát trực quan đồ thị đáp ứng bước nhảy (Step response) và độ vọt lố (Overshoot) khi căn chỉnh PID.</li>
      <li>Rủi ro sai lệch ID bus CAN gây va chạm lệnh giữa các thiết bị.</li>
    </ul>

    <h2>2. Giải pháp RM-MotorBench: Test động cơ qua Web UI không cần nạp lại code</h2>
    <p>Tôi thấy giải pháp của <strong>RM-MotorBench</strong> giải quyết trọn vẹn vấn đề này: Người dùng chỉ cần nạp firmware tổng quát một lần duy nhất vào bo điều khiển. Toàn bộ thao tác sau đó được thực hiện trực tiếp trên giao diện Web UI:</p>
    <ol>
      <li><strong>Giao thức giao tiếp:</strong> Máy tính kết nối với bo mạch qua cổng ảo USB Virtual COM (CDC). Các lệnh cấu hình và điều khiển được gửi xuống bo mạch với độ trễ dưới 2ms.</li>
      <li><strong>Tự động điều phối CAN bus:</strong> Bo mạch phân tích lệnh và tự động khởi tạo node điều khiển trên bus CAN tương ứng với ID gạt mã của ESC mà không cần biên dịch lại firmware.</li>
      <li><strong>Phản hồi telemetry thời gian thực:</strong> Tốc độ vòng quay (RPM), dòng điện tiêu thụ (A), vị trí góc và nhiệt độ động cơ được gửi ngược lên máy tính và vẽ biểu đồ trực tiếp.</li>
    </ol>

    <div style="text-align:center;margin:24px 0;">
      <img src="https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/ef7d49f3d6244a59b7395bff229315b31792844524622/overview-photo.png" alt="Bàn test thực tế RM-MotorBench" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <p style="font-size:0.85em;color:#666;margin-top:6px;"><em>Hình 1: Mô hình bàn test thực tế tại phòng Lab</em></p>
    </div>

    <h2>3. Các tính năng kỹ thuật nổi bật</h2>
    <ul>
      <li><strong>Hỗ trợ đa dạng phần cứng:</strong> Firmware mã nguồn mở (CubeMX + CMake) sẵn sàng cho 3 dòng bo mạch thông dụng: DJI Type A, DJI Type C và Damiao MC02; tất cả dùng chung một Host UI.</li>
      <li><strong>Chuyển đổi 3 vòng điều khiển trực tiếp (Vận tốc / Vị trí / Dòng điện):</strong> Căn chỉnh thông số PID ngay trên giao diện web và ghi tức thời vào vòng lặp điều khiển.</li>
      <li><strong>Bộ công cụ đo kiểm chuyên dụng:</strong>
        <ul>
          <li>Vẽ đồ thị đáp ứng thời gian thực với tần số lấy mẫu cao.</li>
          <li>Tự động phát tín hiệu kích thích hình Sin hoặc sóng bước nhảy (Step wave) để nhận dạng hệ thống.</li>
          <li>Công cụ tính toán quy đổi giữa tần số cơ cấu sang số vòng quay/phút của động cơ.</li>
        </ul>
      </li>
      <li><strong>Cơ chế an toàn phòng ngừa hư hại:</strong>
        <ul>
          <li><strong>Nhịp tim bảo vệ (Heartbeat timeout):</strong> Nếu mất tín hiệu kết nối máy tính quá 1.5 giây, bo mạch lập tức ngắt toàn bộ lệnh điều khiển để chống trôi tự do.</li>
          <li><strong>Phím dừng khẩn cấp (E-Stop):</strong> Nhấn phím cách (Spacebar) ngắt lực tức thì khi cơ cấu bị kẹt tải.</li>
        </ul>
      </li>
    </ul>

    <div style="text-align:center;margin:24px 0;">
      <img src="https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/99893f5f7ebd4814a9c32aedf60406651792844454567/ui-annotated.png" alt="Giao diện Web UI của MotorBench" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <p style="font-size:0.85em;color:#666;margin-top:6px;"><em>Hình 2: Chi tiết các vùng chức năng trên phần mềm điều khiển Host UI</em></p>
    </div>

    <h2>4. Hướng dẫn thiết lập & thao tác nhanh</h2>
    <ol>
      <li><strong>Nạp firmware bo mạch:</strong> Dùng VS Code với extension STM32CubeIDE, mở thư mục dự án tương ứng với bo mạch đang có (Type A / Type C / MC02) và nhấn <code>F5</code> để nạp.</li>
      <li><strong>Khởi chạy Host UI trên máy tính:</strong>
        <ul>
          <li>Cách nhanh nhất: Tải file <code>MotorBench-1.2.0-Windows-x64.exe</code> về mở trực tiếp.</li>
          <li>Cách chạy từ nguồn: Mở terminal, gõ <code>npm install && npm start</code> rồi truy cập <code>http://127.0.0.1:3000</code>.</li>
        </ul>
      </li>
      <li><strong>Kết nối & điều khiển:</strong>
        <ul>
          <li>Chọn cổng COM tương ứng của bo mạch.</li>
          <li>Bấm <code>＋ Thêm động cơ</code> $\rightarrow$ Chọn Model (M3508 / M2006 / GM6020 / DM4310) $\rightarrow$ Chọn Bus CAN (CAN1 / CAN2) $\rightarrow$ Điền ID gạt mã của ESC.</li>
          <li>Bấm <code>Bind</code> (Liên kết) $\rightarrow$ Bấm <code>Enable</code> (Kích hoạt) $\rightarrow$ Kéo thanh trượt để test tốc độ và xem đồ thị phản hồi.</li>
        </ul>
      </li>
    </ol>

    <h2>5. Lưu ý thực tế về phần cứng và an toàn điện</h2>
    <div style="background:#fff3cd;border-left:4px solid #f59e0b;padding:14px;border-radius:4px;margin:15px 0;">
      <strong>⚠️ Kinh nghiệm thực chiến khi đấu nối bàn test:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;">
        <li>Luôn kiểm tra chiều phân cực jack nguồn XT30 / XT60 trước khi bật nguồn 24V (cắm ngược cực sẽ cháy nổ chip nguồn và driver).</li>
        <li>Đảm bảo bus CAN có <strong>trở đầu cuối 120Ω</strong> để tránh phản xạ sóng làm mất gói dữ liệu CAN ở tốc độ cao (1 Mbps).</li>
        <li>Khi bắt đầu thử nghiệm cơ cấu mới, luôn giới hạn trần dòng điện (Current Limit) ở mức thấp để tránh làm gãy bánh răng nếu cơ cấu bị kẹt.</li>
      </ul>
    </div>

    <h2>6. Giới hạn cần lưu ý khi sử dụng</h2>
    <ul>
      <li>Danh sách động cơ đã gán trên Web hiện tại không lưu vào bộ nhớ ROM của bo mạch, do đó khi mất nguồn hoặc rút cáp USB bạn sẽ cần bấm thêm lại trên Web.</li>
      <li>Thông số PID mẫu chỉ là tham khảo cho trạng thái không tải; khi lắp vào tải cơ khí thực tế (bánh đà quán tính lớn, cánh tay đòn), cần tinh chỉnh lại hệ số $K_p$, $K_i$, $K_d$ phù hợp.</li>
    </ul>
  </div>
</article>
  `.trim()
};

// 4. Dữ liệu chuẩn hóa bài Hiện tượng rung IMU bánh đà
const imuData = {
  title: 'Hiện tượng rung IMU do bánh đà ma sát: Bản chất toán học và 4 giải pháp triệt tiêu dao động giả',
  category: 'Điều khiển',
  sourceName: 'RoboMaster BBS (红竹)',
  sourceUrl: 'https://bbs.robomaster.com/article/1972619',
  coverImage: 'https://hz-rm-bbs-web-prod.oss-cn-hangzhou.aliyuncs.com/839267f664b44eb1ad8fe947f801e2be1793286469540/%E5%9B%BE3.png',
  summary: 'Tôi tổng hợp phân tích chuyên sâu về hiện tượng bệ ngắm gimbal bị gật gù (Pitch oscillation) khi quay bánh đà ma sát tốc độ cao: Bản chất không phải do cộng hưởng kết cấu tần số thấp, mà do phép chuẩn hóa vector gia tốc trong thuật toán Mahony vô tình nhân chéo hai tần số rung cao thành tần số phách (beat frequency) siêu thấp. Bài viết chia sẻ 4 giải pháp kỹ thuật thực chiến gồm: cân bằng động, bộ lọc thông thấp 20Hz trước Mahony, chuẩn hóa gia tốc cố định a/g, và triển khai thuật toán VQF triệt tiêu 98% rung lắc mà không gây trễ pha.',
  robotIdea: 'Áp dụng trực tiếp cho hệ thống điều khiển bệ ngắm (Gimbal / Turret) trên robot tự hành và cơ cấu phóng bắn cơ khí. Giúp loại bỏ hoàn toàn hiện tượng lệch góc Pitch do rung động bánh đà, đảm bảo độ chính xác ổn định điểm ngắm ở cự ly xa mà không cần hạ thấp đáp ứng của hệ điều khiển.',
  html: fs.readFileSync('published/1972619-khac-phuc-rung-imu-banh-da/index.html', 'utf8').replace(/<!--\s*METADATA[\s\S]*?-->/, '').trim()
};

async function main() {
  console.log('🔄 Đang biên tập lại bài RoboMark theo phong cách chia sẻ tri thức...');
  await updateArticle('af61c7b4-a8dd-41c7-87d7-a509b926519e', robomarkData);
  console.log('✅ Đã cập nhật xong bài RoboMark!\n');

  console.log('🔄 Đang sửa hình ảnh & link tải công khai bài Bánh xe Omni...');
  await updateArticle('8775e721-2bfd-49cf-9385-b909cdbfb42f', omniWheelData);
  console.log('✅ Đã cập nhật xong bài Bánh xe Omni!\n');

  console.log('🔄 Đang biên tập lại bài RM-MotorBench theo phong cách chia sẻ tri thức...');
  await updateArticle('8ff8f6af-a2b0-473b-b3d1-3273ae7f7070', motorbenchData);
  console.log('✅ Đã cập nhật xong bài RM-MotorBench!\n');

  console.log('🔄 Đang thêm ảnh bìa bài Hiện tượng rung IMU...');
  await updateArticle('7a68d0f2-2995-474f-9ceb-38b39f5075ab', imuData);
  console.log('✅ Đã cập nhật xong bài Hiện tượng rung IMU!\n');

  console.log('🎉 Hoàn tất! Tất cả bài viết đã được cập nhật ảnh bìa và hình ảnh chuẩn xác.');
}

main().catch(console.error);
