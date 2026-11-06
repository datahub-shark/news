import json
import re

with open('data/crawled_articles.json', encoding='utf-8') as f:
    articles = json.load(f)

with open('data/all_bbs_candidates.json', encoding='utf-8') as f:
    candidates = {str(c['id']): c for c in json.load(f)}

PHRASES = [
    ('仿人形七轴双臂机械臂控制技术开源', 'Thuật toán điều khiển cánh tay robot song thủ hình người 7-DOF'),
    ('仿人形七轴机械臂重力补偿算法详细推导', 'Thuật toán bù trọng lực chi tiết cánh tay robot 7-DOF'),
    ('平衡步兵强化学习控制部署开源', 'Triển khai điều khiển học tăng cường (RL) cho Robot Bộ binh Cân bằng'),
    ('平衡步兵强化学习控制训练开源', 'Huấn luyện điều khiển học tăng cường (RL) cho Robot Bộ binh Cân bằng'),
    ('空中机器人反制算法开源', 'Thuật toán khắc chế và vô hiệu hóa Drone trên không'),
    ('哨兵自主导航开源', 'Thuật toán điều hướng tự hành SLAM cho Robot Sentry'),
    ('工程视觉上位机方案开源', 'Hệ thống thị giác máy tính và phần mềm điều khiển Robot Kỹ sư'),
    ('单臂隧道工程结构+技术方案开源', 'Kết cấu cơ khí và giải pháp kỹ thuật Robot Kỹ sư chui hầm một tay'),
    ('工程结构、硬件及控制算法', 'Kết cấu, phần cứng và thuật toán điều khiển Robot Kỹ sư'),
    ('压缩包过洞步兵机械结构', 'Cơ cấu cơ khí Robot Bộ binh nén kích thước chui hầm'),
    ('英雄云台结构设计开源', 'Thiết kế cơ khí bệ ngắm Gimbal cho Robot Anh hùng'),
    ('哨兵动态物体滤除建图工具、地图编辑工具开源', 'Công cụ lọc vật thể động và chỉnh sửa bản đồ SLAM cho Robot Sentry'),
    ('云台滑模控制器教学&开源', 'Hướng dẫn và mã nguồn mở bộ điều khiển trượt (SMC) cho Gimbal'),
    ('过洞步兵&哨兵机械结构', 'Cơ cấu cơ khí Robot Bộ binh & Sentry thu gọn chui hầm'),
    ('适用于RMUL的三摩擦轮英雄机械设计开源', 'Thiết kế cơ khí Robot Anh hùng 3 bánh đà ma sát cho RMUL'),
    ('全通底单边双电机抬升工程机械结构开源', 'Cơ cấu cơ khí Robot Kỹ sư thông đáy nâng hạ motor kép 1 bên'),
    ('低成本3508减速箱开源(轻/重型P15.8)', 'Hộp số giảm tốc hành tinh P15.8 giá rẻ cho motor M3508'),
    ('过洞舵轮工程机械结构开源', 'Cơ cấu cơ khí Robot Kỹ sư bánh lái Swerve chui hầm'),
    ('四轮足底盘机械结构开源', 'Cơ cấu cơ khí khung gầm 4 bánh chân (Quadruped Wheel-Leg)'),
    ('为提高自瞄上限的云台控制方案开源', 'Giải pháp điều khiển bệ ngắm Gimbal nâng cao độ chính xác Auto-Aim'),
    ('全向轮步兵悬挂及低成本全向轮辊子方案开源', 'Hệ thống treo bánh Omni và giải pháp tự chế con lăn giá rẻ'),
    ('双弧轮近战英雄机械结构开源', 'Cơ cấu cơ khí Robot Anh hùng cận chiến bánh vòm đôi'),
    ('简易电控云台重力补偿公式开源', 'Công thức bù trọng lực bệ ngắm Gimbal cho hệ thống điều khiển'),
    ('大弹丸中心供弹机械设计指南', 'Cẩm nang thiết kế cơ khí cơ cấu cấp đạn lớn 42mm trung tâm'),
    ('工程机器人通用串联型机械臂控制框架与上位机框架开源', 'Khung điều khiển và phần mềm máy tính cho cánh tay robot nối tiếp'),
    ('主动悬挂步兵机械&算法开源', 'Cơ cấu cơ khí và thuật toán hệ thống treo chủ động Robot Bộ binh'),
    ('关节电机缓冲电容经验分享', 'Kinh nghiệm thiết kế tụ đệm xung điện cho động cơ khớp'),
    ('工程机器人ROS2上位机控制框架开源', 'Khung điều khiển ROS 2 trên máy tính nhúng cho Robot Kỹ sư'),
    ('无CNC舵轮机械方案开源', 'Giải pháp cơ khí bánh lái Swerve Drive không cần phay CNC'),
    ('环数检测能量机关机械开源', 'Cơ cấu cơ khí Rune năng lượng tích hợp nhận diện vòng điểm'),
    ('雷达站视觉+激光雷达融合定位算法开源', 'Thuật toán định vị kết hợp Camera và LiDAR cho trạm Radar'),
    ('ROBOCON 2026 排球机器人上位机算法与思路分享', 'Thuật toán máy tính nhúng và kiến trúc điều khiển Robot đánh bóng chuyền'),
    ('常见控制理论算法及仿真开源', 'Các thuật toán lý thuyết điều khiển tự động và mô phỏng thực hành'),
    ('全向轮接、发球 排球机器人设计技术报告', 'Báo cáo thiết kế cơ cấu đón và phát bóng Robot bóng chuyền Omni'),
    ('飞镖发射架独立4Z轴底座自动调平算法开源', 'Thuật toán tự cân bằng đế 4 trục Z độc lập cho bệ phóng phi tiêu'),
    ('自制动圈电机驱动及关节电机开源', 'Thiết kế động cơ khớp robot F8518 và mạch driver điều khiển'),
    ('串联腿哨兵机械开源', 'Cơ cấu cơ khí Robot Sentry chân nối tiếp (Serial Leg)'),
    ('串联腿步兵机械结构开源', 'Cơ cấu cơ khí Robot Bộ binh chân nối tiếp (Serial Leg)'),
    ('全向轮下供弹底盘开源', 'Khung gầm bánh xe Omni tích hợp cơ cấu cấp đạn từ phía dưới'),
    ('中南四级工程机械结构开源', 'Cơ cấu cơ khí Robot Kỹ sư 4 tầng nâng hạ'),
    ('步兵机器人云台机械结构开源', 'Cơ cấu cơ khí bệ ngắm Gimbal cho Robot Bộ binh'),
    ('高升力密度空中机器人/无人机开源', 'Thiết kế Drone trên không tỷ số lực nâng / trọng lượng cao'),
]

