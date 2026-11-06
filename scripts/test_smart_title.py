import json
import re

with open('data/crawled_articles.json', encoding='utf-8') as f:
    articles = json.load(f)

with open('data/all_bbs_candidates.json', encoding='utf-8') as f:
    candidates = {str(c['id']): c for c in json.load(f)}

# Dictionaries for university / team names
TEAM_DICT = [
    (r'华南理工大学\s*华南虎(?:战队)?|华南虎战队|华南理工大学', 'ĐH Bách khoa Nam Trung Hoa (SCUT South China Tiger)'),
    (r'哈尔滨工业大学(?:（深圳）)?|哈工大', 'ĐH Công nghệ Cáp Nhĩ Tân (HIT)'),
    (r'哈尔滨工业大学（威海）HERO战队|HERO战队', 'ĐH Công nghệ Cáp Nhĩ Tân HERO'),
    (r'北京理工大学\s*DreamChaser(?:战队)?|DreamChaser战队|追梦战队', 'ĐH Bách khoa Bắc Kinh (BIT DreamChaser)'),
    (r'同济大学\s*SuperPower(?:战队)?|SuperPower战队', 'ĐH Đồng Tế (Tongji SuperPower)'),
    (r'东北大学\s*T-DT(?:战队)?|T-DT战队|TDT战队', 'ĐH Đông Bắc (NEU T-DT)'),
    (r'深圳大学\s*RobotPilots(?:战队)?|RobotPilots战队', 'ĐH Thâm Quyến (SZU RobotPilots)'),
    (r'香港科技大学\s*ENTERPRIZE(?:战队)?|ENTERPRIZE战队|港科大', 'ĐH KH&CN Hồng Kông (HKUST Enterprize)'),
    (r'浙江大学\s*Hello\s*World(?:战队)?|Hello\s*World战队', 'ĐH Chiết Giang (ZJU Hello World)'),
    (r'中南大学\s*FYT(?:战队)?|FYT战队', 'ĐH Trung Nam (CSU FYT)'),
    (r'南京理工大学\s*Alliance(?:战队)?|Alliance战队', 'ĐH Khoa học Công nghệ Nam Kinh (NJUST Alliance)'),
    (r'中国石油大学（华东）\s*RPS(?:战队)?|RPS战队', 'ĐH Dầu khí Trung Quốc (UPC RPS)'),
    (r'复旦大学\s*星云EGA(?:战队)?|星云EGA战队', 'ĐH Phúc Đán (Fudan Nebula EGA)'),
    (r'大连理工大学\s*[-—]?\s*凌Bug战队|凌Bug战队', 'ĐH Bách khoa Đại Liên (DUT Lăng Bug)'),
    (r'南方科技大学\s*ARTINX(?:战队)?|ARTINX战队', 'ĐH KH&CN Miền Nam (SUSTech ARTINX)'),
    (r'五邑大学\s*[-—]?\s*IMCA(?:战队)?|IMCA战队', 'ĐH Ngũ Ấp (WYU IMCA)'),
    (r'合肥工业大学\s*[-—]?\s*苍穹战队|苍穹战队', 'ĐH Công nghiệp Hợp Phì (HFUT Thương Khung)'),
    (r'齐鲁工业大学\s*[-—]?\s*Adam战队|Adam战队', 'ĐH Công nghiệp Tề Lỗ (QLU Adam)'),
    (r'广州城市理工学院\s*[-—]?\s*野狼战队|野狼战队', 'ĐH Công nghệ TP Quảng Châu (GCU Dã Lang)'),
    (r'常州大学\s*[-—]?\s*Climber战队|Climber战队', 'ĐH Thường Châu (CZU Climber)'),
    (r'山东理工大学\s*[-—]?\s*齐奇战队|齐奇战队', 'ĐH Bách khoa Sơn Đông (SDUT Tề Kỳ)'),
    (r'武汉科技大学\s*[-—]?\s*崇实战队|崇实战队', 'ĐH KH&CN Vũ Hán (WUST Sùng Thực)'),
    (r'青岛大学\s*[-—]?\s*未来战队|未来战队', 'ĐH Thanh Đảo (QDU Tương Lai)'),
    (r'沈阳理工大学\s*[-—]?\s*Ambition战队|Ambition战队', 'ĐH Bách khoa Thẩm Dương (SYLU Ambition)'),
    (r'南京航空航天大学金城学院\s*[-—]?\s*Born of Fire战队', 'Học viện Kim Thành - ĐH Hàng không Nam Kinh'),
    (r'福州大学\s*[-—]?\s*浮舟湿地战队', 'ĐH Phúc Châu (FZU Phù Chu Thấp Địa)'),
    (r'北京工业大学\s*[-—]?\s*PIP战队', 'ĐH Công nghiệp Bắc Kinh (BJUT PIP)'),
    (r'华南农业大学\s*[-—]?\s*Taurus战队', 'ĐH Nông nghiệp Nam Trung Hoa (SCAU Taurus)'),
    (r'华东理工大学\s*[-—]?\s*起源战队', 'ĐH Khoa học Công nghệ Hoa Đông (ECUST Khởi Nguyên)'),
    (r'西安交通大学\s*[-—]?\s*笃行战队', 'ĐH Giao thông Tây An (XJTU Đốc Hành)'),
]

