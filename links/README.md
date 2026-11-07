# linkS trên Robot Ideas

Mở `index.html` qua máy chủ web của Robot Ideas. `linkS.html` là bàn thiết kế tự chứa, giữ toàn bộ công cụ cơ cấu, DXF, quỹ đạo và lực 2D; tải riêng file này để làm việc ngoại tuyến.

Ngày 07/11/2026: công cụ được tích hợp trước; phần tài khoản Google và lưu dự án chờ OAuth Client ID và triển khai backend tài khoản mới. Backend hiện tại chưa cung cấp đăng nhập Google. Trang quản trị hiện có tiếp tục dùng bản đã triển khai cho tới đợt chuyển đổi.

`projects.js` nối tài khoản với cơ cấu đang mở qua API của bàn thiết kế. Lưu lên tài khoản là thao tác riêng; bản nháp tự lưu trong trình duyệt không thay cho bản lưu trên server. Không đưa token hay Google Client Secret vào nguồn.

Cập nhật bàn thiết kế bằng `npm run build:links -- <đường-dẫn-tới-linkS.html>`; mặc định lấy bản đã build ở `../link-shark-dxf/dist/linkS.html`. `build-info.json` ghi SHA-256 để đối chiếu.