# Quick word-level dictionary
WORD_DICT = [
    (r'开源', 'Nguồn mở'),
    (r'机械结构|机械', 'Cơ cấu cơ khí'),
    (r'技术报告', 'Báo cáo kỹ thuật'),
    (r'自瞄算法|自瞄框架|自瞄', 'Tự ngắm Auto-Aim'),
    (r'视觉算法|视觉', 'Thị giác máy tính'),
    (r'雷达站|雷达', 'Trạm Radar'),
    (r'导航算法|导航', 'Điều hướng SLAM'),
    (r'中心供弹', 'Cấp đạn trung tâm'),
    (r'切线供弹', 'Cấp đạn tiếp tuyến'),
    (r'供弹', 'Cấp đạn'),
    (r'发射机构|发射架|发射', 'Cơ cấu bắn/phóng'),
    (r'舵轮底盘|舵轮', 'Bánh lái Swerve'),
    (r'全向轮', 'Bánh xe Omni'),
    (r'麦轮|麦克纳姆轮', 'Bánh xe Mecanum'),
    (r'底盘', 'Khung gầm'),
    (r'云台', 'Bệ ngắm Gimbal'),
    (r'步兵机器人|步兵', 'Robot Bộ binh'),
    (r'英雄机器人|英雄', 'Robot Anh hùng'),
    (r'哨兵机器人|哨兵', 'Robot Sentry'),
    (r'工程机器人|工程', 'Robot Kỹ sư'),
    (r'空中机器人|无人机', 'Drone trên không'),
    (r'轮足机器人|轮足|轮腿', 'Robot Bánh - Chân'),
    (r'四足机器人|四足', 'Robot 4 chân'),
    (r'机械臂', 'Cánh tay robot'),
    (r'飞镖系统|飞镖', 'Hệ thống phi tiêu'),
    (r'排球机器人|排球', 'Robot bóng chuyền'),
    (r'能量机关|打符', 'Rune năng lượng'),
    (r'超级电容', 'Siêu tụ điện (SuperCap)'),
    (r'电机驱动|电机', 'Động cơ & Driver'),
    (r'重力补偿', 'Bù trọng lực'),
    (r'悬挂', 'Hệ thống treo'),
    (r'上位机', 'Ứng dụng điều khiển máy tính'),
    (r'仿真', 'Mô phỏng'),
    (r'电控', 'Điều khiển điện'),
    (r'传承分析|传承', 'Kế thừa kinh nghiệm'),
    (r'赛季总结', 'Tổng kết mùa giải'),
    (r'赛季规划', 'Kế hoạch mùa giải'),
    (r'电池架', 'Khung pin'),
    (r'激光雷达', 'LiDAR'),
    (r'强化学习', 'Học tăng cường RL'),
]

