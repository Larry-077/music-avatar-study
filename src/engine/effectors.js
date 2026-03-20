/**
 * Animation Effectors
 * ===================
 * Classes that take a 0.0-1.0 input and drive CharacterRig properties.
 *
 * Ported from: src/engine/effectors.py
 */

// --- Base Class ---
class Effector {
  update(value, character) {}
}

// --- Continuous Effectors (Input: 0.0-1.0) ---

export class ArmDancer extends Effector {
  constructor(smoothing = 0.1) {
    super();
    this.currentShoulder = 0.0;
    this.currentElbow = 0.0;
    this.smoothing = smoothing;

    this.baseShoulder = 30.0;
    this.baseElbow = 10.0;
    this.rangeShoulder = 160.0;
    this.rangeElbow = 120.0;
  }

  update(value, character) {
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

  update(value, character) {
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

  update(value, character) {
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
    this.maxMouthScale = 2.0;   // reduced from 4.5 — keeps mouth proportional
    this.maxFaceScale = 1.15;   // slightly enlarge face oval for "shocked" look
  }

  update(value, character) {
    if (value < 0.05) {
      value = 0.0;
    } else {
      value = (value - 0.05) / 0.95;
    }

    let boostedValue = value * 1.5;  // reduced from 2.5 — ramps up more gradually
    boostedValue = Math.min(1.0, boostedValue);
    const exaggeratedValue = Math.pow(boostedValue, 2.0);

    const targetBrow       = exaggeratedValue * this.maxBrowRaise;
    const targetMouthScale = 1.0 + exaggeratedValue * (this.maxMouthScale - 1.0);
    const targetFaceScale  = 1.0 + exaggeratedValue * (this.maxFaceScale - 1.0);

    this.currentBrowOffset  += (targetBrow - this.currentBrowOffset) * this.smoothing;
    this.currentMouthScale  += (targetMouthScale - this.currentMouthScale) * this.smoothing;
    this.currentFaceScale   += (targetFaceScale - this.currentFaceScale) * this.smoothing;

    character.setEyebrowHeight(this.currentBrowOffset);
    character.setFaceScale(this.currentMouthScale);   // scales Mouth bone
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

  update(value, character) {
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

// --- Trigger Effectors (Input: Boolean/Pulse) ---

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

  update(value, character) {
    if (this.path.length < 2) return;

    // Map value (0-1) to position along path via linear interpolation
    const lastIdx = this.path.length - 1;
    const rawIdx = value * lastIdx;
    const i = Math.min(Math.floor(rawIdx), lastIdx - 1);
    const frac = rawIdx - i;

    const p0 = this.path[i];
    const p1 = this.path[Math.min(i + 1, lastIdx)];
    const nx = p0.x + (p1.x - p0.x) * frac;
    const ny = p0.y + (p1.y - p0.y) * frac;

    // Convert normalized (0-1) canvas position to arm angles
    // Shoulder pivot is at (0.5, 0.12) in normalized space
    const dx = nx - 0.5;
    const dy = ny - 0.12;

    // Angle from straight-down direction (positive = toward right)
    const angle = Math.atan2(-dx, Math.max(dy, 0.01));
    // Map angle to shoulder rotation: down(0)→30°, right(π/2)→110°, up(π)→190°
    const clampedAngle = Math.max(-0.2, Math.min(Math.PI, angle));
    const targetShoulder = 30 + (clampedAngle / Math.PI) * 160;

    // Distance from shoulder determines elbow bend
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxReach = 0.7;
    const reach = Math.min(dist / maxReach, 1.0);
    // Extended (reach=1) → elbow=10°, bent (reach=0) → elbow=130°
    const targetElbow = 10 + (1 - reach) * 120;

    // Smooth
    this.currentShoulder += (targetShoulder - this.currentShoulder) * this.smoothing;
    this.currentElbow += (targetElbow - this.currentElbow) * this.smoothing;

    // Apply to both arms (mirrored)
    character.setArmJointRotation("left", this.currentShoulder, this.currentElbow);
    character.setArmJointRotation("right", -this.currentShoulder, -this.currentElbow);

    // Hand variant based on reach
    let handVariant = "rest";
    if (reach > 0.8) handVariant = "high";
    else if (reach > 0.4) handVariant = "open";
    else if (reach > 0.15) handVariant = "curl";

    character.setHandVariant("left", `L_hand_${handVariant}`);
    character.setHandVariant("right", `R_hand_${handVariant}`);
  }
}
