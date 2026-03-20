'use client';

/**
 * GestureGallery (Step 1)
 * =======================
 * Browse movement styles - pure demonstration, no selection.
 * Provides reference for Step 2 mapping choices.
 */

import { useState } from "react";
import CharacterCanvas from "./CharacterCanvas";

const EFFECTOR_INFO = {
  arm_dance:  { name: "Arm Dance", description: "Arms rise and fall symmetrically", category: "continuous", icon: "🙌" },
  body_pump:  { name: "Body Pump", description: "Body inflates and deflates with energy", category: "continuous", icon: "💪" },
  float:      { name: "Levitate", description: "Character rises and falls vertically", category: "continuous", icon: "🎈" },
  face:       { name: "Face Expression", description: "Eyebrows lift and mouth opens with intensity", category: "continuous", icon: "😮" },
  head_bob:   { name: "Head Bob", description: "Head nods down on each beat pulse", category: "trigger", icon: "🎵" },
  foot_tap:   { name: "Foot Tap", description: "Feet pulse bigger on each beat", category: "trigger", icon: "👟" },
};

export default function GestureGallery({ analysisData }) {
  const continuous = Object.entries(EFFECTOR_INFO).filter(([, e]) => e.category === "continuous");
  const trigger = Object.entries(EFFECTOR_INFO).filter(([, e]) => e.category === "trigger");

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Browse Movement Styles</h2>
        <p style={styles.sectionDesc}>
          Explore different ways the character responds to music. These animations will be available
          in the Mapping Studio where you can assign them to musical elements.
        </p>
      </div>

      <h3 style={styles.categoryLabel}>Continuous Movements</h3>
      <p style={styles.categoryDesc}>These respond smoothly to ongoing musical features like volume and pitch.</p>
      <div style={styles.cardGrid}>
        {continuous.map(([id, eff]) => (
          <EffectorCard
            key={id}
            id={id}
            eff={eff}
            analysisData={analysisData}
          />
        ))}
      </div>

      <h3 style={{ ...styles.categoryLabel, marginTop: 48 }}>Trigger-based Movements</h3>
      <p style={styles.categoryDesc}>These fire on each beat or rhythmic pulse.</p>
      <div style={styles.cardGrid}>
        {trigger.map(([id, eff]) => (
          <EffectorCard
            key={id}
            id={id}
            eff={eff}
            analysisData={analysisData}
          />
        ))}
      </div>
    </div>
  );
}

function EffectorCard({ id, eff, analysisData }) {
  const [gifError, setGifError] = useState(false);
  const gifSrc = `/assets/gifs/${id}.gif`;

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardCanvas, position: "relative" }}>
        {!gifError ? (
          <img
            src={gifSrc}
            alt={eff.name}
            width={180}
            height={220}
            style={{ borderRadius: 10, objectFit: "cover", display: "block" }}
            onError={() => setGifError(true)}
          />
        ) : (
          <CharacterCanvas
            width={180}
            height={220}
            analysisData={analysisData}
            effectorId={id}
            intensity={0.8}
          />
        )}
        {id === "float" && (
          <div style={{
            position: "absolute",
            bottom: "20%",
            left: "8%",
            right: "8%",
            height: 2,
            background: "#3b82f6",
            borderRadius: 1,
            opacity: 0.85,
          }} />
        )}
      </div>
      <div style={styles.cardInfo}>
        <span style={styles.cardIcon}>{eff.icon}</span>
        <span style={styles.cardName}>{eff.name}</span>
      </div>
      <p style={styles.cardDesc}>{eff.description}</p>
    </div>
  );
}

export { EFFECTOR_INFO };

const styles = {
  section: { paddingTop: 40 },
  sectionHeader: { marginBottom: 36 },
  sectionTitle: { fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" },
  sectionDesc: { fontSize: 15, color: "#78716c", margin: "8px 0 0", maxWidth: 600, lineHeight: 1.6 },
  categoryLabel: { fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a8a29e", margin: "0 0 4px" },
  categoryDesc: { fontSize: 13, color: "#a8a29e", margin: "0 0 16px" },
  cardGrid: { display: "flex", flexWrap: "wrap", gap: 16 },
  card: {
    background: "#fff", borderRadius: 16, padding: 12,
    border: "2px solid #e7e5e4", transition: "all 0.2s",
    display: "flex", flexDirection: "column", alignItems: "center", width: 200,
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  },
  cardCanvas: { borderRadius: 10, overflow: "hidden", background: "#fafaf9", marginBottom: 8 },
  cardInfo: { display: "flex", alignItems: "center", gap: 6, marginBottom: 2 },
  cardIcon: { fontSize: 16 },
  cardName: { fontSize: 14, fontWeight: 700 },
  cardDesc: { fontSize: 11, color: "#78716c", textAlign: "center", margin: "0 0 8px", lineHeight: 1.4 },
};
