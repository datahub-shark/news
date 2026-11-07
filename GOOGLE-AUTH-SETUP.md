# Đăng nhập Google, phân quyền và lưu dự án linkS

Bản mã chuyển đăng nhập email sang Google Identity Services. Người dùng mới tự được tạo với quyền **member**; admin quản lý **admin / vip / member**. linkS là một phần của website tại `/news/links/`. Hướng dẫn này áp dụng cho mã nguồn ngày 07/11/2026; cần thực hiện cấu hình và kiểm tra trực tuyến trước khi coi tính năng đã hoạt động trên website.

**Kích hoạt theo thứ tự: OAuth client → backend Apps Script mới → frontend admin mới.** Không thay trang admin đang chạy bằng bản Google login khi backend vẫn dùng mã email, vì hai cơ chế không tương thích và có thể gián đoạn đăng nhập quản trị. Tích hợp linkS có thể được triển khai trước để dùng bản nháp trên máy; chức năng lưu tài khoản chỉ hoạt động sau khi hoàn tất cấu hình và triển khai backend. Việc có file mới trong repo không xác nhận API đang chạy đã nâng cấp.

Trạng thái kiểm tra trước kích hoạt ngày 07/11/2026: endpoint đang chạy vẫn trả API cũ, chưa có `googleClientId` từ `authConfig`. Vì vậy Google login, phân quyền và lưu dự án tài khoản trong bản mã này còn chờ cấu hình OAuth, nâng cấp deployment và kiểm tra thực tế.

## 1. Tạo Google OAuth Web client

