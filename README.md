# Robot Ideas

Web cá nhân tập hợp ý tưởng phát triển robot. GitHub Pages phục vụ giao diện; Sheets lưu danh sách bài; Drive chứa file HTML riêng tư; Apps Script xác thực và trả nội dung theo trạng thái.

Web: https://datahub-shark.github.io/news/ · Quản trị: https://datahub-shark.github.io/news/admin.html

## Dashboard sau đăng nhập

- **Tổng quan:** tổng số bài, chờ duyệt, đang công khai, bản nháp và bài cập nhật gần đây. Bấm thẻ số liệu để mở danh sách tương ứng.
- **Tất cả bài viết:** tìm kiếm, lọc trạng thái, chỉnh sửa, duyệt đăng hoặc gỡ công khai. Các thao tác xuất bản đều yêu cầu xác nhận.
- **Hàng chờ duyệt:** chỉ các bài pending để kiểm tra trước khi đăng.
- **Nguồn thu thập:** thêm/sửa tên và URL RSS/Atom, bật/tắt nguồn và nhập RSS. Không cần sửa Sheet thủ công; cần cập nhật Code.gs mới để dùng các thao tác nguồn.
- **Hệ thống:** xem cách lưu trữ, xác thực và tình trạng tích hợp AI. Không hiển thị khóa hay token.

Nút **Tạo bài viết** mở trình biên tập riêng, hỗ trợ nhập HTML, sửa mã, xem trước và chọn quyền công khai. Nút **Xem website** mở trang độc giả.

## Nâng cấp sang HTML (giữ dữ liệu hiện tại)

1. Mở dự án Apps Script đang sử dụng. Thay toàn bộ **Code.gs** bằng `google-apps-script/Code.gs` mới trong repo.
2. Thay toàn bộ nội dung file HTML tên **Admin** bằng `google-apps-script/Admin.html` mới. Đây là file đã gộp sẵn CSS, JS và bộ lọc, không cần tạo thêm file trong Apps Script.
3. Lưu. Giữ nguyên `ADMIN_EMAIL` và `SHEET_ID`. Chạy **setup**, cấp quyền Google Drive nếu được yêu cầu. Hàm giữ dữ liệu cũ và tạo thư mục **Robot Ideas · Private HTML**, lưu ID vào Script property `HTML_FOLDER_ID`.
4. **Deploy → Manage deployments → Edit (bút chì) → Version: New version → Deploy**. Giữ Execute as **Me**, access **Anyone**, giữ nguyên URL `/exec`.
5. Mở trang Quản trị trên web, tải lại, nhận mã email và đăng nhập. Nếu báo backend chưa nâng cấp, kiểm tra bước 4.

Không đổi tên setup. Hàm kiểm tra danh tính Google; hàm nội bộ mang dấu `_` không gọi được từ google.script.run. Không xóa Sheet hay bài cũ. Bài văn bản cũ vẫn đọc được, khi lưu lại sẽ chuyển sang HTML trên Drive. Giữ Sheet và thư mục Drive riêng tư.

## Đăng bài HTML

1. Trên web bấm **Quản trị** → **Gửi mã đến email quản trị** → nhập mã → Đăng nhập.
2. Bấm **+ Bài mới** → **Nhập file .html**, hoặc dán mã vào ô HTML. Nhập file mới chỉ đọc trên máy, chưa lưu lên Drive.
3. Điền tiêu đề, chủ đề, tóm tắt, tên tác giả/nguồn và URL bài gốc. Bổ sung gợi ý ứng dụng vào robot nếu có.
4. Bấm **Xem trước nội dung**. Mặc định xem nháp không tải ảnh ngoài; tích Hiện ảnh nếu muốn kết nối máy chủ ảnh của nguồn.
5. Chọn **Riêng tư** hoặc **Chờ duyệt** → **Lưu bài viết**. Mỗi lần lưu tạo file HTML riêng tư mới trên Drive. Sheets lưu ID file hiện tại và thông tin bài; phiên bản trước được giữ riêng tư để phục hồi thủ công, có sử dụng dung lượng Drive.
6. Khi duyệt xong chọn **Công khai** → Lưu → xác nhận. Độc giả đọc qua Apps Script, không cần chia sẻ công khai file Drive.
7. Muốn gỡ bài: chọn **Riêng tư** → Lưu. API ngừng trả nội dung cho yêu cầu mới; không thể thu hồi nội dung người khác đã tải/xem.

