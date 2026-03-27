/**
 * Animation Effectors
 * ===================
 * Classes that take a 0.0-1.0 input and drive CharacterRig properties.
 *
 * All continuous effectors now have the signature: update(value, dt, character)
 * (dt is passed by the binder for rate-based effectors; existing ones ignore it)
 *
 * Two effector modes:
 *  - "continuous" effectors: update(value, dt, character) called every frame
 *  - "trigger" effectors: trigger() fires on beat, update(dt, character) decays
 *
 * For cross-type mappings:
 *  - FootTapRate / HeadNodRate: continuous signal → rhythmic frequency
 *  - ArmDancePulse / BodyPumpPulse / FloatPulse / FacePulse: beat → one-shot burst
 */

// --- Base Class ---
class Effector {
  update(value, dt, character) {}
}

// --- Continuous Effectors (Input: 0.0-1.0) ---

export class ArmDancer extends Effector {
  constructor(smoothing = 0.1) {
    super();
    this.currentShoulder = 0.0;
    this.currentElbow = 0.0;
    this.smoothing = smoothing;

    // at value=0: shoulder≈10°  at value=1: shoulder≈65°
    // at median pitch (≈0.77): shoulder≈52°  — arms at comfortable mid-height
    this.baseShoulder = 10.0;
    this.baseElbow = 3.0;
    this.rangeShoulder = 55.0;
    this.rangeElbow = 30.0;
  }

  update(value, dt, character) {
    const targetShoulder = this.baseShoulder + value * this.rangeShoulder;
    const targetElbow = this.baseElbow + value * this.rangeElbow;

    let handVariant = "rest";
    if (value > 0.85) handVariant = "high";
    else if (value > 0.4) handVariant = "open";
    else if (value > 0.1) handVariant = "curl";

    // Exponential moving average smoothing
    this.currentShoulder += (targetShoulder - this.currentShoulder) * this.smoothing;
    this.currentElbow += (targetElbow - this.currentElbow) * this.smoothing;

    character.setArmJointRotation("left", this.currentShoulder, this.currentElbow);
    character.setHandVariant("left", `L_hand_${handVariant}`);

    character.setArmJointRotation("right", -this.currentShoulder, -this.currentElbow);
    character.setHandVariant("right", `R_hand_${handVariant}`);
  }
}

export class BodyPumper extends Effector {
  constructor(minScale = 0.85, maxScale = 2.2) {
    super();
    this.minS = minScale;
    this.maxS = maxScale;
    this.smoothing = 0.12;
    this.currentVal = 0.0;
  }

  update(value, dt, character) {
    if (value < 0.1) value = 0.0;
    this.currentVal += (value - this.currentVal) * this.smoothing;
    const scale = this.minS + (this.maxS - this.minS) * this.currentVal;
    character.setBodyScale(scale);
  }
}

export class Floater extends Effector {
  constructor(maxOffset = 280) {
    super();
    this.maxOffset = maxOffset;
    this.smoothing = 0.09;
    this.currentVal = 0.0;
    this.baseY = null;
    this.idleTime = 0.0;
  }

  update(value, dt, character) {
    const [currentX, currentY] = [character.root.local.x, character.root.local.y];
    if (this.baseY === null) {
      this.baseY = currentY;
    }

    this.currentVal += (value - this.currentVal) * this.smoothing;
    const musicOffset = this.currentVal * this.maxOffset;
    this.idleTime += 0.02;
    const idleOffset = Math.sin(this.idleTime) * 5;
    const targetY = this.baseY - musicOffset + idleOffset;

    character.setScreenPosition(currentX, targetY);
  }
}

export class FaceExpression extends Effector {
  constructor() {
    super();
    this.currentBrowOffset = 0.0;
    this.currentMouthScale = 1.0;
    this.currentFaceScale = 1.0;
    this.smoothing = 0.08;
    this.maxBrowRaise = -80.0;
    this.maxMouthScale = 2.0;
    this.maxFaceScale = 1.15;
  }

