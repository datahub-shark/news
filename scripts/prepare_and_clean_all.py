import json
import re
from pathlib import Path

DATA_FILE = Path('data/crawled_articles.json')
CAND_FILE = Path('data/all_bbs_candidates.json')

with open(DATA_FILE, encoding='utf-8') as f:
    articles = json.load(f)

with open(CAND_FILE, encoding='utf-8') as f:
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
    ('9孔中心供弹机械结构开源', 'Cơ cấu cơ khí cấp đạn trung tâm 9 lỗ (9-hole Central Loader)'),
    ('元胤哨兵机器人机械结构开源', 'Cơ cấu cơ khí Robot Sentry Nguyên Dận'),
    ('外置3508双端六弧轮英雄机械开源', 'Cơ cấu cơ khí Robot Anh hùng 6 bánh vòm motor M3508 gắn ngoài'),
    ('工程高通底盘开源', 'Khung gầm khoảng sáng gầm cao cho Robot Kỹ sư'),
    ('最便宜耐用轮腿PCB滑环开源', 'Cổ góp điện trượt PCB siêu bền giá rẻ cho Robot Bánh - Chân'),
    ('一种英雄登岛舵轮底盘开源——半通底履带撑杆机构', 'Khung gầm bánh lái Swerve leo đảo cho Robot Anh hùng: Cơ cấu thanh chống xích bán thông đáy'),
    ('低成本无改减速箱内嵌3508电机全向轮', 'Bánh xe Omni nhúng động cơ DJI M3508 không cần sửa đổi hộp số giảm tốc'),
    ('铨CNC新电池电池架修改方案开源', 'Khung pin phay CNC cho pin tiêu chuẩn mới RM2027'),
    ('铨CNC中心供弹开源', 'Cơ cấu cấp đạn trung tâm phay CNC tiêu chuẩn RM2026'),
    ('全CNC_17mm切线供弹开源', 'Cơ cấu cấp đạn tiếp tuyến 17mm phay CNC toàn bộ RM2026'),
    ('西华大学创界RC战队-武林探秘SOC端代码开源', 'Mã nguồn mở SoC cho robot nhiệm vụ võ lâm ĐH Tây Hoa'),
    ('哨兵机器人技术报告', 'Báo cáo kỹ thuật toàn diện Robot Sentry'),
    ('飞镖系统技术报告', 'Báo cáo kỹ thuật toàn diện hệ thống phi tiêu'),
]

WORD_DICT = [
    (r'开源', 'mã nguồn mở & bản vẽ'),
    (r'机械结构设计|机械结构|机械图纸|机械开源|机械', 'cơ cấu cơ khí'),
    (r'技术报告', 'báo cáo kỹ thuật'),
    (r'自瞄算法|自瞄框架|自瞄', 'tự ngắm Auto-Aim'),
    (r'视觉算法|视觉项目|视觉', 'thị giác máy tính'),
    (r'雷达站|雷达', 'trạm Radar'),
    (r'导航算法|导航', 'điều hướng SLAM'),
    (r'中心供弹', 'cấp đạn trung tâm'),
    (r'切线供弹', 'cấp đạn tiếp tuyến'),
    (r'下供弹', 'cấp đạn dưới'),
    (r'供弹', 'cấp đạn'),
    (r'发射机构|发射架|发射玩具|发射', 'cơ cấu bắn/phóng'),
    (r'登岛舵轮底盘|舵轮底盘|舵轮', 'bánh lái Swerve'),
    (r'全向轮底盘|全向轮', 'bánh xe Omni'),
    (r'麦轮底盘|麦轮|麦克纳姆轮', 'bánh xe Mecanum'),
    (r'高通底盘', 'khung gầm khoảng sáng cao'),
    (r'底盘', 'khung gầm'),
    (r'云台机械结构|云台控制|云台', 'bệ ngắm Gimbal'),
    (r'串联腿步兵|轮腿步兵|步兵机器人|步兵', 'Robot Bộ binh'),
    (r'英雄机器人|英雄', 'Robot Anh hùng'),
    (r'哨兵机器人|哨兵', 'Robot Sentry'),
    (r'工程机器人|工程', 'Robot Kỹ sư'),
    (r'空中机器人|无人机', 'Drone trên không'),
    (r'轮足机器人|轮腿机器人|轮足|轮腿', 'Robot Bánh - Chân'),
    (r'四足机器人|四足', 'Robot 4 chân'),
    (r'机械臂', 'cánh tay robot'),
    (r'飞镖系统|飞镖发射架|制导飞镖|飞镖', 'hệ thống phi tiêu'),
    (r'排球机器人|排球', 'robot bóng chuyền'),
    (r'能量机关|打符|大符|小符', 'Rune năng lượng'),
    (r'超级电容控制器|超级电容控制板|超级电容', 'siêu tụ điện (SuperCap)'),
    (r'关节电机|电机驱动|电机减速箱|减速箱|电机', 'động cơ & hộp số giảm tốc'),
    (r'滑环', 'cổ góp trượt Slip Ring'),
    (r'重力补偿', 'bù trọng lực'),
    (r'主动悬挂|悬挂', 'hệ thống treo'),
    (r'上位机框架|上位机', 'ứng dụng điều khiển máy tính'),
    (r'仿真平台|仿真器|仿真', 'mô phỏng'),
    (r'战队传承分析|战队传承|传承分析|传承开源|传承', 'kế thừa kinh nghiệm chiến đội'),
    (r'赛季规划开源|赛季规划', 'kế hoạch mùa giải'),
    (r'赛季总结', 'tổng kết mùa giải'),
    (r'电池架', 'khung pin'),
    (r'激光雷达', 'LiDAR'),
    (r'强化学习', 'học tăng cường RL'),
    (r'无线充电', 'sạc không dây'),
    (r'软硬件', 'phần cứng & phần mềm'),
]

