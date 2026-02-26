/**
 * 2-Bone Analytical IK Solver
 * ===========================
 * Computes shoulder and elbow joint angles given a target hand world position.
 * Uses the law of cosines for a closed-form solution.
 *
 * Bone offsets (from character_rig.js skeleton):
 *   Left arm:  Shoulder_L → Elbow_L at local (4, 46),  Elbow_L → Hand_L at local (11, 46)
 *   Right arm: Shoulder_R → Elbow_R at local (-4, 47), Elbow_R → Hand_R at local (-11, 46)
 */

// Upper arm bone local offsets (shoulder → elbow pivot)
const UPPER_L = [4, 46];
const UPPER_R = [-4, 47];

// Forearm bone local offsets (elbow → hand pivot)
const FORE_L = [11, 46];
const FORE_R = [-11, 46];

function boneLen([x, y]) { return Math.sqrt(x * x + y * y); }
function boneAngle([x, y]) { return Math.atan2(y, x); }

// Precomputed constants
const L1_L = boneLen(UPPER_L);   // ~46.17  upper-arm length (left)
const L2_L = boneLen(FORE_L);    // ~47.30  forearm length (left)
const L1_R = boneLen(UPPER_R);   // ~47.17  upper-arm length (right)
const L2_R = boneLen(FORE_R);    // ~47.30  forearm length (right)

// "Rest" angles: direction of each bone segment when its parent rotation = 0
const ARM_REST_L  = boneAngle(UPPER_L);  // atan2(46,  4)  ≈ 85.0°
const FORE_REST_L = boneAngle(FORE_L);   // atan2(46, 11)  ≈ 76.6°
const ARM_REST_R  = boneAngle(UPPER_R);  // atan2(47, -4)  ≈ 94.9°
const FORE_REST_R = boneAngle(FORE_R);   // atan2(46,-11)  ≈103.4°

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Solve 2-bone IK for one arm.
 *
 * @param {[number, number]} shoulderWorldPos  World position of the shoulder pivot
 * @param {[number, number]} targetPos         Desired hand position in world space
 * @param {'left'|'right'}  side
 * @param {number}          parentWorldRotRad  World rotation of the Body bone (default 0)
 * @returns {{ shoulderAngle: number, elbowAngle: number }}  Joint angles in degrees
 */
export function solveArmIK(
  shoulderWorldPos,
  targetPos,
  side = 'left',
  parentWorldRotRad = 0
) {
  const [sx, sy] = shoulderWorldPos;
  const [tx, ty] = targetPos;

  const L1 = side === 'left' ? L1_L : L1_R;
  const L2 = side === 'left' ? L2_L : L2_R;
  const ARM_REST  = side === 'left' ? ARM_REST_L  : ARM_REST_R;
  const FORE_REST = side === 'left' ? FORE_REST_L : FORE_REST_R;

  const dx = tx - sx;
  const dy = ty - sy;
  const rawD = Math.sqrt(dx * dx + dy * dy);

  // Clamp reach
  const minD = Math.abs(L1 - L2) + 0.01;
  const maxD = L1 + L2 - 0.01;
  const d = clamp(rawD, minD, maxD);

  // Direction from shoulder toward target
  const baseAngle = Math.atan2(dy, dx);

  // Law of cosines: angle at shoulder vertex
  const cosAngleS = clamp(
    (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d),
    -1, 1
  );
  const angleAtS = Math.acos(cosAngleS);

  // Choose elbow-bend direction:
  //   Left arm  → elbow bends outward (away from body center, i.e. CCW from shoulder→target)
  //   Right arm → elbow bends outward (CW)
  const dirSE = side === 'left'
    ? baseAngle - angleAtS
    : baseAngle + angleAtS;

  // Elbow world position
  const ex = sx + L1 * Math.cos(dirSE);
  const ey = sy + L1 * Math.sin(dirSE);

  // Forearm world direction (elbow → target)
  const dirET = Math.atan2(ty - ey, tx - ex);

  // Convert to LOCAL joint rotations
  // Upper arm world dir = parentWorldRot + θ_shoulder + ARM_REST
  // → θ_shoulder = dirSE - ARM_REST - parentWorldRot
  const shoulderLocalRad = dirSE - ARM_REST - parentWorldRotRad;

  // Forearm world dir = parentWorldRot + θ_shoulder + θ_elbow + FORE_REST
  // → θ_elbow = dirET - FORE_REST - parentWorldRot - θ_shoulder
  const elbowLocalRad = dirET - FORE_REST - parentWorldRotRad - shoulderLocalRad;

  return {
    shoulderAngle: shoulderLocalRad * (180 / Math.PI),
    elbowAngle:    elbowLocalRad    * (180 / Math.PI),
  };
}

/** Arm bone lengths, exported for UI range limits */
export const ARM_LENGTHS = {
  left:  { L1: L1_L, L2: L2_L, total: L1_L + L2_L },
  right: { L1: L1_R, L2: L2_R, total: L1_R + L2_R },
};