  update(value, dt, character) {
    if (value < 0.05) {
      value = 0.0;
    } else {
      value = (value - 0.05) / 0.95;
    }

    let boostedValue = value * 1.5;
    boostedValue = Math.min(1.0, boostedValue);
    const exaggeratedValue = Math.pow(boostedValue, 2.0);

    const targetBrow       = exaggeratedValue * this.maxBrowRaise;
    const targetMouthScale = 1.0 + exaggeratedValue * (this.maxMouthScale - 1.0);
    const targetFaceScale  = 1.0 + exaggeratedValue * (this.maxFaceScale - 1.0);

    this.currentBrowOffset  += (targetBrow - this.currentBrowOffset) * this.smoothing;
    this.currentMouthScale  += (targetMouthScale - this.currentMouthScale) * this.smoothing;
    this.currentFaceScale   += (targetFaceScale - this.currentFaceScale) * this.smoothing;

    character.setEyebrowHeight(this.currentBrowOffset);
    character.setFaceScale(this.currentMouthScale);
    const faceBone = character.getBone?.("Face");
    if (faceBone) faceBone.setScale(this.currentFaceScale, this.currentFaceScale);
    const hatBone = character.getBone?.("Hat");
    if (hatBone) hatBone.setScale(this.currentFaceScale, this.currentFaceScale);
  }
}

export class SimpleLipSync extends Effector {
  constructor() {
    super();
    this.lastSwitchTime = 0;
    this.switchInterval = 0.6;
    this.silenceTimer = 0.0;
    this.silenceThreshold = 0.15;

    this.openMouths = ["1", "2", "3", "4"];
    this.closedMouth = "Sil";
    this.currentMouth = this.closedMouth;
  }

  update(value, dt, character) {
    const now = performance.now() / 1000;

    if (value < 0.1) {
      this.silenceTimer += 0.016;
    } else {
      this.silenceTimer = 0.0;
    }

    if (this.silenceTimer > this.silenceThreshold) {
      if (this.currentMouth !== this.closedMouth) {
        character.setMouthVariant(this.closedMouth);
        this.currentMouth = this.closedMouth;
      }
    } else {
      if (now - this.lastSwitchTime > this.switchInterval) {
        let newMouth = this.openMouths[Math.floor(Math.random() * this.openMouths.length)];
        let attempts = 0;
        while (newMouth === this.currentMouth && this.openMouths.length > 1 && attempts < 10) {
          newMouth = this.openMouths[Math.floor(Math.random() * this.openMouths.length)];
          attempts++;
        }

        character.setMouthVariant(newMouth);
        this.currentMouth = newMouth;
        this.lastSwitchTime = now;
      }
    }
  }
}

// --- Rate-Based Effectors (continuous signal → rhythmic frequency) ---

/**
 * FootTapRate: continuous signal drives tapping rate.
 * Higher value = faster foot tapping. Used when foot_tap is bound to
 * a continuous signal (volume/pitch/timbre).
 */
export class FootTapRate extends Effector {
  constructor() {
    super();
    this.maxFreq = 8.0;       // taps per second at max signal
    this.tapDuration = 0.10;
    this.phase = 0;
    this.tapTimer = 0;
    this.currentScale = 1.0;
    this.maxScale = 1.8;
    this.intensity = 1.0;
  }

  update(value, dt = 0.016, character) {
    if (value > 0.08) {
      // sqrt mapping: compresses low values upward so even quiet passages tap noticeably
      const mappedValue = Math.sqrt(value);
      const freq = mappedValue * this.maxFreq;
      const prevFloor = Math.floor(this.phase);
      this.phase += freq * dt;
      // Fire a tap each time phase completes a full cycle
      if (Math.floor(this.phase) > prevFloor) {
        this.tapTimer = this.tapDuration;
      }
    } else {
      this.phase = 0;
    }

    let targetScale = 1.0;
    if (this.tapTimer > 0) {
      this.tapTimer -= dt;
      const progress = 1 - Math.max(0, this.tapTimer / this.tapDuration);
      targetScale = 1.0 + (this.maxScale - 1.0) * this.intensity * Math.sin(progress * Math.PI);
    }

    this.currentScale += (targetScale - this.currentScale) * 0.4;
    const feetBone = character.getBone("Feet");
    if (feetBone) feetBone.setScale(this.currentScale, this.currentScale);
  }
}

/**
 * HeadNodRate: continuous signal drives nodding rate.
 * Higher value = faster head nodding. Used when head_bob is bound to
 * a continuous signal (volume/pitch/timbre).
 */
export class HeadNodRate extends Effector {
  constructor() {
    super();
    this.maxFreq = 7.0;       // nods per second at max signal
    this.nodDuration = 0.14;
    this.phase = 0;
    this.nodTimer = 0;
    this.currentOffset = 0.0;
    this.bobAmount = 40;
    this.intensity = 1.0;
  }

