'use client';

/**
 * PoseEditor (Page 2 — Phase B)
 * ==============================
 * 3-keyframe bone editor. Users adjust pose parameters for three
 * intensity levels (x=0 / x=0.5 / x=1.0) via sliders, then
 * preview the interpolated animation with a scrub slider.
 *
 * The resulting keyframes are passed to onSave(keyframes).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { CharacterRig, DEFAULT_SCREEN_X, DEFAULT_SCREEN_Y } from '../character/character_rig.js';
import { DEFAULT_POSE } from '../engine/KeyframePose.js';

const DESIGN_W = 800;
const DESIGN_H = 700;
const CANVAS_W = 320;
const CANVAS_H = 380;

// Frame labels
const FRAME_LABELS = ['Low (x=0)', 'Mid (x=0.5)', 'High (x=1.0)'];
const FRAME_XS = [0, 0.5, 1.0];

// Eye direction options
const EYE_VARIANTS = [
  { value: '1_center',    label: 'Center' },
  { value: '1_left',      label: 'Left' },
  { value: '1_right',     label: 'Right' },
  { value: '1_up',        label: 'Up' },
  { value: '1_down',      label: 'Down' },
  { value: '1_leftup',    label: 'Upper-Left' },
  { value: '1_rightup',   label: 'Upper-Right' },
  { value: '1_leftdown',  label: 'Lower-Left' },
  { value: '1_rightdown', label: 'Lower-Right' },
];

function makeDefaultFrame(x) {
  return { ...DEFAULT_POSE, x };
}

function lerp(a, b, t) { return a + (b - a) * t; }

function nearestFrame(frames, value) {
  const kfs = [...frames].sort((a, b) => a.x - b.x);
  let best = kfs[0];
  let bestDist = Math.abs(value - kfs[0].x);
  for (const k of kfs) {
    const d = Math.abs(value - k.x);
    if (d < bestDist) { bestDist = d; best = k; }
  }
  return best;
}

function interpolatePose(frames, value) {
  const kfs = [...frames].sort((a, b) => a.x - b.x);
  if (value <= kfs[0].x) return { ...kfs[0] };
  if (value >= kfs[kfs.length - 1].x) return { ...kfs[kfs.length - 1] };
  for (let i = 0; i < kfs.length - 1; i++) {
    if (value >= kfs[i].x && value <= kfs[i + 1].x) {
      const t = (value - kfs[i].x) / (kfs[i + 1].x - kfs[i].x);
      return {
        shoulderAngle_L: lerp(kfs[i].shoulderAngle_L, kfs[i + 1].shoulderAngle_L, t),
        elbowAngle_L:    lerp(kfs[i].elbowAngle_L,    kfs[i + 1].elbowAngle_L,    t),
        shoulderAngle_R: lerp(kfs[i].shoulderAngle_R, kfs[i + 1].shoulderAngle_R, t),
        elbowAngle_R:    lerp(kfs[i].elbowAngle_R,    kfs[i + 1].elbowAngle_R,    t),
        bodyScale:       lerp(kfs[i].bodyScale,        kfs[i + 1].bodyScale,        t),
        headOffsetY:     lerp(kfs[i].headOffsetY,      kfs[i + 1].headOffsetY,      t),
        eyebrowOffsetY:  lerp(kfs[i].eyebrowOffsetY ?? 0, kfs[i + 1].eyebrowOffsetY ?? 0, t),
        mouthScale:      lerp(kfs[i].mouthScale ?? 1,     kfs[i + 1].mouthScale ?? 1,     t),
        handScale:       lerp(kfs[i].handScale ?? 1,      kfs[i + 1].handScale ?? 1,      t),
        feetScale:       lerp(kfs[i].feetScale ?? 1,      kfs[i + 1].feetScale ?? 1,      t),
        // eyeVariant is an enum — use nearest frame value
        eyeVariant:      nearestFrame(frames, value).eyeVariant ?? '1_center',
      };
    }
  }
  return { ...kfs[0] };
}

// ─── Preview canvas ─────────────────────────────────────────────────────────

function PosePreviewCanvas({ poseValues, width, height }) {
  const canvasRef = useRef(null);
  const rigRef = useRef(null);
  const readyRef = useRef(false);
  const poseRef = useRef(poseValues);
  const rafRef = useRef(null);

  // Keep pose ref synced every render
  poseRef.current = poseValues;

  // Initialize rig once
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

  // Render loop — applies poseRef.current every frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    const offX = (width / scale - DESIGN_W) / 2;
    const offY = (height / scale - DESIGN_H) / 2;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      if (!readyRef.current || !rigRef.current) return;

      const rig = rigRef.current;
      const p = poseRef.current;

      // Apply pose
      rig.setArmJointRotation('left',  p.shoulderAngle_L, p.elbowAngle_L);
      rig.setArmJointRotation('right', p.shoulderAngle_R, p.elbowAngle_R);
      rig.setBodyScale(p.bodyScale);
      rig.setHeadPositionOffset(0, p.headOffsetY);
      rig.setEyebrowHeight(p.eyebrowOffsetY ?? 0);
      rig.setEyeVariant(p.eyeVariant ?? '1_center');
      rig.setFaceScale(p.mouthScale ?? 1);
      rig.getBone('Hand_L')?.setScale(p.handScale ?? 1);
      rig.getBone('Hand_R')?.setScale(p.handScale ?? 1);
      rig.getBone('Feet')?.setScale(p.feetScale ?? 1, p.feetScale ?? 1);
      rig.update();  // handles blinking

      // Draw
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
      style={{ borderRadius: 12, background: '#fafaf9', display: 'block' }}
    />
  );
}

// ─── Slider row ──────────────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step = 1, onChange, unit = '°' }) {
  return (
    <div style={slStyle.row}>
      <div style={slStyle.labelRow}>
        <span style={slStyle.label}>{label}</span>
        <span style={slStyle.value}>{value > 0 && unit !== '%' ? '+' : ''}{Math.round(value)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={slStyle.slider}
      />
    </div>
  );
}

const eyeSelectStyle = {
  width: '100%', padding: '6px 10px', fontSize: 13,
  border: '1.5px solid #e7e5e4', borderRadius: 8,
  background: '#fafaf9', color: '#1c1917', cursor: 'pointer',
  accentColor: '#f59e0b',
};

const slStyle = {
  row: { marginBottom: 14 },
  labelRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#78716c' },
  value: { fontSize: 12, fontWeight: 700, color: '#1c1917', fontVariantNumeric: 'tabular-nums' },
  slider: { width: '100%', accentColor: '#f59e0b', height: 4 },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function PoseEditor({ intention, onSave, onBack }) {
  const [frames, setFrames] = useState([
    makeDefaultFrame(0),
    makeDefaultFrame(0.5),
    makeDefaultFrame(1.0),
  ]);
  const [activeFrame, setActiveFrame] = useState(0);
  const [previewValue, setPreviewValue] = useState(null); // null = show activeFrame

  const currentPose = previewValue !== null
    ? interpolatePose(frames, previewValue)
    : frames[activeFrame];

  const updateFrame = useCallback((field, value) => {
    setFrames(prev => prev.map((f, i) =>
      i === activeFrame ? { ...f, [field]: value } : f
    ));
  }, [activeFrame]);

  const resetFrame = () => {
    setFrames(prev => prev.map((f, i) =>
      i === activeFrame ? makeDefaultFrame(FRAME_XS[i]) : f
    ));
  };

  const copyFromPrev = () => {
    if (activeFrame === 0) return;
    const prev = frames[activeFrame - 1];
    setFrames(arr => arr.map((f, i) =>
      i === activeFrame ? { ...prev, x: FRAME_XS[i] } : f
    ));
  };

  const handleSave = () => {
    onSave(frames.map(f => ({ ...f })));
  };

  const af = frames[activeFrame];

  return (
    <div style={styles.wrap}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div>
          <h2 style={styles.title}>Design Keyframe Poses</h2>
          {intention && (
            <p style={styles.intentionLabel}>"{intention.text}"</p>
          )}
        </div>
      </div>

      <div style={styles.editorLayout}>
        {/* Left: Canvas + preview scrub */}
        <div style={styles.leftCol}>
          {/* Frame tabs */}
          <div style={styles.frameTabs}>
            {FRAME_LABELS.map((label, i) => (
              <button
                key={i}
                style={{
                  ...styles.frameTab,
                  ...(activeFrame === i && previewValue === null ? styles.frameTabActive : {}),
                }}
                onClick={() => { setActiveFrame(i); setPreviewValue(null); }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Character preview */}
          <PosePreviewCanvas
            poseValues={currentPose}
            width={CANVAS_W}
            height={CANVAS_H}
          />

          {/* Interpolation preview */}
          <div style={styles.previewSection}>
            <div style={styles.previewLabel}>
              Preview animation
              {previewValue !== null && (
                <span style={styles.previewVal}> · intensity {Math.round(previewValue * 100)}%</span>
              )}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={previewValue !== null ? Math.round(previewValue * 100) : Math.round(FRAME_XS[activeFrame] * 100)}
              onChange={e => setPreviewValue(Number(e.target.value) / 100)}
              onMouseUp={() => {}}
              style={{ width: '100%', accentColor: '#f59e0b' }}
            />
            <div style={styles.previewHints}>
              <span>Low</span><span>Mid</span><span>High</span>
            </div>
            {previewValue !== null && (
              <button
                style={styles.exitPreviewBtn}
                onClick={() => setPreviewValue(null)}
              >
                ✕ Exit preview
              </button>
            )}
          </div>
        </div>

        {/* Right: Controls */}
        <div style={styles.rightCol}>
          <div style={styles.controlsHeader}>
            <span style={styles.controlsTitle}>
              Editing: <strong>{FRAME_LABELS[activeFrame]}</strong>
            </span>
            <div style={styles.frameActions}>
              {activeFrame > 0 && (
                <button style={styles.actionBtn} onClick={copyFromPrev}>
                  Copy from previous
                </button>
              )}
              <button style={styles.actionBtn} onClick={resetFrame}>
                Reset frame
              </button>
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Left Arm</div>
            <SliderRow
              label="Shoulder"
              value={af.shoulderAngle_L}
              min={-90}
              max={190}
              onChange={v => updateFrame('shoulderAngle_L', v)}
            />
            <SliderRow
              label="Elbow"
              value={af.elbowAngle_L}
              min={-30}
              max={130}
              onChange={v => updateFrame('elbowAngle_L', v)}
            />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Right Arm</div>
            <SliderRow
              label="Shoulder"
              value={af.shoulderAngle_R}
              min={-190}
              max={90}
              onChange={v => updateFrame('shoulderAngle_R', v)}
            />
            <SliderRow
              label="Elbow"
              value={af.elbowAngle_R}
              min={-130}
              max={30}
              onChange={v => updateFrame('elbowAngle_R', v)}
            />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Body</div>
            <SliderRow
              label="Body Scale"
              value={Math.round(af.bodyScale * 100)}
              min={70}
              max={180}
              step={1}
              unit="%"
              onChange={v => updateFrame('bodyScale', v / 100)}
            />
            <SliderRow
              label="Head Height"
              value={af.headOffsetY}
              min={-60}
              max={60}
              onChange={v => updateFrame('headOffsetY', v)}
            />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Face &amp; Extremities</div>

            {/* Eye direction */}
            <div style={slStyle.row}>
              <div style={slStyle.labelRow}>
                <span style={slStyle.label}>Eye Direction</span>
                <span style={slStyle.value}>{EYE_VARIANTS.find(v => v.value === af.eyeVariant)?.label ?? 'Center'}</span>
              </div>
              <select
                value={af.eyeVariant ?? '1_center'}
                onChange={e => updateFrame('eyeVariant', e.target.value)}
                style={eyeSelectStyle}
              >
                {EYE_VARIANTS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <SliderRow
              label="Eyebrow Height"
              value={af.eyebrowOffsetY ?? 0}
              min={-40}
              max={40}
              onChange={v => updateFrame('eyebrowOffsetY', v)}
            />
            <SliderRow
              label="Mouth Size"
              value={Math.round((af.mouthScale ?? 1) * 100)}
              min={50}
              max={200}
              step={1}
              unit="%"
              onChange={v => updateFrame('mouthScale', v / 100)}
            />
            <SliderRow
              label="Hand Size"
              value={Math.round((af.handScale ?? 1) * 100)}
              min={30}
              max={200}
              step={1}
              unit="%"
              onChange={v => updateFrame('handScale', v / 100)}
            />
            <SliderRow
              label="Feet Size"
              value={Math.round((af.feetScale ?? 1) * 100)}
              min={30}
              max={200}
              step={1}
              unit="%"
              onChange={v => updateFrame('feetScale', v / 100)}
            />
          </div>

          <button style={styles.saveBtn} onClick={handleSave}>
            Save My Design →
          </button>
          <p style={styles.saveHint}>
            This will be available as "My Custom Design" in Step 3.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { paddingTop: 40 },
  header: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 32 },
  backBtn: {
    marginTop: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600,
    background: '#fff', border: '1.5px solid #e7e5e4',
    borderRadius: 8, cursor: 'pointer', flexShrink: 0, color: '#78716c',
  },
  title: { fontSize: 26, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' },
  intentionLabel: { fontSize: 14, color: '#78716c', margin: 0, fontStyle: 'italic' },

  editorLayout: { display: 'flex', gap: 32, alignItems: 'flex-start' },

  leftCol: { width: CANVAS_W, flexShrink: 0 },
  frameTabs: { display: 'flex', gap: 8, marginBottom: 12 },
  frameTab: {
    flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 700,
    background: '#fff', border: '2px solid #e7e5e4', borderRadius: 8,
    cursor: 'pointer', color: '#a8a29e', transition: 'all 0.15s',
  },
  frameTabActive: { borderColor: '#f59e0b', color: '#f59e0b', background: '#fffbeb' },

  previewSection: { marginTop: 16 },
  previewLabel: { fontSize: 12, fontWeight: 600, color: '#78716c', marginBottom: 6 },
  previewVal: { color: '#f59e0b' },
  previewHints: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a8a29e', marginTop: 2 },
  exitPreviewBtn: {
    marginTop: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600,
    background: '#fff', border: '1px solid #e7e5e4', borderRadius: 6,
    cursor: 'pointer', color: '#78716c',
  },

  rightCol: { flex: 1, minWidth: 0 },
  controlsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  controlsTitle: { fontSize: 14, color: '#78716c' },
  frameActions: { display: 'flex', gap: 8 },
  actionBtn: {
    padding: '6px 12px', fontSize: 11, fontWeight: 600,
    background: '#fff', border: '1px solid #e7e5e4',
    borderRadius: 8, cursor: 'pointer', color: '#78716c',
  },

  section: {
    marginBottom: 24, paddingBottom: 20,
    borderBottom: '1px solid #f5f5f4',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: '#a8a29e', marginBottom: 14,
  },

  saveBtn: {
    width: '100%', padding: '14px 24px',
    fontSize: 16, fontWeight: 700,
    background: '#1c1917', color: '#fff',
    border: 'none', borderRadius: 12, cursor: 'pointer',
    marginTop: 8, transition: 'opacity 0.15s',
  },
  saveHint: { fontSize: 12, color: '#a8a29e', textAlign: 'center', marginTop: 8 },
};
