import json

with open('data/seen_urls.json', encoding='utf-8') as f:
    seen = set(json.load(f))
with open('data/all_bbs_candidates.json', encoding='utf-8') as f:
    cand = json.load(f)

uncrawled = [c for c in cand if f"https://bbs.robomaster.com/article/{c['id']}" not in seen]
print(f"Total uncrawled remaining: {len(uncrawled)}")

categories = {}
for c in uncrawled:
    t = c.get('title', '')
    cat = 'Khác'
    if any(k in t.lower() for k in ['机械', '结构', '发射', '供弹', '底盘', '云台', '平衡', '步兵', '英雄', '哨兵', '工程', '无人机', '夹爪', '连杆', '减速', '电机', 'cad', 'step', 'sw', 'solidworks', '3d', '舵轮', '轮足', '轮腿']):
        cat = 'Cơ khí'
    elif any(k in t.lower() for k in ['视觉', 'vision', 'camera', 'yolo', 'opencv', 'npu', 'nhận diện', 'target', 'tracking', '自瞄', 'aim', 'gán nhãn', 'zeroshot', '雷达', 'pointcloud', 'lidar']):
        cat = 'Thị giác'
    elif any(k in t.lower() for k in ['电控', 'control', 'pid', 'imu', 'kalman', 'mã hóa', 'động cơ', 'vô tuyến', 'motor', 'uart', 'can', 'can bus', 'mpc', 'leso', 'firmware', 'bms', 'freertos', 'stm32']):
        cat = 'Điều khiển'
    elif any(k in t.lower() for k in ['ros', 'ros2', 'mujoco', 'agent', 'mô phỏng', 'simulation', 'ai', 'nơ-ron', 'deep learning', 'vlm', 'llm', '强化学习', 'rl']):
        cat = 'AI & ROS'
    categories[cat] = categories.get(cat, 0) + 1

print("Categories in uncrawled candidates:", categories)
print("\nSample top 25 remaining uncrawled:")
for i, c in enumerate(uncrawled[:25], 1):
    print(f"{i:2d}. [{c['id']}] {c['title']}")
