'use client';

/**
 * MappingStudio (Step 2)
 * ======================
 * Map movements to music elements with intensity control.
 * All 7 effectors available for selection (not filtered).
 */

import { useRef, useEffect } from "react";
import CharacterCanvas from "./CharacterCanvas";
import CombinedPreview from "./CombinedPreview";
import CurveEditor from "./CurveEditor";
import { EFFECTOR_INFO } from "./GestureGallery";
import { logEvent } from "@/lib/logger";

const MUSIC_ELEMENTS = [
  { id: "volume", name: "Volume", description: "How loud or quiet the music is", type: "continuous", color: "#f59e0b" },
  { id: "pitch", name: "Pitch", description: "How high or low the musical notes are", type: "continuous", color: "#3b82f6" },
  { id: "timbre", name: "Timbre", description: "The brightness or darkness of the sound", type: "continuous", color: "#8b5cf6" },
  { id: "beat", name: "Beat", description: "The rhythmic pulse of the music", type: "trigger", color: "#ef4444" },
];

const CONTINUOUS_EFFECTORS = Object.entries(EFFECTOR_INFO)
  .filter(([, e]) => e.category === "continuous")
  .map(([k]) => k);

const TRIGGER_EFFECTORS = Object.entries(EFFECTOR_INFO)
  .filter(([, e]) => e.category === "trigger")
  .map(([k]) => k);

