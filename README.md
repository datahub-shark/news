# ROAB Ideas

Thư viện ý tưởng phát triển robot. Giao diện tĩnh trên GitHub Pages, dữ liệu riêng tư trên Google Sheets, API và trang biên tập trên Google Apps Script. Không có khóa bí mật trong repo.

## Chức năng bản đầu

- Tìm kiếm, lọc chủ đề, đọc bài và mở nguồn gốc; giao diện điện thoại.
- Đăng nhập biên tập bằng mã email; phiên 1 giờ, tối đa 5 lần thử mã, giới hạn gửi lại 60 giây.
- Lưu nháp / chờ duyệt / công khai / từ chối. API đọc công khai chỉ trả bài published.
- Chống ghi đè phiên bản cũ; khóa ghi đồng thời; không render HTML nhập từ nguồn.
- Nhập RSS/Atom từ danh sách nguồn cho phép, chống trùng URL; luôn tạo bản nháp.
- Nhật ký thay đổi trạng thái trên Sheets.

**Chưa tích hợp AI dịch hoặc cào toàn văn.** RSS chỉ lấy tiêu đề và tóm tắt; người duyệt tự hoàn thiện nội dung. Không có bài demo giả làm dữ liệu thật. Chưa có upload ảnh; khi bổ sung sẽ lưu Google Drive với quyền truy cập tách biệt khỏi cơ sở dữ liệu.

## Triển khai Google (làm một lần)

1. Tạo dự án tại https://script.google.com bằng tài khoản Google quản trị. Tạo file `Code.gs`, `Admin.html`, bật hiển thị manifest trong Project Settings rồi chép ba file tương ứng từ `google-apps-script/`.
2. Project Settings → Script properties: thêm `ADMIN_EMAIL` bằng email nhận mã duyệt bài. Không đặt email hay mã trong frontend.
3. Trong trình biên tập, chạy `setup_` và cấp quyền Google yêu cầu. Hàm tạo Google Spreadsheet và lưu `SHEET_ID` trong Script Properties; URL bảng nằm trong execution log. Chạy lại không xóa dữ liệu.
4. **Giữ Spreadsheet riêng tư**, chỉ cấp cho quản trị viên tin cậy. Không Publish to web, không chia sẻ Anyone with link. Không dùng tài khoản chứa dữ liệu nhạy cảm khác nếu không cần.
5. Deploy → New deployment → Web app → Execute as **Me**, Who has access **Anyone**. API công khai cần cấu hình này; dữ liệu nháp và mọi thao tác quản trị đều kiểm tra session ở server. Không dùng URL `/dev`.
6. Copy URL kết thúc `/exec` vào `config.js` → `apiUrl`. URL triển khai là địa chỉ công khai, không phải bí mật.
7. Mở URL `/exec?view=admin`, gửi mã đến email quản trị, nhập mã và tạo bài đầu tiên. Đăng xuất sẽ xóa session ở server; token chỉ nằm trong bộ nhớ trang, không localStorage.
8. Sau khi sửa Apps Script: Deploy → Manage deployments → Edit → New version → Deploy để URL cũ tiếp tục dùng mã mới.

Không cần Google OAuth Client ID. Mã chỉ gửi đến ADMIN_EMAIL, không cho người dùng tự chọn người nhận. Bản đầu chỉ có một vai trò quản trị; độc giả xem bài công khai không cần đăng nhập.

## GitHub Pages

Repo: https://github.com/datahub-shark/news

Settings → Pages → Build and deployment → Deploy from a branch → `main` / root. Sau khi GitHub triển khai thành công, địa chỉ dự kiến là https://datahub-shark.github.io/news/ . Phải kiểm tra trạng thái Pages thực tế trước khi coi là đã chạy.

Chỉ frontend và mã nguồn backend nằm trong repo. Không commit `.clasp.json`, token phiên, mã OTP hoặc Script Properties. Dữ liệu bài viết nằm trong Google Sheet, không nằm trong repo công khai.

## Nguồn RSS

Trong Sheet `Sources`, thêm hàng theo cột:

| id | name | feedUrl | enabled |
| --- | --- | --- | --- |
| mã tự đặt | Tên nguồn | URL HTTPS RSS/Atom do bạn xác minh | TRUE |

Sau đó bấm **Nhập RSS** ở trang biên tập. Mỗi lượt tối đa 5 nguồn × 5 mục đầu. Feed chuyển hướng sẽ bị bỏ qua; cấu hình URL đích chính thức. Xem execution log khi nhập thất bại. Chỉ dùng nguồn được phép khai thác và giữ liên kết/tác giả. Không vượt paywall hoặc tự đăng bản dịch toàn văn chưa có quyền.

Muốn tự động nhập: trong Apps Script chạy `installImportTrigger_` để tạo một trigger mỗi 6 giờ. Bài thu thập luôn ở trạng thái `draft`. Xóa trigger trong Apps Script để tắt. Chỉ bật khi đã kiểm tra nguồn và hạn mức; trigger chạy bằng quyền người cài.

## Bước tiếp theo: AI

Luồng dự kiến: nguồn cho phép → RSS/API → chống trùng → AI dịch/tóm tắt tiếng Việt, đề xuất ứng dụng robot → nháp riêng tư → quản trị kiểm tra/sửa → công khai. Dùng Script Properties cho API key, xử lý theo lô nhỏ, ghi lỗi và không tự xuất bản khi AI trả về lỗi. Chưa chọn nhà cung cấp, chưa có API key và chưa phát sinh lệnh gọi AI.

Google Sheets/Apps Script có hạn mức miễn phí, không đảm bảo vô hạn hoặc SLA. AI có thể có chi phí riêng. Tham khảo hạn mức hiện hành: https://developers.google.com/apps-script/guides/services/quotas . Khi thư viện lớn cần phân trang và chỉ mục tìm kiếm thay cho quét toàn bộ Sheet.

## Kiểm tra

Yêu cầu Node.js 18+: `node --test tests/backend.test.cjs`.

Test offline xác minh quyền server, cách ly nháp, vòng đời xuất bản, xung đột phiên bản, đầu vào và phiên OTP. **Không thay thế kiểm tra triển khai Google thật**: cần thử gửi email, đăng nhập, lưu nháp, đọc API ẩn danh, xuất bản, gỡ công khai và đăng xuất. Người chưa đăng nhập không được đọc nháp hoặc sửa bài. Chưa xác nhận triển khai Google/Pages chỉ từ việc test offline thành công.
