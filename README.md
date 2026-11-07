# Robot Ideas

Web cá nhân tập hợp ý tưởng phát triển robot, kèm **linkS** để tạo và lưu cơ cấu. GitHub Pages phục vụ giao diện; Sheets lưu bài viết, tài khoản và metadata dự án; Drive chứa HTML và JSON dự án riêng tư; Apps Script xác thực Google và kiểm tra quyền ở server.

Web: https://datahub-shark.github.io/news/ · linkS: https://datahub-shark.github.io/news/links/ · Quản trị: https://datahub-shark.github.io/news/admin.html

## Tài khoản Google và dự án linkS

Người dùng đăng nhập bằng Google; tài khoản mới **tự trở thành member**. Admin gán quyền **admin / vip / member** và bật/tắt tài khoản trong mục quản lý tài khoản. VIP hiện là vai trò để phân quyền tiếp theo, chưa có gói trả phí hay hạn mức riêng. Tài khoản chủ cấu hình qua `ADMIN_EMAIL` được bảo vệ và gắn với Google ID sau lần đăng nhập đầu.

Trong linkS, bản nháp trình duyệt vẫn nằm trên thiết bị. Dùng thao tác lưu dự án vào tài khoản để lưu bản JSON riêng tư trên Drive và metadata trong sheet `Projects`; đăng nhập cùng tài khoản để mở lại. Mỗi yêu cầu đọc/sửa/xóa đều kiểm tra chủ dự án ở server, kể cả khi người dùng có quyền admin. Dữ liệu này nằm trong Drive/Sheet của chủ website, không yêu cầu quyền truy cập Drive của từng thành viên.

**Cần cấu hình OAuth và triển khai trước khi dùng trực tuyến:** xem [GOOGLE-AUTH-SETUP.md](GOOGLE-AUTH-SETUP.md). Thay đổi trong repo và test offline chưa xác nhận Google login, Sheets, Drive hoặc website đang chạy.

**Thứ tự kích hoạt:** hoàn tất OAuth Web client và backend mới trước, rồi mới thay giao diện admin đang chạy. Giao diện Google login không dùng được với backend email cũ; triển khai admin trước có thể làm gián đoạn đăng nhập quản trị. linkS vẫn có thể dùng bản nháp trên máy khi lưu tài khoản chưa được cấu hình.

## Dashboard sau đăng nhập

- **Tổng quan:** tổng số bài, chờ duyệt, đang công khai, bản nháp và bài cập nhật gần đây. Bấm thẻ số liệu để mở danh sách tương ứng.
- **Tất cả bài viết:** tìm kiếm, lọc trạng thái, chỉnh sửa, duyệt đăng hoặc gỡ công khai. Các thao tác xuất bản đều yêu cầu xác nhận.
- **Playlist:** tạo bộ sưu tập để phân loại bài, thêm một bài vào nhiều playlist và sắp xếp thứ tự bằng nút lên/xuống. Xóa playlist hoặc gỡ bài khỏi playlist vẫn giữ nguyên bài và trạng thái duyệt.
- **Hàng chờ duyệt:** chỉ các bài pending để kiểm tra trước khi đăng.
- **Nguồn thu thập:** thêm/sửa tên và URL RSS/Atom, bật/tắt nguồn và nhập RSS. Không cần sửa Sheet thủ công; cần cập nhật Code.gs mới để dùng các thao tác nguồn.
- **Hệ thống:** xem cách lưu trữ, xác thực và tình trạng tích hợp AI. Không hiển thị khóa hay token.
- **Tài khoản:** thêm email, gán admin/vip/member và khóa/mở tài khoản. Thay đổi quyền hoặc trạng thái thu hồi các phiên hiện có của tài khoản đó.

Nút **Tạo bài viết** mở trình biên tập riêng, hỗ trợ nhập HTML, sửa mã, xem trước và chọn quyền công khai. Nút **Xem website** mở trang độc giả.

