'use client';

/**
 * MappingStudio (Step 2)
 * ======================
 * Map movements to music elements with intensity control.
 * All 7 effectors available for selection (not filtered).
 */

import { useRef, useEffect, useState } from "react";
import CharacterCanvas from "./CharacterCanvas";
import CurveEditor from "./CurveEditor";
import { EFFECTOR_INFO } from "./GestureGallery";
import { logEvent } from "@/lib/logger";

// NOTE: audioUrl and analysisUrl currently point to test3.wav/json as placeholders
// These will be replaced with actual music clips later:
// - volume_vivaldi_summer.wav/json
// - pitch_bach_brandenburg.wav/json
// - timbre_debussy_clair.wav/json
// - beat_beethoven_fifth.wav/json
const MUSIC_ELEMENTS = [
  {
    id: "volume",
    name: "Volume (音量)",
    description: "音量的大小变化，从安静到响亮",
    detailedDesc: "体验音量如何从响亮到安静的变化 - 像一场突如其来的夏日暴风雨",
    audioUrl: "/assets/audio/test3.wav", // Placeholder
    analysisUrl: "/assets/analysis/test3.json", // Placeholder
    type: "continuous",
    color: "#f59e0b"
  },
  {
    id: "pitch",
    name: "Pitch (音高)",
    description: "旋律的高低起伏",
    detailedDesc: "跟随旋律从低音爬升到高音 - 像一只鸟儿向天空飞翔",
    audioUrl: "/assets/audio/test3.wav", // Placeholder
    analysisUrl: "/assets/analysis/test3.json", // Placeholder
    type: "continuous",
    color: "#10b981"
  },
  {
    id: "timbre",
    name: "Timbre (音色)",
    description: "声音的质感和色彩",
    detailedDesc: "感受音色从明亮清澈到温暖柔和的变化 - 像月光在水面的波纹",
    audioUrl: "/assets/audio/test3.wav", // Placeholder
    analysisUrl: "/assets/analysis/test3.json", // Placeholder
    type: "continuous",
    color: "#8b5cf6"
  },
  {
    id: "beat",
    name: "Beat (节拍)",
    description: "音乐的脉搏和律动",
    detailedDesc: "跟随强烈的节拍脉动 - 像心跳一样有力",
    audioUrl: "/assets/audio/test3.wav", // Placeholder
    analysisUrl: "/assets/analysis/test3.json", // Placeholder
    type: "trigger",
    color: "#ef4444"
  },
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
  customArmPath,
  onCustomArmPathChange,
  sessionId,
}) {
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
          For each musical element below, listen to its unique audio clip, then choose which movement best represents it.
        </p>
      </div>

      {MUSIC_ELEMENTS.map((elem) => (
        <MappingRow
          key={elem.id}
          elem={elem}
          currentMapping={mappings[elem.id]}
          onSetEffector={(eid) => handleSetMapping(elem.id, eid)}
          onSetIntensity={(val) => handleSetIntensity(elem.id, val)}
          customArmPath={customArmPath}
          onCustomArmPathChange={onCustomArmPathChange}
          sessionId={sessionId}
        />
      ))}
    </div>
  );
}

function MappingRow({ elem, currentMapping, onSetEffector, onSetIntensity, customArmPath, onCustomArmPathChange, sessionId }) {
  // Independent audio state for this row
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicTime, setMusicTime] = useState(0);
  const [analysisData, setAnalysisData] = useState(null);

  // Load this row's analysis data
  useEffect(() => {
    fetch(elem.analysisUrl)
      .then(res => res.json())
      .then(data => setAnalysisData(data))
      .catch(err => console.error(`Failed to load analysis for ${elem.id}:`, err));
  }, [elem.analysisUrl, elem.id]);

  // Track audio time
  useEffect(() => {
    if (!audioRef.current) return;
    let rafId;
    const updateTime = () => {
      if (audioRef.current && isPlaying) {
        setMusicTime(audioRef.current.currentTime);
      }
      rafId = requestAnimationFrame(updateTime);
    };
    rafId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  // Audio controls with logging
  const handlePlay = () => {
    audioRef.current?.play();
    setIsPlaying(true);
    logEvent(sessionId, 'audio_play', {
      musicElement: elem.id,
      timestamp: Date.now(),
    });
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    logEvent(sessionId, 'audio_pause', {
      musicElement: elem.id,
      currentTime: audioRef.current?.currentTime || 0,
      timestamp: Date.now(),
    });
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
    logEvent(sessionId, 'audio_reset', {
      musicElement: elem.id,
      timestamp: Date.now(),
    });
  };

  // Show ALL effectors (not filtered by Step 1 selection)
  const availableEffectors =
    elem.type === "trigger"
      ? TRIGGER_EFFECTORS
      : CONTINUOUS_EFFECTORS;

  return (
    <div style={styles.mappingRow}>
      {/* Hidden audio element for this row */}
      <audio ref={audioRef} src={elem.audioUrl} preload="metadata" />

      {/* Left: Music Element Info + Audio Controls */}
      <div style={styles.mappingLeft}>
        <div style={{ ...styles.elemDot, background: elem.color }} />
        <div style={{ flex: 1 }}>
          <h4 style={{ ...styles.elemName, color: elem.color }}>{elem.name}</h4>
          <p style={styles.elemDesc}>{elem.description}</p>
          <p style={styles.elemDetailedDesc}>{elem.detailedDesc}</p>

          {/* Row audio controls */}
          <div style={styles.rowAudioControls}>
            <button
              style={{ ...styles.rowControlBtn, opacity: isPlaying ? 0.5 : 1 }}
              onClick={handlePlay}
              disabled={isPlaying}
            >
              ▶
            </button>
            <button
              style={{ ...styles.rowControlBtn, opacity: !isPlaying ? 0.5 : 1 }}
              onClick={handlePause}
              disabled={!isPlaying}
            >
              ⏸
            </button>
            <button
              style={styles.rowControlBtn}
              onClick={handleReset}
            >
              ⏹
            </button>
            <span style={styles.rowTimeDisplay}>
              {formatTime(musicTime)}
            </span>
          </div>

          <SignalBar
            type={elem.id}
            analysisData={analysisData}
            width={180}
            height={18}
            color={elem.color}
            musicTime={musicTime}
            isPlaying={isPlaying}
          />
        </div>
      </div>

      {/* Center: Character Preview */}
      <div style={styles.mappingCenter}>
        <div style={styles.previewFrame}>
          {currentMapping.effector ? (
            <CharacterCanvas
              width={240}
              height={300}
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
  sectionDesc: { fontSize: 15, color: "#78716c", margin: "8px 0 0", maxWidth: 700, lineHeight: 1.6 },
  mappingRow: {
    display: "flex", gap: 24, alignItems: "flex-start",
    padding: "32px 0", borderBottom: "1px solid #e7e5e4",
  },
  mappingLeft: {
    width: 240, flexShrink: 0, display: "flex", gap: 12, alignItems: "flex-start",
  },
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
  rowTimeDisplay: {
    fontSize: 11, fontWeight: 600, color: "#78716c",
    fontFamily: "monospace", marginLeft: "auto",
  },
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
  effectorChips: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    padding: "8px 14px", fontSize: 13, fontWeight: 600,
    border: "1.5px solid", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
  },
  intensityWrap: { maxWidth: 280 },
  slider: { width: "100%", accentColor: "#f59e0b", height: 6 },
  sliderLabels: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#a8a29e", marginTop: 2 },
};
