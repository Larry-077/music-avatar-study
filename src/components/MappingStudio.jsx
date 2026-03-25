'use client';

/**
 * MappingStudio (Step 3)
 * ======================
 * Map movements to music elements with intensity control.
 * Each row has a "✓ Confirm" button once an effector is chosen.
 * After all 4 are confirmed, the Combined Preview section activates.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import CharacterCanvas from "./CharacterCanvas";
import CombinedPreviewCanvas from "./CombinedPreviewCanvas";
import { EFFECTOR_INFO } from "./GestureGallery";
import { logEvent } from "@/lib/logger";

const MUSIC_ELEMENTS = [
  {
    id: "volume",
    name: "Volume",
    description: "Changes in loudness, from quiet to loud",
    detailedDesc: "Experience how volume shifts from loud to quiet",
    audioUrl: "/assets/audio/volume.wav",
    analysisUrl: "/assets/analysis/volume.json",
    type: "continuous",
    color: "#f59e0b"
  },
  {
    id: "pitch",
    name: "Pitch",
    description: "The rise and fall of musical notes",
    detailedDesc: "Follow the melody as it climbs from low to high",
    audioUrl: "/assets/audio/pitch.wav",
    analysisUrl: "/assets/analysis/pitch.json",
    type: "continuous",
    color: "#10b981"
  },
  {
    id: "timbre",
    name: "Timbre",
    description: "The texture and color of sound",
    detailedDesc: "Feel the timbre shift from bright and clear to warm and soft",
    audioUrl: "/assets/audio/timbre.wav",
    analysisUrl: "/assets/analysis/timbre.json",
    type: "continuous",
    color: "#8b5cf6"
  },
  {
    id: "beat",
    name: "Beat",
    description: "The pulse and rhythm of music",
    detailedDesc: "Follow the strong rhythmic pulse",
    audioUrl: "/assets/audio/beat.wav",
    analysisUrl: "/assets/analysis/beat.json",
    type: "trigger",
    color: "#ef4444"
  },
];

// All 6 effectors available for every music element
const ALL_EFFECTORS = Object.keys(EFFECTOR_INFO);

export default function MappingStudio({
  mappings,
  setMapping,
  setIntensity,
  sessionId,
  customKeyframePose = null,
  confirmedMappings,
  setConfirmedMappings,
}) {

  // Combined preview audio state (uses test3.wav)
  const combinedAudioRef = useRef(null);
  const [combinedPlaying, setCombinedPlaying] = useState(false);
  const [combinedTime, setCombinedTime] = useState(0);
  const combinedRafRef = useRef(null);

  // Track combined audio time
  useEffect(() => {
    const tick = () => {
      if (combinedAudioRef.current) {
        setCombinedTime(combinedAudioRef.current.currentTime);
      }
      combinedRafRef.current = requestAnimationFrame(tick);
    };
    combinedRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(combinedRafRef.current);
  }, []);

  const confirmedCount = Object.values(confirmedMappings).filter(Boolean).length;
  const allConfirmed = confirmedCount === 4;

  // Instrumented setMapping
  const handleSetMapping = (elemId, effectorId) => {
    logEvent(sessionId, 'effector_selected', {
      musicElement: elemId,
      effector: effectorId,
      timestamp: Date.now(),
    });
    setMapping(elemId, effectorId);
    // Un-confirm if user changes their selection
    if (confirmedMappings[elemId]) {
      setConfirmedMappings(prev => ({ ...prev, [elemId]: null }));
    }
  };

  // Instrumented setIntensity (debounced)
  const intensityTimeoutRef = useRef(null);
  const handleSetIntensity = (elemId, value) => {
    setIntensity(elemId, value);
    if (intensityTimeoutRef.current) clearTimeout(intensityTimeoutRef.current);
    intensityTimeoutRef.current = setTimeout(() => {
      logEvent(sessionId, 'intensity_changed', {
        musicElement: elemId,
        intensity: value,
        timestamp: Date.now(),
      });
    }, 500);
  };

  const handleConfirm = useCallback((elemId) => {
    const m = mappings[elemId];
    if (!m?.effector) return;
    setConfirmedMappings(prev => ({
      ...prev,
      [elemId]: { effector: m.effector, intensity: m.intensity },
    }));
    logEvent(sessionId, 'effector_confirmed', {
      musicElement: elemId,
      effector: m.effector,
      intensity: m.intensity,
      timestamp: Date.now(),
    });
  }, [mappings, sessionId]);

  const handleCombinedPlay = () => {
    combinedAudioRef.current?.play();
    setCombinedPlaying(true);
  };
  const handleCombinedPause = () => {
    combinedAudioRef.current?.pause();
    setCombinedPlaying(false);
  };
  const handleCombinedReset = () => {
    if (combinedAudioRef.current) {
      combinedAudioRef.current.currentTime = 0;
      combinedAudioRef.current.pause();
    }
    setCombinedPlaying(false);
  };

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Map Movements to Music</h2>
        <p style={styles.sectionDesc}>
          For each musical element below, listen to its unique audio clip, then choose which
          movement best represents it. Confirm each mapping when you're happy with it.
        </p>
      </div>

      {MUSIC_ELEMENTS.map((elem) => (
        <MappingRow
          key={elem.id}
          elem={elem}
          currentMapping={mappings[elem.id]}
          confirmed={!!confirmedMappings[elem.id]}
          onSetEffector={(eid) => handleSetMapping(elem.id, eid)}
          onSetIntensity={(val) => handleSetIntensity(elem.id, val)}
          onConfirm={() => handleConfirm(elem.id)}
          sessionId={sessionId}
        />
      ))}

      {/* ── Combined Preview ─────────────────────────────── */}
      <div style={styles.combinedSection}>
        <div style={styles.combinedHeader}>
          <div>
            <h3 style={styles.combinedTitle}>Combined Preview</h3>
            <p style={styles.combinedDesc}>
              See all your confirmed mappings at once, driven by the same music.
            </p>
          </div>
          <div style={{
            ...styles.confirmBadge,
            background: allConfirmed ? '#10b981' : '#f59e0b',
          }}>
            {confirmedCount} / 4 confirmed
          </div>
        </div>

        {confirmedCount === 0 ? (
          <div style={styles.combinedEmpty}>
            Confirm at least one mapping above to activate the combined preview.
          </div>
        ) : (
          <div style={styles.combinedLayout}>
            {/* Large character canvas */}
            <div style={styles.combinedCanvas}>
              <audio
                ref={combinedAudioRef}
                src="/assets/audio/test3.wav"
                onEnded={() => setCombinedPlaying(false)}
              />
              <CombinedPreviewCanvas
                confirmedMappings={confirmedMappings}
                customKeyframePose={customKeyframePose}
                externalTime={combinedTime}
                playing={combinedPlaying}
                width={380}
                height={440}
              />
              {/* Audio controls */}
              <div style={styles.combinedControls}>
                <button style={styles.combinedBtn} onClick={handleCombinedPlay} disabled={combinedPlaying}>▶</button>
                <button style={styles.combinedBtn} onClick={handleCombinedPause} disabled={!combinedPlaying}>⏸</button>
                <button style={styles.combinedBtn} onClick={handleCombinedReset}>⏹</button>
                <span style={styles.combinedTime}>{fmtTime(combinedTime)}</span>
              </div>
            </div>

            {/* Legend of confirmed mappings */}
            <div style={styles.combinedLegend}>
              <p style={styles.legendTitle}>Active mappings</p>
              {MUSIC_ELEMENTS.map(elem => {
                const cm = confirmedMappings[elem.id];
                if (!cm) return null;
                const eff = cm.effector === 'none'
                  ? { icon: '⏹', name: 'No Movement' }
                  : EFFECTOR_INFO[cm.effector];
                return (
                  <div key={elem.id} style={styles.legendRow}>
                    <span style={{ ...styles.legendDot, background: elem.color }} />
                    <span style={styles.legendElem}>{elem.name}</span>
                    <span style={styles.legendArrow}>→</span>
                    <span style={styles.legendEff}>{eff?.icon} {eff?.name}</span>
                    <span style={styles.legendIntensity}>{Math.round(cm.intensity * 100)}%</span>
                  </div>
                );
              })}
              {!allConfirmed && (
                <p style={styles.legendHint}>
                  Confirm the remaining {4 - confirmedCount} mapping{4 - confirmedCount > 1 ? 's' : ''} to complete your design.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MappingRow({
  elem, currentMapping, confirmed,
  onSetEffector, onSetIntensity, onConfirm,
  sessionId,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicTime, setMusicTime] = useState(0);
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    fetch(elem.analysisUrl)
      .then(res => res.json())
      .then(data => setAnalysisData(data))
      .catch(err => console.error(`Failed to load analysis for ${elem.id}:`, err));
  }, [elem.analysisUrl, elem.id]);

  useEffect(() => {
    if (!audioRef.current) return;
    let rafId;
    const updateTime = () => {
      if (audioRef.current && isPlaying) setMusicTime(audioRef.current.currentTime);
      rafId = requestAnimationFrame(updateTime);
    };
    rafId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const handlePlay = () => {
    audioRef.current?.play();
    setIsPlaying(true);
    logEvent(sessionId, 'audio_play', { musicElement: elem.id, timestamp: Date.now() });
  };
  const handlePause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    logEvent(sessionId, 'audio_pause', { musicElement: elem.id, currentTime: audioRef.current?.currentTime || 0, timestamp: Date.now() });
  };
  const handleReset = () => {
    if (audioRef.current) { audioRef.current.currentTime = 0; setIsPlaying(false); }
    logEvent(sessionId, 'audio_reset', { musicElement: elem.id, timestamp: Date.now() });
  };

  // All 6 effectors available regardless of signal type
  const availableEffectors = ['none', ...ALL_EFFECTORS];

  return (
    <div style={{
      ...styles.mappingRow,
      ...(confirmed ? styles.mappingRowConfirmed : {}),
    }}>
      <audio ref={audioRef} src={elem.audioUrl} preload="metadata" />

      {/* Left: Info + Audio Controls */}
      <div style={styles.mappingLeft}>
        <div style={{ ...styles.elemDot, background: elem.color }} />
        <div style={{ flex: 1 }}>
          <h4 style={{ ...styles.elemName, color: elem.color }}>{elem.name}</h4>
          <p style={styles.elemDesc}>{elem.description}</p>
          <p style={styles.elemDetailedDesc}>{elem.detailedDesc}</p>

          <div style={styles.rowAudioControls}>
            <button style={{ ...styles.rowControlBtn, opacity: isPlaying ? 0.5 : 1 }} onClick={handlePlay} disabled={isPlaying}>▶</button>
            <button style={{ ...styles.rowControlBtn, opacity: !isPlaying ? 0.5 : 1 }} onClick={handlePause} disabled={!isPlaying}>⏸</button>
            <button style={styles.rowControlBtn} onClick={handleReset}>⏹</button>
            <span style={styles.rowTimeDisplay}>{formatTime(musicTime)}</span>
          </div>

          <SignalBar type={elem.id} analysisData={analysisData} width={180} height={18} color={elem.color} musicTime={musicTime} />
        </div>
      </div>

      {/* Center: Character Preview */}
      <div style={styles.mappingCenter}>
        <div style={{ ...styles.previewFrame, position: "relative" }}>
          {currentMapping.effector === 'none' ? (
            <CharacterCanvas
              width={240}
              height={300}
              effectorId={null}
              playing={false}
            />
          ) : (
            <CharacterCanvas
              width={240}
              height={300}
              analysisData={analysisData}
              effectorId={currentMapping.effector}
              musicType={elem.id}
              intensity={currentMapping.intensity}
              externalTime={musicTime}
              playing={isPlaying}
            />
          )}
          {currentMapping.effector === 'float' && (
            <div style={{
              position: "absolute",
              bottom: "18%",
              left: "5%",
              right: "5%",
              height: 3,
              background: "#2563eb",
              borderRadius: 2,
              zIndex: 10,
              boxShadow: "0 0 6px rgba(37,99,235,0.5)",
            }} />
          )}
        </div>
      </div>

      {/* Right: Effector selection + intensity + confirm */}
      <div style={styles.mappingRight}>
        <label style={styles.controlLabel}>Movement Type</label>
        <p style={styles.effectorHint}>
          {elem.type === "trigger"
            ? "Head Nod & Foot Tap fire once per beat · others burst on beat"
            : "Head Nod & Foot Tap speed up with signal · others respond smoothly"}
        </p>
        <div style={styles.effectorChips}>
          {availableEffectors.map((eid) => {
            const eff = eid === 'none'
              ? { icon: '⏹', name: 'No Movement' }
              : EFFECTOR_INFO[eid];
            const active = currentMapping.effector === eid;
            return (
              <button
                key={eid}
                style={{
                  ...styles.chip,
                  background: active ? elem.color : "#f3f4f6",
                  color: active ? "#fff" : "#374151",
                  borderColor: active ? elem.color : "#e5e7eb",
                }}
                onClick={() => onSetEffector(eid)}
              >
                {eff.icon} {eff.name}
              </button>
            );
          })}
        </div>

        {currentMapping.effector && currentMapping.effector !== 'none' && (
          <div style={styles.intensityWrap}>
            <label style={styles.controlLabel}>
              Intensity: <strong>{Math.round(currentMapping.intensity * 100)}%</strong>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(currentMapping.intensity * 100)}
              onChange={(e) => onSetIntensity(Number(e.target.value) / 100)}
              style={styles.slider}
            />
            <div style={styles.sliderLabels}>
              <span>Subtle</span>
              <span>Strong</span>
            </div>
          </div>
        )}

        {/* Confirm button — always visible */}
        <button
          style={{
            ...styles.confirmBtn,
            ...(confirmed ? styles.confirmBtnDone : {}),
          }}
          onClick={onConfirm}
          disabled={confirmed}
        >
          {confirmed ? '✓ Mapping confirmed' : '✓ Confirm this mapping'}
        </button>
      </div>
    </div>
  );
}

function SignalBar({ type, analysisData, width = 120, height = 24, color = "#888", musicTime = 0 }) {
  const canvasRef = useRef(null);
  const beatDecay = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const t = musicTime;

    let val = 0;
    if (analysisData) {
      if (type === "beat") {
        const beats = analysisData.triggers.beats;
        for (const bt of beats) {
          const diff = t - bt;
          if (diff >= 0 && diff < 0.12) { beatDecay.current = 1.0; break; }
        }
        beatDecay.current *= 0.85;
        val = beatDecay.current;
      } else if (analysisData.continuous[type]) {
        const signal = analysisData.continuous[type];
        const fps = analysisData.info.fps;
        const idx = Math.min(Math.floor(t * fps), signal.length - 1);
        val = idx >= 0 ? signal[idx] : 0;
      }
    }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color + "22";
    roundRect(ctx, 0, 0, width, height, 4);
    ctx.fill();
    ctx.fillStyle = color + "88";
    roundRect(ctx, 0, 0, width * Math.max(0, val), height, 4);
    ctx.fill();
  }, [type, analysisData, width, height, color, musicTime]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ borderRadius: 4, display: "block" }} />;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${secs.toFixed(2).padStart(5, "0")}`;
}

function fmtTime(s) {
  return `${Math.floor(s)}:${String(Math.floor((s % 1) * 60)).padStart(2, '0')}`;
}

const styles = {
  section: { paddingTop: 40 },
  sectionHeader: { marginBottom: 36 },
  sectionTitle: { fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
  sectionDesc: { fontSize: 15, color: "#78716c", margin: "8px 0 0", maxWidth: 700, lineHeight: 1.6 },

  mappingRow: {
    display: "flex", gap: 24, alignItems: "flex-start",
    padding: "32px 0", borderBottom: "1px solid #e7e5e4",
    transition: "background 0.2s",
  },
  mappingRowConfirmed: {
    background: "#f0fdf4",
    borderRadius: 12,
    padding: "32px 16px",
    borderBottom: "1px solid #bbf7d0",
  },

  mappingLeft: { width: 240, flexShrink: 0, display: "flex", gap: 12, alignItems: "flex-start" },
  elemDot: { width: 10, height: 10, borderRadius: "50%", marginTop: 6, flexShrink: 0 },
  elemName: { fontSize: 16, fontWeight: 700, margin: "0 0 4px" },
  elemDesc: { fontSize: 13, color: "#78716c", margin: "0 0 2px", lineHeight: 1.4 },
  elemDetailedDesc: { fontSize: 12, color: "#a8a29e", margin: "0 0 12px", lineHeight: 1.5, fontStyle: "italic" },
  rowAudioControls: {
    display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
    padding: "8px 10px", background: "#fafaf9", borderRadius: 8, border: "1px solid #e7e5e4",
  },
  rowControlBtn: {
    padding: "6px 10px", fontSize: 13, fontWeight: 700,
    background: "#fff", color: "#1c1917",
    border: "1px solid #e7e5e4", borderRadius: 6, cursor: "pointer",
    transition: "all 0.15s", minWidth: 32,
  },
  rowTimeDisplay: { fontSize: 11, fontWeight: 600, color: "#78716c", fontFamily: "monospace", marginLeft: "auto" },

  mappingCenter: { flexShrink: 0 },
  previewFrame: {
    width: 240, height: 300, background: "#fff", borderRadius: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  previewPlaceholder: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", height: "100%", color: "#a8a29e",
  },

  mappingRight: { flex: 1, minWidth: 0 },
  controlLabel: {
    fontSize: 12, fontWeight: 600, color: "#78716c", textTransform: "uppercase",
    letterSpacing: "0.05em", display: "block", marginBottom: 8,
  },
  effectorHint: { fontSize: 11, color: "#a8a29e", margin: "0 0 10px", lineHeight: 1.5, fontStyle: "italic" },
  effectorChips: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    padding: "8px 14px", fontSize: 13, fontWeight: 600,
    border: "1.5px solid", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
  },
  chipCustom: { borderStyle: "dashed" },
  intensityWrap: { maxWidth: 280 },
  slider: { width: "100%", accentColor: "#f59e0b", height: 6 },
  sliderLabels: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#a8a29e", marginTop: 2 },

  confirmBtn: {
    marginTop: 16, width: "100%", maxWidth: 280, padding: "12px 20px",
    fontSize: 14, fontWeight: 700,
    background: "#1c1917", color: "#fff",
    border: "none", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
  },
  confirmBtnDone: {
    background: "#10b981", cursor: "default",
  },

  // ── Combined Preview ────────────────────────────────────
  combinedSection: {
    marginTop: 64,
    background: "#fff",
    border: "2px solid #e7e5e4",
    borderRadius: 20,
    padding: "36px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  },
  combinedHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 28,
  },
  combinedTitle: { fontSize: 22, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" },
  combinedDesc: { fontSize: 14, color: "#78716c", margin: 0 },
  confirmBadge: {
    padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
    color: "#fff", flexShrink: 0,
  },
  combinedEmpty: {
    textAlign: "center", padding: "48px 0",
    fontSize: 14, color: "#a8a29e", fontStyle: "italic",
  },
  combinedLayout: { display: "flex", gap: 40, alignItems: "flex-start" },
  combinedCanvas: { flexShrink: 0 },
  combinedControls: {
    display: "flex", alignItems: "center", gap: 10, marginTop: 16,
  },
  combinedBtn: {
    padding: "8px 14px", fontSize: 14, fontWeight: 700,
    background: "#1c1917", color: "#fff",
    border: "none", borderRadius: 8, cursor: "pointer",
  },
  combinedTime: { fontSize: 13, color: "#78716c", fontFamily: "monospace" },

  combinedLegend: { flex: 1 },
  legendTitle: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a8a29e", margin: "0 0 16px" },
  legendRow: {
    display: "flex", alignItems: "center", gap: 8, padding: "10px 0",
    borderBottom: "1px solid #f5f5f4",
  },
  legendDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  legendElem: { fontSize: 13, fontWeight: 700, width: 56 },
  legendArrow: { fontSize: 12, color: "#a8a29e" },
  legendEff: { fontSize: 13, flex: 1 },
  legendIntensity: { fontSize: 12, color: "#a8a29e", fontVariantNumeric: "tabular-nums" },
  legendHint: { fontSize: 13, color: "#a8a29e", fontStyle: "italic", marginTop: 16 },
};
