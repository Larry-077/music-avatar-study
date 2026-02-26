#!/usr/bin/env python3
"""
批量生成四个音频文件的分析 JSON
"""

import sys
import os

# 添加 analyzer.py 所在路径到 sys.path
analyzer_path = '/Users/larryzhu/DGP/2d_animation/music-avatar-project/src/music'
sys.path.insert(0, analyzer_path)

from analyzer import analyze_song

# 配置
AUDIO_DIR = '/Users/larryzhu/DGP/2d_animation/web-next/public/assets/audio'
OUTPUT_DIR = '/Users/larryzhu/DGP/2d_animation/web-next/public/assets/analysis'

# 需要分析的四个音频文件
audio_files = [
    'volume.wav',
    'pitch.wav',
    'timbre.wav',
    'beat.wav'
]

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for filename in audio_files:
        audio_path = os.path.join(AUDIO_DIR, filename)
        name_no_ext = os.path.splitext(filename)[0]
        output_path = os.path.join(OUTPUT_DIR, f"{name_no_ext}.json")

        print(f"\n{'='*60}")
        print(f"处理: {filename}")
        print(f"{'='*60}")

        if not os.path.exists(audio_path):
            print(f"❌ 文件不存在: {audio_path}")
            continue

        # 运行分析（使用 OUTPUT_DIR 作为 cache_dir）
        result = analyze_song(audio_path, cache_dir=OUTPUT_DIR)

        if result:
            print(f"✅ 成功生成: {output_path}")
            print(f"   - 时长: {result['info']['duration']:.2f}s")
            print(f"   - FPS: {result['info']['fps']:.2f}")
            print(f"   - Volume 帧数: {len(result['continuous']['volume'])}")
            print(f"   - Pitch 帧数: {len(result['continuous']['pitch'])}")
            print(f"   - Timbre 帧数: {len(result['continuous']['timbre'])}")
            print(f"   - Beats 数量: {len(result['triggers']['beats'])}")
        else:
            print(f"❌ 分析失败: {filename}")

    print(f"\n{'='*60}")
    print("✅ 所有分析完成！")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