export default function MappingStudio({
  mappings,
  setMapping,
  setIntensity,
  analysisData,
  audioRef,
  isPlaying,
  onPlay,
  onPause,
  onReset,
  musicTime,
  customArmPath,
  onCustomArmPathChange,
  sessionId,
}) {
  // Instrumented audio controls
  const handlePlay = () => {
    logEvent(sessionId, 'audio_play', { timestamp: Date.now() });
    onPlay();
  };

  const handlePause = () => {
    logEvent(sessionId, 'audio_pause', { currentTime: musicTime, timestamp: Date.now() });
    onPause();
  };

  const handleReset = () => {
    logEvent(sessionId, 'audio_reset', { timestamp: Date.now() });
    onReset();
  };

  // Instrumented setMapping
  const handleSetMapping = (elemId, effectorId) => {
    logEvent(sessionId, 'effector_selected', {
      musicElement: elemId,
      effector: effectorId,
      timestamp: Date.now(),
    });
    setMapping(elemId, effectorId);
  };

  // Instrumented setIntensity (debounced to avoid too many events)
  const intensityTimeoutRef = useRef(null);
  const handleSetIntensity = (elemId, value) => {
    setIntensity(elemId, value);

    // Debounce logging by 500ms
    if (intensityTimeoutRef.current) {
      clearTimeout(intensityTimeoutRef.current);
    }
    intensityTimeoutRef.current = setTimeout(() => {
      logEvent(sessionId, 'intensity_changed', {
        musicElement: elemId,
        intensity: value,
        timestamp: Date.now(),
      });
    }, 500);
  };

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Map Movements to Music</h2>
        <p style={styles.sectionDesc}>
          For each musical element below, choose which movement best represents it and adjust the intensity.
        </p>
      </div>

      {/* Audio Controls */}
      <div style={styles.audioControls}>
        <button style={styles.controlBtn} onClick={handlePlay} disabled={isPlaying}>
          Play
        </button>
        <button style={styles.controlBtn} onClick={handlePause} disabled={!isPlaying}>
          Pause
        </button>
        <button style={styles.controlBtn} onClick={handleReset}>
          Reset
        </button>
        <span style={styles.timeDisplay}>
          {formatTime(musicTime)}
        </span>
      </div>

      {MUSIC_ELEMENTS.map((elem) => (
        <MappingRow
          key={elem.id}
          elem={elem}
          currentMapping={mappings[elem.id]}
          onSetEffector={(eid) => handleSetMapping(elem.id, eid)}
          onSetIntensity={(val) => handleSetIntensity(elem.id, val)}
          analysisData={analysisData}
          musicTime={musicTime}
          isPlaying={isPlaying}
          customArmPath={customArmPath}
          onCustomArmPathChange={onCustomArmPathChange}
          sessionId={sessionId}
        />
      ))}

      {/* Combined Preview */}
      <div style={styles.combinedSection}>
        <h3 style={styles.combinedTitle}>Combined Preview</h3>
        <p style={styles.combinedDesc}>
          This preview shows all your mappings working together with the actual music analysis.
        </p>
        <div style={styles.combinedCanvas}>
          <CombinedPreview
            mappings={mappings}
            analysisData={analysisData}
            width={320}
            height={380}
            musicTime={musicTime}
            isPlaying={isPlaying}
            customArmPath={customArmPath}
          />
        </div>

        {/* Summary */}
        <div style={styles.summaryGrid}>
          {MUSIC_ELEMENTS.map((elem) => {
            const m = mappings[elem.id];
            const eff = m.effector ? EFFECTOR_INFO[m.effector] : null;
            return (
              <div key={elem.id} style={{ ...styles.summaryItem, borderLeftColor: elem.color }}>
                <div style={styles.summaryLabel}>{elem.name}</div>
                <div style={styles.summaryValue}>
                  {eff ? `${eff.icon} ${eff.name}` : "—"}{" "}
                  {eff && <span style={styles.summaryIntensity}>{Math.round(m.intensity * 100)}%</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MappingRow({ elem, currentMapping, onSetEffector, onSetIntensity, analysisData, musicTime, isPlaying, customArmPath, onCustomArmPathChange, sessionId }) {
  // Show ALL effectors (not filtered by Step 1 selection)
  const availableEffectors =
    elem.type === "trigger"
      ? TRIGGER_EFFECTORS
      : CONTINUOUS_EFFECTORS;

  return (
    <div style={styles.mappingRow}>
      {/* Left: Music Element Info */}
      <div style={styles.mappingLeft}>
        <div style={{ ...styles.elemDot, background: elem.color }} />
        <div>
          <h4 style={styles.elemName}>{elem.name}</h4>
          <p style={styles.elemDesc}>{elem.description}</p>
          <SignalBar type={elem.id} analysisData={analysisData} width={140} height={18} color={elem.color} musicTime={musicTime} isPlaying={isPlaying} />
        </div>
      </div>

      {/* Center: Character Preview */}
      <div style={styles.mappingCenter}>
        <div style={styles.previewFrame}>
          {currentMapping.effector ? (
            <CharacterCanvas
              width={270}
              height={345}
              analysisData={analysisData}
              effectorId={currentMapping.effector}
              musicType={elem.id}
              intensity={currentMapping.intensity}
              externalTime={musicTime}
              playing={isPlaying}
              customArmPath={customArmPath}
            />
          ) : (
            <div style={styles.previewPlaceholder}>
              <span style={{ fontSize: 32, opacity: 0.3 }}>&#128100;</span>
              <span style={{ fontSize: 12, opacity: 0.4, marginTop: 4 }}>Select a movement</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Controls */}
      <div style={styles.mappingRight}>
        <label style={styles.controlLabel}>Movement Type</label>
        <div style={styles.effectorChips}>
          {availableEffectors.map((eid) => {
            const eff = EFFECTOR_INFO[eid];
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
                onClick={() => onSetEffector(active ? null : eid)}
              >
                {eff.icon} {eff.name}
              </button>
            );
          })}
        </div>

        {currentMapping.effector && (
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

        {currentMapping.effector === "custom_arm" && (
          <div style={{ marginTop: 16 }}>
            <CurveEditor
              path={customArmPath}
              onPathChange={onCustomArmPathChange}
              sessionId={sessionId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SignalBar({ type, analysisData, width = 120, height = 24, color = "#888", musicTime = 0, isPlaying = false }) {
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
        // Check if we're near a beat timestamp
        const beats = analysisData.triggers.beats;
        for (const bt of beats) {
          const diff = t - bt;
          if (diff >= 0 && diff < 0.12) {
            beatDecay.current = 1.0;
            break;
          }
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
    // Background
    ctx.fillStyle = color + "22";
    roundRect(ctx, 0, 0, width, height, 4);
    ctx.fill();
    // Fill
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

const styles = {
  section: { paddingTop: 40 },
  sectionHeader: { marginBottom: 36 },
  sectionTitle: { fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
  sectionDesc: { fontSize: 15, color: "#78716c", margin: "8px 0 0", maxWidth: 600, lineHeight: 1.6 },
  audioControls: {
    display: "flex", alignItems: "center", gap: 12, marginBottom: 24,
    padding: "16px 20px", background: "#1c1917", borderRadius: 12,
  },
  controlBtn: {
    padding: "8px 20px", fontSize: 13, fontWeight: 700, background: "#f59e0b",
    color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
  },
  timeDisplay: {
    fontSize: 16, fontWeight: 700, color: "#fafaf9", fontFamily: "monospace", marginLeft: "auto",
  },
  mappingRow: {
    display: "flex", gap: 24, alignItems: "flex-start",
    padding: "28px 0", borderBottom: "1px solid #e7e5e4",
  },
  mappingLeft: {
    width: 180, flexShrink: 0, display: "flex", gap: 12, alignItems: "flex-start",
  },
  elemDot: { width: 10, height: 10, borderRadius: "50%", marginTop: 6, flexShrink: 0 },
  elemName: { fontSize: 16, fontWeight: 700, margin: "0 0 2px" },
  elemDesc: { fontSize: 12, color: "#a8a29e", margin: "0 0 8px", lineHeight: 1.4 },
  mappingCenter: { flexShrink: 0 },
  previewFrame: {
    width: 270, height: 345, background: "#fff", borderRadius: 14,
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
  effectorChips: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    padding: "8px 14px", fontSize: 13, fontWeight: 600,
    border: "1.5px solid", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
  },
  intensityWrap: { maxWidth: 280 },
  slider: { width: "100%", accentColor: "#f59e0b", height: 6 },
  sliderLabels: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#a8a29e", marginTop: 2 },
  combinedSection: { marginTop: 56, textAlign: "center" },
  combinedTitle: { fontSize: 22, fontWeight: 700, margin: "0 0 6px" },
  combinedDesc: { fontSize: 14, color: "#78716c", margin: "0 0 24px" },
  combinedCanvas: {
    display: "inline-block", background: "#fff", borderRadius: 20,
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)", padding: 12, marginBottom: 32,
  },
  summaryGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
    maxWidth: 700, margin: "0 auto",
  },
  summaryItem: {
    background: "#fff", borderRadius: 10, padding: "12px 16px", textAlign: "left",
    borderLeft: "3px solid", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  summaryLabel: {
    fontSize: 11, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase",
    letterSpacing: "0.05em", marginBottom: 4,
  },
  summaryValue: { fontSize: 13, fontWeight: 600 },
  summaryIntensity: { fontSize: 11, color: "#a8a29e", fontWeight: 400 },
};
