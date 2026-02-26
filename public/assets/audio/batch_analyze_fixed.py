#!/usr/bin/env python3
"""
批量生成四个音频文件的分析 JSON（绕过 lzma 问题）
"""

import librosa
import soundfile as sf
import numpy as np
import json
import os

# 配置
HOP_LENGTH = 512
SAMPLE_RATE = 22050

AUDIO_DIR = '/Users/larryzhu/DGP/2d_animation/web-next/public/assets/audio'
OUTPUT_DIR = '/Users/larryzhu/DGP/2d_animation/web-next/public/assets/analysis'

audio_files = ['volume.wav', 'pitch.wav', 'timbre.wav', 'beat.wav']

def normalize_array(arr, min_val=None, max_val=None, use_percentile=False):
    """归一化数组到 0.0 - 1.0"""
    if len(arr) == 0: return arr
    arr = np.nan_to_num(arr)

    if min_val is None:
        min_val = np.min(arr)

    if max_val is None:
        if use_percentile:
            max_val = np.percentile(arr, 98)
        else:
            max_val = np.max(arr)

    if max_val - min_val == 0:
        return np.zeros_like(arr)

    norm = (arr - min_val) / (max_val - min_val)
    return np.clip(norm, 0.0, 1.0)

def analyze_pitch_log(y, sr):
    """提取音高"""
    f0, _, _ = librosa.pyin(y, fmin=librosa.note_to_hz('C2'),
                           fmax=librosa.note_to_hz('C7'),
                           sr=sr, hop_length=HOP_LENGTH)
    f0 = np.nan_to_num(f0)

    midi_pitch = np.zeros_like(f0)
    non_zero_mask = f0 > 0
    midi_pitch[non_zero_mask] = librosa.hz_to_midi(f0[non_zero_mask])

    normalized_pitch = normalize_array(midi_pitch, min_val=36, max_val=96)
    normalized_pitch[~non_zero_mask] = 0.0

    return normalized_pitch.tolist()

def analyze_volume_rms(y, sr):
    """提取音量"""
    rms = librosa.feature.rms(y=y, hop_length=HOP_LENGTH)[0]
    return normalize_array(rms, use_percentile=True).tolist()

def analyze_centroid(y, sr):
    """提取音色（频谱质心）"""
    cent = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=HOP_LENGTH)[0]
    return normalize_array(cent, use_percentile=True).tolist()

def analyze_beats(y, sr):
    """提取节拍"""
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=HOP_LENGTH)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=HOP_LENGTH)
    return beat_times.tolist()

def analyze_song(audio_path):
    """分析音频文件"""
    filename = os.path.basename(audio_path)
    print(f"\n{'='*60}")
    print(f"处理: {filename}")
    print(f"{'='*60}")

    # 使用 soundfile 读取（避免 lzma 问题）
    try:
        y, sr = sf.read(audio_path)
        print(f"✓ 原始音频: {len(y)} samples, {sr}Hz")

        # 转为 mono 如果是 stereo
        if len(y.shape) > 1:
            y = np.mean(y, axis=1)
            print(f"✓ 转换为 mono")

        # 重采样到 22050Hz
        if sr != SAMPLE_RATE:
            y = librosa.resample(y, orig_sr=sr, target_sr=SAMPLE_RATE)
            sr = SAMPLE_RATE
            print(f"✓ 重采样到 {SAMPLE_RATE}Hz")

    except Exception as e:
        print(f"❌ Error loading audio: {e}")
        return None

    # 运行分析
    duration = librosa.get_duration(y=y, sr=sr)
    print(f"✓ 时长: {duration:.2f}s")

    print(f"⚙️  分析 volume...")
    volume = analyze_volume_rms(y, sr)

    print(f"⚙️  分析 pitch...")
    pitch = analyze_pitch_log(y, sr)

    print(f"⚙️  分析 timbre...")
    timbre = analyze_centroid(y, sr)

    print(f"⚙️  分析 beats...")
    beats = analyze_beats(y, sr)

    data = {
        "info": {
            "filename": filename,
            "duration": duration,
            "sample_rate": sr,
            "hop_length": HOP_LENGTH,
            "fps": sr / HOP_LENGTH
        },
        "continuous": {
            "volume": volume,
            "pitch": pitch,
            "timbre": timbre
        },
        "triggers": {
            "beats": beats
        }
    }

    print(f"✅ 分析完成:")
    print(f"   - FPS: {data['info']['fps']:.2f}")
    print(f"   - Volume 帧数: {len(volume)}")
    print(f"   - Pitch 帧数: {len(pitch)}")
    print(f"   - Timbre 帧数: {len(timbre)}")
    print(f"   - Beats 数量: {len(beats)}")

    return data

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for filename in audio_files:
        audio_path = os.path.join(AUDIO_DIR, filename)

        if not os.path.exists(audio_path):
            print(f"❌ 文件不存在: {audio_path}")
            continue

        result = analyze_song(audio_path)

        if result:
            name_no_ext = os.path.splitext(filename)[0]
            output_path = os.path.join(OUTPUT_DIR, f"{name_no_ext}.json")

            with open(output_path, 'w') as f:
                json.dump(result, f)

            print(f"💾 保存到: {output_path}")

    print(f"\n{'='*60}")
    print("✅ 所有分析完成！")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