  update(value, dt = 0.016, character) {
    if (value > 0.08) {
      // sqrt mapping: same as FootTapRate — lifts low-value signals into usable frequency range
      const mappedValue = Math.sqrt(value);
      const freq = mappedValue * this.maxFreq;
      const prevFloor = Math.floor(this.phase);
      this.phase += freq * dt;
      // Fire a nod each time phase completes a full cycle
      if (Math.floor(this.phase) > prevFloor) {
        this.nodTimer = this.nodDuration;
      }
    } else {
      this.phase = 0;
    }

    let targetOffset = 0.0;
    if (this.nodTimer > 0) {
      this.nodTimer -= dt;
      const progress = 1 - Math.max(0, this.nodTimer / this.nodDuration);
      targetOffset = this.bobAmount * this.intensity * Math.sin(progress * Math.PI);
    }

    this.currentOffset += (targetOffset - this.currentOffset) * 0.25;
    character.setHeadPositionOffset(0, this.currentOffset);
  }
}

// --- Trigger Effectors (fires on beat pulse) ---

export class HeadBanger extends Effector {
  constructor() {
    super();
    this.timer = 0.0;
    this.duration = 0.2;
    this.active = false;
    this.bobAmount = 55;
    this.currentOffset = 0.0;
    this.intensity = 1.0;
  }

  trigger() {
    this.active = true;
    this.timer = this.duration;
  }

  update(dt, character) {
    let targetOffset = 0.0;

    if (this.active) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.active = false;
      } else {
        const progress = this.timer / this.duration;
        targetOffset = this.bobAmount * this.intensity * Math.sin(progress * Math.PI);
      }
    }

    this.currentOffset += (targetOffset - this.currentOffset) * 0.2;
    character.setHeadPositionOffset(0, this.currentOffset);
  }
}

export class FootTapper extends Effector {
  constructor() {
    super();
    this.scaleTimer = 0.0;
    this.duration = 0.25;
    this.maxScale = 2.0;
    this.currentScale = 1.0;
    this.triggered = false;
    this.intensity = 1.0;
  }

  trigger() {
    this.triggered = true;
    this.scaleTimer = this.duration;
  }

  update(dt, character) {
    let targetScale = 1.0;

    if (this.triggered) {
      this.scaleTimer -= dt;
      if (this.scaleTimer <= 0) {
        this.triggered = false;
      } else {
        const progress = this.scaleTimer / this.duration;
        targetScale = 1.0 + (this.maxScale - 1.0) * this.intensity * Math.sin(progress * Math.PI);
      }
    }

    this.currentScale += (targetScale - this.currentScale) * 0.3;

    const feetBone = character.getBone("Feet");
    if (feetBone) {
      feetBone.setScale(this.currentScale, this.currentScale);
    }
  }
}

// --- Beat-Pulse Effectors (one-shot burst on beat for normally-continuous effectors) ---

/**
 * ArmDancePulse: arms wave once on each beat.
 * Used when arm_dance is bound to a beat/trigger signal.
 */
export class ArmDancePulse extends Effector {
  constructor() {
    super();
    this.timer = 0;
    this.duration = 0.4;
    this.active = false;
    this.intensity = 1.0;
    this.currentShoulder = 30.0;
    this.currentElbow = 10.0;
  }

  trigger() {
    this.active = true;
    this.timer = this.duration;
  }

  update(dt, character) {
    let targetShoulder = 30.0;
    let targetElbow = 10.0;
    let handVariant = "rest";

    if (this.active) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.active = false;
      } else {
        const progress = 1 - (this.timer / this.duration);
        const wave = Math.sin(progress * Math.PI) * this.intensity;
        targetShoulder = 30 + wave * 160;
        targetElbow = 10 + wave * 60;
        if (wave > 0.7) handVariant = "high";
        else if (wave > 0.35) handVariant = "open";
        else handVariant = "curl";
      }
    }

    this.currentShoulder += (targetShoulder - this.currentShoulder) * 0.25;
    this.currentElbow += (targetElbow - this.currentElbow) * 0.25;

    character.setArmJointRotation("left", this.currentShoulder, this.currentElbow);
    character.setHandVariant("left", `L_hand_${handVariant}`);
    character.setArmJointRotation("right", -this.currentShoulder, -this.currentElbow);
    character.setHandVariant("right", `R_hand_${handVariant}`);
  }
}

/**
 * BodyPumpPulse: body inflates once on each beat.
 */
export class BodyPumpPulse extends Effector {
  constructor() {
    super();
    this.timer = 0;
    this.duration = 0.3;
    this.active = false;
    this.intensity = 1.0;
    this.currentScale = 1.0;
    this.maxScale = 1.9;
  }

  trigger() {
    this.active = true;
    this.timer = this.duration;
  }