TEAM_PAIRS = [
    (r'华南理工大学\s*华南虎(?:战队)?|华南虎战队', 'ĐH Bách khoa Nam Trung Hoa (SCUT South China Tiger)'),
    (r'哈尔滨工业大学（威海）HERO战队|HERO战队', 'ĐH Công nghệ Cáp Nhĩ Tân HERO'),
    (r'北京理工大学\s*DreamChaser(?:战队)?|DreamChaser战队|追梦战队', 'ĐH Bách khoa Bắc Kinh (BIT DreamChaser)'),
    (r'同济大学\s*SuperPower(?:战队)?|SuperPower战队', 'ĐH Đồng Tế (Tongji SuperPower)'),
    (r'东北大学\s*T-DT(?:战队)?|T-DT战队|TDT战队', 'ĐH Đông Bắc (NEU T-DT)'),
    (r'深圳大学\s*RobotPilots(?:战队)?|RobotPilots战队', 'ĐH Thâm Quyến (SZU RobotPilots)'),
    (r'香港科技大学\s*ENTERPRIZE(?:战队)?|ENTERPRIZE战队', 'ĐH KH&CN Hồng Kông (HKUST Enterprize)'),
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
]

def clean_html_text(text):
    if not text:
        return ""
    t = re.sub(r'<[^>]*>', ' ', text)
    t = t.replace('&nbsp;', ' ').replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def clean_author(raw_author):
    a = (raw_author or '').strip()
    m = re.match(r'关于作者\s+([^\s\d]+(?:\s+[^\s\d]+)?)\s+\d+\s+关注Ta', a)
    if m:
        return m.group(1).strip()
    
    if '通讯信息' in a:
        a = re.sub(r'^(?:通讯信息|联系方式)[:：\s]*', '', a)
        team_m = re.search(r'([\u4e00-\u9fa5A-Za-z0-9_\-]+(?:战队|实验室|团队|学院|大学))', a)
        if team_m:
            return team_m.group(1).strip()
        wx_m = re.search(r'(?:微信|wx|WX)[:：\s]*([a-zA-Z0-9_\-]+)', a)
        if wx_m and len(wx_m.group(1)) > 3:
            return wx_m.group(1).strip()
        name_m = re.search(r'([a-zA-Z][a-zA-Z0-9_\.\-]{2,20})', a)
        if name_m:
            return name_m.group(1).strip()
        return "Cộng đồng RoboMaster"
    
    if len(a) > 50 or any(bad in a.lower() for bad in ['http', 'qq群', '联系qq', '电话及微信']):
        return "Cộng đồng RoboMaster"
        
    return a or "Cộng đồng RoboMaster"

def clean_cover(url):
    if not url or not isinstance(url, str):
        return ""
    url = url.strip()
    if not url.startswith('http'):
        return ""
    if url.endswith('.gif'):
        return ""
    if any(bad in url.lower() for bad in ['avatar', 'icon', 'emoji', 'badge', 'default.0258246']):
        return ""
    return url

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

    # Exact phrases match first
    matched = False
    for pat, rep in PHRASES:
        if pat in full:
            full = full.replace(pat, rep)
            matched = True
            break
            
    if not matched:
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

# Process all 456 articles
cleaned_count = 0
for a in articles:
    art_id = a.get('sourceUrl', '').split('/')[-1]
    cand_t = candidates.get(art_id, {}).get('title', '')
    
    # 1. Clean Title
    vn_title = make_vietnamese_title(art_id, a.get('title', ''), cand_t)
    if not vn_title or len(vn_title) < 3:
        vn_title = f"Giải pháp kỹ thuật mã nguồn mở #{art_id}"
    a['title'] = vn_title[:240]
    
    # 2. Clean Author
    a['author'] = clean_author(a.get('author', ''))[:100]
    
    # 3. Clean Cover Image (strictly blank if none)
    a['coverImage'] = clean_cover(a.get('coverImage', ''))[:2000]
    
    # 4. Clean Summary
    clean_sum = clean_html_text(a.get('summary', ''))
    if not clean_sum:
        clean_sum = f"Tài liệu phân tích kỹ thuật, bản vẽ CAD và mã nguồn mở cho giải pháp {vn_title}."
    a['summary'] = clean_sum[:950]
    
    # 5. Clean Category
    valid_cats = ['Cơ khí', 'Robot di động', 'Thị giác máy', 'Điều khiển', 'AI & ROS', 'Khác']
    if a.get('category') not in valid_cats:
        a['category'] = 'Cơ khí'
        
    # 6. Clean robotIdea
    if not a.get('robotIdea') or 'undefined' in a.get('robotIdea', ''):
        a['robotIdea'] = f"Ứng dụng giải pháp vào phân mảng {a['category']}: tham khảo kết cấu cơ khí, thuật toán điều khiển và sơ đồ phần cứng thực tế cho các dự án robot thi đấu và tự hành."
    else:
        a['robotIdea'] = clean_html_text(a['robotIdea'])[:4800]
        
    cleaned_count += 1

with open(DATA_FILE, 'w', encoding='utf-8') as f:
    json.dump(articles, f, ensure_ascii=False, indent=2)

print(f"🎉 Đã làm sạch & chuẩn hóa toàn bộ {cleaned_count} bài viết trong {DATA_FILE}!")
