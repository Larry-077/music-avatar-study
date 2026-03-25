/**
 * Binder / Engine Core
 * ====================
 * Manages the mapping between Signals and Effectors.
 *
 * Supports all 6 effectors for any signal type:
 *  - Continuous signals (volume/pitch/timbre) → continuous effectors respond smoothly
 *    foot_tap_rate and head_nod_rate respond with rhythmic frequency proportional to signal
 *  - Trigger signal (beat) → trigger effectors fire on onset
 *    arm_dance_pulse, body_pump_pulse, float_pulse, face_pulse fire one-shot bursts on beat
 */

import { ContinuousSignal, TriggerSignal } from "./signals.js";
import {
  ArmDancer,
  BodyPumper,
  Floater,
  FaceExpression,
  SimpleLipSync,
  HeadBanger,
  FootTapper,
  FootTapRate,
  HeadNodRate,
  ArmDancePulse,
  BodyPumpPulse,
  FloatPulse,
  FacePulse,
} from "./effectors.js";

/**
 * Resolve a UI "concept" effector ID to its actual implementation ID
 * based on the signal type.
 *
 * - foot_tap + continuous → foot_tap_rate (frequency-based)
 * - head_bob + continuous → head_nod_rate (frequency-based)
 * - arm_dance + beat → arm_dance_pulse (one-shot burst)
 * - body_pump + beat → body_pump_pulse (one-shot burst)
 * - float + beat → float_pulse (one-shot burst)
 * - face + beat → face_pulse (one-shot burst)
 * - everything else stays the same
 */
export function resolveEffectorId(conceptId, signalName) {
  const isBeat = signalName === "beat";
  if (!isBeat) {
    if (conceptId === "foot_tap") return "foot_tap_rate";
    if (conceptId === "head_bob") return "head_nod_rate";
    return conceptId;
  } else {
    if (conceptId === "arm_dance") return "arm_dance_pulse";
    if (conceptId === "body_pump") return "body_pump_pulse";
    if (conceptId === "float") return "float_pulse";
    if (conceptId === "face") return "face_pulse";
    return conceptId;
  }
}

export class BindingEngine {
  /**
   * @param {object} analysisData    Parsed analysis JSON
   * @param {object} customEffectors Optional extra effectors, e.g. { custom_pose: new KeyframePose(...) }
   */
  constructor(analysisData, customEffectors = {}) {
    this.analysis = analysisData;
    const fps = analysisData.info.fps;

    // 1. Create Signal Sources
    this.signals = {
      volume: new ContinuousSignal(analysisData.continuous.volume, fps),
      pitch: new ContinuousSignal(analysisData.continuous.pitch, fps),
      timbre: new ContinuousSignal(analysisData.continuous.timbre, fps),
      beat: new TriggerSignal(analysisData.triggers.beats),
    };

    // 2. Create Available Effectors
    this.effectors = {
      // Standard continuous effectors
      arm_dance: new ArmDancer(),
      body_pump: new BodyPumper(),
      float: new Floater(),
      face: new FaceExpression(),
      lip_sync: new SimpleLipSync(),
      // Standard beat-trigger effectors
      head_bob: new HeadBanger(),
      foot_tap: new FootTapper(),
      // Rate-based (continuous signal → rhythmic frequency)
      foot_tap_rate: new FootTapRate(),
      head_nod_rate: new HeadNodRate(),
      // Pulse-based (beat → one-shot burst for normally-continuous motions)
      arm_dance_pulse: new ArmDancePulse(),
      body_pump_pulse: new BodyPumpPulse(),
      float_pulse: new FloatPulse(),
      face_pulse: new FacePulse(),
      ...customEffectors,
    };

    // 3. Bindings (The "Wiring")
    this.continuousBindings = [];
    this.triggerBindings = [];
  }

  /**
   * Set a binding with automatic effector resolution.
   * The UI can always pass the "concept" effector ID (arm_dance, foot_tap, etc.)
   * and this method will resolve to the correct implementation.
   */
  setBinding(signalName, effectorConcept, intensity = 1.0) {
    const effectorId = resolveEffectorId(effectorConcept, signalName);

    if (signalName === "beat") {
      this.triggerBindings.push([signalName, effectorId, intensity]);
    } else {
      this.continuousBindings.push([signalName, effectorId, intensity]);
    }
  }

  removeBindingByEffector(effectorId) {
    this.continuousBindings = this.continuousBindings.filter(
      ([, e]) => e !== effectorId
    );
    this.triggerBindings = this.triggerBindings.filter(
      ([, e]) => e !== effectorId
    );
  }

  clearBindings() {
    this.continuousBindings = [];
    this.triggerBindings = [];
  }

  update(currentTime, dt, characterRig) {
    // A. Process Continuous Bindings
    // Pass dt as second argument — rate-based effectors use it, others ignore it
    for (const [sigName, effName, intensity] of this.continuousBindings) {
      if (sigName in this.signals && effName in this.effectors) {
        const rawVal = this.signals[sigName].getValue(currentTime);
        this.effectors[effName].update(rawVal * intensity, dt, characterRig);
      }
    }

    // B. Process Trigger Bindings
    // 1. Check trigger
    if (this.signals.beat.check(currentTime)) {
      for (const [sigName, effName, intensity] of this.triggerBindings) {
        if (sigName === "beat" && effName in this.effectors) {
          this.effectors[effName].intensity = intensity;
          this.effectors[effName].trigger();
        }
      }
    }

    // 2. Update Trigger Animations (Decay logic)
    for (const [, effName] of this.triggerBindings) {
      const effector = this.effectors[effName];
      if (effector && typeof effector.update === "function") {
        try {
          effector.update(dt, characterRig);
        } catch (e) {
          // Silently handle type errors
        }
      }
    }
  }
}
