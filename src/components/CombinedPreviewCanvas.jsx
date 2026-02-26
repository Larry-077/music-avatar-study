'use client';

/**
 * CombinedPreviewCanvas
 * =====================
 * Renders a single large CharacterCanvas driven simultaneously by
 * all confirmed music→movement mappings.
 *
 * Each signal is read from its own analysis JSON; they are merged into
 * a single analysis object consumed by one BindingEngine instance.
 *
 * Props:
 *  confirmedMappings – object { volume, pitch, timbre, beat } where each
 *    value is either null (not confirmed) or { effector, intensity }
 *  customKeyframePose – keyframes array for the 'custom_pose' effector
 *  externalTime – audio playback cursor in seconds (from parent)
 *  playing      – whether audio is playing
 *  width, height – canvas dimensions
 */

import { useRef, useEffect } from 'react';
import { CharacterRig, DEFAULT_SCREEN_X, DEFAULT_SCREEN_Y } from '../character/character_rig.js';
import { BindingEngine } from '../engine/binder.js';
import { KeyframePose } from '../engine/KeyframePose.js';

const ANALYSIS_URLS = {
  volume: '/assets/analysis/volume.json',
  pitch:  '/assets/analysis/pitch.json',
  timbre: '/assets/analysis/timbre.json',
  beat:   '/assets/analysis/beat.json',
};

const DESIGN_W = 800;
const DESIGN_H = 700;

export default function CombinedPreviewCanvas({
  confirmedMappings = {},
  customKeyframePose = null,
  externalTime = 0,
  playing = false,
  width = 480,
  height = 560,
}) {
  const canvasRef  = useRef(null);
  const rigRef     = useRef(null);
  const engineRef  = useRef(null);
  const readyRef   = useRef(false);
  const timeRef    = useRef(externalTime);
  const rafRef     = useRef(null);

  // Keep externalTime ref current
  timeRef.current = externalTime;

  // 1. Init CharacterRig once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rig = new CharacterRig();
      await rig.init();
      if (cancelled) return;
      rig.setScreenPosition(DEFAULT_SCREEN_X, DEFAULT_SCREEN_Y);
      rigRef.current = rig;
      readyRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // 2. Rebuild BindingEngine whenever confirmed mappings change
  useEffect(() => {
    const activeMappings = Object.entries(confirmedMappings).filter(
      ([, m]) => m && m.effector
    );
    if (activeMappings.length === 0) { engineRef.current = null; return; }

    // Load all needed analysis files, merge into one object
    const signals = ['volume', 'pitch', 'timbre', 'beat'];
    Promise.all(
      signals.map(s => fetch(ANALYSIS_URLS[s]).then(r => r.json()).catch(() => null))
    ).then(([vol, pit, tim, beat]) => {
      const mergedAnalysis = {
        info: vol?.info ?? { fps: 30 },
        continuous: {
          volume: vol?.continuous?.volume ?? [],
          pitch:  pit?.continuous?.pitch  ?? [],
          timbre: tim?.continuous?.timbre ?? [],
        },
        triggers: {
          beats: beat?.triggers?.beats ?? [],
        },
      };

      const customEffectors = {};
      if (customKeyframePose) {
        customEffectors.custom_pose = new KeyframePose(customKeyframePose);
      }

      const engine = new BindingEngine(mergedAnalysis, customEffectors);
      engine.clearBindings();

      for (const [signal, m] of activeMappings) {
        engine.setBinding(signal, m.effector, m.intensity);
      }

      engineRef.current = engine;
    });
  }, [confirmedMappings, customKeyframePose]);

  // 3. rAF draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    const offX  = (width  / scale - DESIGN_W) / 2;
    const offY  = (height / scale - DESIGN_H) / 2 + 70; // nudge character toward vertical center
    let lastTime = performance.now();

    const animate = (now) => {
      rafRef.current = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!readyRef.current || !rigRef.current) return;

      const rig    = rigRef.current;
      const engine = engineRef.current;
      const t      = timeRef.current;

      if (engine) {
        engine.update(t, dt, rig);
      }
      rig.update();

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(offX, offY);
      rig.draw(ctx);
      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ borderRadius: 16, background: '#fafaf9', display: 'block' }}
    />
  );
}
