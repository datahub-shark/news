# linkS trên Robot Ideas

Mở `index.html` qua máy chủ web của Robot Ideas. `linkS.html` là bàn thiết kế tự chứa, giữ toàn bộ công cụ cơ cấu, DXF, quỹ đạo và lực 2D; tải riêng file này để làm việc ngoại tuyến.

Ngày 07/11/2026: backend tài khoản mới đã được triển khai và cấu hình OAuth Client ID. API cấp challenge Google thành công và từ chối truy cập dự án/tài khoản khi chưa đăng nhập. Frontend dùng đăng nhập Google và lưu dự án riêng; lần đăng nhập thật, quyền admin của chủ và lưu/mở dự án trên Drive cần được xác nhận bằng tài khoản người dùng.

`projects.js` nối tài khoản với cơ cấu đang mở qua API của bàn thiết kế. Lưu lên tài khoản là thao tác riêng; bản nháp tự lưu trong trình duyệt không thay cho bản lưu trên server. Không đưa token hay Google Client Secret vào nguồn.

Cập nhật bàn thiết kế bằng `npm run build:links -- <đường-dẫn-tới-linkS.html>`; mặc định lấy bản đã build ở `../link-shark-dxf/dist/linkS.html`. `build-info.json` ghi SHA-256 để đối chiếu.
