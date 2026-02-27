'use client';

/**
 * Sketchpad (Page 2 – Phase B)
 * =============================
 * Replaces PoseEditor. User draws freely on top of the character
 * to communicate intended movement. Data-collection only — no animation editing.
 *
 * Features:
 *  - Static character canvas as visual reference background
 *  - Transparent freehand drawing canvas overlaid on top
 *  - Color palette mapped to the 4 music elements + black
 *  - Eraser tool
 *  - Clear button
 *  - Music selector (test / test2 / test3) with play/pause
 *  - Save: exports drawing as base64 PNG
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import CharacterCanvas from './CharacterCanvas';

const MUSIC_OPTIONS = [
  { id: 'test',  label: 'Music A', url: '/assets/audio/test.wav' },
  { id: 'test2', label: 'Music B', url: '/assets/audio/test2.wav' },
  { id: 'test3', label: 'Music C', url: '/assets/audio/test3.wav' },
];

const COLOR_OPTIONS = [
  { color: '#1c1917', label: 'General',  title: 'General movement' },
  { color: '#f59e0b', label: 'Volume',   title: 'Volume — loud / quiet' },
  { color: '#10b981', label: 'Pitch',    title: 'Pitch — high / low notes' },
  { color: '#8b5cf6', label: 'Timbre',   title: 'Timbre — bright / warm' },
  { color: '#ef4444', label: 'Beat',     title: 'Beat — rhythmic pulse' },
];

const CANVAS_W = 400;
const CANVAS_H = 480;

export default function Sketchpad({ intention, onSave, onBack }) {
  const drawCanvasRef = useRef(null);
  const audioRef      = useRef(null);
  const isDrawingRef  = useRef(false);
  const lastPosRef    = useRef({ x: 0, y: 0 });

  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].color);
  const [isEraser,      setIsEraser]      = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_OPTIONS[0]);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [hasStrokes,    setHasStrokes]    = useState(false);

  // Stop audio when music selection changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, [selectedMusic]);

  // ── Drawing helpers ──────────────────────────────────────────

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    isDrawingRef.current = true;
    lastPosRef.current = pos;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, []);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 24;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 3;
      ctx.strokeStyle = selectedColor;
    }
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
    setHasStrokes(true);
  }, [isEraser, selectedColor]);

  const stopDraw = useCallback((e) => {
    e?.preventDefault();
    isDrawingRef.current = false;
  }, []);

  const handleClear = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  // ── Audio ────────────────────────────────────────────────────

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // ── Save ─────────────────────────────────────────────────────

  const handleSave = () => {
    const sketch = drawCanvasRef.current?.toDataURL('image/png') ?? null;
    onSave({ sketch, selectedMusic: selectedMusic.id });
  };

  // ── Render ───────────────────────────────────────────────────

  const activeColorOption = COLOR_OPTIONS.find(c => c.color === selectedColor);

  return (
    <div style={styles.page}>
      <audio
        ref={audioRef}
        src={selectedMusic.url}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={styles.headerCenter}>
          <h2 style={styles.title}>Sketch Your Movement Idea</h2>
          {intention && (
            <div style={styles.intentionTag}>
              <span style={styles.intentionDot}>●</span>
              {intention.text}
            </div>
          )}
        </div>
        <button style={styles.saveBtn} onClick={handleSave}>
          Save &amp; Continue →
        </button>
      </div>

      <p style={styles.hint}>
        Draw arrows, stick figures, or any marks on the character to show how you imagine it moving.
        Use colors to indicate which music element drives each movement.
      </p>

      <div style={styles.workspace}>
        {/* Left: tools + music */}
        <div style={styles.sidebar}>

          {/* Color palette */}
          <div style={styles.toolSection}>
            <label style={styles.toolLabel}>Draw Color</label>
            <div style={styles.colorPalette}>
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.color}
                  title={opt.title}
                  onClick={() => { setSelectedColor(opt.color); setIsEraser(false); }}
                  style={{
                    ...styles.colorSwatch,
                    background: opt.color,
                    outline: !isEraser && selectedColor === opt.color
                      ? `3px solid ${opt.color}`
                      : '3px solid transparent',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            {!isEraser && (
              <div style={styles.activeColorLabel}>
                <span style={{ ...styles.activeColorDot, background: selectedColor }} />
                {activeColorOption?.label}
              </div>
            )}
          </div>

          {/* Tool buttons */}
          <div style={styles.toolSection}>
            <label style={styles.toolLabel}>Tool</label>
            <div style={styles.toolBtns}>
              <button
                style={{
                  ...styles.toolBtn,
                  ...(isEraser ? {} : styles.toolBtnActive),
                  borderColor: isEraser ? '#e5e7eb' : selectedColor,
                  color: isEraser ? '#374151' : selectedColor,
                }}
                onClick={() => setIsEraser(false)}
              >
                ✏️ Pen
              </button>
              <button
                style={{
                  ...styles.toolBtn,
                  ...(isEraser ? styles.toolBtnActive : {}),
                }}
                onClick={() => setIsEraser(true)}
              >
                ◻ Eraser
              </button>
            </div>
            <button style={styles.clearBtn} onClick={handleClear}>
              Clear All
            </button>
          </div>

          {/* Music player */}
          <div style={styles.toolSection}>
            <label style={styles.toolLabel}>Listen While Drawing</label>
            <div style={styles.musicTabs}>
              {MUSIC_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  style={{
                    ...styles.musicTab,
                    ...(selectedMusic.id === opt.id ? styles.musicTabActive : {}),
                  }}
                  onClick={() => setSelectedMusic(opt)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button style={styles.playBtn} onClick={handlePlayPause}>
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
          </div>

          {/* Color legend */}
          <div style={styles.toolSection}>
            <label style={styles.toolLabel}>Color Key</label>
            {COLOR_OPTIONS.map(opt => (
              <div key={opt.color} style={styles.legendRow}>
                <span style={{ ...styles.legendDot, background: opt.color }} />
                <span style={styles.legendText}>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: canvas stack */}
        <div style={styles.canvasWrap}>
          {/* Character background */}
          <CharacterCanvas
            width={CANVAS_W}
            height={CANVAS_H}
            effectorId={null}
            playing={false}
          />
          {/* Drawing overlay */}
          <canvas
            ref={drawCanvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={styles.drawCanvas}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {!hasStrokes && (
            <div style={styles.placeholder}>
              Draw here →
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { paddingTop: 32, paddingBottom: 64 },

  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 12, gap: 16,
  },
  headerCenter: { flex: 1 },
  title: { fontSize: 24, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' },
  intentionTag: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 13, fontWeight: 600, color: '#78716c',
    background: '#f3f4f6', padding: '4px 12px', borderRadius: 20,
  },
  intentionDot: { color: '#f59e0b', fontSize: 10 },

  backBtn: {
    padding: '8px 16px', fontSize: 13, fontWeight: 600,
    background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer',
    color: '#374151', whiteSpace: 'nowrap',
  },
  saveBtn: {
    padding: '10px 20px', fontSize: 14, fontWeight: 700,
    background: '#1c1917', color: '#fff', border: 'none',
    borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap',
  },

  hint: {
    fontSize: 13, color: '#78716c', margin: '0 0 24px',
    maxWidth: 700, lineHeight: 1.6,
  },

  workspace: { display: 'flex', gap: 28, alignItems: 'flex-start' },

  sidebar: {
    width: 180, flexShrink: 0,
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  toolSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  toolLabel: {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: '#a8a29e',
  },

  colorPalette: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  colorSwatch: {
    width: 28, height: 28, borderRadius: '50%', border: 'none',
    cursor: 'pointer', transition: 'outline 0.1s',
  },
  activeColorLabel: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: '#44403c', fontWeight: 600,
  },
  activeColorDot: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' },

  toolBtns: { display: 'flex', gap: 8 },
  toolBtn: {
    flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
    background: '#f3f4f6', border: '2px solid #e5e7eb',
    borderRadius: 8, cursor: 'pointer', color: '#374151',
  },
  toolBtnActive: { background: '#fff' },

  clearBtn: {
    padding: '6px 0', fontSize: 12, fontWeight: 600,
    background: 'transparent', border: '1.5px solid #e5e7eb',
    borderRadius: 8, cursor: 'pointer', color: '#78716c',
  },

  musicTabs: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  musicTab: {
    padding: '5px 10px', fontSize: 12, fontWeight: 600,
    background: '#f3f4f6', border: '2px solid #e5e7eb',
    borderRadius: 8, cursor: 'pointer', color: '#374151',
  },
  musicTabActive: {
    background: '#1c1917', color: '#fff', borderColor: '#1c1917',
  },
  playBtn: {
    padding: '8px 0', fontSize: 13, fontWeight: 700,
    background: '#f59e0b', color: '#fff', border: 'none',
    borderRadius: 8, cursor: 'pointer',
  },

  legendRow: { display: 'flex', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendText: { fontSize: 12, color: '#44403c' },

  canvasWrap: {
    position: 'relative', display: 'inline-block',
    borderRadius: 16, overflow: 'hidden',
    border: '2px solid #e7e5e4',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  drawCanvas: {
    position: 'absolute', top: 0, left: 0,
    cursor: 'crosshair', touchAction: 'none',
    borderRadius: 16,
  },
  placeholder: {
    position: 'absolute', top: '50%', left: '55%',
    transform: 'translate(-50%, -50%)',
    fontSize: 16, fontWeight: 700, color: '#d6d3d1',
    pointerEvents: 'none', userSelect: 'none',
  },
};
