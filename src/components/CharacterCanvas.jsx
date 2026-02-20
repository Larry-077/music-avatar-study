'use client';

/**
 * CharacterCanvas
 * ===============
 * Canvas component that renders a CharacterRig with optional effector preview.
 */

import { useRef, useEffect } from "react";
import { CharacterRig, DEFAULT_SCREEN_X, DEFAULT_SCREEN_Y } from "../character/character_rig.js";
import { BindingEngine } from "../engine/binder.js";

/**
 * Renders a single character with optional effector + music signal preview.
 *
 * Props:
 *  - width, height: canvas size
 *  - analysisData: loaded JSON (for signal-driven preview)
 *  - effectorId: single effector to preview (for Gesture Gallery cards)
 *  - musicType: which signal drives it ('volume'|'pitch'|'timbre'|'beat')
 *  - intensity: 0-1 (for Mapping Studio slider)
 *  - playing: whether animation is running
 *  - characterRef: optional external CharacterRig ref (for shared instances)
 *  - engineRef: optional external BindingEngine ref
 *  - externalTime: if provided, use this time instead of internal clock
 */
export default function CharacterCanvas({
  width = 300,
  height = 400,
  analysisData = null,
  effectorId = null,
  musicType = null,
  intensity = 0.7,
  playing = true,
  externalTime = null,
  characterRef: externalCharRef = null,
  engineRef: externalEngineRef = null,
  customArmPath = null,
}) {
  const canvasRef = useRef(null);
  const internalCharRef = useRef(null);
  const internalEngineRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const readyRef = useRef(false);

  // Initialize character rig (async, runs once)
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (externalCharRef) {
        internalCharRef.current = externalCharRef;
      } else {
        const rig = new CharacterRig();
        await rig.init();
        if (cancelled) return;
        rig.setScreenPosition(DEFAULT_SCREEN_X, DEFAULT_SCREEN_Y);
        internalCharRef.current = rig;
      }
      readyRef.current = true;
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Rebuild engine bindings when effector/musicType/intensity change
  useEffect(() => {
    if (externalEngineRef) {
      internalEngineRef.current = externalEngineRef;
      return;
    }
    if (!analysisData || !effectorId) return;

    // Reset character to default pose before applying new effector
    if (internalCharRef.current) {
      internalCharRef.current.resetToDefault();
    }

    const engine = new BindingEngine(analysisData);
    engine.clearBindings();

    if (musicType) {
      engine.setBinding(musicType, effectorId, intensity);
    } else {
      const eff = engine.effectors[effectorId];
      if (eff && typeof eff.trigger === "function") {
        engine.setBinding("beat", effectorId, intensity);
      } else {
        engine.setBinding("pitch", effectorId, intensity);
      }
    }

    // Set custom arm path if this effector uses it
    if (effectorId === "custom_arm" && engine.effectors.custom_arm && customArmPath) {
      engine.effectors.custom_arm.setPath(customArmPath);
    }

    internalEngineRef.current = engine;
  }, [analysisData, effectorId, musicType, intensity, customArmPath]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let lastTime = performance.now();

    const animate = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!readyRef.current) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      if (playing) timeRef.current += dt;

      const character = internalCharRef.current;
      const engine = internalEngineRef.current;

      const t = externalTime !== null ? externalTime : timeRef.current;

      // Update engine if available
      if (engine && character) {
        engine.update(t, dt, character);
      }

      // Update character animations (blink etc.)
      if (character) {
        character.update();
      }

      // Clear and draw
      ctx.clearRect(0, 0, width, height);

      if (character) {
        if (!externalCharRef) {
          const DESIGN_W = 800;
          const DESIGN_H = 700;
          const scale = Math.min(width / DESIGN_W, height / DESIGN_H);

          ctx.save();
          ctx.scale(scale, scale);
          const offsetX = (width / scale - DESIGN_W) / 2;
          const offsetY = (height / scale - DESIGN_H) / 2;
          ctx.translate(offsetX, offsetY);
          character.draw(ctx);
          ctx.restore();
        } else {
          character.draw(ctx);
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [width, height, playing, externalTime, externalCharRef]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ borderRadius: 12 }}
    />
  );
}