### Phân loại bài bằng playlist và ảnh bìa

1. Mở **Playlist → Tạo playlist**, nhập tên và mô tả, rồi lưu.
2. Trong **Tất cả bài viết**, xem ảnh bìa nhỏ cạnh tiêu đề. Bài thiếu ảnh hoặc ảnh lỗi hiện ô thay thế; sửa trường **Ảnh bìa** trong trình biên tập để bổ sung ảnh.
3. Bấm **☷ Playlist** trên một bài để chọn một hoặc nhiều bộ sưu tập. Hoặc tích nhiều bài (có thể qua nhiều trang), chọn playlist ở thanh thao tác rồi bấm thêm.
4. Dùng bộ lọc playlist hoặc **Chưa vào playlist** để phân loại tiếp. Mở một playlist để đổi thứ tự, gỡ bài hoặc sửa tên/mô tả.

Dữ liệu playlist lưu trong sheet **Playlists**, tự tạo khi lưu playlist đầu tiên. Chỉ phiên quản trị đã xác thực đọc/sửa được; website độc giả chưa hiển thị playlist. Các phiên cùng sửa được kiểm tra phiên bản để tránh ghi đè dữ liệu mới.

Để nâng cấp bản đang chạy, cập nhật cả `google-apps-script/Code.gs` và file HTML **Admin** bằng `google-apps-script/Admin.html`, rồi triển khai **New version** như hướng dẫn bên dưới. Giữ nguyên Script properties và URL `/exec`; không cần chạy lại setup cho riêng chức năng playlist. Bản nguồn và kiểm tra offline không tự cập nhật Apps Script đang triển khai.

## Nâng cấp đăng nhập Google và linkS (giữ dữ liệu hiện tại)

1. Mở dự án Apps Script đang sử dụng. Thay toàn bộ **Code.gs** bằng `google-apps-script/Code.gs` mới trong repo.
2. Thay toàn bộ nội dung file HTML tên **Admin** bằng `google-apps-script/Admin.html` mới. Đây là file đã gộp sẵn CSS, JS và bộ lọc, không cần tạo thêm file trong Apps Script.
3. Tạo OAuth Web client theo [hướng dẫn Google login](GOOGLE-AUTH-SETUP.md), thêm Script property `GOOGLE_CLIENT_ID`. Giữ nguyên `ADMIN_EMAIL`, `SHEET_ID` và `HTML_FOLDER_ID`. Chạy **setup** bằng tài khoản chủ, cấp quyền Google Drive nếu được yêu cầu. Hàm giữ dữ liệu cũ, bổ sung `Users`, `UserSessions`, `Projects` và thư mục riêng tư cho JSON dự án (`PROJECTS_FOLDER_ID`).
4. **Deploy → Manage deployments → Edit (bút chì) → Version: New version → Deploy**. Giữ Execute as **Me**, access **Anyone**, giữ nguyên URL `/exec`.
5. Triển khai frontend mới, mở trang Quản trị trên GitHub Pages và đăng nhập bằng Google của chủ. Phiên email cũ hết hiệu lực trên backend mới. Nếu báo backend chưa nâng cấp hoặc thiếu client ID, kiểm tra Script properties và bước 4.

Không đổi tên setup. Hàm kiểm tra danh tính Google; hàm nội bộ mang dấu `_` không gọi được từ google.script.run. Không xóa Sheet hay bài cũ. Bài văn bản cũ vẫn đọc được, khi lưu lại sẽ chuyển sang HTML trên Drive. Giữ Sheet và thư mục Drive riêng tư.

## Đăng bài HTML

### Tự động nhập file có sẵn trên Google Drive vào hàng chờ