  update(dt, character) {
    let targetScale = 1.0;

    if (this.active) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.active = false;
      } else {
        const progress = 1 - (this.timer / this.duration);
        targetScale = 1.0 + (this.maxScale - 1.0) * this.intensity * Math.sin(progress * Math.PI);
      }
    }

    this.currentScale += (targetScale - this.currentScale) * 0.35;
    character.setBodyScale(this.currentScale);
  }
}

/**
 * FloatPulse: character bounces up once on each beat.
 */
export class FloatPulse extends Effector {
  constructor() {
    super();
    this.timer = 0;
    this.duration = 0.45;
    this.active = false;
    this.intensity = 1.0;
    this.currentOffset = 0.0;
    this.maxBounce = 60;
    this.baseY = null;
  }

  trigger() {
    this.active = true;
    this.timer = this.duration;
  }

  update(dt, character) {
    const [currentX, currentY] = [character.root.local.x, character.root.local.y];
    if (this.baseY === null) this.baseY = currentY;

    let targetOffset = 0.0;
    if (this.active) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.active = false;
      } else {
        const progress = 1 - (this.timer / this.duration);
        targetOffset = this.maxBounce * this.intensity * Math.sin(progress * Math.PI);
      }
    }

    this.currentOffset += (targetOffset - this.currentOffset) * 0.3;
    character.setScreenPosition(currentX, this.baseY - this.currentOffset);
  }
}

/**
 * FacePulse: eyebrows raise and mouth opens once on each beat.
 */
export class FacePulse extends Effector {
  constructor() {
    super();
    this.timer = 0;
    this.duration = 0.35;
    this.active = false;
    this.intensity = 1.0;
    this.currentBrowOffset = 0.0;
    this.currentMouthScale = 1.0;
    this.maxBrowRaise = -60;
    this.maxMouthScale = 1.8;
  }

  trigger() {
    this.active = true;
    this.timer = this.duration;
  }

  update(dt, character) {
    let targetBrow = 0.0;
    let targetMouthScale = 1.0;

    if (this.active) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.active = false;
      } else {
        const progress = 1 - (this.timer / this.duration);
        const wave = Math.sin(progress * Math.PI) * this.intensity;
        targetBrow = wave * this.maxBrowRaise;
        targetMouthScale = 1.0 + wave * (this.maxMouthScale - 1.0);
      }
    }

    this.currentBrowOffset += (targetBrow - this.currentBrowOffset) * 0.3;
    this.currentMouthScale += (targetMouthScale - this.currentMouthScale) * 0.3;

    character.setEyebrowHeight(this.currentBrowOffset);
    character.setFaceScale(this.currentMouthScale);
  }
}

// --- Custom Arm Path Effector (User-drawn trajectory) ---

export class CustomArmPath extends Effector {
  constructor(smoothing = 0.12) {
    super();
    this.path = []; // [{x, y}, ...] normalized 0-1
    this.smoothing = smoothing;
    this.currentShoulder = 30;
    this.currentElbow = 10;
  }

  setPath(pathPoints) {
    this.path = pathPoints || [];
  }

  update(value, dt, character) {
    if (this.path.length < 2) return;

    const lastIdx = this.path.length - 1;
    const rawIdx = value * lastIdx;
    const i = Math.min(Math.floor(rawIdx), lastIdx - 1);
    const frac = rawIdx - i;

    const p0 = this.path[i];
    const p1 = this.path[Math.min(i + 1, lastIdx)];
    const nx = p0.x + (p1.x - p0.x) * frac;
    const ny = p0.y + (p1.y - p0.y) * frac;

    const dx = nx - 0.5;
    const dy = ny - 0.12;

    const angle = Math.atan2(-dx, Math.max(dy, 0.01));
    const clampedAngle = Math.max(-0.2, Math.min(Math.PI, angle));
    const targetShoulder = 30 + (clampedAngle / Math.PI) * 160;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxReach = 0.7;
    const reach = Math.min(dist / maxReach, 1.0);
    const targetElbow = 10 + (1 - reach) * 120;

    this.currentShoulder += (targetShoulder - this.currentShoulder) * this.smoothing;
    this.currentElbow += (targetElbow - this.currentElbow) * this.smoothing;

    character.setArmJointRotation("left", this.currentShoulder, this.currentElbow);
    character.setArmJointRotation("right", -this.currentShoulder, -this.currentElbow);

    let handVariant = "rest";
    if (reach > 0.8) handVariant = "high";
    else if (reach > 0.4) handVariant = "open";
    else if (reach > 0.15) handVariant = "curl";

    character.setHandVariant("left", `L_hand_${handVariant}`);
    character.setHandVariant("right", `R_hand_${handVariant}`);
  }
}
