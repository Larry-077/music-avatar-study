'use client';

/**
 * DemoGallery (Page 1)
 * ====================
 * Shows multiple character mappings responding to the same music clip in sync.
 * - Volume/Pitch/Timbre tabs: show 4 continuous effectors driven by that signal
 * - Beat tab: show 2 trigger effectors
 * - Progress bar shows low/high labels per music element
 * - Rich professional description per music element
 */

import { useState, useRef, useEffect } from "react";
import CharacterCanvas from "./CharacterCanvas";

const MUSIC_CLIPS = [
  {
    id: "volume", label: "Volume", color: "#f59e0b",
    audioUrl: "/assets/audio/volume.wav",
    analysisUrl: "/assets/analysis/volume.json",
    desc: "Changes in loudness",
    lowLabel: "Quiet ", highLabel: "Loud ",
    richDesc: "Volume (loudness) is the simplest and most primal musical feature. It reflects the amplitude of sound waves — how much air is moving. A sudden crescendo signals urgency or excitement; a fade-out signals calm. In music, composers shape emotion by controlling dynamics from pianissimo (pp) to fortissimo (ff). When you move to music, your body naturally responds to loudness: you crouch in silence and leap in a climax.",
  },
  {
    id: "pitch", label: "Pitch", color: "#10b981",
    audioUrl: "/assets/audio/pitch.wav",
    analysisUrl: "/assets/analysis/pitch.json",
    desc: "Rise and fall of notes",
    lowLabel: "Low notes ", highLabel: "High notes ",
    richDesc: "Pitch is the frequency of a sound wave — how many cycles per second (Hz). Human hearing spans roughly 20–20,000 Hz. In music, pitch rises and falls with melody. High pitches often feel light or tense; low pitches feel grounded or heavy. Research on cross-modal perception shows people instinctively map high pitches to elevated positions and small, light objects — which is why high notes often pair naturally with upward arm gestures.",
  },
  {
    id: "timbre", label: "Timbre", color: "#8b5cf6",
    audioUrl: "/assets/audio/timbre.wav",
    analysisUrl: "/assets/analysis/timbre.json",
    desc: "Texture and color of sound",
    lowLabel: "Warm / Mellow ", highLabel: "Bright / Sharp ",
    richDesc: "Timbre (tone color) is what makes a violin sound different from a flute playing the same note. It is defined by the mix of overtones (harmonics) above the fundamental frequency. Spectral brightness — energy concentrated in high harmonics — creates a sharp, cutting sound; a low-energy harmonic profile produces a warm, mellow tone. Electronically, timbre is measured via spectral centroid: where the \"center of mass\" of the spectrum lies.",
  },
  {
    id: "beat", label: "Beat", color: "#ef4444",
    audioUrl: "/assets/audio/beat.wav",
    analysisUrl: "/assets/analysis/beat.json",
    desc: "Rhythmic pulse",
    lowLabel: "Steady pulse ", highLabel: "Driving pulse ",
    richDesc: "The beat is music's rhythmic skeleton — the regular pulse you tap your foot to. Beats are detected as transient energy spikes in the audio signal. Strong, regular beats create drive and momentum; syncopated or irregular beats create surprise and tension. In dance, the beat is fundamental: every step, nod, and pulse aligns to it. Beat-driven animations use onset detection to trigger discrete movement events rather than continuous interpolation.",
  },
];

// All 6 effectors — shown for every signal type.
// Descriptions vary by context: continuous signals vs beat.
const DEMO_EFFECTORS = [
  {
    id: "arm_dance", name: "Arm Dance", icon: "🙌",
    continuousDesc: "Arms rise and fall smoothly with signal intensity",
    beatDesc: "Arms wave once on each rhythmic beat",
  },
  {
    id: "body_pump", name: "Body Pump", icon: "💪",
    continuousDesc: "Body inflates and deflates continuously with energy",
    beatDesc: "Body pulses bigger once per beat",
  },
  {
    id: "float", name: "Levitate", icon: "🎈",
    continuousDesc: "Character rises and falls with the signal level",
    beatDesc: "Character bounces up once on each beat",
  },
  {
    id: "face", name: "Face Expression", icon: "😮",
    continuousDesc: "Eyebrows and mouth open with signal intensity",
    beatDesc: "Eyebrows raise and mouth opens once per beat",
  },
  {
    id: "head_bob", name: "Head Nod", icon: "🎵",
    continuousDesc: "Nod rate increases as signal gets stronger",
    beatDesc: "Head nods once on each rhythmic pulse",
  },
  {
    id: "foot_tap", name: "Foot Tap", icon: "👟",
    continuousDesc: "Tap rate increases as signal gets louder/brighter",
    beatDesc: "Feet pulse bigger once on each beat",
  },
];