Trong [Google Cloud Console](https://console.cloud.google.com/auth/clients), chọn/tạo dự án của bạn. Cấu hình Google Auth Platform: tên ứng dụng, email hỗ trợ và đối tượng sử dụng. Với website cho nhiều tài khoản Google cá nhân, chọn **External**; **Internal** dành cho tổ chức Google Workspace. Tạo client loại **Web application**, lấy **Client ID** kết thúc bằng `.apps.googleusercontent.com`. Cách tạo client và branding được mô tả trong [hướng dẫn Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

Trong **Authorized JavaScript origins**, thêm đúng:

```text
https://datahub-shark.github.io
```

Origin chỉ gồm giao thức và hostname; **không thêm `/news`, `/admin.html`, `/links/` hoặc dấu `/` cuối**. Nếu chủ động phát triển trên cổng 8000, thêm riêng `http://localhost` và `http://localhost:8000`; dùng cổng khác thì đăng ký đúng cổng đó. Không cần thêm localhost cho bản chỉ dùng trên GitHub Pages. Quy tắc origin và lỗi `origin_mismatch` được Google nêu tại [Manage OAuth Clients](https://support.google.com/cloud/answer/15549257?hl=en).

Luồng hiện tại nhận credential qua JavaScript callback, không dùng OAuth redirect callback; không điền URL Apps Script `/exec` vào Authorized JavaScript origins. Đăng nhập admin qua trang GitHub Pages; trang Admin nhúng trong Apps Script có origin khác và không tự được cấp quyền bởi origin trên.

**Client ID được phép công khai.** Luồng này không dùng client secret hoặc mật khẩu Google trong frontend. Không yêu cầu thành viên cấp quyền Drive/Sheets: backend lưu dữ liệu vào kho của chủ website.

### Audience, Testing và mở đăng ký

Google thường giới hạn ứng dụng **Testing** ở tối đa 100 test users. Tuy nhiên, Google có ngoại lệ cho đăng nhập chỉ yêu cầu tên, email và hồ sơ cơ bản: không bắt buộc danh sách test users, không có cảnh báo thử nghiệm và không áp dụng thời hạn cấp quyền 7 ngày. Xem [quy định Audience chính thức](https://support.google.com/cloud/answer/15549945?hl=en). Bản này chỉ dùng thông tin đăng nhập cơ bản; không thêm các scope Drive/Sheets của người dùng vào OAuth client.

Kiểm tra Audience và các yêu cầu Google đang hiển thị trong Console. Nếu thay đổi scope hoặc Google yêu cầu tester cho cấu hình cụ thể, thêm email thử nghiệm trước; cấu hình cho phát hành công khai theo hướng dẫn Console. Trạng thái Testing/Production của Google và quyền member/admin trong website là hai cài đặt độc lập.

## 2. Cấu hình Apps Script

Thay `Code.gs` bằng [bản trong repo](google-apps-script/Code.gs). Trong **Project Settings → Script properties**, cấu hình:

| Property | Giá trị / công dụng |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Client ID của Web application vừa tạo; backend trả ID công khai cho frontend qua `authConfig`. |
| `ADMIN_EMAIL` | Email Google của chủ hệ thống; bootstrap tài khoản admin được bảo vệ. Nên dùng Gmail hoặc Google Workspace. |
| `SHEET_ID` | Giữ ID database hiện có khi nâng cấp. Để trống khi cài mới để `setup` tạo Sheet. |
| `HTML_FOLDER_ID` | Giữ thư mục HTML bài viết hiện có. Tự tạo nếu chưa có. |
| `PROJECTS_FOLDER_ID` | Thư mục JSON linkS riêng tư, không có người được chia sẻ. `setup` tự tạo nếu chưa có. |
| `ALLOW_MEMBER_SIGNUP` | Bỏ trống hoặc `true`: tài khoản Google mới tự thành member. Chỉ đặt đúng chuỗi `false` khi muốn chuyển sang chế độ chỉ mời. |
| `OWNER_GOOGLE_SUB` | Tự ghi Google ID ổn định sau lần đăng nhập đầu của chủ. Không sửa/xóa tùy tiện vì đây là danh tính chủ đã gắn; đổi `ADMIN_EMAIL` sau đó không tự chuyển chủ. |
| `SYNC_KEY` | Tùy chọn cho script nhập bài của chủ; dùng bí mật ngẫu nhiên mới ít nhất 32 ký tự. Không cần cho Google login hoặc lưu dự án. Không dùng khóa mặc định cũ. |

Chạy **setup** trong Apps Script editor bằng tài khoản chủ và cấp quyền cho backend. Hàm bổ sung bảng `Users`, `UserSessions`, `Projects` mà không xóa bảng/bài viết hiện có. Sheet và kho dự án phải được giữ riêng tư; người được cấp quyền sửa trực tiếp Script/Sheet/Drive là người quản trị tin cậy ngoài ứng dụng.

Lần đăng nhập đầu gắn một email được admin thêm trước với Google ID phải dùng Gmail hoặc Workspace đã được Google xác minh là đơn vị quản lý email. Google Account dùng email ngoài Gmail/Workspace có thể đăng ký member nhưng không được tự nhận lời mời/quyền của email có sẵn. Danh tính tài khoản và chủ dự án sau đó được gắn với Google `sub`, không nhận từ email hay role do trình duyệt tự khai.

## 3. Triển khai backend và frontend

1. Sau khi cấu hình OAuth, trong repo chạy `npm run build:admin`. Chép `google-apps-script/Admin.html` vào file HTML tên **Admin** trong Apps Script để chuẩn bị phiên bản backend mới; bản đang triển khai chưa đổi cho đến bước 2. Bản trình dựng `links/linkS.html` đã đóng gói sẵn; chỉ khi cập nhật trình dựng mới cần `npm run build:links -- /đường/dẫn/linkS.html` (nguồn mặc định `../link-shark-dxf/dist/linkS.html`).
2. Apps Script → **Deploy → Manage deployments → Edit → New version → Deploy**. Với cài mới, tạo **Web app**, **Execute as: Me**, **Who has access: Anyone**. API công khai là điểm nhận yêu cầu; quyền dữ liệu được kiểm tra ở backend.
3. Giữ URL deployment `/exec` cũ khi nâng cấp; với deployment mới, cập nhật `apiUrl` trong `config.js`. Không thêm token hoặc client secret vào file này.
4. Sau khi OAuth và backend đã sẵn sàng, triển khai admin mới lên GitHub Pages. Frontend gồm `account.js` và thư mục `links/`; linkS có thể xuất hiện trước ở chế độ bản nháp trên máy. Hoàn tất bước này ngay sau nâng cấp backend vì phiên email cũ không còn dùng được. Việc sửa file trên máy hoặc chạy test chưa cập nhật GitHub Pages/Apps Script.
5. Mở `https://datahub-shark.github.io/news/admin.html`, tải lại trang và đăng nhập Google của chủ. Kiểm tra mục **Tài khoản** rồi thử tài khoản Google thứ hai.

Frontend tự đọc Client ID từ `authConfig`; không cần sao chép client ID vào mã trang. Backend mới không đọc phiên/mã email cũ; các script mới cũng không dùng file phiên cũ `data/.admin_session.json`. Cần đăng nhập lại bằng Google sau khi nâng cấp.

## 4. Tài khoản và quyền

| Vai trò | Quyền hiện tại |
| --- | --- |
| member | Tạo, lưu, mở, đổi tên, xóa dự án linkS của mình. |
| vip | Quyền dự án cá nhân như member; vai trò được lưu để mở rộng sau, chưa có gói trả phí/hạn mức riêng. |
| admin | Quyền dự án cá nhân và quản lý bài viết, nguồn, playlist, tài khoản. Không tự được đọc dự án của thành viên khác qua API dự án. |

Trong quản trị, thêm email và chọn vai trò để cấp quyền trước khi người đó đăng nhập, hoặc đổi quyền sau khi họ tự đăng ký. Khóa tài khoản hoặc đổi vai trò thu hồi các phiên đã cấp. Chủ hệ thống được bảo vệ khỏi hạ quyền/khóa qua giao diện quản trị.

Phiên ứng dụng có hạn 30 ngày, tối đa 10 phiên/tài khoản. Server lưu hash trong `UserSessions`; trình duyệt giữ token để khôi phục đăng nhập dùng chung giữa linkS và admin. Đăng xuất thu hồi phiên. Đăng nhập Google không tự trao quyền admin: quyền được đọc từ `Users` cho mỗi yêu cầu.

## 5. Dự án linkS lưu ở đâu

Lưu trên trình duyệt chỉ tạo bản nháp trên máy hiện tại. Thao tác **lưu vào tài khoản** gửi mô hình lên backend; `Projects` giữ ID, chủ sở hữu, tên, phiên bản và ID file, còn Drive chứa JSON riêng tư. Người dùng mở lại dự án sau khi đăng nhập cùng Google Account trên thiết bị khác.

Mỗi lần lưu tạo một JSON phiên bản mới. Backend kiểm tra phiên bản để từ chối ghi đè khi hai cửa sổ cùng sửa; tải lại bản mới trước khi lưu tiếp. Xóa dự án ẩn dự án khỏi ứng dụng, còn các JSON lịch sử được giữ trên Drive để chủ có thể phục hồi thủ công. Dung lượng và hạn mức sử dụng thuộc tài khoản chủ backend; chưa có chính sách dọn phiên bản hoặc hạn mức VIP riêng.

API chỉ trả dự án thuộc Google ID của phiên hiện tại. Không trả file ID/link Drive trong metadata cho người dùng và không chia sẻ công khai thư mục/file JSON.

## Script đồng bộ bài viết

Các script CLI không mở luồng đăng nhập Google hay gửi mã email và không lưu token vào file. Cấu hình một trong hai biến môi trường trong tiến trình chạy script:

- `ROBOT_IDEAS_SYNC_KEY`: cùng giá trị với Script property `SYNC_KEY`, dùng riêng trên máy/tiến trình của chủ. Chỉ cho phép `list`, `get`, `save` bài viết; backend chỉ nhận lưu `draft`/`pending` và từ chối sửa bài `published`/`rejected`. CLI nhập mới thu hẹp xuống `pending`.
- `ROBOT_IDEAS_SESSION_TOKEN`: token phiên ứng dụng của Google admin hiện tại, dùng khi cần chỉnh sửa bài đang công khai. Nếu đặt cả hai biến, phiên Google admin được ưu tiên. Đây là token ứng dụng sau Google login, không phải Google ID token hoặc OAuth client secret.

Nạp biến từ kho bí mật hoặc nhập ẩn trong PowerShell để tránh ghi giá trị vào lịch sử lệnh. Ví dụ chạy một lượt nhập bài vào hàng chờ:

```powershell
$syncCredential = Read-Host 'SYNC_KEY của chủ website' -AsSecureString
$syncPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($syncCredential)
try {
  $env:ROBOT_IDEAS_SYNC_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($syncPointer)
  Remove-Item Env:ROBOT_IDEAS_SESSION_TOKEN -ErrorAction SilentlyContinue
  rtk node scripts/sync-to-drive.mjs
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($syncPointer)
  Remove-Item Env:ROBOT_IDEAS_SYNC_KEY -ErrorAction SilentlyContinue
}
```

Để dùng phiên admin, đăng nhập trang quản trị trên máy của chủ; token ứng dụng nằm trong localStorage của origin website dưới khóa `robot_ideas_user_session` (trường `token`). Chỉ lấy phiên của chính mình, nhập ẩn tương tự với biến `ROBOT_IDEAS_SESSION_TOKEN`, rồi xóa biến sau khi chạy; không dán token vào chat, source, URL hoặc file. Đăng xuất để thu hồi phiên khi xong. Không cấp phiên admin cho người dùng/tiến trình nhập bài thông thường.

`auto-sync.mjs`, `sync-to-drive.mjs`, `push-approved.mjs` và `push_all_to_queue.mjs` mặc định đưa bài vào hàng chờ. `curate-knowledge.mjs`, `update_queue_translations.mjs`, `sync_all_translated_html_to_queue.py`, `translate_and_sync_all_html.py` giữ trạng thái bài hiện có nên yêu cầu phiên Google admin. Không có quyền xuất bản tự động từ khóa nhập bài. Lệnh `npm run sync:drive` hiện chỉ đồng bộ thư mục Drive trên máy; để gọi API dùng `node scripts/sync-to-drive.mjs` như ví dụ trên. API URL lấy từ `config.js`, có thể ghi đè cho một tiến trình bằng `ROBOT_IDEAS_API_URL`.

## 6. Kiểm tra sau triển khai

1. Đăng nhập chủ: nhận role admin; kiểm tra lần đăng nhập đầu đã gắn `OWNER_GOOGLE_SUB`.
2. Dùng Google Account mới: tự thành member, không vào được API quản trị. Admin đổi member thành vip/admin rồi kiểm tra phiên cũ bị thu hồi; đăng nhập lại nhận quyền mới.
3. Tài khoản A tạo/lưu/mở/sửa dự án trên hai cửa sổ. Kiểm tra xung đột phiên bản được từ chối, bản JSON trong Drive và metadata trong Sheet tương ứng.
4. Tài khoản B và yêu cầu ẩn danh không đọc/sửa/xóa được ID dự án A; khóa A hoặc đăng xuất A làm phiên A hết hiệu lực.
5. Kiểm tra Drive/Sheet thực tế vẫn riêng tư. Thử luồng bài nháp → duyệt đăng → gỡ công khai; thử khóa nhập bài không gọi được tài khoản/dự án hoặc xuất bản.

Nếu lỗi `origin_mismatch`, kiểm tra origin đầy đủ và đúng OAuth Web client. Nếu thiếu cấu hình, kiểm tra `GOOGLE_CLIENT_ID` và phiên bản deployment. Nếu Workspace chặn đăng nhập, kiểm tra chính sách của tổ chức và Audience trong Google Console.

Test offline chỉ mô phỏng Apps Script/Google: không xác nhận deployment, OAuth popup/FedCM, chính sách Google Workspace, quyền Drive thật, CORS hoặc hạn mức. Bản Apps Script hiện xác minh ID token qua HTTPS `tokeninfo` của Google, nên phụ thuộc dịch vụ đó khi đăng nhập; [Google khuyến nghị thư viện xác minh token ở server cho production](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token). Khi phát triển quy mô lớn, cần chuyển xác minh sang backend hỗ trợ thư viện Google/JWT và đánh giá lại lưu trữ/hạn mức.
