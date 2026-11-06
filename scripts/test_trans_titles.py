import json
import re

with open('data/crawled_articles.json', encoding='utf-8') as f:
    articles = json.load(f)

with open('data/all_bbs_candidates.json', encoding='utf-8') as f:
    candidates = {str(c['id']): c for c in json.load(f)}

TITLE_DICT = [
    (r'【RM2027-铨CNC新电池电池架修改方案开源】', 'Khung pin phay CNC cho pin tiêu chuẩn mới RM2027'),
    (r'【RM2026-铨CNC中心供弹开源】', 'Cơ cấu cấp đạn trung tâm phay CNC tiêu chuẩn RM2026'),
    (r'【RM2026-全CNC_17mm切线供弹开源】', 'Cơ cấu cấp đạn tiếp tuyến 17mm phay CNC toàn bộ RM2026'),
    (r'\[RC2026 西华大学创界RC战队-武林探秘SOC端代码开源\]', 'Mã nguồn mở SoC cho robot nhiệm vụ võ lâm ĐH Tây Hoa'),
    (r'【哨兵机器人技术报告-哈尔滨工业大学（威海）HERO战队-RM2026技术报告开源】', 'Báo cáo kỹ thuật Sentry Robot ĐH Công nghệ Cáp Nhĩ Tân HERO'),
    (r'【赛季总结\+仲恺农业工程学院奇点战队\+RM2026赛季总结传承开源】', 'Tổng kết mùa giải & kế thừa kỹ thuật ĐH Kỹ thuật Nông nghiệp Trọng Khải Singularity'),
    (r'\[RM26工程电控开源\]', 'Mã nguồn mở điều khiển điện Robot Kỹ sư RM2026'),
    (r'【飞镖系统技术报告\+西安交通大学笃行战队\+RM2026技术报告开源】', 'Báo cáo kỹ thuật hệ thống phi tiêu ĐH Giao thông Tây An Đốc Hành'),
    (r'【西安交通大学笃行战队\+RM2026赛季总结“战队传承分析”开源】', 'Tổng kết mùa giải & phân tích kế thừa chiến đội ĐH Giao thông Tây An Đốc Hành'),
    (r'【技术报告 北京理工大学追梦战队 RM2026 技术报告开源】', 'Báo cáo kỹ thuật toàn diện chiến đội ĐH Bách khoa Bắc Kinh DreamChaser'),
    (r'【RC2026 福州大学浮舟湿地实验室 马术强化学习运控训练开源】', 'Mã nguồn mở huấn luyện RL điều khiển vận động cưỡi ngựa ĐH Phúc Châu'),
    (r'【赛季规划\+北京工业大学PIP\+RM2026 赛季规划开源】', 'Kế hoạch mùa giải & phát triển kỹ thuật ĐH Công nghiệp Bắc Kinh PIP'),
    (r'【赛季规划\+同济大学SuperPower\+RM2026 赛季规划开源】', 'Kế hoạch mùa giải & phát triển kỹ thuật ĐH Đồng Tế SuperPower'),
    (r'【赛季规划\+复旦大学星云EGA \+RM2026赛季规划开源】', 'Kế hoạch mùa giải & phát triển kỹ thuật ĐH Fudan Nebula EGA'),
    (r'【RMUC 2026区域赛部分赛事数据发布】', 'Bộ dữ liệu thi đấu vòng loại khu vực RMUC 2026 cho huấn luyện chiến thuật'),
    (r'【RMUC2025南昌航空大学洪鹰战队赛季规划】', 'Kế hoạch mùa giải & định hướng kỹ thuật ĐH Hàng không Nam Xương Hồng Ưng'),
    (r'【RMUC2025常州大学Climber战队赛季规划】', 'Kế hoạch mùa giải & định hướng kỹ thuật ĐH Thường Châu Climber'),
    (r'【2024赛季 优秀赛季规划 广州航海学院ICBK破冰船战队】', 'Kế hoạch mùa giải & phát triển kỹ thuật Học viện Hàng hải Quảng Châu ICBK'),
]

