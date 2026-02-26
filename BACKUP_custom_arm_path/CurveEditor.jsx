'use client';

/**
 * CurveEditor
 * ===========
 * Interactive canvas for drawing a 2D arm trajectory path.
 * The drawn path drives the CustomArmPath effector.
 * With event logging for research data collection.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import { logEvent } from "@/lib/logger";
import { CharacterRig } from "../character/character_rig";
import { CustomArmPath } from "../engine/effectors";

const CANVAS_W = 280;
const CANVAS_H = 340;

// Shoulder pivot in canvas coords
const SHOULDER_X = CANVAS_W / 2;
const SHOULDER_Y = CANVAS_H * 0.12;
const MAX_REACH_PX = CANVAS_H * 0.65;

export default function CurveEditor({ path, onPathChange, sessionId }) {
  const gridCanvasRef = useRef(null);  // Bottom layer: grid + path
  const charCanvasRef = useRef(null);  // Top layer: character
  const characterRef = useRef(null);
  const animRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [previewValue, setPreviewValue] = useState(0.5);  // 0-1 for slider
  const rawPointsRef = useRef([]);

  const getCanvasPos = useCallback((e) => {
    const rect = gridCanvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handleStart = useCallback((e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    rawPointsRef.current = [pos];
    setIsDrawing(true);

    // Log draw start
    logEvent(sessionId, 'curve_draw_start', { timestamp: Date.now() });
  }, [getCanvasPos, sessionId]);

  const handleMove = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    rawPointsRef.current.push(pos);
  }, [isDrawing, getCanvasPos]);

  const handleEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const raw = rawPointsRef.current;
    if (raw.length < 3) return;

    // Downsample to ~60 evenly-spaced points and normalize to 0-1
    const sampled = resamplePath(raw, 60);
    const normalized = sampled.map((p) => ({
      x: p.x / CANVAS_W,
      y: p.y / CANVAS_H,
    }));

    // Log the completed path
    logEvent(sessionId, 'custom_arm_path', {
      path: normalized,
      pointCount: normalized.length,
      timestamp: Date.now(),
    });

    onPathChange(normalized);
  }, [isDrawing, onPathChange, sessionId]);

  const handleClear = useCallback(() => {
    logEvent(sessionId, 'curve_clear', { timestamp: Date.now() });
    onPathChange([]);
  }, [onPathChange, sessionId]);

  // Initialize character
  useEffect(() => {
    let cancelled = false;
    async function initChar() {
      const rig = new CharacterRig();
      await rig.init();
      if (cancelled) return;
      // Scale and position character to fit editor
      rig.setScreenPosition(CANVAS_W / 2, CANVAS_H * 0.15);
      rig.root.setScale(0.28, 0.28);
      characterRef.current = rig;
    }
    initChar();
    return () => { cancelled = true; };
  }, []);

  // Render bottom layer: grid + path
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background
    ctx.fillStyle = "#fafaf9";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid
    ctx.strokeStyle = "#e7e5e4";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // Arm reach circle
    ctx.strokeStyle = "#d6d3d1";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(SHOULDER_X, SHOULDER_Y, MAX_REACH_PX, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Shoulder pivot
    ctx.fillStyle = "#78716c";
    ctx.beginPath();
    ctx.arc(SHOULDER_X, SHOULDER_Y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a8a29e";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Shoulder", SHOULDER_X, SHOULDER_Y - 10);

    // Draw the stored path
    if (path && path.length >= 2) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(path[0].x * CANVAS_W, path[0].y * CANVAS_H);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * CANVAS_W, path[i].y * CANVAS_H);
      }
      ctx.stroke();

      // Start marker
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.arc(path[0].x * CANVAS_W, path[0].y * CANVAS_H, 5, 0, Math.PI * 2);
      ctx.fill();

      // End marker
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(path[path.length - 1].x * CANVAS_W, path[path.length - 1].y * CANVAS_H, 5, 0, Math.PI * 2);
      ctx.fill();

      // Preview point (current slider position)
      const idx = Math.min(
        Math.floor(previewValue * (path.length - 1)),
        path.length - 1
      );
      const p = path[idx];
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(p.x * CANVAS_W, p.y * CANVAS_H, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw in-progress raw stroke
    if (isDrawing && rawPointsRef.current.length >= 2) {
      const raw = rawPointsRef.current;
      ctx.strokeStyle = "#f59e0b88";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(raw[0].x, raw[0].y);
      for (let i = 1; i < raw.length; i++) {
        ctx.lineTo(raw[i].x, raw[i].y);
      }
      ctx.stroke();
    }
  }, [path, isDrawing, previewValue]);

  // Render top layer: character animation
  useEffect(() => {
    const canvas = charCanvasRef.current;
    if (!canvas || !characterRef.current) return;

    const ctx = canvas.getContext('2d');
    const char = characterRef.current;

    const animate = () => {
      // If path exists, calculate arm position
      if (path && path.length >= 2) {
        const effector = new CustomArmPath();
        effector.setPath(path);
        effector.update(previewValue, char);
      } else {
        // No path - reset to default pose
        char.resetToDefault();
      }

      char.update();  // Update animations (blink, etc.)

      // Draw
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      char.draw(ctx);

      // Draw hand position indicator
      const leftHand = char.bones.find(b => b.name === "Hand_L");
      if (leftHand) {
        const [hx, hy] = leftHand.getWorldPos();
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(hx, hy, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [path, previewValue]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.label}>Draw arm trajectory</div>

      {/* Dual Canvas Container */}
      <div style={styles.canvasContainer}>
        {/* Bottom layer: Grid + Path */}
        <canvas
          ref={gridCanvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={styles.gridCanvas}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />

        {/* Top layer: Character */}
        <canvas
          ref={charCanvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={styles.charCanvas}
        />
      </div>

      {/* Preview slider (only shown when path exists) */}
      {path && path.length >= 2 && (
        <div style={styles.previewControl}>
          <label style={styles.previewLabel}>
            Preview position: {(previewValue * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={previewValue * 100}
            onChange={(e) => setPreviewValue(e.target.value / 100)}
            style={styles.previewSlider}
          />
        </div>
      )}

      <div style={styles.legend}>
        <span style={{ ...styles.dot, background: "#16a34a" }} /> Start (signal=0)
        <span style={{ ...styles.dot, background: "#10b981", marginLeft: 8 }} /> Preview
        <span style={{ ...styles.dot, background: "#ef4444", marginLeft: 8 }} /> End (signal=1)
      </div>

      <button
        style={styles.clearBtn}
        onClick={handleClear}
      >
        Clear Path
      </button>
    </div>
  );
}

/**
 * Resample a polyline into N evenly-spaced points.
 */
function resamplePath(points, n) {
  if (points.length < 2) return points;

  // Compute cumulative arc-length
  const cumLen = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLen = cumLen[cumLen.length - 1];
  if (totalLen < 1) return points;

  const result = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const targetLen = (i / (n - 1)) * totalLen;
    while (j < cumLen.length - 2 && cumLen[j + 1] < targetLen) j++;
    const segLen = cumLen[j + 1] - cumLen[j];
    const t = segLen > 0 ? (targetLen - cumLen[j]) / segLen : 0;
    result.push({
      x: points[j].x + (points[j + 1].x - points[j].x) * t,
      y: points[j].y + (points[j + 1].y - points[j].y) * t,
    });
  }
  return result;
}

const styles = {
  wrapper: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  },
  label: {
    fontSize: 11, fontWeight: 600, color: "#78716c", textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  canvasContainer: {
    position: "relative",
    width: CANVAS_W,
    height: CANVAS_H,
  },
  gridCanvas: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: 12,
    border: "2px solid #e7e5e4",
    cursor: "crosshair",
    touchAction: "none",
    zIndex: 1,
  },
  charCanvas: {
    position: "absolute",
    top: 0,
    left: 0,
    pointerEvents: "none",
    opacity: 0.7,
    zIndex: 2,
  },
  previewControl: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    width: "100%",
    maxWidth: CANVAS_W,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#78716c",
  },
  previewSlider: {
    width: "100%",
    accentColor: "#10b981",
  },
  legend: {
    fontSize: 10, color: "#a8a29e", display: "flex", alignItems: "center", gap: 4,
  },
  dot: {
    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
  },
  clearBtn: {
    padding: "6px 16px", fontSize: 12, fontWeight: 600, background: "#f3f4f6",
    color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer",
  },
};
