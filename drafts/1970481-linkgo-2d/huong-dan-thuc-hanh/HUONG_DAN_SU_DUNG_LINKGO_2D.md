# LinkGo 2D — Cẩm Nang Hướng Dẫn Sử Dụng & Phân Tích Chuyên Sâu

> **Phiên bản:** LinkGo v1.1 (Bản Việt hóa & Tối ưu hóa giao diện đa ngôn ngữ)  
> **Nền tảng:** Web độc lập (HTML5/Canvas/React), tối ưu cho PC, iPad và máy tính bảng cảm ứng.  
> **Tác giả gốc:** 俣琦 (Yuxi) — Đội RoboMaster, Đại học Nottingham Ninh Ba (UNNC).  
> **Tài liệu kèm theo:** 8 Video thực hành thao tác chi tiết trong thư mục `huong-dan-thuc-hanh/video/`.

---

## MỤC LỤC
1. [Giới thiệu & Bản chất của công cụ LinkGo 2D](#1-giới-thiệu--bản-chất-của-công-cụ-linkgo-2d)
2. [Phân tích năng lực mô phỏng: LinkGo 2D có thể làm những gì?](#2-phân-tích-năng-lực-mô-phỏng-linkgo-2d-có-thể-làm-những-gì)
3. [Danh mục 8 Video thực hành chi tiết](#3-danh-mục-8-video-thực-hành-chi-tiết)
4. [Hướng dẫn thao tác từng bước theo từng phân hệ chức năng](#4-hướng-dẫn-thao-tác-từng-bước-theo-từng-phân-hệ-chức-năng)
   - [4.1. Bảng điều khiển đỉnh (Toolbar) & Quản lý dự án](#41-bảng-điều-khiển-đỉnh-toolbar--quản-lý-dự-án)
   - [4.2. Thư viện cơ cấu mẫu kinh điển & Phân tích cấu hình](#42-thư-viện-cơ-cấu-mẫu-kinh-điển--phân-tích-cấu-hình)
   - [4.3. Bảng bên trái: Động lực học, Nguồn dẫn động & Ràng buộc](#43-bảng-bên-trái-động-lực-học-nguồn-dẫn-động--ràng-buộc)
   - [4.4. Bảng bên phải: Thuộc tính đối tượng & Hộp công cụ phác thảo](#44-bảng-bên-phải-thuộc-tính-đối-tượng--hộp-công-cụ-phác-thảo)
   - [4.5. Ghi tư thế (Pose Recording) & Tự tổng hợp cơ cấu từ quỹ đạo vẽ tay](#45-ghi-tư-thế-pose-recording--tự-tổng-hợp-cơ-cấu-từ-quỹ-đạo-vẽ-tay)
   - [4.6. Bàn tính toán bộ truyền cơ khí: Bánh răng, Xích tải & Đai răng](#46-bàn-tính-toán-bộ-truyền-cơ-khí-bánh-răng-xích-tải--đai-răng)
   - [4.7. Kiểm tra giao thoa, vùng cản & Mô phỏng va chạm mặt đất](#47-kiểm-tra-giao-thoa-vùng-cản--mô-phỏng-va-chạm-mặt-đất)
   - [4.8. Thao tác nâng cao: Đa chọn, Căn chỉnh & Tạo cụm vật rắn](#48-thao-tác-nâng-cao-đa-chọn-căn-chỉnh--tạo-cụm-vật-rắn)
5. [Các vấn đề tồn tại đã được khắc phục trong bản cập nhật](#5-các-vấn-đề-tồn-tại-đã-được-khắc-phục-trong-bản-cập-nhật)
6. [Bảng phím tắt & Mẹo thao tác nhanh](#6-bảng-phím-tắt--mẹo-thao-tác-nhanh)

---

## 1. Giới thiệu & Bản chất của công cụ LinkGo 2D

Trong quá trình thiết kế ý tưởng ban đầu cho các hệ thống robot (đặc biệt là robot thi đấu RoboMaster như cơ cấu nạp đạn, tay gắp bóng/hộp, cụm nâng hạ tháp pháo, cơ cấu chân di chuyển đa khâu kiểu Klann/Jansen), các kỹ sư cơ khí thường gặp khó khăn:
- **Phần mềm CAD 3D (SolidWorks, Inventor, Fusion 360):** Quá nặng nề, tốn nhiều thời gian thiết kế từng chi tiết và tạo ràng buộc ăn khớp khi chỉ cần kiểm chứng tính đúng đắn về mặt nguyên lý.
- **Phần mềm hình học động (GeoGebra):** Mạnh về toán học thuần túy nhưng thiếu hoàn toàn các khái niệm kỹ thuật cơ khí như khối lượng khâu, lực quán tính, mô-men xoắn động cơ, góc truyền lực và ma sát khớp.
- **Phần mềm 2D Linkage (David Rector):** Khá thân thiện nhưng giao diện desktop cũ kỹ, khó dùng trên iPad/tablet khi họp bàn ý tưởng, và thiếu khả năng phân tích tải trọng động lực học cũng như tổng hợp quỹ đạo tự do.

**LinkGo 2D** ra đời để giải quyết bài toán này: Đưa toàn bộ quy trình **vẽ cơ cấu $\to$ mô phỏng chuyển động $\to$ tính toán tải trọng $\to$ kiểm tra va chạm $\to$ tổng hợp cơ cấu** vào trong một file HTML duy nhất, chạy mượt mà trên mọi trình duyệt web hiện đại, không cần kết nối mạng hay cài đặt bất kỳ phần mềm hỗ trợ nào.

---

## 2. Phân tích năng lực mô phỏng: LinkGo 2D có thể làm những gì?

LinkGo 2D là một workbench tích hợp đa năng với 8 nhóm năng lực cốt lõi:

### 2.1. Động học phẳng đa bậc tự do (Planar Multibody Kinematics)
- Hỗ trợ giải nghiệm động học vị trí, vận tốc và gia tốc cho các chuỗi động học hở (open-loop) và kín (closed-loop).
- Khớp quay bản lề (Revolute Joint - 1 DOF quay) và Khớp tịnh tiến/con trượt (Prismatic Slider - 1 DOF tịnh tiến dọc ray dẫn hướng cố định hoặc ray gắn trên thanh di động).
- Cơ cấu nhiều thanh liên kết, khớp hàn cứng (Weld Joint) liên kết nhiều thanh thành một cụm vật rắn bất biến hình.
- Giám sát góc truyền lực thời gian thực $\mu$ (Transmission angle) và cảnh báo nguy cơ kẹt/điểm chết (Dead-point) khi $\mu < 45^\circ$ hoặc cơ cấu đến vị trí duỗi thẳng/gập sát.

### 2.2. Động lực học ngược & Phân tích tải trọng (Inverse Dynamics & Load Breakdown)
- Tự động giải bài toán động lực học ngược thời gian thực: Khi người dùng đặt quy luật chuyển động (quay đều, chuyển vị hình sin, bám quỹ đạo vẽ tay), phần mềm tính toán ra:
  * **Mô-men xoắn cần thiết của động cơ $\tau(t)$ (N·m)**.
  * **Lực dọc trục của xi-lanh/con trượt $F_{drive}(t)$ (N)**.
- Phân tích bóc tách các thành phần tải:
  * Tải quán tính ($I \cdot \alpha$).
  * Trọng lực tĩnh ($m \cdot g$) theo vector trọng trường tùy chỉnh.
  * Lực Coriolis và gia tốc hướng tâm.
  * Lực đàn hồi và mô-men cản ma sát/cản nhớt tại các khớp xoay.

### 2.3. Không gian làm việc & Bản đồ nhiệt mô-men (Workspace Reachability & Heatmap)
- Cho phép gắn **Điểm khảo sát (Coupler Point / Point of Interest)** tại bất kỳ vị trí nào trên thanh liên kết (kể cả điểm lệch ra ngoài trục thanh).
- Tự động quét toàn bộ miền không gian mà điểm khảo sát có thể vươn tới (Reachable Workspace).
- Phân vùng màu nhiệt trực quan:
  * **Màu xanh lá:** Tải nhẹ, động cơ hoạt động tối ưu.
  * **Màu vàng/cam:** Tải trung bình.
  * **Màu đỏ:** Tải đỉnh (Peak load) hoặc cơ cấu tiệm cận vị trí kỳ dị (kinematic singularity).
  * **Màu xám:** Vùng ngoài tầm với hoặc không thể xác định tải do vi phạm ràng buộc.

### 2.4. Tổng hợp cơ cấu từ quỹ đạo tự do vẽ tay (Freehand Path Synthesis)
- Người dùng chỉ cần vẽ tự do một đường cong mục tiêu trên màn hình (ví dụ: quỹ đạo chân robot bước đi, quỹ đạo nâng hạ của tay gắp).
- Thuật toán tối ưu hóa của LinkGo sẽ tự động tìm kiếm kích thước các khâu và vị trí gối đỡ cố định để cơ cấu 4 khâu hoặc 5 khâu tạo ra quỹ đạo bám sát nhất với đường vẽ.

### 2.5. Ghi tư thế (Pose Recording) & Kéo ghi quỹ đạo chuyển động (Drag Recording)
- Chế độ **Ghi tư thế (Key poses):** Lưu từng tư thế của cơ cấu tại các trạng thái làm việc quan trọng, hệ thống tự động nội suy chuyển động mượt mà tuần hoàn giữa các tư thế (Spline loop).
- Chế độ **Kéo ghi đường cong:** Người dùng chỉ cần bật nút ghi rồi dùng chuột/ngón tay kéo một nút bất kỳ di chuyển, phần mềm sẽ lấy mẫu liên tục mọi nút và tạo thành chu trình chuyển động thực tế.

### 2.6. Mô-đun tra cứu & Tính toán bộ truyền cơ khí chuẩn (Transmission Sizing Workbench)
- **Bánh răng trụ răng thẳng (Spur Gears - ISO / Metric & Imperial DP):** Tính toán tỷ số truyền, đường kính vòng chia, vòng cơ sở, vòng đỉnh, vòng chân, khoảng cách trục, hệ số trùng khớp $\epsilon$, ứng suất uốn Lewis sơ bộ và cảnh báo nguy cơ cắt chân răng ($Z < 18$).
- **Truyền động xích con lăn (Roller Chain - Tiêu chuẩn ISO/ANSI 06B, 08B, 10B, #40, #50):** Tính số mắt xích chẵn, lực căng nhánh căng/nhánh chùng, vận tốc đường chia và ước tính độ dao động tốc độ do hiệu ứng đa giác (Polygonal speed ripple).
- **Truyền động đai răng (Timing Belts - GT2, HTD, T5, XL):** Tính chiều dài đai tiêu chuẩn, số răng ăn khớp trên bánh đai nhỏ và lực căng ban đầu.
- **Tự động xuất thẳng bộ truyền lên bản vẽ Canvas** để liên kết đồng bộ với hệ thống khớp quay.

### 2.7. Kiểm tra giao thoa, Vùng cản & Va chạm tiếp xúc (Collision & Penalty Contact)
- Đặt các **Vùng cố định (Fixed Obstacles)** và **Vùng di động (Moving Obstacles)** hình chữ nhật hoặc hình tròn gắn với các thanh.
- Phát hiện giao thoa hình học trong quá trình cơ cấu chuyển động.
- Mô phỏng tiếp xúc đàn hồi với mặt đất và vật cản theo phương pháp phạt (Penalty method) kèm biểu diễn vector lực phản lực tiếp xúc thời gian thực.

### 2.8. Quản lý dự án đa thẻ & Xuất nhập dữ liệu JSON
- Làm việc đa nhiệm với nhiều cơ cấu cùng lúc trên các Thẻ (Tabs) riêng biệt.
- Lưu trữ toàn bộ dữ liệu cơ cấu dưới dạng tệp `.json` chuẩn, dễ dàng lưu trên Google Drive hoặc gửi qua email/Zalo.
- Đổi giao diện Sáng/Tối (Light/Dark mode) và chuyển đổi ngôn ngữ Tiếng Việt / Tiếng Anh / Tiếng Trung gốc tức thì.

---

## 3. Danh mục 8 Video thực hành chi tiết

Trong thư mục `huong-dan-thuc-hanh/video/`, toàn bộ các bài thực hành đã được quay màn hình thao tác thực tế với độ phân giải cao (1920x910, 60fps). Dưới đây là bảng tổng hợp các video và mục tiêu đào tạo:

| TT | Tên tệp video | Thời lượng | Nội dung trọng tâm |
|---|---|---|---|
| **01** | `01-co-cau-mau-va-dieu-khien.mp4` | 116.7s | Mở cơ cấu mẫu kinh điển (Four-bar Crank-Rocker), điều khiển chạy/tạm dừng, chạy từng bước (Step), đặt lại (Reset), tăng giảm tốc độ phát và quản lý các thẻ (Tabs). |
| **02** | `02-thuoc-tinh-nguon-dan-dong-va-phan-tich.mp4` | 154.8s | Khám phá Bảng cây mô hình bên trái: Thiết lập chiều dài, khối lượng, tỷ lệ khối tâm của thanh; cài đặt nguồn dẫn động quay/thẳng; đọc biểu đồ mô-men xoắn $\tau(t)$ và bản đồ nhiệt không gian làm việc. |
| **03** | `03-tu-ve-va-chinh-sua.mp4` | 157.0s | Tạo bản vẽ trống, sử dụng các công cụ vẽ thanh liên kết, đặt khớp quay, đặt gối cố định, đặt con trượt thẳng, sử dụng chế độ bắt điểm (Snap) và vẽ vùng cản cố định/di động. |
| **04** | `04-ghi-tu-the-va-tao-co-cau-tu-quy-dao.mp4` | 152.2s | Ghi các tư thế khóa (Key poses), kéo chuột để ghi đường cong chuyển động liên tục; dùng công cụ bút vẽ tay một đường cong tự do và để phần mềm tự động tổng hợp cơ cấu bám theo. |
| **05** | `05-banh-rang-xich-dai-va-co-cau-mau-khac.mp4` | 134.2s | Mở bàn tính toán bộ truyền cơ khí trong menu ba chấm: Chọn thông số bánh răng, xích con lăn, đai răng, khóa khoảng cách trục/tỷ số truyền, kiểm tra ứng suất Lewis và chèn trực tiếp lên bản vẽ Canvas. |
| **06** | `06-thu-cac-co-cau-mau.mp4` | 217.8s | Thử nghiệm thực tế toàn bộ thư viện cơ cấu phức tạp: Cơ cấu dập tay quay – con trượt, Robot song song 5 khâu 2-DOF hai động cơ độc lập, cơ cấu lắc hình sin có giới hạn góc, cơ cấu liên kết bánh răng và mô hình xích ảo va chạm mặt đất. |
| **07** | `07-luu-xuat-va-cai-dat-hien-thi.mp4` | 273.0s | Thao tác lưu dự án thành file JSON về máy tính/Google Drive, nạp lại file JSON đã lưu, xuất báo cáo tính toán bộ truyền, cấu hình hiển thị lưới tọa độ và đổi giao diện Sáng/Tối. |
| **08** | `08-chon-nhieu-can-chinh-va-vat-ran.mp4` | 900.0s (15 phút) | Thực hành chuyên sâu nâng cao: Giữ phím Shift để quét khung chọn nhiều khâu khớp, căn chỉnh thẳng hàng ngang/dọc, giãn cách đều nhau, liên kết nhiều thanh thành một cụm vật rắn (Rigid body) và chỉnh sửa cơ cấu phức tạp. |

---

## 4. Hướng dẫn thao tác từng bước theo từng phân hệ chức năng

### 4.1. Bảng điều khiển đỉnh (Toolbar) & Quản lý dự án

Thanh công cụ đỉnh được thiết kế dạng thanh ngang trực quan với các nhóm nút chức năng từ trái sang phải:

1. **Cây mô hình (Icon danh sách bên trái):** Nhấn để bật/tắt Bảng phân tích mô hình bên trái (nơi quản lý thông số vật lý và đồ thị).
2. **Về trang chính (Icon ngôi nhà):** Quay về danh sách các bản nháp cục bộ đã lưu trên trình duyệt.
3. **Tạo cơ cấu (Icon dấu cộng):** Mở cửa sổ chọn tạo bản vẽ trống hoặc nạp nhanh một cơ cấu mẫu có sẵn.
4. **Lưu JSON (Icon đĩa mềm):** Tải file thiết kế `.json` về máy tính để sao lưu hoặc chuyển sang máy khác.
5. **Thao tác khác (Icon 3 chấm tròn):**
   - **Nhập JSON:** Mở một file cơ cấu đã lưu từ ổ cứng.
   - **Cơ cấu mẫu:** Mở danh mục các bài mẫu kinh điển.
   - **Cài đặt hiển thị:** Bật/tắt lưới tọa độ, bắt điểm, vector vận tốc/lực.
   - **Tính toán bộ truyền:** Mở bàn tính bánh răng, xích tải, đai răng.
   - **Đổi giao diện:** Chuyển đổi giữa chế độ nền tối (Dark) và nền sáng (Light).
6. **Thanh Thẻ (Tabs):** Cho phép mở đồng thời nhiều cơ cấu. Nhấn `+` để thêm thẻ mới, nhấn `×` để đóng thẻ.
7. **Bộ chọn ngôn ngữ (Language Selector):** Chọn tức thì giữa **Tiếng Việt**, **English** và **中文 (gốc)**.
8. **Hướng dẫn sử dụng (Icon dấu hỏi chấm):** Mở cửa sổ sổ tay trợ giúp nhanh tích hợp sẵn.
9. **Kéo thả (Icon bàn tay):** Chế độ chọn đối tượng, xem thuộc tính và kéo di chuyển thử nghiệm các chốt khớp.
10. **Phác thảo (Icon cây bút):** Chế độ kích hoạt các công cụ vẽ hình học ở bảng bên phải.
11. **Chỉnh điểm khảo sát (Icon mục tiêu tâm ngắm):** Kích hoạt chế độ thêm hoặc di chuyển điểm theo dõi quỹ đạo trên thanh.
12. **Hoàn tác & Làm lại (Undo / Redo):** Phục hồi thao tác trước đó (`Ctrl+Z` / `Ctrl+Y`).
13. **Tẩy (Icon cục tẩy):** Nhấn vào bất kỳ thanh hoặc khớp nào trên bản vẽ để xóa bỏ.
14. **Bộ điều khiển mô phỏng:**
    - **▶ Chạy / ⏸ Tạm dừng:** Bắt đầu hoặc dừng mô phỏng vật lý.
    - **Đặt lại (Reset):** Đưa cơ cấu về tư thế xuất phát ban đầu.
    - **Chạy từng bước (Single Step):** Nhích chuyển động từng bước vật lý ngắn để quan sát chi tiết điểm chết hoặc giao thoa.
    - **Thanh tốc độ:** Điều chỉnh tốc độ phát từ 0.1x (chậm) đến 5.0x (nhanh).
15. **Bảng vẽ (Icon bên phải cùng):** Bật/tắt Bảng thuộc tính và công cụ phác thảo bên phải.

---

### 4.2. Thư viện cơ cấu mẫu kinh điển & Phân tích cấu hình

Phần mềm tích hợp sẵn các cơ cấu kinh điển giúp người dùng học tập và tái sử dụng nhanh:

1. **Cơ cấu bốn khâu Grashof tay quay – cần lắc (Classic Crank-Rocker):**
   - *Khâu dẫn (Tay quay $L_1$):* Quay tròn toàn vòng $360^\circ$ quanh gối $O_1$.
   - *Khâu truyền ($L_2$):* Nối tay quay với cần lắc, có điểm khảo sát $P_1$ vẽ đường cong quả thận (Coupler curve).
   - *Khâu bị dẫn (Cần lắc $L_3$):* Lắc qua lại quanh gối $O_2$.
   - *Phân tích kỹ thuật:* Hiển thị góc truyền lực $\mu$. Điều kiện Grashof được thỏa mãn khi $L_{min} + L_{max} \le L_p + L_q$.
2. **Cơ cấu dập tay quay – con trượt (Slider-Crank Press):**
   - Biến chuyển động quay liên tục của động cơ thành chuyển động trượt tịnh tiến qua lại của pít-tông/đầu dập.
   - Thích hợp để phân tích lực dập cực đại ở cuối hành trình (gần điểm chết dưới) và góc nghiêng của thanh truyền.
3. **Robot phẳng song song 5 khâu hai động cơ (Dual-Motor 5-Bar Parallel Robot):**
   - Hai động cơ độc lập đặt tại hai gối cố định $O_1$ và $O_2$.
   - Đầu công tác $P$ di chuyển trong mặt phẳng 2D với 2 bậc tự do (2-DOF).
   - Minh họa xuất sắc khả năng giải động lực học đa nguồn dẫn động và vẽ bản đồ nhiệt mô-men xoắn 2D.
4. **Cơ cấu khuỷu lắc hình sin có giới hạn góc (Sinusoidal + Angle Limit + Welded):**
   - Minh họa nguồn dẫn động dao động điều hòa hình sin.
   - Khớp quay có đặt giới hạn góc $[0^\circ, 135^\circ]$ và cần gập chữ L là một cụm vật rắn hàn cứng.
5. **Cơ cấu kết hợp bánh răng – thanh liên kết (Gear Pair + Linkage):**
   - Cặp bánh răng ăn khớp ràng buộc tỷ số truyền góc giữa hai khâu, tạo ra quỹ đạo đầu mút dạng cánh hoa (Hypotrochoid/Epitrochoid).
6. **Mô hình xích ảo & Va chạm theo phương pháp phạt (Chain + Penalty Contact):**
   - Hai đĩa xích truyền động kết hợp cơ cấu lắc va chạm với khối cao su giảm chấn trên mặt đất.

---

### 4.3. Bảng bên trái: Động lực học, Nguồn dẫn động & Ràng buộc

Bảng bên trái là "trái tim" tính toán vật lý của LinkGo 2D, bao gồm 6 mục:

1. **Động lực học và mô-men (Dynamics & Torque):**
   - Hiển thị đồ thị thời gian thực của mô-men dẫn động $\tau(t)$.
   - Lựa chọn bóc tách thành phần: Quán tính ($I\alpha$), Trọng lực ($mg$), Coriolis, Lực lò xo hoặc Lực cản nhớt.
   - Cung cấp giá trị mô-men xoắn cực đại (Peak torque) và giá trị hiệu dụng (RMS torque) để kỹ sư chọn động cơ điện có dải công suất phù hợp.
2. **Thông số thanh (Link Parameters):**
   - Liệt kê toàn bộ các thanh trong cơ cấu.
   - Cho phép nhập chính xác chiều dài khâu (milimet), khối lượng (kg) và tỷ lệ vị trí khối tâm $r_{com}$ (mặc định $0.5$ là chính giữa thanh).
3. **Nguồn dẫn động (Drive Source):**
   - Chọn khớp dẫn động và khâu dẫn động.
   - Chế độ điều khiển:
     * *Vận tốc góc đều:* Nhập giá trị vận tốc góc $\omega$ (rad/s) và chiều quay.
     * *Dao động hình sin:* Nhập góc tâm lắc, biên độ lắc và chu kỳ dao động $T$ (s).
     * *Dẫn động tịnh tiến:* Điều khiển vị trí con trượt thẳng.
4. **Nút và ràng buộc (Nodes & Constraints):**
   - Thiết lập loại khớp: Khớp quay tự do, khớp hàn cứng hoặc con trượt.
   - Giới hạn góc quay của khớp: Cho phép bật chặn góc tối thiểu / tối đa.
   - Bổ sung lò xo xoắn với góc cân bằng tự do và hệ số cản nhớt giảm chấn.
5. **Truyền động và va chạm (Transmission & Contact):**
   - Thiết lập môi trường trọng trường: Gia tốc trọng trường $g$ (mặc định $9.81\text{ m/s}^2$) và góc hướng trọng lực.
   - Bật/tắt va chạm với mặt đất, tọa độ cao độ mặt đất $Y_{ground}$ và hệ số đàn hồi va chạm.
6. **Không gian làm việc (Workspace Analysis):**
   - Bấm nút **"Tính toán miền làm việc"** để phần mềm quét lưới 2D và tạo bản đồ nhiệt mô-men xoắn cho điểm khảo sát đã chọn.

---

### 4.4. Bảng bên phải: Thuộc tính đối tượng & Hộp công cụ phác thảo

Bảng bên phải phục vụ quá trình dựng hình học và tùy biến chi tiết:

1. **Thuộc tính đối tượng đang chọn:**
   - Khi nhấn chọn một thanh: Hiển thị tên thanh (có thể sửa), chiều dài chính xác, độ dày hiển thị, màu sắc thanh và vị trí hai nút đầu mút.
   - Khi nhấn chọn một nút khớp: Hiển thị tọa độ $(X, Y)$, trạng thái gối đỡ cố định hay chốt di động.
2. **Hộp công cụ phác thảo (Drawing Toolbox):**
   - **Vẽ thanh liên kết:** Nhấn giữ và kéo trên bản vẽ để tạo thanh mới.
   - **Đặt khớp quay:** Nhấn trên canvas để thêm chốt quay.
   - **Đặt gối cố định:** Đặt chốt neo cứng vào khung máy.
   - **Đặt con trượt thẳng:** Tạo con trượt và ray dẫn hướng.
   - **Thêm điểm khảo sát:** Gắn một điểm theo dõi quỹ đạo lên thanh đang chọn.
   - **Vùng cản cố định / Vùng di động:** Tạo hình chữ nhật hoặc hình tròn làm vật cản kiểm tra va chạm.
3. **Hỗ trợ vẽ thông minh:**
   - **Bắt điểm đối tượng (Element Snapping):** Tự động hút đầu thanh vào các nút khớp lân cận với bán kính hút điều chỉnh được.
   - **Bắt lưới tọa độ (Grid Snapping):** Bắt vào các giao điểm của lưới milimet để vẽ các kích thước chẵn.

---

### 4.5. Ghi tư thế (Pose Recording) & Tự tổng hợp cơ cấu từ quỹ đạo vẽ tay

Đây là tính năng độc đáo nhất của LinkGo 2D, phục vụ thiết kế ngược (Inverse mechanism synthesis):

1. **Quy trình ghi tư thế tuần hoàn (Pose Looping):**
   - Nhấn nút **"Ghi tư thế"** $\to$ Kéo cơ cấu đến vị trí 1 $\to$ Nhấn **"Lưu tư thế"**.
   - Kéo cơ cấu sang vị trí 2 $\to$ Nhấn **"Lưu tư thế"** (tiếp tục cho các vị trí 3, 4...).
   - Nhấn **"Bắt đầu phát lặp"** $\to$ Cơ cấu sẽ tự động lướt qua các tư thế mượt mà theo đường cong spline tuần hoàn.
2. **Kéo ghi quỹ đạo chuyển động (Drag Recording):**
   - Nhấn **"Kéo để ghi quỹ đạo"** $\to$ Dùng chuột nhấn giữ một nút khớp bất kỳ và kéo di chuyển theo quỹ đạo bạn muốn $\to$ Nhấn **"Kết thúc ghi"**.
   - Phần mềm lưu lại toàn bộ chuỗi vị trí và cho phép phát lại tự động.
3. **Tự động tổng hợp cơ cấu từ đường vẽ tay (Freehand Synthesis):**
   - Chọn công cụ **"Vẽ quỹ đạo mục tiêu"**.
   - Dùng chuột hoặc bút cảm ứng vẽ một đường cong khép kín trên Canvas.
   - Nhấn **"Tạo cơ cấu"** $\to$ Hệ thống tính toán và tự động xuất ra một bộ cơ cấu 4 khâu hoặc 5 khâu có điểm đầu mút bám sát đường cong vừa vẽ!

---

### 4.6. Bàn tính toán bộ truyền cơ khí: Bánh răng, Xích tải & Đai răng

Mở từ menu ba chấm $\to$ **"Truyền động bánh răng / xích / đai"**:

1. **Bánh răng trụ răng thẳng (Spur Gears):**
   - Nhập tỷ số truyền mong muốn $i$ và khoảng cách trục sơ bộ $a$.
   - Chọn hệ mô-đun tiêu chuẩn ISO ($m = 1, 1.5, 2, 2.5, 3, 4...$).
   - Nhấn **"Tự động chọn thông số"** $\to$ Phần mềm tìm ra cặp số răng nguyên $(Z_1, Z_2)$ tối ưu, tính đường kính vòng chia $d$, khoảng cách trục chính xác $a$, và kiểm tra nguy cơ cắt chân răng ($Z_1 \ge 18$).
   - Nhấn **"Đưa vào bản vẽ"** để tạo ngay cặp bánh răng liên kết với hai khớp quay trên màn hình.
2. **Truyền động xích con lăn (Roller Chain):**
   - Chọn mã xích tiêu chuẩn (06B, 08B, 10B, ANSI 40, ANSI 50...).
   - Nhập công suất truyền $P$ (kW) và tốc độ quay $n$ (vòng/phút).
   - Phần mềm tính toán số mắt xích $X$ (làm tròn số chẵn), lực căng nhánh căng $F_1$, lực căng do ly tâm $F_v$, và độ đập vận tốc do hiệu ứng đa giác.
3. **Truyền động đai răng (Timing Belt):**
   - Chọn bước đai (GT2 cho in 3D/robot nhỏ, HTD 3M/5M cho tải nặng, T5, XL...).
   - Nhập số răng bánh nhỏ $Z_1$, bánh lớn $Z_2$ và khoảng cách trục.
   - Tính toán chiều dài đai tiêu chuẩn, số răng ăn khớp trên bánh nhỏ $Z_{mesh}$ (cần $\ge 6$ để tránh trượt răng) và lực căng ban đầu.

---

### 4.7. Kiểm tra giao thoa, Vùng cản & Mô phỏng va chạm mặt đất

1. **Đặt vùng cản (Obstacle Regions):**
   - *Vùng cố định:* Đặt tại vị trí có khung sườn xe hoặc linh kiện cố định để kiểm tra xem thanh có quét qua và chạm phải không.
   - *Vùng chuyển động:* Gắn cố định vào một thanh (ví dụ: gầu xúc hoặc bàn chân robot) để vùng này di chuyển cùng thanh.
2. **Phát hiện giao thoa:** Khi hai vùng chồng lấn lên nhau trong quá trình chuyển động, đường viền sẽ đổi sang màu đỏ cảnh báo.
3. **Mặt đất đàn hồi & Lực phạt:**
   - Trong Bảng bên trái $\to$ Bật **"Mặt đất"**.
   - Khi bất kỳ thanh hoặc chốt nào chạm qua cao độ mặt đất $Y_{ground}$, phần mềm áp dụng lực phạt đàn hồi $F_{contact} = k \cdot \Delta y + c \cdot v_y$ đẩy cơ cấu nảy lên, mô phỏng chân robot tiếp đất thực tế.

---

### 4.8. Thao tác nâng cao: Đa chọn, Căn chỉnh & Tạo cụm vật rắn

Dành cho các cơ cấu phức tạp như chân robot Jansen (Strandbeest) hoặc tay máy nhiều bậc tự do:

1. **Chọn nhiều đối tượng (Multi-select):**
   - Giữ phím `Shift` và quét chuột tạo khung bao quanh các thanh/khớp cần chọn.
   - Hoặc nhấn `Ctrl+A` để chọn toàn bộ cơ cấu trên bản vẽ.
2. **Thanh công cụ căn chỉnh nhanh:**
   - **Căn ngang:** Đưa các nút khớp đã chọn về cùng một cao độ $Y$.
   - **Căn dọc:** Đưa các nút khớp đã chọn về cùng một tọa độ $X$.
   - **Giãn đều ngang / dọc:** Phân bố khoảng cách giữa các nút khớp bằng nhau.
3. **Tạo cụm vật rắn (Rigid Body Grouping):**
   - Chọn 3 thanh trở lên ghép thành hình tam giác hoặc đa giác.
   - Nhấn **"Tạo vật rắn"** $\to$ Cụm này sẽ biến thành một tấm cứng duy nhất, không bị biến dạng khi truyền lực.
   - Muốn chỉnh sửa lại, nhấn chọn cụm và bấm **"Tách vật rắn"**.

---

## 5. Các vấn đề tồn tại đã được khắc phục trong bản cập nhật

Trong quá trình rà soát và kiểm thử chuyên sâu với hệ thống tự động hóa trình duyệt `/browser`, chúng tôi đã phát hiện và xử lý triệt để các tồn tại sau trên tệp `linkgo-v1.1-viet-anh-huong-dan.html`:

1. **Khắc phục lỗi hiển thị tiếng Trung trong ô nhập thuộc tính thanh (`<input value={...}>`):**
   - *Hiện trạng cũ:* Khi người dùng nạp một cơ cấu mẫu (như 4-bar Crank-Rocker) và bấm vào thanh để sửa thuộc tính ở bảng bên phải, ô nhập liệu "Tên thanh" hiển thị chuỗi gốc tiếng Trung chưa dịch (ví dụ: `中间连杆 L₂`), mặc dù tiêu đề bảng bên trên đã hiển thị tiếng Việt (`Thanh trung gian L₂`).
   - *Nguyên nhân kỹ thuật:* Bộ lọc JSX của bản Việt hóa trước chỉ can thiệp vào các thuộc tính `title`, `aria-label`, `placeholder`, `alt` và chuỗi con `children`, bỏ qua thuộc tính `value` và `defaultValue` của thẻ `<input>`.
   - *Giải pháp đã thực thi:* Mở rộng JSX interceptor để tự động dịch các thuộc tính `value` và `defaultValue` khi chứa ký tự chữ Hán, đồng thời bổ sung các định danh thanh mẫu vào từ điển bản địa hóa. Hiện tại 100% ô nhập hiển thị đúng chuẩn tiếng Việt (`Thanh trung gian L₂`, `Tay quay dẫn động L₁`, `Cần lắc bị động L₃`...).
2. **Khắc phục các cụm từ ghép bị ghép dính chữ không có khoảng cách:**
   - *Hiện trạng cũ:* Một số cụm từ ghép kỹ thuật như `驱动角速度`, `标准链传动`, `标准规格`, `轨迹点法向偏移` bị bộ dịch từ khóa đơn lẻ dịch rời rạc và dính liền không có dấu cách:
     * `驱动角速度 ω (rad/s)` $\to$ `Dẫn độngVận tốc góc ω (rad/s)`.
     * `标准链传动 08B` $\to$ `Tiêu chuẩnTruyền động xích 08B`.
     * `标准规格` $\to$ `Tiêu chuẩnThông số tiêu chuẩn`.
     * `轨迹点法向偏移` $\to$ `Điểm quỹ đạoĐộ lệch vuông góc`.
   - *Giải pháp đã thực thi:* Bổ sung các cụm từ nguyên khối chuẩn thuật ngữ cơ cấu học vào từ điển:
     * `驱动角速度` $\to$ **`Vận tốc góc dẫn động`** (Drive angular velocity).
     * `标准链传动` $\to$ **`Truyền động xích tiêu chuẩn`** (Standard chain drive).
     * `标准规格` $\to$ **`Quy cách tiêu chuẩn`** (Standard specification).
     * `轨迹点法向偏移` $\to$ **`Độ lệch pháp tuyến điểm quỹ đạo`** (Trace point normal offset).
     * `L型拐臂` $\to$ **`Cần gập chữ L`** (thay vì "Lđầu tay gấp").
3. **Tối ưu hóa giao diện đa ngôn ngữ (Language Switcher):**
   - Bộ chuyển đổi ngôn ngữ trên thanh công cụ cho phép chuyển đổi mượt mà giữa **Tiếng Việt**, **English** và **中文 (gốc)** theo thời gian thực mà không làm mất trạng thái mô phỏng hay mất dữ liệu cơ cấu đang vẽ dở.

---

## 6. Bảng phím tắt & Mẹo thao tác nhanh

| Phím tắt | Thao tác trên chuột / Màn hình cảm ứng | Chức năng |
|---|---|---|
| `Space` (Phím cách) | Nhấn nút ▶ / ⏸ | Chạy hoặc tạm dừng mô phỏng |
| `R` | Nhấn nút ↺ | Đặt lại cơ cấu về vị trí ban đầu (Reset) |
| `Ctrl + Z` | Nhấn nút Hoàn tác | Hoàn tác thao tác vừa thực hiện |
| `Ctrl + Y` hoặc `Ctrl + Shift + Z` | Nhấn nút Làm lại | Làm lại thao tác vừa hoàn tác |
| `Delete` hoặc `Backspace` | Chọn công cụ Tẩy và nhấn phần tử | Xóa thanh, nút hoặc vùng đang chọn |
| `Ctrl + A` | Nhấn giữ `Shift` và quét chuột | Chọn tất cả các phần tử trên bản vẽ |
| `Cuộn chuột` (Scroll) | Véo hai ngón tay (Pinch to zoom) | Phóng to / Thu nhỏ vùng làm việc Canvas |
| `Nhấn giữ chuột giữa` | Kéo bằng hai ngón tay | Di chuyển toàn bộ vùng nhìn (Pan canvas) |
| `F` | Nhấn nút "Vừa khung nhìn" | Tự động căn chỉnh toàn bộ cơ cấu vào chính giữa màn hình |

---
*Tài liệu được biên soạn và tối ưu cho dự án Robot Ideas Articles.*