1. Trong dự án Apps Script đang nối với website, thay `Code.gs` bằng `google-apps-script/Code.gs` trong repo và lưu; giữ nguyên các Script properties hiện có.
2. Thư mục nguồn mặc định là **Robot Ideas Articles** trong Drive của tài khoản chạy script. Nếu thư mục có tên khác, hoặc có nhiều thư mục cùng tên, đặt Script property **IMPORT_FOLDER_ID** bằng ID thư mục muốn nhập.
3. Chọn hàm **installDriveImport** và bấm **Run** bằng tài khoản sở hữu dự án, cấp quyền Google khi được yêu cầu. Hàm nhập ngay một lượt, rồi đặt lịch mỗi 10 phút. Không cần mở máy tính để lịch chạy trên Google. Trigger dùng mã đã lưu; nếu muốn cập nhật cả API web thì Deploy một phiên bản mới như phần nâng cấp.
4. Mở quản trị → **Đang chờ** → tải lại danh sách để thấy bài vừa nhập. Mỗi lượt tối đa 10 bài mới, quét tối đa 200 mục hoặc khoảng 2 phút rồi tiếp tục ở lượt sau. Vì vậy kho lớn cần nhiều lượt.

Hệ thống đọc file `.html`/`.htm` trong thư mục và thư mục con, bỏ thư mục `attachments`; lấy tiêu đề, chuyên mục, nguồn, tóm tắt và ảnh bìa từ khối `METADATA` hiện có. File không có metadata dùng tiêu đề HTML/tên file. Bài mới luôn là **pending**, kể cả file ghi READY. Đã có cùng file ID hoặc URL nguồn thì bỏ qua; không tự sửa hay đưa bài đã duyệt/từ chối trở lại hàng chờ. Nội dung được lưu thành bản HTML riêng tư cho web, không tự công khai các file đính kèm. Liên kết tương đối/tệp đính kèm riêng tư chưa được chuyển thành link tải công khai.

Chạy **importDriveNow** để nhập thêm một lượt ngay; **stopDriveImport** để dừng lịch. Xem **Executions** và Script property **DRIVE_IMPORT_LAST_RESULT** để biết số bài nhập, bỏ qua và lỗi; file lỗi được bỏ qua trong vòng quét hiện tại và thử lại ở vòng sau. Các thay đổi file đã nhập không tự ghi đè bài trên web.

1. Trên web bấm **Quản trị** → **Đăng nhập bằng Google** bằng tài khoản có quyền admin.
2. Bấm **+ Bài mới** → **Nhập file .html**, hoặc dán mã vào ô HTML. Nhập file mới chỉ đọc trên máy, chưa lưu lên Drive.
3. Điền tiêu đề, chủ đề, tóm tắt, tên tác giả/nguồn và URL bài gốc. Bổ sung gợi ý ứng dụng vào robot nếu có.
4. Bấm **Xem trước nội dung**. Mặc định xem nháp không tải ảnh ngoài; tích Hiện ảnh nếu muốn kết nối máy chủ ảnh của nguồn.
5. Chọn **Riêng tư** hoặc **Chờ duyệt** → **Lưu bài viết**. Mỗi lần lưu tạo file HTML riêng tư mới trên Drive. Sheets lưu ID file hiện tại và thông tin bài; phiên bản trước được giữ riêng tư để phục hồi thủ công, có sử dụng dung lượng Drive.
6. Khi duyệt xong chọn **Công khai** → Lưu → xác nhận. Độc giả đọc qua Apps Script, không cần chia sẻ công khai file Drive.
7. Muốn gỡ bài: chọn **Riêng tư** → Lưu. API ngừng trả nội dung cho yêu cầu mới; không thể thu hồi nội dung người khác đã tải/xem.

Chọn bài trong kho để đọc/sửa. Tải lại lấy bản mới nhất và cảnh báo thay đổi chưa lưu. Hệ thống chặn ghi đè phiên bản cũ. Đăng xuất thu hồi phiên ở server, xóa token lưu trên thiết bị và nội dung đang mở.