export default function DemoGallery({ onNext }) {
  const [selectedClip, setSelectedClip] = useState(MUSIC_CLIPS[0]);
  const [analysisData, setAnalysisData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const rafRef = useRef(null);

  // Load analysis data when clip changes
  useEffect(() => {
    setAnalysisData(null);
    fetch(selectedClip.analysisUrl)
      .then(r => r.json())
      .then(setAnalysisData)
      .catch(console.error);
  }, [selectedClip]);

  // Track audio time via rAF for smooth updates to all canvases
  useEffect(() => {
    const tick = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleSelectClip = (clip) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setSelectedClip(clip);
  };

  const handlePlay  = () => { audioRef.current?.play();  setIsPlaying(true);  };
  const handlePause = () => { audioRef.current?.pause(); setIsPlaying(false); };

  const fmtTime = (s) => `${Math.floor(s)}:${String(Math.floor((s % 1) * 60)).padStart(2, '0')}`;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // All 6 effectors shown for every signal type
  const isBeat = selectedClip.id === 'beat';
  const visibleEffectors = DEMO_EFFECTORS;

  return (
    <div style={styles.section}>
      <audio
        ref={audioRef}
        src={selectedClip.audioUrl}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => { setIsPlaying(false); }}
      />

      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Music Drives Movement</h2>
        <p style={styles.desc}>
          The same music can be expressed through many different body movements. Choose a music
          element, listen to a clip, and see how each movement responds — then design your own.
        </p>
      </div>

      {/* Audio player bar */}
      <div style={styles.playerBar}>
        {/* Clip selector tabs */}
        <div style={styles.clipTabs}>
          {MUSIC_CLIPS.map(clip => (
            <button
              key={clip.id}
              onClick={() => handleSelectClip(clip)}
              style={{
                ...styles.clipTab,
                ...(selectedClip.id === clip.id
                  ? { borderColor: clip.color, color: clip.color, background: `${clip.color}18` }
                  : {}),
              }}
            >
              <span style={{ fontWeight: 700 }}>{clip.label}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>{clip.desc}</span>
            </button>
          ))}
        </div>

        {/* Playback controls + progress bar with labels */}
        <div style={styles.controls}>
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            style={{ ...styles.playBtn, background: selectedClip.color }}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <div style={styles.progressCol}>
            <div style={styles.progressLabels}>
              <span style={styles.progressLabelL}>{selectedClip.lowLabel}</span>
              <span style={styles.progressLabelR}>{selectedClip.highLabel}</span>
            </div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${progress}%`, background: selectedClip.color }} />
            </div>
          </div>
          <span style={styles.timeDisplay}>{fmtTime(currentTime)} / {fmtTime(duration)}</span>
        </div>
      </div>

      {/* Rich educational description */}
      <div style={{ ...styles.richDesc, borderColor: `${selectedClip.color}40` }}>
        <div style={{ ...styles.richDescTag, background: `${selectedClip.color}20`, color: selectedClip.color }}>
          About {selectedClip.label}
        </div>
        <p style={styles.richDescText}>{selectedClip.richDesc}</p>
      </div>

      {/* Notice when no analysis loaded yet */}
      {!analysisData && (
        <div style={styles.loadingRow}>Loading analysis...</div>
      )}

      {/* Effector cards — all 6 for every signal type */}
      {analysisData && (
        <>
          <h3 style={styles.catLabel}>
            6 Movements driven by {selectedClip.label}
          </h3>
          <p style={styles.catDesc}>
            {isBeat
              ? 'All movements respond to the beat. Head Nod and Foot Tap fire once per pulse; the other four burst on each beat.'
              : `All movements respond to the ${selectedClip.label.toLowerCase()} signal. Head Nod and Foot Tap use frequency (faster = stronger signal); the other four respond smoothly.`}
          </p>
          <div style={styles.cardGrid}>
            {visibleEffectors.map(eff => (
              <DemoCard
                key={eff.id}
                eff={eff}
                analysisData={analysisData}
                externalTime={currentTime}
                playing={isPlaying}
                accentColor={selectedClip.color}
                musicType={selectedClip.id}
                isBeat={isBeat}
              />
            ))}
          </div>
        </>
      )}

      {/* CTA to move to Step 2 */}
      {onNext && (
        <div style={styles.nextRow}>
          <button style={styles.nextBtn} onClick={onNext}>
            Design Your Own Movement →
          </button>
          <p style={styles.nextHint}>
            Now it's your turn — create a custom pose or choose from presets.
          </p>
        </div>
      )}
    </div>
  );
}

function DemoCard({ eff, analysisData, externalTime, playing, accentColor, musicType, isBeat }) {
  const desc = isBeat ? eff.beatDesc : eff.continuousDesc;
  const modeLabel = isBeat
    ? (eff.id === 'head_bob' || eff.id === 'foot_tap' ? 'beat pulse' : 'beat burst')
    : (eff.id === 'head_bob' || eff.id === 'foot_tap' ? 'rate-based' : 'continuous');

  return (
    <div style={styles.card}>
      <div style={styles.cardCanvas}>
        <CharacterCanvas
          width={180}
          height={220}
          analysisData={analysisData}
          effectorId={eff.id}
          musicType={musicType}
          intensity={0.8}
          externalTime={externalTime}
          playing={playing}
        />
      </div>
      <div style={styles.cardInfo}>
        <span style={styles.cardIcon}>{eff.icon}</span>
        <span style={styles.cardName}>{eff.name}</span>
      </div>
      <p style={styles.cardDesc}>{desc}</p>
      <div style={{ ...styles.cardTag, borderColor: accentColor, color: accentColor }}>
        {modeLabel}
      </div>
    </div>
  );
}

const styles = {
  section: { paddingTop: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" },
  desc: { fontSize: 15, color: "#78716c", margin: 0, maxWidth: 640, lineHeight: 1.6 },

  playerBar: {
    background: "#fff",
    borderRadius: 16,
    border: "2px solid #e7e5e4",
    padding: "20px 24px",
    marginBottom: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  clipTabs: { display: "flex", gap: 10, flexWrap: "wrap" },
  clipTab: {
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    padding: "10px 16px", fontSize: 13, fontWeight: 600,
    background: "#fafaf9", border: "2px solid #e7e5e4",
    borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
    gap: 2, minWidth: 90,
  },
  controls: { display: "flex", alignItems: "center", gap: 12 },
  playBtn: {
    width: 40, height: 40, borderRadius: "50%", border: "none",
    color: "#fff", fontSize: 16, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  progressCol: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  progressLabels: { display: "flex", justifyContent: "space-between" },
  progressLabelL: { fontSize: 11, color: "#a8a29e", fontWeight: 600 },
  progressLabelR: { fontSize: 11, color: "#a8a29e", fontWeight: 600 },
  progressTrack: {
    height: 6, borderRadius: 3, background: "#e7e5e4", overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3, transition: "width 0.1s linear" },
  timeDisplay: { fontSize: 12, color: "#a8a29e", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" },

  richDesc: {
    background: "#fafaf9",
    border: "1.5px solid",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 36,
  },
  richDescTag: {
    display: "inline-block",
    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "3px 10px", borderRadius: 20, marginBottom: 10,
  },
  richDescText: { fontSize: 14, color: "#44403c", lineHeight: 1.7, margin: 0 },

  loadingRow: { color: "#a8a29e", fontSize: 14, padding: "24px 0" },

  catLabel: {
    fontSize: 13, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "#a8a29e", margin: "0 0 4px",
  },
  catDesc: { fontSize: 13, color: "#a8a29e", margin: "0 0 16px" },
  cardGrid: { display: "flex", flexWrap: "wrap", gap: 16 },

  card: {
    background: "#fff", borderRadius: 16, padding: "12px 12px 14px",
    border: "2px solid #e7e5e4", display: "flex",
    flexDirection: "column", alignItems: "center", width: 200,
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  },
  cardCanvas: { borderRadius: 10, overflow: "hidden", background: "#fafaf9", marginBottom: 8 },
  cardInfo: { display: "flex", alignItems: "center", gap: 6, marginBottom: 2 },
  cardIcon: { fontSize: 16 },
  cardName: { fontSize: 14, fontWeight: 700 },
  cardDesc: { fontSize: 11, color: "#78716c", textAlign: "center", margin: "0 0 8px", lineHeight: 1.4 },
  cardTag: {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
    padding: "2px 8px", borderRadius: 6, border: "1.5px solid",
  },

  nextRow: {
    marginTop: 64, textAlign: "center",
    padding: "40px", background: "#fff",
    borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    border: "2px solid #e7e5e4",
  },
  nextBtn: {
    padding: "16px 40px", fontSize: 17, fontWeight: 700,
    background: "#1c1917", color: "#fff",
    border: "none", borderRadius: 12, cursor: "pointer",
    boxShadow: "0 4px 12px rgba(28,25,23,0.2)",
  },
  nextHint: { fontSize: 13, color: "#a8a29e", margin: "12px 0 0" },
};