DICT_TERMS = [
    (r'技术报告', 'Báo cáo kỹ thuật'),
    (r'开源', 'Nguồn mở'),
    (r'机械结构', 'Cơ cấu cơ khí'),
    (r'机械', 'Cơ khí'),
    (r'结构', 'Kết cấu'),
    (r'底盘', 'Khung gầm'),
    (r'云台', 'Bệ ngắm Gimbal'),
    (r'发射器|发射', 'Cơ cấu phóng/bắn'),
    (r'供弹|拨盘', 'Cơ cấu cấp đạn'),
    (r'自瞄', 'Tự ngắm Auto-Aim'),
    (r'雷达站|雷达', 'Trạm Radar'),
    (r'飞镖', 'Hệ thống phi tiêu'),
    (r'步兵机器人|步兵', 'Robot Bộ binh'),
    (r'英雄机器人|英雄', 'Robot Anh hùng'),
    (r'哨兵机器人|哨兵', 'Robot Sentry'),
    (r'工程机器人|工程', 'Robot Kỹ sư'),
    (r'无人机|空中机器人', 'Drone trên không'),
    (r'轮足机器人|轮足|轮腿', 'Robot Bánh - Chân'),
    (r'四足机器人|四足', 'Robot 4 chân'),
    (r'舵轮', 'Bánh lái Swerve'),
    (r'全向轮', 'Bánh xe Omni'),
    (r'麦轮|麦克纳姆轮', 'Bánh xe Mecanum'),
    (r'超级电容', 'Siêu tụ điện (SuperCap)'),
    (r'减速箱|减速器', 'Hộp số giảm tốc'),
    (r'机械臂', 'Cánh tay robot'),
    (r'仿真', 'Mô phỏng'),
    (r'算法', 'Thuật toán'),
    (r'电控', 'Điều khiển điện'),
    (r'视觉', 'Thị giác máy'),
    (r'重力补偿', 'Bù trọng lực'),
    (r'战队传承分析|战队传承|传承分析', 'Kế thừa kinh nghiệm chiến đội'),
    (r'赛季规划', 'Kế hoạch mùa giải'),
    (r'赛季总结', 'Tổng kết mùa giải'),
    (r'电池架', 'Khung gắn pin'),
    (r'切线供弹', 'Cấp đạn tiếp tuyến'),
    (r'中心供弹', 'Cấp đạn trung tâm'),
    (r'排球机器人|排球', 'Robot đánh bóng chuyền'),
    (r'能量机关|打符|大符|小符', 'Cơ cấu Rune năng lượng'),
    (r'悬挂', 'Hệ thống treo'),
    (r'上位机', 'Ứng dụng máy tính điều khiển'),
    (r'软硬件', 'Phần cứng & Phần mềm'),
    (r'单片机', 'Vi điều khiển MCU'),
    (r'图纸', 'Bản vẽ thiết kế'),
]

def translate_title(raw_title, cand_title):
    t = raw_title.strip()
    if not t or len(t) < 2:
        t = cand_title.strip()
    
    # Check exact match rules first
    for pattern, repl in TITLE_DICT:
        if re.search(pattern, t):
            return repl
            
    # Clean brackets
    t_clean = re.sub(r'^[【\[][^】\]]*(?:战队|大学|联队|高校|AWARD|RM202\d|赛季)[^】\]]*[】\]]\s*', '', t, flags=re.I).strip()
    t_clean = re.sub(r'^[【\[][^】\]]*[】\]]\s*', '', t_clean).strip()
    if len(t_clean) >= 4:
        t = t_clean
    else:
        t = re.sub(r'^[【\[](.*)[】\]]$', r'\1', t).strip()

    # Apply term replacements
    for pattern, repl in DICT_TERMS:
        t = re.sub(pattern, f" {repl} ", t)
        
    t = re.sub(r'\s+', ' ', t).strip()
    return t

print("Checking title translations on sample articles:")
for a in articles[100:115]:
    art_id = a.get('sourceUrl', '').split('/')[-1]
    cand_t = candidates.get(art_id, {}).get('title', '')
    translated = translate_title(a.get('title', ''), cand_t)
    print(f"[{art_id}] {translated[:60]}")