## Cách hiển thị HTML

- Drive giữ HTML gốc để tiếp tục sửa. API trả trong JSON, không phục vụ trực tiếp HTML có quyền ứng dụng.
- Trình đọc và xem trước dùng DOMPurify 3.4.17 đóng gói trong `vendor/`, sau đó đặt bài vào iframe sandbox có CSP. Không chạy script, biểu mẫu, handler sự kiện hoặc iframe nhúng. CSS của bài gốc không được sử dụng; bài dùng kiểu trình bày đọc chung.
- Hỗ trợ tiêu đề, đoạn văn, ảnh HTTPS, liên kết, bảng, danh sách, trích dẫn, khối mã. Không bảo đảm giữ bố cục của file HTML gốc.
- Ảnh phải có URL HTTPS độc giả truy cập được. Đường dẫn tương đối ghép với URL bài gốc. Chưa hỗ trợ ảnh riêng tư Drive, ảnh trên máy, base64 hoặc video nhúng. Không tự chia sẻ thư mục ảnh.
- Giới hạn 500.000 ký tự HTML/bài, file nhập tối đa 1,5 MB. Danh sách bài không tải toàn bộ HTML từ Drive.

## Cài từ đầu

1. Tạo dự án tại https://script.google.com; chép `Code.gs`, HTML tên `Admin`, và manifest `appsscript.json` từ thư mục google-apps-script.
2. Project Settings → Script properties → thêm **ADMIN_EMAIL** bằng email Google của chủ và **GOOGLE_CLIENT_ID** bằng OAuth Web client ID. Cấu hình origin và consent theo [GOOGLE-AUTH-SETUP.md](GOOGLE-AUTH-SETUP.md). Không đưa client secret hoặc token vào frontend.
3. Chạy **setup** và cấp quyền bằng tài khoản chủ. Sheet, thư mục HTML và thư mục JSON linkS được tạo tự động, giữ riêng tư. Ai có quyền sửa Sheet/Script/Drive của backend được coi là quản trị tin cậy.
4. Deploy → New deployment → Web app → Execute as **Me**, access **Anyone**. Điền URL `/exec` vào `config.js` → apiUrl.
5. GitHub repo Settings → Pages → Deploy from a branch → **main / root**. Bản trình dựng trong `links/linkS.html` đã đóng gói để triển khai. Chạy `npm run build:admin` để đóng gói admin; chỉ thay giao diện admin đang chạy sau khi OAuth và backend mới đã sẵn sàng. Muốn cập nhật trình dựng, dùng `npm run build:links -- /đường/dẫn/linkS.html`; nguồn mặc định là `../link-shark-dxf/dist/linkS.html`.

Đăng nhập dùng Google Identity Services với nonce một lần. Server kiểm tra Google ID token, sau đó cấp phiên ứng dụng 30 ngày; sheet `UserSessions` chỉ lưu bản băm token. Tối đa 10 phiên/tài khoản. Trình duyệt lưu phiên dùng chung cho linkS và admin; đăng xuất thu hồi phiên ở server. Đổi quyền hoặc khóa tài khoản thu hồi các phiên trước đó. `ALLOW_MEMBER_SIGNUP` mặc định cho tự đăng ký member; đặt chuỗi `false` nếu muốn chỉ nhận email admin đã thêm. Cơ chế gửi mã email cũ đã được thay thế.