TEAM_PAIRS = [
    (r'华南理工大学\s*华南虎(?:战队)?', 'ĐH Bách khoa Nam Trung Hoa (SCUT South China Tiger)'),
    (r'哈尔滨工业大学（威海）HERO战队', 'ĐH Công nghệ Cáp Nhĩ Tân HERO'),
    (r'北京理工大学\s*DreamChaser(?:战队)?|追梦战队', 'ĐH Bách khoa Bắc Kinh (BIT DreamChaser)'),
    (r'同济大学\s*SuperPower(?:战队)?', 'ĐH Đồng Tế (Tongji SuperPower)'),
    (r'东北大学\s*T-DT(?:战队)?|T-DT战队', 'ĐH Đông Bắc (NEU T-DT)'),
    (r'深圳大学\s*RobotPilots(?:战队)?', 'ĐH Thâm Quyến (SZU RobotPilots)'),
    (r'香港科技大学\s*ENTERPRIZE(?:战队)?', 'ĐH KH&CN Hồng Kông (HKUST Enterprize)'),
    (r'浙江大学\s*Hello\s*World(?:战队)?', 'ĐH Chiết Giang (ZJU Hello World)'),
    (r'中南大学\s*FYT(?:战队)?', 'ĐH Trung Nam (CSU FYT)'),
    (r'南京理工大学\s*Alliance(?:战队)?', 'ĐH Khoa học Công nghệ Nam Kinh (NJUST Alliance)'),
    (r'中国石油大学（华东）\s*RPS(?:战队)?', 'ĐH Dầu khí Trung Quốc (UPC RPS)'),
    (r'复旦大学\s*星云EGA(?:战队)?', 'ĐH Phúc Đán (Fudan Nebula EGA)'),
    (r'大连理工大学\s*[-—]?\s*凌Bug战队', 'ĐH Bách khoa Đại Liên (DUT Lăng Bug)'),
    (r'南方科技大学\s*ARTINX(?:战队)?', 'ĐH KH&CN Miền Nam (SUSTech ARTINX)'),
    (r'五邑大学\s*[-—]?\s*IMCA(?:战队)?', 'ĐH Ngũ Ấp (WYU IMCA)'),
    (r'合肥工业大学\s*[-—]?\s*苍穹战队', 'ĐH Công nghiệp Hợp Phì (HFUT Thương Khung)'),
    (r'齐鲁工业大学\s*[-—]?\s*Adam战队', 'ĐH Công nghiệp Tề Lỗ (QLU Adam)'),
    (r'广州城市理工学院\s*[-—]?\s*野狼战队', 'ĐH Công nghệ TP Quảng Châu (GCU Dã Lang)'),
    (r'常州大学\s*[-—]?\s*Climber战队', 'ĐH Thường Châu (CZU Climber)'),
    (r'山东理工大学\s*[-—]?\s*齐奇战队', 'ĐH Bách khoa Sơn Đông (SDUT Tề Kỳ)'),
    (r'武汉科技大学\s*[-—]?\s*崇实战队', 'ĐH KH&CN Vũ Hán (WUST Sùng Thực)'),
    (r'青岛大学\s*[-—]?\s*未来战队', 'ĐH Thanh Đảo (QDU Tương Lai)'),
    (r'沈阳理工大学\s*[-—]?\s*Ambition战队', 'ĐH Bách khoa Thẩm Dương (SYLU Ambition)'),
]

def make_vietnamese_title(art_id, cur_t, cand_t):
    full = cand_t if len(cand_t) > len(cur_t) else cur_t
    if not full:
        full = cur_t or cand_t
        
    team = ""
    for pat, rep in TEAM_PAIRS:
        if re.search(pat, full, re.I):
            team = rep
            full = re.sub(pat, '', full, flags=re.I)
            break

    # Check exact phrases
    matched_phrase = False
    for pat, rep in PHRASES:
        if pat in full:
            full = full.replace(pat, rep)
            matched_phrase = True
            break
            
    if not matched_phrase:
        # Strip brackets
        clean = re.sub(r'^[【\[](?:RM|RC)?202\d[A-Za-z0-9_\-\s]*[】\]\-—\s]*', '', full)
        clean = re.sub(r'^[【\[](.*)[】\]]$', r'\1', clean)
        clean = clean.replace('战队', '').replace('——', ' - ').replace('—', ' - ').strip(' -+[]【】')
        
        for pat, rep in WORD_DICT:
            clean = re.sub(pat, f" {rep} ", clean)
        full = clean

    full = re.sub(r'\s+', ' ', full).strip(' -+[]【】')
    if full:
        full = full[0].upper() + full[1:]
    if team:
        return f"{full} · {team}"
    return full

print("Testing 20 titles from across the dataset:")
for i in [0, 5, 10, 20, 50, 80, 100, 120, 150, 180, 200, 250, 300, 350, 400, 450]:
    if i < len(articles):
        a = articles[i]
        art_id = a.get('sourceUrl', '').split('/')[-1]
        cand_t = candidates.get(art_id, {}).get('title', '')
        res = make_vietnamese_title(art_id, a.get('title', ''), cand_t)
        print(f"[{art_id}] {res}")
