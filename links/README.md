# linkS trên Robot Ideas

Mở `index.html` qua máy chủ web của Robot Ideas. `linkS.html` là bàn thiết kế tự chứa, giữ toàn bộ công cụ cơ cấu, DXF, quỹ đạo và lực 2D; tải riêng file này để làm việc ngoại tuyến.

Ngày 07/11/2026: backend tài khoản mới đã được triển khai và cấu hình OAuth Client ID. API cấp challenge Google thành công và từ chối truy cập dự án/tài khoản khi chưa đăng nhập. Frontend dùng đăng nhập Google và lưu dự án riêng; lần đăng nhập thật, quyền admin của chủ và lưu/mở dự án trên Drive cần được xác nhận bằng tài khoản người dùng.

`projects.js` nối tài khoản với cơ cấu đang mở qua API của bàn thiết kế. Lưu lên tài khoản là thao tác riêng; bản nháp tự lưu trong trình duyệt không thay cho bản lưu trên server. Không đưa token hay Google Client Secret vào nguồn.

Bản nháp trình duyệt được tách theo ID tài khoản đã xác minh; đăng xuất/đổi tài khoản thay toàn bộ cửa sổ thiết kế để không giữ mô hình cũ trong bộ nhớ. Khách chỉ dùng bộ nhớ tạm. Nháp dùng chung từ bản cũ không được tự nhận vào tài khoản mới. `workspace-storage.js` cấp vùng lưu riêng trước khi app khởi động; bản app mở trực tiếp cũng không đọc khóa nháp dùng chung.

Cập nhật bàn thiết kế bằng `npm run build:links -- <đường-dẫn-tới-linkS.html>`; mặc định lấy bản đã build ở `../link-shark-dxf/dist/linkS.html`. `build-info.json` ghi SHA-256 để đối chiếu.

Build chuyển trực tiếp các chuỗi mặc định của ứng dụng sang tiếng Việt bằng AST: tên mẫu, tên khớp/khâu mới, mô tả, thông báo và tiêu đề xuất tệp. Bảng dịch nằm trong bản tham chiếu, bổ sung tại `vi-defaults.json`; tiếng Anh và tùy chọn xem bản gốc vẫn hoạt động. Tên và nội dung do người dùng đã nhập/lưu không bị dịch lại khi nhập JSON.
