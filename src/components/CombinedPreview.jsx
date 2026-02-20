'use client';

/**
 * CombinedPreview
 * ===============
 * Shows all active mappings working together with a single character.
 */

import { useRef, useEffect } from "react";
import { CharacterRig, DEFAULT_SCREEN_X, DEFAULT_SCREEN_Y } from "../character/character_rig.js";
import { BindingEngine } from "../engine/binder.js";

export default function CombinedPreview({
  mappings,
  analysisData,
  width = 320,
  height = 380,
  musicTime = 0,
  isPlaying = true,
  customArmPath = null,
}) {
  const canvasRef = useRef(null);
  const charRef = useRef(null);
  const engineRef = useRef(null);
  const animRef = useRef(null);
  const musicTimeRef = useRef(0);
  const readyRef = useRef(false);

  // Keep musicTime in a ref so animation loop always reads latest value
  musicTimeRef.current = musicTime;

  // Initialize character and engine
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const rig = new CharacterRig();
      await rig.init();
      if (cancelled) return;
      rig.setScreenPosition(DEFAULT_SCREEN_X, DEFAULT_SCREEN_Y);
      charRef.current = rig;
      readyRef.current = true;
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Rebuild engine bindings when mappings change
  useEffect(() => {
    if (!analysisData) return;

    // Reset character to default pose before applying new mappings
    if (charRef.current) {
      charRef.current.resetToDefault();
    }

    const engine = new BindingEngine(analysisData);
    engine.clearBindings();

    for (const [elemId, mapping] of Object.entries(mappings)) {
      if (mapping.effector) {
        engine.setBinding(elemId, mapping.effector, mapping.intensity);
      }
    }

    // Set custom arm path if any mapping uses custom_arm
    if (engine.effectors.custom_arm && customArmPath && customArmPath.length > 0) {
      engine.effectors.custom_arm.setPath(customArmPath);
    }

    engineRef.current = engine;
  }, [mappings, analysisData, customArmPath]);

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

      const character = charRef.current;
      const engine = engineRef.current;
      const t = musicTimeRef.current;

      if (engine && character) {
        engine.update(t, dt, character);
      }
      if (character) {
        character.update();
      }

      ctx.clearRect(0, 0, width, height);
      if (character) {
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
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [mappings, width, height, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ borderRadius: 16 }}
    />
  );
}
