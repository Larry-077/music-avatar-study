/**
 * Binder / Engine Core
 * ====================
 * Manages the mapping between Signals and Effectors.
 *
 * Ported from: src/engine/binder.py
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
} from "./effectors.js";

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

    // 2. Create Available Effectors (builtins + any custom ones passed in)
    this.effectors = {
      arm_dance: new ArmDancer(),
      body_pump: new BodyPumper(),
      float: new Floater(),
      face: new FaceExpression(),
      head_bob: new HeadBanger(),
      foot_tap: new FootTapper(),
      lip_sync: new SimpleLipSync(),
      ...customEffectors,
    };

    // 3. Bindings (The "Wiring")
    this.continuousBindings = [];
    this.triggerBindings = [];
  }

  setBinding(signalName, effectorName, intensity = 1.0) {
    if (signalName === "beat") {
      this.triggerBindings.push([signalName, effectorName, intensity]);
    } else {
      this.continuousBindings.push([signalName, effectorName, intensity]);
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
    for (const [sigName, effName, intensity] of this.continuousBindings) {
      if (sigName in this.signals && effName in this.effectors) {
        const rawVal = this.signals[sigName].getValue(currentTime);
        this.effectors[effName].update(rawVal * intensity, characterRig);
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
          // Silently handle type errors (continuous vs trigger signature)
        }
      }
    }
  }
}