# Translation for technical terms
TECH_TRANSLATIONS = [
    (r'机械结构开源|机械结构设计|机械结构|机械开源|机械图纸', 'kết cấu cơ khí'),
    (r'技术报告开源|技术报告', 'Báo cáo kỹ thuật'),
    (r'电控开源|电控框架|电控培训|电控', 'hệ thống điều khiển điện'),
    (r'自瞄算法开源|自瞄开源|自瞄算法|自瞄框架|自瞄', 'thuật toán tự ngắm Auto-Aim'),
    (r'视觉算法开源|视觉开源|视觉项目|视觉', 'hệ thống thị giác máy tính'),
    (r'雷达站开源|雷达开源|雷达', 'trạm Radar'),
    (r'导航算法开源|导航开源|导航', 'thuật toán điều hướng SLAM'),
    (r'中心供弹开源|中心供弹', 'cơ cấu cấp đạn trung tâm'),
    (r'切线供弹开源|切线供弹', 'cơ cấu cấp đạn tiếp tuyến'),
    (r'下供弹', 'cơ cấu cấp đạn dưới'),
    (r'供弹', 'cơ cấu cấp đạn'),
    (r'发射玩具|发射机构|发射架|发射', 'cơ cấu bắn & bệ phóng'),
    (r'登岛舵轮底盘|舵轮底盘|舵轮', 'khung gầm bánh lái Swerve'),
    (r'全向轮底盘|全向轮', 'bánh xe Omni'),
    (r'麦轮底盘|麦轮|麦克纳姆轮', 'bánh xe Mecanum'),
    (r'高通底盘', 'khung gầm khoảng sáng gầm cao'),
    (r'底盘', 'khung gầm'),
    (r'云台机械结构|云台控制|云台', 'bệ ngắm Gimbal'),
    (r'串联腿步兵|轮腿步兵|步兵机器人|步兵', 'Robot Bộ binh'),
    (r'英雄机器人|英雄', 'Robot Anh hùng'),
    (r'哨兵机器人|哨兵', 'Robot Sentry'),
    (r'工程机器人|工程', 'Robot Kỹ sư'),
    (r'空中机器人|无人机', 'Drone trên không'),
    (r'轮足机器人|轮腿机器人|轮足|轮腿', 'Robot Bánh - Chân (Wheel-Leg)'),
    (r'四足机器人|四足', 'Robot 4 chân (Quadruped)'),
    (r'机械臂', 'cánh tay robot'),
    (r'飞镖系统|飞镖发射架|制导飞镖|飞镖', 'hệ thống phi tiêu'),
    (r'排球机器人|排球', 'robot đánh bóng chuyền'),
    (r'能量机关|打符|大符|小符', 'cơ cấu Rune năng lượng'),
    (r'超级电容控制器|超级电容控制板|超级电容', 'mạch siêu tụ điện (SuperCap)'),
    (r'关节电机|电机驱动|电机减速箱|减速箱|电机', 'động cơ & hộp số giảm tốc'),
    (r'滑环', 'cổ góp trượt Slip Ring'),
    (r'重力补偿', 'bù trọng lực'),
    (r'主动悬挂|悬挂', 'hệ thống treo'),
    (r'上位机框架|上位机', 'phần mềm điều khiển máy tính (Host App)'),
    (r'仿真平台|仿真器|仿真', 'mô phỏng'),
    (r'战队传承分析|战队传承|传承分析|传承开源|传承', 'tổng kết kế thừa kinh nghiệm'),
    (r'赛季规划开源|赛季规划', 'kế hoạch mùa giải'),
    (r'赛季总结', 'tổng kết mùa giải'),
    (r'电池架', 'khung gắn pin'),
    (r'激光雷达', 'LiDAR'),
    (r'强化学习', 'học tăng cường (Reinforcement Learning)'),
    (r'无线充电', 'sạc không dây'),
    (r'开源', 'mã nguồn mở'),
]

def format_smart_title(art_id, cur_title, cand_title):
    # Select the richer title source
    full = cand_title if len(cand_title) > len(cur_title) else cur_title
    if not full:
        full = cur_title or cand_title

    # Detect team
    team_name = ""
    for pat, rep in TEAM_DICT:
        if re.search(pat, full, re.I):
            team_name = rep
            break

    # Strip bracket headers like 【RM2026-
    clean = re.sub(r'^[【\[](?:RM|RC)?202\d[A-Za-z0-9_\-\s]*[】\]\-—\s]*', '', full)
    clean = re.sub(r'^[【\[](.*)[】\]]$', r'\1', clean)
    
    # Strip team from clean if team is detected
    for pat, rep in TEAM_DICT:
        clean = re.sub(pat, '', clean, flags=re.I)
    clean = clean.replace('战队', '').replace('——', ' - ').replace('—', ' - ').strip(' -+[]【】')

    # Translate tech concepts
    t_vi = clean
    for pat, rep in TECH_TRANSLATIONS:
        t_vi = re.sub(pat, f" {rep} ", t_vi)
    
    t_vi = re.sub(r'\s+', ' ', t_vi).strip(' -+')
    # Capitalize first letter
    if t_vi:
        t_vi = t_vi[0].upper() + t_vi[1:]

    if team_name:
        return f"{t_vi} · {team_name}"
    return t_vi

print("Testing 15 smart titles:")
for a in articles[115:130]:
    art_id = a.get('sourceUrl', '').split('/')[-1]
    cand_t = candidates.get(art_id, {}).get('title', '')
    res = format_smart_title(art_id, a.get('title', ''), cand_t)
    print(f"[{art_id}] -> {res}")
