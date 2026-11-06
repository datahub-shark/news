import json

with open("data/all_bbs_candidates.json", "r", encoding="utf-8") as f:
    candidates = json.load(f)

with open("data/seen_urls.json", "r", encoding="utf-8") as f:
    seen = set(json.load(f))

uncrawled = [c for c in candidates if f"https://bbs.robomaster.com/article/{c['id']}" not in seen]
print(f"Total uncrawled: {len(uncrawled)}")

# Classify by keyword
mech_keywords = ['机械', '结构', '发射', '供弹', '底盘', '云台', '平衡', '步兵', '英雄', '哨兵', '工程', '无人机', '夹爪', '连杆', '减速', '电机', 'cad', 'step', 'sw', 'solidworks', '3d']
elec_keywords = ['电控', 'can', 'pid', 'imu', '滤波', 'kalman', '驱动', 'bms', '嵌入式', 'stm32', 'c板', 'freertos']
vision_keywords = ['视觉', 'yolo', '自瞄', '目标', 'opencv', 'ros', 'slam', '雷达', 'pointcloud', 'lidar']

mech_list = []
elec_list = []
vision_list = []
other_list = []

for c in uncrawled:
    t = c['title'].lower()
    if any(k in t for k in mech_keywords):
        mech_list.append(c)
    elif any(k in t for k in elec_keywords):
        elec_list.append(c)
    elif any(k in t for k in vision_keywords):
        vision_list.append(c)
    else:
        other_list.append(c)

print(f"Cơ khí & Kết cấu (Mechanical): {len(mech_list)}")
print(f"Điều khiển & Điện tử (Control & Embedded): {len(elec_list)}")
print(f"Thị giác & Thuật toán (Vision & AI): {len(vision_list)}")
print(f"Khác (Other/Management/Contest): {len(other_list)}")

print("\n--- TOP 20 BÀI CƠ KHÍ MỚI NHẤT CHƯA CÀO ---")
for c in mech_list[:20]:
    print(f"[{c['id']}] {c['title']}")
