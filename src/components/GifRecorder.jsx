'use client';

/**
 * GifRecorder
 * ===========
 * Utility page to record each effector animation as a GIF.
 * Access via step=0 or /recorder route.
 *
 * Usage: Click "Record" on any effector card to capture ~3 seconds of animation
 * as a GIF. The GIF auto-downloads. Place the downloaded files in public/assets/gifs/.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import GIF from "gif.js";
import { CharacterRig } from "../character/character_rig.js";
import { BindingEngine } from "../engine/binder.js";

const EFFECTOR_LIST = [
  { id: "arm_dance", name: "Arm Dance", category: "continuous" },
  { id: "body_pump", name: "Body Pump", category: "continuous" },
  { id: "float", name: "Levitate", category: "continuous" },
  { id: "face", name: "Face Expression", category: "continuous" },
  { id: "head_bob", name: "Head Bob", category: "trigger" },
  { id: "foot_tap", name: "Foot Tap", category: "trigger" },
];

// Canvas dimensions for GIF output
const GIF_WIDTH = 360;
const GIF_HEIGHT = 440;
const RECORD_DURATION = 3.0; // seconds
const RECORD_FPS = 20;

export default function GifRecorder({ analysisData }) {
  const [recording, setRecording] = useState(null); // effector id being recorded
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const recordEffector = useCallback(
    async (effectorId) => {
      if (!analysisData) {
        setStatus("No analysis data loaded");
        return;
      }

      setRecording(effectorId);
      setProgress(0);
      setStatus(`Recording ${effectorId}...`);

      // Create offscreen canvas
      const canvas = document.createElement("canvas");
      canvas.width = GIF_WIDTH;
      canvas.height = GIF_HEIGHT;
      const ctx = canvas.getContext("2d");

      // Create character and engine
      const rig = new CharacterRig();
      await rig.init();
      rig.setScreenPosition(400, 420);

      const engine = new BindingEngine(analysisData);
      engine.clearBindings();

      // Bind appropriate signal
      const eff = engine.effectors[effectorId];
      if (eff && typeof eff.trigger === "function") {
        engine.setBinding("beat", effectorId);
      } else {
        engine.setBinding("pitch", effectorId);
      }

      // Design space scaling (same as CharacterCanvas)
      const DESIGN_W = 800;
      const DESIGN_H = 700;
      const scale = Math.min(GIF_WIDTH / DESIGN_W, GIF_HEIGHT / DESIGN_H);

      // Create GIF encoder
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: GIF_WIDTH,
        height: GIF_HEIGHT,
        workerScript: "/gif.worker.js",
      });

      // Record frames
      const totalFrames = Math.floor(RECORD_DURATION * RECORD_FPS);
      const frameDt = 1.0 / RECORD_FPS;
      let time = 0;

      for (let i = 0; i < totalFrames; i++) {
        time += frameDt;

        // Update engine and character
        engine.update(time, frameDt, rig);
        rig.update();

        // Draw
        ctx.clearRect(0, 0, GIF_WIDTH, GIF_HEIGHT);
        ctx.fillStyle = "#fafaf9";
        ctx.fillRect(0, 0, GIF_WIDTH, GIF_HEIGHT);

        ctx.save();
        ctx.scale(scale, scale);
        const offsetX = (GIF_WIDTH / scale - DESIGN_W) / 2;
        const offsetY = (GIF_HEIGHT / scale - DESIGN_H) / 2;
        ctx.translate(offsetX, offsetY);
        rig.draw(ctx);
        ctx.restore();

        // Add frame to GIF
        gif.addFrame(ctx, { copy: true, delay: Math.round(1000 / RECORD_FPS) });

        setProgress(Math.round(((i + 1) / totalFrames) * 100));
      }

      // Render GIF
      setStatus(`Encoding ${effectorId} GIF...`);

      gif.on("finished", (blob) => {
        // Auto-download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${effectorId}.gif`;
        a.click();
        URL.revokeObjectURL(url);

        setRecording(null);
        setProgress(100);
        setStatus(`${effectorId}.gif downloaded!`);
      });

      gif.render();
    },
    [analysisData]
  );

  const recordAll = useCallback(async () => {
    for (const eff of EFFECTOR_LIST) {
      await new Promise((resolve) => {
        const origOnFinished = () => resolve();

        // We need to wait for each one to complete
        const doRecord = async () => {
          if (!analysisData) return resolve();

          setRecording(eff.id);
          setProgress(0);
          setStatus(`Recording ${eff.id}...`);

          const canvas = document.createElement("canvas");
          canvas.width = GIF_WIDTH;
          canvas.height = GIF_HEIGHT;
          const ctx = canvas.getContext("2d");

          const rig = new CharacterRig();
          await rig.init();
          rig.setScreenPosition(400, 420);

          const engine = new BindingEngine(analysisData);
          engine.clearBindings();
          const effObj = engine.effectors[eff.id];
          if (effObj && typeof effObj.trigger === "function") {
            engine.setBinding("beat", eff.id);
          } else {
            engine.setBinding("pitch", eff.id);
          }

          const DESIGN_W = 800;
          const DESIGN_H = 700;
          const scale = Math.min(GIF_WIDTH / DESIGN_W, GIF_HEIGHT / DESIGN_H);

          const gif = new GIF({
            workers: 2,
            quality: 10,
            width: GIF_WIDTH,
            height: GIF_HEIGHT,
            workerScript: "/gif.worker.js",
          });

          const totalFrames = Math.floor(RECORD_DURATION * RECORD_FPS);
          const frameDt = 1.0 / RECORD_FPS;
          let time = 0;

          for (let i = 0; i < totalFrames; i++) {
            time += frameDt;
            engine.update(time, frameDt, rig);
            rig.update();

            ctx.clearRect(0, 0, GIF_WIDTH, GIF_HEIGHT);
            ctx.fillStyle = "#fafaf9";
            ctx.fillRect(0, 0, GIF_WIDTH, GIF_HEIGHT);

            ctx.save();
            ctx.scale(scale, scale);
            const offsetX = (GIF_WIDTH / scale - DESIGN_W) / 2;
            const offsetY = (GIF_HEIGHT / scale - DESIGN_H) / 2;
            ctx.translate(offsetX, offsetY);
            rig.draw(ctx);
            ctx.restore();

            gif.addFrame(ctx, { copy: true, delay: Math.round(1000 / RECORD_FPS) });
            setProgress(Math.round(((i + 1) / totalFrames) * 100));
          }

          setStatus(`Encoding ${eff.id} GIF...`);
          gif.on("finished", (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${eff.id}.gif`;
            a.click();
            URL.revokeObjectURL(url);
            resolve();
          });
          gif.render();
        };

        doRecord();
      });
    }

    setRecording(null);
    setStatus("All GIFs recorded! Move them to public/assets/gifs/");
  }, [analysisData]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>GIF Recorder</h2>
        <p style={styles.desc}>
          Record each effector animation as a GIF file ({GIF_WIDTH}x{GIF_HEIGHT}, {RECORD_DURATION}s, {RECORD_FPS}fps).
          <br />
          Downloaded GIFs should be placed in <code>public/assets/gifs/</code>.
        </p>
        <button style={styles.recordAllBtn} onClick={recordAll} disabled={!!recording}>
          Record All GIFs
        </button>
      </div>

      {recording && (
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          <span style={styles.progressText}>{status} ({progress}%)</span>
        </div>
      )}

      {!recording && status && (
        <div style={styles.statusMsg}>{status}</div>
      )}

      <div style={styles.grid}>
        {EFFECTOR_LIST.map((eff) => (
          <div key={eff.id} style={styles.card}>
            <div style={styles.cardName}>{eff.name}</div>
            <div style={styles.cardId}>{eff.id}.gif</div>
            <button
              style={styles.recordBtn}
              onClick={() => recordEffector(eff.id)}
              disabled={!!recording}
            >
              {recording === eff.id ? `Recording... ${progress}%` : "Record"}
            </button>
          </div>
        ))}
      </div>

      <div style={styles.instructions}>
        <h3>After recording:</h3>
        <ol>
          <li>GIF files auto-download to your Downloads folder</li>
          <li>Move them to: <code>web/public/assets/gifs/</code></li>
          <li>
            Expected files:
            <ul>
              {EFFECTOR_LIST.map((e) => (
                <li key={e.id}><code>{e.id}.gif</code></li>
              ))}
            </ul>
          </li>
          <li>The Gesture Gallery will automatically use them</li>
        </ol>
      </div>
    </div>
  );
}

// Adjust these to change the GIF output:
export { GIF_WIDTH, GIF_HEIGHT, RECORD_DURATION, RECORD_FPS };

const styles = {
  container: { padding: "40px 0" },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 700, margin: "0 0 8px" },
  desc: { fontSize: 14, color: "#78716c", lineHeight: 1.6 },
  recordAllBtn: {
    marginTop: 16, padding: "12px 28px", fontSize: 14, fontWeight: 700,
    background: "#ef4444", color: "#fff", border: "none", borderRadius: 10,
    cursor: "pointer",
  },
  progressBar: {
    position: "relative", height: 36, background: "#e5e7eb", borderRadius: 8,
    marginBottom: 24, overflow: "hidden",
  },
  progressFill: {
    position: "absolute", top: 0, left: 0, height: "100%",
    background: "#f59e0b", borderRadius: 8, transition: "width 0.1s",
  },
  progressText: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 600, color: "#1c1917",
  },
  statusMsg: {
    padding: "12px 16px", background: "#dcfce7", borderRadius: 8,
    fontSize: 14, fontWeight: 600, color: "#166534", marginBottom: 24,
  },
  grid: { display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32 },
  card: {
    background: "#fff", borderRadius: 12, padding: "16px 20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", width: 180,
    display: "flex", flexDirection: "column", gap: 8,
  },
  cardName: { fontSize: 15, fontWeight: 700 },
  cardId: { fontSize: 12, color: "#a8a29e", fontFamily: "monospace" },
  recordBtn: {
    padding: "8px 16px", fontSize: 13, fontWeight: 600,
    background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8,
    cursor: "pointer",
  },
  instructions: {
    background: "#fff", borderRadius: 12, padding: 24,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    fontSize: 14, lineHeight: 1.8,
  },
};
