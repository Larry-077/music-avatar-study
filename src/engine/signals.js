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
