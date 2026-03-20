'use client';

/**
 * Sketchpad (Page 2)
 * ===================
 * 4-tab sketchpad — one tab per music element (Volume / Pitch / Timbre / Beat).
 * Each tab: draw on character canvas (left) + text description + audio (right).
 * All 4 tabs must be completed (sketch OR description) before saving.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import CharacterCanvas from './CharacterCanvas';

const MUSIC_ELEMENTS = [
  { id: 'volume', name: 'Volume', description: 'Changes in loudness — from quiet to loud',
    url: '/assets/audio/volume.wav', color: '#f59e0b' },
  { id: 'pitch',  name: 'Pitch',  description: 'The rise and fall of musical notes',
    url: '/assets/audio/pitch.wav',  color: '#10b981' },
  { id: 'timbre', name: 'Timbre', description: 'The texture and colour of sound — bright or warm',
    url: '/assets/audio/timbre.wav', color: '#8b5cf6' },
  { id: 'beat',   name: 'Beat',   description: 'The rhythmic pulse that drives the music',
    url: '/assets/audio/beat.wav',   color: '#ef4444' },
];

const COLOR_OPTIONS = [
  { color: '#1c1917', label: 'General' },
  { color: '#f59e0b', label: 'Volume'  },
  { color: '#10b981', label: 'Pitch'   },
  { color: '#8b5cf6', label: 'Timbre'  },
  { color: '#ef4444', label: 'Beat'    },
];

const CANVAS_W = 380;
const CANVAS_H = 460;

export default function Sketchpad({ onSave, onSkip, sessionId }) {
  const drawCanvasRef  = useRef(null);
  const audioRef       = useRef(null);
  const isDrawingRef   = useRef(false);
  const lastPosRef     = useRef({ x: 0, y: 0 });
  // activeTabRef keeps a sync ref so event handlers can read the current tab
  const activeTabRef   = useRef('volume');

  const [activeTab,     setActiveTabState] = useState('volume');
  const [canvasData,    setCanvasData]     = useState({ volume: null, pitch: null, timbre: null, beat: null });
  const [descriptions,  setDescriptions]   = useState({ volume: '', pitch: '', timbre: '', beat: '' });
  const [tabHasStrokes, setTabHasStrokes]  = useState({ volume: false, pitch: false, timbre: false, beat: false });

  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].color);
  const [isEraser,      setIsEraser]      = useState(false);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [showExample,   setShowExample]   = useState(false);
  const [saved,         setSaved]         = useState(false);

  // Keep ref in sync
  const setActiveTab = (tab) => {
    activeTabRef.current = tab;
    setActiveTabState(tab);
  };

  const activeElem = MUSIC_ELEMENTS.find(e => e.id === activeTab);
  const activeIdx  = MUSIC_ELEMENTS.findIndex(e => e.id === activeTab);

  // ── Tab switching — save current canvas, restore next ────────

  // Saves current canvas to canvasData state and returns the imageData
  const saveCurrentCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
  }, []);

  const switchTab = useCallback((newTab) => {
    if (newTab === activeTabRef.current) return;
    // Save current canvas synchronously before state update
    const imgData = saveCurrentCanvas();
    setCanvasData(prev => ({ ...prev, [activeTabRef.current]: imgData }));
    // Stop audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(false);
    setActiveTab(newTab);
  }, [saveCurrentCanvas]);

  // Restore canvas when activeTab changes
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    setCanvasData(prev => {
      if (prev[activeTab]) ctx.putImageData(prev[activeTab], 0, 0);
      return prev; // no change to state, just side-effect
    });
  }, [activeTab]);

  // Update audio src when tab changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.load();
      setIsPlaying(false);
    }
  }, [activeTab]);

  // ── Drawing helpers ──────────────────────────────────────────

  const getPos = (e, canvas) => {
    const rect  = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src   = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    isDrawingRef.current = true;
    lastPosRef.current   = pos;
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
      ctx.lineWidth  = 24;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth  = 3;
      ctx.strokeStyle = selectedColor;
    }
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;

    // Mark this tab as having strokes
    setTabHasStrokes(prev => prev[activeTabRef.current] ? prev : { ...prev, [activeTabRef.current]: true });
  }, [isEraser, selectedColor]);

  const stopDraw = useCallback((e) => {
    e?.preventDefault();
    isDrawingRef.current = false;
  }, []);

  const handleClear = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, CANVAS_W, CANVAS_H);
    setTabHasStrokes(prev => ({ ...prev, [activeTab]: false }));
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

  // ── Completion ───────────────────────────────────────────────

  const isTabComplete = (id) =>
    tabHasStrokes[id] || descriptions[id].trim().length > 0;

  const completeCount = MUSIC_ELEMENTS.filter(e => isTabComplete(e.id)).length;
  const allComplete   = completeCount === 4;

  // ── Save ─────────────────────────────────────────────────────

  const handleSave = () => {
    if (!allComplete) return;
    // Capture current tab's latest canvas
    const currentImgData = saveCurrentCanvas();
    const latestCanvasData = { ...canvasData, [activeTab]: currentImgData };

    // Build designs: convert ImageData → base64 for each tab
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width  = CANVAS_W;
    tmpCanvas.height = CANVAS_H;
    const tmpCtx = tmpCanvas.getContext('2d');

    const designs = {};
    MUSIC_ELEMENTS.forEach(({ id }) => {
      tmpCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      if (latestCanvasData[id]) tmpCtx.putImageData(latestCanvasData[id], 0, 0);
      designs[id] = {
        sketch:      tmpCanvas.toDataURL('image/png'),
        description: descriptions[id],
      };
    });

    onSave({ designs });
    setSaved(true);
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      <audio
        ref={audioRef}
        src={activeElem.url}
        onEnded={() => setIsPlaying(false)}
      />

      {/* ── Page header ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.pageTitle}>Design Your Movement</h2>
          <p style={styles.pageSubtitle}>
            For each musical element, draw how you imagine the character should move, and describe it in words.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button style={styles.exampleBtn} onClick={() => setShowExample(v => !v)}>
            {showExample ? 'Hide Example' : '💡 See Example'}
          </button>
          <button style={styles.skipBtn} onClick={onSkip}>
            Skip →
          </button>
        </div>
      </div>

      {/* ── Example panel ────────────────────────────── */}
      {showExample && (
        <div style={styles.examplePanel}>
          <p style={styles.exampleLabel}>
            Example — draw movement arrows and annotations on top of the character:
          </p>
          <img
            src="/assets/eg.jpg"
            alt="Example sketch"
            style={styles.exampleImg}
          />
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────── */}
      <div style={styles.tabs}>
        {MUSIC_ELEMENTS.map((elem, i) => {
          const done   = isTabComplete(elem.id);
          const active = activeTab === elem.id;
          return (
            <button
              key={elem.id}
              style={{
                ...styles.tab,
                borderBottomColor:  active ? elem.color : 'transparent',
                color:              active ? elem.color : '#78716c',
                fontWeight:         active ? 700 : 500,
              }}
              onClick={() => switchTab(elem.id)}
            >
              <span style={{
                ...styles.tabDot,
                background: done ? elem.color : (active ? elem.color + '44' : '#e5e7eb'),
                border:     `2px solid ${done || active ? elem.color : '#d6d3d1'}`,
              }} />
              {elem.name}
              {done && <span style={styles.tabCheck}>✓</span>}
            </button>
          );
        })}
        <div style={styles.tabProgress}>
          {completeCount} / 4 done
        </div>
      </div>

      {/* ── Main workspace ───────────────────────────── */}
      <div style={styles.workspace}>

        {/* LEFT: canvas + tools */}
        <div style={styles.leftPanel}>
          {/* Canvas stack */}
          <div style={styles.canvasWrap}>
            <CharacterCanvas
              width={CANVAS_W}
              height={CANVAS_H}
              effectorId={null}
              playing={false}
            />
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
          </div>

          {/* Tool row */}
          <div style={styles.toolRow}>
            {/* Color swatches */}
            <div style={styles.swatchRow}>
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.color}
                  title={opt.label}
                  onClick={() => { setSelectedColor(opt.color); setIsEraser(false); }}
                  style={{
                    ...styles.swatch,
                    background:    opt.color,
                    outline:       !isEraser && selectedColor === opt.color
                      ? `3px solid ${opt.color}` : '3px solid transparent',
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>

            <div style={styles.toolBtns}>
              <button
                style={{ ...styles.toolBtn, ...(isEraser ? {} : styles.toolBtnActive) }}
                onClick={() => setIsEraser(false)}
              >
                ✏️ Pen
              </button>
              <button
                style={{ ...styles.toolBtn, ...(isEraser ? styles.toolBtnActive : {}) }}
                onClick={() => setIsEraser(true)}
              >
                ◻ Eraser
              </button>
              <button style={styles.clearBtn} onClick={handleClear}>
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: element info + audio + description */}
        <div style={styles.rightPanel}>

          {/* Element info */}
          <div style={{ ...styles.elemHeader, borderLeft: `4px solid ${activeElem.color}` }}>
            <h3 style={{ ...styles.elemName, color: activeElem.color }}>
              {activeElem.name}
            </h3>
            <p style={styles.elemDesc}>{activeElem.description}</p>
          </div>

          {/* Audio player */}
          <div style={styles.audioRow}>
            <button
              style={{ ...styles.playBtn, background: activeElem.color }}
              onClick={handlePlayPause}
            >
              {isPlaying ? '⏸' : '▶'} {isPlaying ? 'Pause' : 'Play'} audio
            </button>
            <span style={styles.audioHint}>Listen to understand this element</span>
          </div>

          {/* Description */}
          <div style={styles.descBlock}>
            <label style={styles.descLabel}>
              Describe the movement you imagined:
            </label>
            <textarea
              style={styles.textarea}
              rows={6}
              placeholder={`e.g. "When ${activeElem.name.toLowerCase()} increases, the arms slowly rise up..."`}
              value={descriptions[activeTab]}
              onChange={e => setDescriptions(prev => ({ ...prev, [activeTab]: e.target.value }))}
            />
          </div>

          {/* Completion hint */}
          <p style={styles.completionHint}>
            {isTabComplete(activeTab)
              ? <span style={{ color: '#10b981', fontWeight: 600 }}>✓ This element is complete</span>
              : <span style={{ color: '#78716c' }}>Add a sketch or description to complete this element</span>
            }
          </p>

          {/* Navigation + Save */}
          <div style={styles.navRow}>
            {activeIdx > 0 && (
              <button
                style={styles.navBtn}
                onClick={() => switchTab(MUSIC_ELEMENTS[activeIdx - 1].id)}
              >
                ← {MUSIC_ELEMENTS[activeIdx - 1].name}
              </button>
            )}
            <div style={{ flex: 1 }} />
            {activeIdx < 3 ? (
              <button
                style={{ ...styles.navBtn, ...styles.navBtnPrimary, background: activeElem.color }}
                onClick={() => switchTab(MUSIC_ELEMENTS[activeIdx + 1].id)}
              >
                {MUSIC_ELEMENTS[activeIdx + 1].name} →
              </button>
            ) : (
              <button
                style={{
                  ...styles.saveBtn,
                  opacity:     allComplete ? 1 : 0.4,
                  cursor:      allComplete ? 'pointer' : 'not-allowed',
                }}
                onClick={handleSave}
                disabled={!allComplete}
                title={allComplete ? '' : `Complete all 4 elements first (${completeCount}/4 done)`}
              >
                Save &amp; Continue →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Completion modal ──────────────────────────── */}
      {saved && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.completionIcon}>🎉</div>
            <h2 style={styles.completionTitle}>All 4 designs complete!</h2>
            <p style={styles.completionSubtitle}>
              Your movement sketches and descriptions have been saved.
            </p>
            <div style={styles.completionGrid}>
              {MUSIC_ELEMENTS.map(elem => (
                <div key={elem.id} style={{ ...styles.completionElem, borderLeft: `4px solid ${elem.color}` }}>
                  <span style={{ ...styles.completionElemName, color: elem.color }}>{elem.name}</span>
                  <span style={styles.completionElemCheck}>✓</span>
                </div>
              ))}
            </div>
            <button style={styles.modalBtn} onClick={onSkip}>
              Go to Mapping Studio →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { paddingTop: 32, paddingBottom: 80 },

  pageHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 24, gap: 16,
  },
  pageTitle: { fontSize: 26, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' },
  pageSubtitle: { fontSize: 14, color: '#78716c', margin: 0, maxWidth: 560, lineHeight: 1.6 },
  skipBtn: {
    padding: '8px 18px', fontSize: 13, fontWeight: 600,
    background: '#f3f4f6', border: 'none', borderRadius: 8,
    cursor: 'pointer', color: '#78716c', whiteSpace: 'nowrap', flexShrink: 0,
  },
  exampleBtn: {
    padding: '8px 18px', fontSize: 13, fontWeight: 600,
    background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8,
    cursor: 'pointer', color: '#92400e', whiteSpace: 'nowrap', flexShrink: 0,
  },
  examplePanel: {
    background: '#fafaf9', border: '1.5px solid #e7e5e4', borderRadius: 12,
    padding: '14px 16px', marginBottom: 24, display: 'flex', alignItems: 'flex-start',
    gap: 16, flexWrap: 'wrap',
  },
  exampleLabel: {
    fontSize: 13, color: '#57534e', margin: 0, paddingTop: 2, flex: '0 0 auto', maxWidth: 160,
  },
  exampleImg: {
    maxHeight: 240, borderRadius: 10, border: '1px solid #e7e5e4',
    objectFit: 'contain', display: 'block',
  },

  // Tabs
  tabs: {
    display: 'flex', alignItems: 'center', gap: 0,
    borderBottom: '2px solid #e7e5e4', marginBottom: 28,
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '10px 20px', fontSize: 14, background: 'transparent',
    border: 'none', borderBottom: '3px solid transparent',
    cursor: 'pointer', transition: 'all 0.15s', marginBottom: -2,
  },
  tabDot: {
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
    transition: 'all 0.2s',
  },
  tabCheck: { fontSize: 11, fontWeight: 700 },
  tabProgress: {
    marginLeft: 'auto', fontSize: 12, fontWeight: 600,
    color: '#a8a29e', paddingRight: 8,
  },

  // Workspace
  workspace: { display: 'flex', gap: 28, alignItems: 'flex-start' },

  // Left panel
  leftPanel: { flexShrink: 0 },
  canvasWrap: {
    position: 'relative', display: 'inline-block',
    borderRadius: 14, overflow: 'hidden',
    border: '2px solid #e7e5e4',
    boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
  },
  drawCanvas: {
    position: 'absolute', top: 0, left: 0,
    cursor: 'crosshair', touchAction: 'none',
  },

  // Tool row below canvas
  toolRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    marginTop: 12, flexWrap: 'wrap',
  },
  swatchRow: { display: 'flex', gap: 7 },
  swatch: {
    width: 26, height: 26, borderRadius: '50%', border: 'none',
    cursor: 'pointer', transition: 'outline 0.1s', flexShrink: 0,
  },
  toolBtns: { display: 'flex', gap: 8, marginLeft: 'auto' },
  toolBtn: {
    padding: '6px 12px', fontSize: 12, fontWeight: 600,
    background: '#f3f4f6', border: '2px solid #e5e7eb',
    borderRadius: 7, cursor: 'pointer', color: '#374151',
  },
  toolBtnActive: { background: '#fff', borderColor: '#a8a29e' },
  clearBtn: {
    padding: '6px 12px', fontSize: 12, fontWeight: 600,
    background: 'transparent', border: '1.5px solid #e5e7eb',
    borderRadius: 7, cursor: 'pointer', color: '#78716c',
  },

  // Right panel
  rightPanel: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 20,
    paddingTop: 4,
  },
  elemHeader: {
    paddingLeft: 14, paddingTop: 4, paddingBottom: 4,
  },
  elemName: { fontSize: 22, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' },
  elemDesc: { fontSize: 14, color: '#78716c', margin: 0, lineHeight: 1.6 },

  audioRow: { display: 'flex', alignItems: 'center', gap: 12 },
  playBtn: {
    padding: '9px 18px', fontSize: 14, fontWeight: 700,
    color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  audioHint: { fontSize: 12, color: '#a8a29e' },

  descBlock: { display: 'flex', flexDirection: 'column', gap: 8 },
  descLabel: {
    fontSize: 13, fontWeight: 600, color: '#44403c',
  },
  textarea: {
    width: '100%', padding: '12px 14px', fontSize: 14, lineHeight: 1.6,
    border: '2px solid #e5e7eb', borderRadius: 10, resize: 'vertical',
    fontFamily: 'inherit', color: '#1c1917', background: '#fafaf9',
    boxSizing: 'border-box', outline: 'none',
  },

  completionHint: { fontSize: 13, margin: 0 },

  navRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', paddingTop: 8 },
  navBtn: {
    padding: '9px 18px', fontSize: 13, fontWeight: 600,
    background: '#f3f4f6', border: 'none', borderRadius: 9,
    cursor: 'pointer', color: '#374151',
  },
  navBtnPrimary: { color: '#fff' },
  saveBtn: {
    padding: '12px 24px', fontSize: 15, fontWeight: 700,
    background: '#1c1917', color: '#fff', border: 'none',
    borderRadius: 10, transition: 'opacity 0.2s',
  },

  // Completion modal
  modalBackdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    textAlign: 'center', maxWidth: 420, width: '90%', padding: '44px 36px',
    background: '#fff', borderRadius: 20, border: '2px solid #e7e5e4',
    boxShadow: '0 16px 60px rgba(0,0,0,0.2)',
  },
  modalBtn: {
    marginTop: 24, padding: '13px 28px', fontSize: 15, fontWeight: 700,
    background: '#1c1917', color: '#fff', border: 'none', borderRadius: 10,
    cursor: 'pointer', width: '100%',
  },
  completionIcon: { fontSize: 56, marginBottom: 16, lineHeight: 1 },
  completionTitle: { fontSize: 26, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' },
  completionSubtitle: { fontSize: 15, color: '#78716c', margin: '0 0 28px', lineHeight: 1.6 },
  completionGrid: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' },
  completionElem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', background: '#fafaf9', borderRadius: 8,
  },
  completionElemName: { fontWeight: 700, fontSize: 14 },
  completionElemCheck: { fontSize: 16, color: '#10b981', fontWeight: 700 },
  completionHintText: { fontSize: 13, color: '#78716c', margin: 0 },
};
