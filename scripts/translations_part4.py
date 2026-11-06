# -*- coding: utf-8 -*-
"""
Translations for Pages 31 to 36 of Humanoid Dual-Arm Control Technical Report.
"""

TRANSLATIONS_PART4 = {
    # ==================== PAGE 31 ====================
    31: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "trong đó τ0,a là độ lệch hằng số của từng khớp. Khai triển theo từng khớp như sau:",
        3: "5.1.5 Kiểm chứng mô phỏng đơn hướng",
        4: "Trong giai đoạn kiểm chứng, giá trị bù trọng lực dự đoán được tính toán theo thời gian thực trong MuJoCo dựa trên trạng thái khớp hiện tại, và được kiểm tra chéo bằng kịch bản độc lập.",
        5: "(a) Trạng thái kiểm chứng MuJoCo 1",
        6: "(b) Trạng thái kiểm chứng MuJoCo 2",
        7: "Hình 11",
        8: "Kiểm chứng mô phỏng bù trọng lực đơn hướng",
    },

    # ==================== PAGE 32 ====================
    32: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "Hình 12",
        3: "Kết quả kịch bản kiểm chứng bù trọng lực",
        4: "5.2 Bù trọng lực đa hướng toàn phần",
        5: "5.2.1 Dạng tổng quát",
        6: "Sau khi hai cánh tay được lắp trên sàn nâng hạ (pitch), hướng trọng lực trong hệ tọa độ cục bộ của cánh tay không còn chỉ dọc theo ±ey. Thế năng tổng quát được viết thành:",
        7: "Đặt",
        8: "thì",
        9: "Suy dẫn đơn hướng và khai triển mã nguồn về bản chất chỉ sử dụng",
    },

    # ==================== PAGE 33 ====================
    33: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "Nếu sau khi eo Pitch mà ux ≠ 0, thì còn phải xét đến",
        3: "5.2.2 Suy dẫn hệ tọa độ tham chiếu",
        4: "Giả sử hướng thẳng đứng hướng lên trong hệ tọa độ thế giới là",
        5: "Định nghĩa hệ tọa độ trung gian giữa hai cánh tay là M, RWM là ma trận quay từ hệ trung gian M sang hệ thế giới W. Hướng thẳng đứng của thế giới trong hệ trung gian là:",
        6: "Nếu ma trận quay lắp đặt của đế cánh tay trái và phải so với hệ trung gian là RML và RMR, trong đó RML biểu thị phép quay từ hệ cục bộ tay trái sang hệ trung gian, RMR biểu thị phép quay từ hệ cục bộ tay phải sang hệ trung gian, thì",
        7: "Bù trọng lực có thể được viết thống nhất thành:",
        8: "Đặt tiếp",
        9: "Nếu hướng trọng lực trong hệ tọa độ đế cánh tay là",
        10: "Thành phần độ cao thế năng là",
        11: "Mô-men trọng lực là",
    },

    # ==================== PAGE 34 ====================
    34: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "Công thức đơn hướng là trường hợp đặc biệt khi u = [0, σ, 0]T.",
        3: "5.2.3 Bù động cơ Pitch phần eo",
        4: "Nếu cần bù thêm cho chính động cơ Pitch phần eo, ta cần tính thêm mô-men trọng lực phần eo:",
        5: "5.2.4 Kiểm chứng mô phỏng đa hướng",
        6: "Trong điều kiện tạm thời chưa thêm bù trọng lực cho chính phần eo, trước tiên ta kiểm chứng hiệu quả bù trọng lực của hai cánh tay trái và phải khi hướng tham chiếu thay đổi.",
        7: "(a) Trạng thái kiểm chứng đa hướng 1",
        8: "(b) Trạng thái kiểm chứng đa hướng 2",
        9: "Hình 13",
        10: "Kiểm chứng bù toàn hướng của cánh tay robot khi chưa bù trọng lực eo",
        11: "6. Tổng kết và mã nguồn mở",
        12: "6.1 Tổng kết kỹ thuật",
        13: "Toàn bộ hệ thống điều khiển gồm 3 phần: định tuyến đầu vào, thực thi thao tác và điều khiển cánh tay. Router chuẩn hóa đầu vào DR16 thành yêu cầu thao tác chu kỳ hiện tại, FSM / Actions tạo mục tiêu cánh tay dựa trên các yêu cầu này; tiếp theo, RoboArmT và",
        14: "ArmMiddleware hoàn thành kiểm tra an toàn, ánh xạ không gian, giải động học nghịch, lập quỹ đạo và tính bù trọng lực cấp trước, sau đó ArmDriver",
        15: "thông qua CAN1 / CAN2 điều khiển hai bộ cánh tay robot 7 khớp trái và phải. Phản hồi động cơ tuần tự trả về tầng driver và middleware để cập nhật trạng thái hệ thống và tính lượng điều khiển cho chu kỳ kế tiếp.",
        16: "Ưu điểm chính của hệ thống là phân công rõ ràng, quá trình điều khiển dự đoán được, và kết hợp mượt mà hai phương pháp giải nghịch cùng bù trọng lực trên cùng một mô hình 7 trục. DLS có trọng số thích hợp xử lý biến đổi tư thế vi sai liên tục; giải tích SEW và tìm kiếm đa tạp 1D dùng cho mục tiêu ở xa; bù trọng lực cũng được mở rộng từ hướng cố định sang toàn hướng theo tư thế eo. Giai đoạn khởi động chờ dữ liệu Pitch / IMU ổn định và đồng bộ trạng thái cánh tay bằng phản hồi động cơ mới nhất; trong quá trình chạy, hệ thống kiểm tra lần lượt không gian làm việc, vùng cấm, giới hạn khớp và trạng thái online của động cơ, giúp giảm nguy cơ giá trị khởi tạo sai hoặc mục tiêu không khả thi đi vào vòng điều khiển động cơ.",
    },

    # ==================== PAGE 35 ====================
    35: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "rủi ro trong khâu điều khiển động cơ.",
        3: "Giải pháp hiện tại vẫn còn một số giới hạn. Việc xóa trắng đầu ra Router, xử lý xung đột giữa các danh mục đầu vào và phản hồi lỗi thực thi đều cần tầng logic phía trên đảm nhận; một số ít handler vẫn sửa đổi trực tiếp trạng thái toàn cục hoặc lưu trạng thái tĩnh. Gia số vị thế cánh tay robot tích lũy theo số lần gọi nên tốc độ thực tế phụ thuộc vào chu kỳ gọi; khả năng biểu đạt của định tuyến tổ hợp còn hạn chế. Mã điều khiển cánh tay hiện tối ưu cho động cơ Damiao 7 khớp, vòng đời đối tượng và điều phối tác vụ do bên ngoài đảm bảo, NativeMIT chưa dùng torqueMax để giới hạn phần mềm cho mô-men cấp trước. Về động học nghịch, DLS khi di chuyển theo đường cong kín Descartes có thể khiến một khớp tiệm cận giới hạn; nghiệm giải tích có thể nhảy nhánh, hiện chưa hoàn thành lập quỹ đạo điểm-tới-điểm liên tục nghiêm ngặt. Bù trọng lực đã được kiểm chứng bằng mô phỏng và kịch bản, nhưng trong phương án đa hướng, mô-men bù cho động cơ eo vẫn cần tính riêng theo biểu thức thế năng. Reset mềm và cứng sử dụng đường dẫn kinh nghiệm phân đoạn, không thể thay thế cho thuật toán phát hiện va chạm dựa trên mô hình môi trường hay tránh vật cản trực tuyến.",
        4: "6.2 Kho lưu trữ mã nguồn mở và giải pháp kỹ thuật",
        5: "Nhằm tạo thuận lợi cho việc tái lập giải pháp, thẩm định mã nguồn và tiếp tục cải tiến, dự án công khai hai loại thành quả đi kèm báo cáo: một là mã nguồn điều khiển song thủ cốt lõi trích xuất từ dự án robot thực tế hoàn chỉnh, hai là mã tham chiếu MATLAB dùng để xây dựng mô hình động học và kiểm chứng giải nghịch dạng đóng. Hai kho lưu trữ lần lượt phục vụ tích hợp kỹ thuật nhúng và kiểm chứng thuật toán, có thể đối chiếu trực tiếp với kiến trúc, mô hình và suy dẫn trong báo cáo này.",
        6: "Nội dung mã nguồn mở tập trung vào các mô-đun then chốt được đề cập trong báo cáo. Kho mã xe thực tế không chứa toàn bộ thư viện phần cứng, tham số khởi tạo và cấu hình nạp chip, nên không phải firmware nạp chạy ngay; kho mô phỏng MATLAB chủ yếu xác thực quan hệ hình học và động học, không chứa điều khiển xe thực, tính động lực học hay lập kế hoạch tránh va chạm.",
        7: "Kho lưu trữ mã nguồn mở",
        8: "Mã nguồn cốt lõi xe thực: github.com/NomadJoeviolet/Double7RArm trích xuất từ dự án robot thực tế, tập hợp mã nguồn lõi 7-DOF IK, Router, driver cánh tay, điều khiển middleware và giao diện đỉnh tương ứng với báo cáo này, làm tài liệu tham khảo cho thẩm định thuật toán và tích hợp nhúng.",
        9: "Mô phỏng động học MATLAB: github.com/NomadJoeviolet/Double7RArmSim",
        10: "Cung cấp mô hình MDH tay đơn/đôi, giải nghịch SEW dạng đóng, kiểm chứng nghiệm ứng viên và ví dụ trực quan hóa; có thể tái lập mô hình hình học, kiểm tra tính khả đạt của mục tiêu và nghiệm giải tích mà không cần robot thực.",
        11: "Tài liệu giải pháp kỹ thuật Feishu",
        12: "Hai tài liệu giải pháp kỹ thuật Feishu sau đây tương ứng chặt chẽ với nội dung báo cáo, bổ sung chi tiết quá trình suy dẫn, thiết kế giải pháp và chi tiết hiện thực, có thể đọc đối chiếu cùng các kho mã nguồn mở:",
        13: "Tài liệu kỹ thuật 1: my.feishu.cn/wiki/NBR0wrzq5im2Pukb0FvchLKxnYe",
        14: "Tài liệu kỹ thuật 2: my.feishu.cn/wiki/Cnjrwa7vWibzEykxFVuc63O8nbf",
    },

    # ==================== PAGE 36 ====================
    36: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "7. Lời cảm ơn",
        3: "Cánh tay robot song thủ từ thiết kế giải pháp đến vận hành ổn định là nhờ vào nỗ lực căn chỉnh, kiểm chứng và cải tiến liên tục của toàn thể thành viên tổ Kỹ sư. Xin chân thành cảm ơn sự đóng góp của mọi người trong các mảng cơ khí, điện tử điều khiển, thuật toán và liên kết toàn hệ thống robot, cũng như những cống hiến cho việc hiện thực hóa và hoàn thiện hệ thống song thủ.",
        4: "Đồng thời, xin gửi lời cảm ơn sâu sắc tới toàn thể các thành viên Đội Robomaster DreamChaser (追梦战队) vì sự ủng hộ, phối hợp và tin tưởng bền bỉ suốt thời gian qua. Chính nỗ lực chung của tất cả mọi người đã giúp giải pháp từng bước trở thành hiện thực và không ngừng hoàn thiện. Bài viết này xin được dành tặng và gửi lời tri ân chân thành nhất tới mọi thành viên tham gia và ủng hộ dự án.",
        5: "8. Tài liệu tham khảo và phụ lục",
        6: "Liên kết tài liệu tham khảo",
    }
}
