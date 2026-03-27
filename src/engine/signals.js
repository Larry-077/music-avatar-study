/**
 * Signal Sources
 * ==============
 * Reads normalized data arrays and provides values synchronized to playback time.
 *
 * Ported from: src/engine/signals.py
 */

export class ContinuousSignal {
  constructor(dataArray, fps) {
    this.data = dataArray;
    this.fps = fps;
    this.length = dataArray.length;
    this.lastValue = 0.0;
  }

  getValue(currentTime) {
    if (this.length === 0) return 0.0;

    let idx = Math.floor(currentTime * this.fps);
    if (idx < 0) idx = 0;
    if (idx >= this.length) idx = this.length - 1;

    this.lastValue = this.data[idx];
    return this.data[idx];
  }
}

export class TriggerSignal {
  constructor(timestampList) {
    this.timestamps = [...timestampList].sort((a, b) => a - b);
    this.index = 0;
    this.count = this.timestamps.length;
    this.tolerance = 0.05;
  }

  check(currentTime) {
    if (this.index >= this.count) return false;

    const nextTime = this.timestamps[this.index];
    if (currentTime >= nextTime) {
      this.index++;
      return true;
    }
    return false;
  }

  reset() {
    this.index = 0;
  }
}

/**
 * BeatFrequencySignal
 * ====================
 * Converts beat timestamps into a continuous 0-1 value representing
 * the current beat frequency (BPM). Higher frequency → value closer to 1.
 *
 * This allows beat to drive the same continuous effectors as volume/pitch/timbre:
 * fast beats = high arms / big body / high levitate / strong expression.
 */
export class BeatFrequencySignal {
  constructor(timestampList, minFreq = 0.5, maxFreq = 3.0) {
    this.timestamps = [...timestampList].sort((a, b) => a - b);
    this.count = this.timestamps.length;
    this.minFreq = minFreq; // Hz mapped to 0.0
    this.maxFreq = maxFreq; // Hz mapped to 1.0
  }

  getValue(currentTime) {
    if (this.count < 2) return 0.5;

    // Find the most recent beat at or before currentTime
    let idx = -1;
    for (let i = 0; i < this.count; i++) {
      if (this.timestamps[i] <= currentTime) idx = i;
      else break;
    }

    if (idx < 1) return 0.3; // Not enough beats yet — return low value

    // Average the last few intervals for smoothness
    const windowSize = Math.min(3, idx);
    let totalInterval = 0;
    for (let i = idx; i > idx - windowSize; i--) {
      totalInterval += this.timestamps[i] - this.timestamps[i - 1];
    }
    const avgInterval = totalInterval / windowSize;
    const freq = 1 / avgInterval;

    const normalized = (freq - this.minFreq) / (this.maxFreq - this.minFreq);
    return Math.max(0, Math.min(1, normalized));
  }
}
