/**
 * Binder / Engine Core
 * ====================
 * Manages the mapping between Signals and Effectors.
 *
 * All 6 effectors work with any signal type via continuous binding:
 *  - volume/pitch/timbre → continuous value drives movement amplitude
 *  - beat → BeatFrequencySignal converts beat timestamps to 0-1 frequency value;
 *    faster beats = higher arms / bigger body / higher levitate / stronger expression
 *  - foot_tap/head_bob always use rate-based effectors (frequency proportional to signal)
 */

import { ContinuousSignal, TriggerSignal } from "./signals.js";
import {
  ArmDancer,
  BodyPumper,
  Floater,
  FaceExpression,
  SimpleLipSync,
  FootTapRate,
  HeadNodRate,
} from "./effectors.js";

/**
 * Resolve a UI "concept" effector ID to its actual implementation ID.
 *
 * All signals (including beat) now use the same continuous effectors.
 * Beat uses a BeatFrequencySignal so its frequency drives movement amplitude.
 *
 * - foot_tap → foot_tap_rate (frequency-based, works for all signals)
 * - head_bob → head_nod_rate (frequency-based, works for all signals)
 * - everything else stays the same
 */
export function resolveEffectorId(conceptId, signalName) {
  if (conceptId === "foot_tap") return "foot_tap_rate";
  if (conceptId === "head_bob") return "head_nod_rate";
  return conceptId;
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
      // Pre-computed smooth beat-frequency signal (stored in JSON by analyzer).
      // Falls back to a flat 0.5 if the field is absent from older JSON files.
      beat_freq: new ContinuousSignal(
        analysisData.continuous.beat_freq ?? [],
        fps
      ),
    };

    // 2. Create Available Effectors
    this.effectors = {
      // Standard continuous effectors (used by volume/pitch/timbre AND beat_freq)
      arm_dance: new ArmDancer(),
      body_pump: new BodyPumper(),
      float: new Floater(),
      face: new FaceExpression(),
      lip_sync: new SimpleLipSync(),
      // Rate-based (continuous signal → rhythmic frequency; also used for beat_freq)
      foot_tap_rate: new FootTapRate(),
      head_nod_rate: new HeadNodRate(),
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
    // Beat uses beat_freq (frequency-based continuous signal) instead of trigger pulses
    const actualSignal = signalName === "beat" ? "beat_freq" : signalName;
    this.continuousBindings.push([actualSignal, effectorId, intensity]);
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
    // Process all bindings as continuous — beat uses beat_freq signal
    // Pass dt as second argument — rate-based effectors use it, others ignore it
    for (const [sigName, effName, intensity] of this.continuousBindings) {
      if (sigName in this.signals && effName in this.effectors) {
        const rawVal = this.signals[sigName].getValue(currentTime);
        this.effectors[effName].update(rawVal * intensity, dt, characterRig);
      }
    }
  }
}