Các script nhập bài dùng biến môi trường của chủ: `ROBOT_IDEAS_SYNC_KEY` tương ứng Script property `SYNC_KEY`, hoặc `ROBOT_IDEAS_SESSION_TOKEN` của phiên Google admin. Không có khóa mặc định và không đọc/ghi file phiên. Khóa đồng bộ chỉ dùng `list`/`get`/`save` bài nháp/chờ duyệt, không quản lý tài khoản hoặc dự án và không xuất bản. Script sửa bài đang công khai cần phiên Google admin. Xem cách chạy tại [GOOGLE-AUTH-SETUP.md](GOOGLE-AUTH-SETUP.md#script-đồng-bộ-bài-viết).

## RSS và AI

Sheet Sources gồm `id`, `name`, `feedUrl`, `enabled`. Thêm nguồn RSS/Atom HTTPS chính thức được phép thu thập, đặt enabled TRUE. Nút **Nhập RSS** tạo nháp, tối đa 5 nguồn × 5 mục đầu/lượt, chống trùng URL. Nguồn lỗi/chuyển hướng sẽ bỏ qua; xem execution log.

Chạy **installImportTrigger** trong Apps Script nếu muốn nhập mỗi 6 giờ. Xóa trigger trong Apps Script để tắt. Không tự công khai.

**Chưa có AI tự tìm/dịch.** Có thể nhập file HTML do AI tạo bên ngoài. Tích hợp AI tự động cần chọn dịch vụ/khóa API/giới hạn chi phí riêng; khóa chỉ đặt trong Script properties. Kiểm tra nguồn, quyền sử dụng và bản dịch trước khi đăng.

## Phát triển và kiểm tra

### Hiệu năng giao diện

Trang chủ hiển thị 18 bài đầu, nút **Xem thêm** mở thêm 18 bài. Quản trị chia trang 40 bài; tìm kiếm và bộ lọc vẫn áp dụng trên toàn bộ danh sách đã tải. Tìm kiếm thư viện lớn chờ 120 ms sau lần gõ cuối để giảm dựng lại DOM. Trang chủ dùng font hệ thống và chỉ trang đọc/biên tập mới tải DOMPurify. Ảnh giải mã bất đồng bộ; ảnh ngoài vùng đầu trang tải khi cần.

API hiện vẫn trả toàn bộ metadata, nên thời gian kết nối Apps Script và dung lượng danh sách chưa được giải quyết bằng phân trang phía server. Thay đổi backend cần cập nhật Code.gs và triển khai phiên bản Apps Script mới; cập nhật giao diện quản trị nhúng bằng `npm run build:admin` rồi chép Admin.html. Test JSDOM với 1.000 bài kiểm tra giới hạn DOM và tìm kiếm, không thay thế đo hiệu năng trên trình duyệt thật.

Node.js 22 trở lên. `npm ci`, `npm test`; kiểm tra riêng credential CLI bằng `node --test scripts/editorial-auth.test.mjs`. Test backend dùng mock Google, test trình đọc dùng JSDOM và DOMPurify thật; không thay thế thử Google login/Drive/Sheets/trình duyệt thật.

Sửa UI quản trị tại admin.html, admin.css, admin.js, html-viewer.js; đăng nhập dùng chung qua account.js. Chạy **npm run build:admin** để tạo lại `google-apps-script/Admin.html` trước khi triển khai.

Thử sau triển khai: Google của chủ → thêm/đổi quyền tài khoản → Google mới tự thành member → lưu/mở dự án linkS → tài khoản khác không đọc/sửa/xóa được → khóa tài khoản thu hồi phiên. Tiếp tục kiểm tra luồng bài: nhập HTML → xem trước → lưu riêng tư → API ẩn danh không đọc được → công khai → web đọc được → gỡ công khai → API từ chối → đăng xuất. Không gọi test offline là kết quả Google thật.

Google có hạn mức miễn phí và Drive hữu hạn: https://developers.google.com/apps-script/guides/services/quotas . Chưa có phân trang cho thư viện lớn. Không commit token, khóa API, .clasp.json hoặc dữ liệu riêng tư. Mỗi lần lưu dự án tạo một JSON phiên bản mới; xóa dự án ẩn khỏi ứng dụng, chưa xóa các JSON lịch sử trên Drive.

DOMPurify: https://github.com/cure53/DOMPurify · giấy phép: vendor/DOMPurify-LICENSE.
