'use client';

/**
 * GestureGallery (Step 1)
 * =======================
 * Browse movement styles - pure demonstration, no selection.
 * Provides reference for Step 2 mapping choices.
 */

import { useState } from "react";
import CharacterCanvas from "./CharacterCanvas";

// All 6 effectors work with both continuous signals AND beat.
// With continuous signals: arm_dance/body_pump/float/face respond smoothly;
//   foot_tap and head_bob respond with rate proportional to signal intensity.
// With beat: head_bob/foot_tap fire on each pulse;
//   arm_dance/body_pump/float/face fire a one-shot burst on each beat.
const EFFECTOR_INFO = {
  arm_dance:  { name: "Arm Dance",       description: "Arms rise/fall continuously · one wave per beat",       category: "all", icon: "🙌" },
  body_pump:  { name: "Body Pump",       description: "Body inflates/deflates continuously · one pulse per beat", category: "all", icon: "💪" },
  float:      { name: "Levitate",        description: "Rises/falls with signal intensity · one bounce per beat", category: "all", icon: "🎈" },
  face:       { name: "Face Expression", description: "Eyebrows/mouth open continuously · one flash per beat",  category: "all", icon: "😮" },
  head_bob:   { name: "Head Nod",        description: "Nod rate increases with signal · one nod per beat",      category: "all", icon: "🎵" },
  foot_tap:   { name: "Foot Tap",        description: "Tap rate increases with signal · one tap per beat",      category: "all", icon: "👟" },
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