Chọn bài trong kho để đọc/sửa. Tải lại lấy bản mới nhất và cảnh báo thay đổi chưa lưu. Hệ thống chặn ghi đè phiên bản cũ. Đăng xuất xóa token và nội dung đang mở khỏi bộ nhớ tab.

## Cách hiển thị HTML

- Drive giữ HTML gốc để tiếp tục sửa. API trả trong JSON, không phục vụ trực tiếp HTML có quyền ứng dụng.
- Trình đọc và xem trước dùng DOMPurify 3.4.17 đóng gói trong `vendor/`, sau đó đặt bài vào iframe sandbox có CSP. Không chạy script, biểu mẫu, handler sự kiện hoặc iframe nhúng. CSS của bài gốc không được sử dụng; bài dùng kiểu trình bày đọc chung.
- Hỗ trợ tiêu đề, đoạn văn, ảnh HTTPS, liên kết, bảng, danh sách, trích dẫn, khối mã. Không bảo đảm giữ bố cục của file HTML gốc.
- Ảnh phải có URL HTTPS độc giả truy cập được. Đường dẫn tương đối ghép với URL bài gốc. Chưa hỗ trợ ảnh riêng tư Drive, ảnh trên máy, base64 hoặc video nhúng. Không tự chia sẻ thư mục ảnh.
- Giới hạn 500.000 ký tự HTML/bài, file nhập tối đa 1,5 MB. Danh sách bài không tải toàn bộ HTML từ Drive.

## Cài từ đầu

1. Tạo dự án tại https://script.google.com; chép `Code.gs`, HTML tên `Admin`, và manifest `appsscript.json` từ thư mục google-apps-script.
2. Project Settings → Script properties → thêm **ADMIN_EMAIL** bằng email nhận mã quản trị. Không ghi email/bí mật vào frontend.
3. Chạy **setup** và cấp quyền. Sheet và thư mục HTML được tạo tự động, giữ riêng tư. Ai có quyền sửa Sheet/Script được coi là quản trị tin cậy.
4. Deploy → New deployment → Web app → Execute as **Me**, access **Anyone**. Điền URL `/exec` vào `config.js` → apiUrl.
5. GitHub repo Settings → Pages → Deploy from a branch → **main / root**. Frontend không cần build.

OTP chỉ gửi đến ADMIN_EMAIL: tối đa 20 email/ngày UTC, cách 60 giây; mã có hạn 10 phút, 5 lần thử; phiên tối đa một giờ (Google Cache có thể hết sớm hơn). Token chỉ trong bộ nhớ tab. Chưa hỗ trợ nhiều vai trò/tài khoản.

## RSS và AI

Sheet Sources gồm `id`, `name`, `feedUrl`, `enabled`. Thêm nguồn RSS/Atom HTTPS chính thức được phép thu thập, đặt enabled TRUE. Nút **Nhập RSS** tạo nháp, tối đa 5 nguồn × 5 mục đầu/lượt, chống trùng URL. Nguồn lỗi/chuyển hướng sẽ bỏ qua; xem execution log.

Chạy **installImportTrigger** trong Apps Script nếu muốn nhập mỗi 6 giờ. Xóa trigger trong Apps Script để tắt. Không tự công khai.

**Chưa có AI tự tìm/dịch.** Có thể nhập file HTML do AI tạo bên ngoài. Tích hợp AI tự động cần chọn dịch vụ/khóa API/giới hạn chi phí riêng; khóa chỉ đặt trong Script properties. Kiểm tra nguồn, quyền sử dụng và bản dịch trước khi đăng.

## Phát triển và kiểm tra

Node.js 22 trở lên. `npm ci`, `npm test`. Test backend dùng mock Google, test trình đọc dùng JSDOM và DOMPurify thật; không thay thế thử Google/Drive/email/trình duyệt thật.

Sửa UI quản trị tại admin.html, admin.css, admin.js, html-viewer.js. Chạy **npm run build:admin** để tạo lại `google-apps-script/Admin.html` trước khi triển khai.

Thử sau triển khai: đăng nhập → nhập HTML → xem trước → lưu riêng tư → API ẩn danh không đọc được → công khai → web đọc được → gỡ công khai → API từ chối → đăng xuất. Không gọi test offline là kết quả Google thật.

Google có hạn mức miễn phí và Drive hữu hạn: https://developers.google.com/apps-script/guides/services/quotas . Chưa có phân trang cho thư viện lớn. Không commit OTP, token, khóa API, .clasp.json hoặc dữ liệu riêng tư.

DOMPurify: https://github.com/cure53/DOMPurify · giấy phép: vendor/DOMPurify-LICENSE.
