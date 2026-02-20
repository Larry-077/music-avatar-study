import os

# === 1. 设置素材文件夹路径 ===
# ⚠️ 请修改成你自己的路径
folder = "assets/character/eyes/do"

# === 2. 定义九个方向对应的英文名称 ===
directions = [
    "center", "up", "down", "left", "right",
    "leftup", "leftdown", "rightdown", "rightup"
]

# === 3. 获取所有 PNG 文件 ===
files = sorted([f for f in os.listdir(folder) if f.lower().endswith(".png")])

# === 4. 只处理前 9 张 ===
if len(files) < 9:
    print(f"⚠️ 目录中只有 {len(files)} 张图片，不足 9 张。")
    exit()
else:
    print(f"✅ 检测到 {len(files)} 张图片，将重命名前 9 张。")

# === 5. Dry Run（预览效果） ===
print("\n🔍 预览即将重命名结果：")
for i in range(9):
    old = files[i]
    new = f"2_{directions[i]}.png"
    print(f"  {old} → {new}")

# === 6. 确认执行 ===
confirm = input("\n是否确认执行重命名？(y/n): ").strip().lower()
if confirm != 'y':
    print("❎ 已取消操作。")
    exit()

# === 7. 执行重命名 ===
for i in range(9):
    old = os.path.join(folder, files[i])
    new = os.path.join(folder, f"3_{directions[i]}.png")
    os.rename(old, new)
    print(f"✅ {files[i]} → 1_{directions[i]}.png")

print("\n🎉 重命名完成！(第1组)")
