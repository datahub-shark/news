# -*- coding: utf-8 -*-
"""
Translations for Pages 11 to 20 of Humanoid Dual-Arm Control Technical Report.
"""

TRANSLATIONS_PART2 = {
    # ==================== PAGE 11 ====================
    11: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "(a) Kích thước lắp đặt tay đơn",
        3: "(b) Kích thước lắp đặt song thủ",
        4: "Hình 5",
        5: "Sơ đồ cấu trúc và kích thước lắp đặt cánh tay robot",
        6: "3.2 Tham số MDH",
        7: "Lấy mô hình trên Hình 6 làm ví dụ để thiết lập mô hình DH cải tiến (MDH). Các tham số trạng thái ban đầu của cánh tay robot xem Bảng 3.",
        8: "Hình 6",
        9: "Mô hình MDH cánh tay robot 7 trục trong MATLAB",
    },

    # ==================== PAGE 12 ====================
    12: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "Bảng 3",
        3: "Các tham số MDH trạng thái ban đầu của cánh tay robot",
        4: "Mô hình cánh tay robot được xây dựng bằng Robotics Toolbox theo các tham số sau:",
    },

    # ==================== PAGE 13 ====================
    13: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "3.3 Tư thế lắp đặt cánh tay robot trái và phải",
        3: "Đế cánh tay trái và phải cách nhau 220 mm. Theo hình vẽ lắp ráp nhìn từ trên xuống: hướng thế giới −X là hướng đầu cuối vươn tới, thế giới +Y là hướng sang phải trong hình, thế giới +Z vuông góc hướng lên; tay trái nằm ở Y = −110 mm, trục khớp đầu tiên hướng dọc theo Z thế giới; tay phải nằm ở Y = +110 mm.",
        4: "(a) Kích thước lắp đặt hai tay",
        5: "(b) Mô hình lắp đặt nhìn từ trên trong MATLAB",
        6: "Hình 7",
        7: "Quan hệ lắp đặt cánh tay robot trái và phải",
        8: "Mã nguồn ma trận quay lắp đặt như sau:",
        9: "%% 2. Tư thế lắp đặt hai tay % rotationWorldFromRobot biểu thị: phép quay từ hệ tọa độ cục bộ robot sang hệ tọa độ thế giới.",
    },

    # ==================== PAGE 14 ====================
    14: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "4. Giải động học nghịch cánh tay robot 7 trục hình người",
        3: "Cánh tay 7 trục khi cho trước tư thế 6 bậc tự do điểm đầu cuối vẫn giữ lại một bậc tự do dư thừa. Chương này lần lượt trình bày phương pháp giải tích ứng viên dựa trên góc cánh tay SEW và lặp số trị bình phương tối thiểu có cản có trọng số, được điều phối thống nhất bởi AdaptiveHybrid.",
        4: "4.1 Kiến thức nền tảng cho nghiệm giải tích",
        5: "4.1.1 Các bài toán con IK-Geo",
        6: "Suy dẫn giải tích sử dụng 4 bài toán hình học cơ bản trong IK-Geo.",
        7: "4.1.1.1 Bài toán con 1: Đường tròn và Điểm (SP1)",
        8: "Bài toán được định nghĩa là:",
        9: "Đặt",
        10: "Theo công thức Rodrigues ta có:",
        11: "Đặt tiếp",
        12: "thu được:",
        13: "Điều kiện có nghiệm chính xác là:",
        14: "Bài toán con này dùng để tìm góc cuối cùng q3 của vai cầu và góc cuối cùng q7 của cổ tay cầu.",
    },

    # ==================== PAGE 15 ====================
    15: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "4.1.1.2 Bài toán con 4: Đường tròn và Mặt phẳng (SP4)",
        3: "Bài toán được định nghĩa là:",
        4: "Đặt",
        5: "thì",
        6: "Định nghĩa",
        7: "có thể viết thành:",
        8: "Khi |c| ≤ ρ, nghiệm là:",
        9: "Bài toán con này dùng để tìm góc phân tách nhân tạo θa, giúp véc-tơ khuỷu tay nằm trên mặt phẳng SEW chỉ định.",
        10: "4.1.1.3 Bài toán con 3: Đường tròn và Mặt cầu (SP3)",
        11: "Bài toán được định nghĩa là:",
        12: "Bình phương và rút gọn:",
        13: "Nó có thể quy về SP4, trong đó:",
        14: "Bài toán con này dùng khoảng cách Vai - Cổ tay để giải góc khớp khuỷu q4.",
        15: "4.1.1.4 Bài toán con 2: Giao điểm hai đường tròn quay (SP2)",
        16: "Bài toán được định nghĩa là:",
        17: "Đặt véc-tơ chung",
    },

    # ==================== PAGE 16 ====================
    16: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "Quay quanh k2 không làm thay đổi hình chiếu dọc trục, do đó:",
        3: "Thay đường tròn vế trái vào thu được:",
        4: "từ đó chuyển thành SP4 để giải θ1. Bài toán con này dùng để giải cặp góc phân tách nhân tạo (θb, θc), cũng như phân tách khớp vai cầu (q1, q2) và khớp cổ tay cầu (q5, q6).",
        5: "4.1.2 Định nghĩa góc cánh tay SEW",
        6: "Ý nghĩa trực quan của góc SEW là 'khuỷu tay đã xoay bao nhiêu độ quanh trục nối từ vai đến cổ tay'. Đặt:",
        7: "Tiếp tục định nghĩa bởi hàm hướng tham chiếu:",
        8: "và đặt:",
        9: "Định nghĩa chính xác của góc cánh tay là:",
        10: "tức là xuất phát từ ex, quay ψ quanh trục +eSW theo quy tắc bàn tay phải để tới eCE. Việc lựa chọn hàm hướng tham chiếu ex = fx(pSW) quyết định trực tiếp hướng 0 độ và tập kỳ dị, là thành phần then chốt của thuật toán sau này.",
    },

    # ==================== PAGE 17 ====================
    17: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "Hình 8",
        3: "Sơ đồ mặt phẳng tham chiếu SEW và mặt phẳng cánh tay robot",
        4: "4.2 Suy dẫn nghiệm giải tích SEW",
        5: "4.2.1 Xác định mặt phẳng khuỷu mục tiêu bằng góc SEW",
        6: "Sau khi chỉ định ψ, ta thu được eCE và nSEW: nSEW là véc-tơ pháp tuyến đơn vị của mặt phẳng Vai - Khuỷu - Cổ tay mục tiêu; eCE nằm trên mặt phẳng đó, vuông góc với hướng Vai - Cổ tay, và hướng về nửa mặt phẳng chứa khuỷu tay. Cả hai thỏa mãn:",
        7: "4.2.2 Giải khớp khuỷu q4",
        8: "Ràng buộc vị trí Vai - Cổ tay là:",
        9: "Định nghĩa:",
        10: "Phép quay bảo toàn độ dài, do đó:",
        11: "tức là:",
        12: "Ánh xạ sang SP3:",
    },

    # ==================== PAGE 18 ====================
    18: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "từ đó giải ra:",
        3: "4.2.3 Xây dựng ma trận quay khớp vai R03",
        4: "Sau khi tìm được q4, đặt:",
        5: "Một lần căn chỉnh véc-tơ chỉ xác định được 2 bậc tự do tư thế, vẫn còn khả năng quay tự do quanh eSW; bậc tự do còn lại này được xác định bởi góc SEW. Vì vậy ta đưa vào phép phân tách phụ kiểu Euler nhân tạo:",
        6: "trong đó θc trước tiên quay hình học cánh tay cục bộ quanh trục Vai - Cổ tay, θb tiếp tục chỉnh hướng quanh pháp tuyến mặt phẳng SEW, cuối cùng θa quay quanh trục Vai - Cổ tay để khuỷu tay rơi đúng vào nửa mặt phẳng chỉ định. Đây không phải thứ tự khớp cơ học thực tế, mà là công cụ tham số hóa trung gian để dựng R03.",
        7: "4.2.4 Sử dụng SP2 giải (θb, θc)",
        8: "Từ:",
        9: "và",
        10: "thu được:",
        11: "Nhân bên trái với R(nSEW, θb)T:",
        12: "Lại có:",
        13: "Vì vậy các tham số tương ứng với SP2 là:",
        14: "4.2.5 Sử dụng SP4 giải θa",
        15: "Nếu chọn O4 làm điểm khuỷu, thì:",
        16: "Yêu cầu khuỷu tay nằm trên mặt phẳng SEW đòi hỏi:",
    },

    # ==================== PAGE 19 ====================
    19: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "Định nghĩa:",
        3: "thu được:",
        4: "Các tham số SP4 là:",
        5: "Cuối cùng dùng điều kiện nửa mặt phẳng:",
        6: "để lọc hướng khuỷu tay mục tiêu.",
        7: "4.2.6 Phân tích khớp vai cầu và cổ tay cầu",
        8: "Khớp vai cầu thỏa mãn:",
        9: "Dựa trên cấu hình cánh tay, có thể dùng phân tích ZYZ hoặc ZYX để giải các góc vai. Phần cổ tay cầu từ:",
        10: "thu được:",
        11: "tiếp tục phân tích:",
        12: "Véc-tơ khớp cuối cùng là:",
        13: "4.3 Các nhánh nghiệm và tính kỳ dị",
        14: "4.3.1 Các nhánh ứng viên",
        15: "Quá trình giải tích chứa 3 bộ nhánh nhị phân:",
        16: "1. Khuỷu tay hướng lên (Elbow Up) và khuỷu tay hướng xuống (Elbow Down);",
        17: "2. Lật cổ tay (Wrist Flipped) và không lật cổ tay (Wrist Not Flipped);",
        18: "3. Lật vai (Shoulder Flipped) và không lật vai (Shoulder Not Flipped).",
        19: "Do đó tổng số nghiệm ứng viên là:",
    },

    # ==================== PAGE 20 ====================
    20: {
        0: "■ Báo cáo kỹ thuật điều khiển cánh tay robot song thủ 7 trục hình người",
        1: "Định tuyến đầu vào ∙ Động học nghịch ∙ Bù trọng lực",
        2: "4.3.2 Trường hợp kỳ dị và vô nghiệm",
        3: "Vai, Khuỷu, Cổ tay thẳng hàng: Khi",
        4: "thì véc-tơ pháp tuyến mặt phẳng SEW không xác định, thường ứng với trạng thái cánh tay duỗi thẳng hoàn toàn hoặc gập sát.",
        5: "Kỳ dị vai cầu: Trục thứ nhất và trục thứ ba của vai cầu trùng nhau, q1 và q3 không thể xác định duy nhất độc lập mà chỉ xác định được một tổ hợp góc; hai nghiệm của SP2 có thể trùng nhau.",
        6: "Kỳ dị cổ tay cầu: Trục 5 và trục 7 thẳng hàng, q5 và q7 không thể xác định duy nhất riêng rẽ; trong thực tế kỹ thuật có thể cố định một góc hoặc chọn tổ hợp gần nhất với tư thế hiện tại.",
        7: "Vô nghiệm: Khoảng cách Vai - Cổ tay mục tiêu vượt quá phạm vi khả đạt, đường tròn và mặt cầu không giao nhau.",
        8: "4.4 Conventional SEW và Stereographic SEW",
        9: "Cho véc-tơ tham chiếu đơn vị cố định er, ví dụ hướng lên trong hệ tọa độ thế giới, định nghĩa:",
        10: "Từ tích có hướng kép (triple product) ta có:",
        11: "Bản chất của nó là chiếu trực giao hướng tham chiếu cố định er lên mặt phẳng vuông góc với trục Vai - Cổ tay, sau đó chuẩn hóa thành hướng 0 độ. Do đó ψ = 0 biểu thị hướng bán kính khuỷu eCE hướng tối đa về phía er. Conventional SEW có",
        12: "tập kỳ dị tương ứng là:",
        13: "tức là cả một đường thẳng hai chiều xuyên qua khớp vai.",
        14: "Đặt",
    }
}
