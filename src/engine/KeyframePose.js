/**
 * KeyframePose Effector
 * =====================
 * Drives the character by linearly interpolating between
 * 3 user-designed pose keyframes at x=0, x=0.5, x=1.0.
 *
 * This is a "continuous" effector: its update(value, character) method
 * is called each frame with a 0-1 signal value.
 *
 * Keyframe schema:
 * {
 *   x: number,               // intensity level (0, 0.5, 1.0)
 *   shoulderAngle_L: number, // Shoulder_L rotation in degrees
 *   elbowAngle_L: number,    // Elbow_L rotation in degrees
 *   shoulderAngle_R: number, // Shoulder_R rotation in degrees
 *   elbowAngle_R: number,    // Elbow_R rotation in degrees
 *   bodyScale: number,       // uniform body scale
 *   headOffsetY: number,     // head Y offset in design-space pixels
 *   eyebrowOffsetY: number,  // eyebrow Y offset (setEyebrowHeight)
 *   eyeVariant: string,      // eye direction enum — NOT interpolated
 *   mouthScale: number,      // mouth scale (setFaceScale)
 *   handScale: number,       // Hand_L + Hand_R scale
 *   feetScale: number,       // Feet bone scale
 * }
 */

function lerp(a, b, t) { return a + (b - a) * t; }

export class KeyframePose {
  /**
   * @param {Array} keyframes  Array of 2-3 pose objects sorted by x
   */
  constructor(keyframes) {
    if (!keyframes || keyframes.length < 2) {
      throw new Error('KeyframePose requires at least 2 keyframes');
    }
    this.keyframes = [...keyframes].sort((a, b) => a.x - b.x);
  }

  /** Find the surrounding frames and interpolation factor for a given value */
  _findFrames(value) {
    const kfs = this.keyframes;

    if (value <= kfs[0].x) return [kfs[0], kfs[0], 0];
    if (value >= kfs[kfs.length - 1].x) {
      const last = kfs[kfs.length - 1];
      return [last, last, 0];
    }

    for (let i = 0; i < kfs.length - 1; i++) {
      if (value >= kfs[i].x && value <= kfs[i + 1].x) {
        const t = (value - kfs[i].x) / (kfs[i + 1].x - kfs[i].x);
        return [kfs[i], kfs[i + 1], t];
      }
    }

    return [kfs[0], kfs[0], 0];
  }

  /** Return the nearest single keyframe for non-interpolatable params */
  _nearestFrame(value) {
    const kfs = this.keyframes;
    let best = kfs[0];
    let bestDist = Math.abs(value - kfs[0].x);
    for (const k of kfs) {
      const d = Math.abs(value - k.x);
      if (d < bestDist) { bestDist = d; best = k; }
    }
    return best;
  }

  /** Apply interpolated pose to the character rig */
  update(value, character) {
    const [k1, k2, t] = this._findFrames(value);
    const kNearest = this._nearestFrame(value); // for enum params

    character.setArmJointRotation('left',
      lerp(k1.shoulderAngle_L, k2.shoulderAngle_L, t),
      lerp(k1.elbowAngle_L,   k2.elbowAngle_L,   t)
    );
    character.setArmJointRotation('right',
      lerp(k1.shoulderAngle_R, k2.shoulderAngle_R, t),
      lerp(k1.elbowAngle_R,   k2.elbowAngle_R,   t)
    );
    character.setBodyScale(lerp(k1.bodyScale, k2.bodyScale, t));
    character.setHeadPositionOffset(0, lerp(k1.headOffsetY, k2.headOffsetY, t));

    // Face
    character.setEyebrowHeight(lerp(k1.eyebrowOffsetY ?? 0, k2.eyebrowOffsetY ?? 0, t));
    character.setEyeVariant(kNearest.eyeVariant ?? '1_center');
    character.setFaceScale(lerp(k1.mouthScale ?? 1, k2.mouthScale ?? 1, t));

    // Extremities
    const hScale = lerp(k1.handScale ?? 1, k2.handScale ?? 1, t);
    character.getBone('Hand_L')?.setScale(hScale);
    character.getBone('Hand_R')?.setScale(hScale);
    const fScale = lerp(k1.feetScale ?? 1, k2.feetScale ?? 1, t);
    character.getBone('Feet')?.setScale(fScale, fScale);
  }
}

/** Default pose values matching CharacterRig.resetToDefault() */
export const DEFAULT_POSE = {
  x: 0,
  shoulderAngle_L:  30,
  elbowAngle_L:     10,
  shoulderAngle_R: -30,
  elbowAngle_R:    -10,
  bodyScale:         1.0,
  headOffsetY:       0,
  eyebrowOffsetY:    0,
  eyeVariant:       '1_center',
  mouthScale:        1.0,
  handScale:         1.0,
  feetScale:         1.0,
};
