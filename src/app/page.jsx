'use client';

/**
 * Main Application Page
 * ====================
 * Music Avatar Studio with two-step formative study flow.
 * - Step 1: Browse movement styles (pure demonstration)
 * - Step 2: Map movements to music elements
 */

import { useState, useRef, useEffect, useCallback } from "react";
import GestureGallery from "@/components/GestureGallery";
import MappingStudio from "@/components/MappingStudio";
import GifRecorder from "@/components/GifRecorder";
import UserInfoForm from "@/components/UserInfoForm";
import { generateSessionId, getSessionFromURL, getConditionFromURL } from "@/lib/session";
import { logEvent } from "@/lib/logger";

const ANALYSIS_URL = "/assets/analysis/test3.json";
const AUDIO_URL = "/assets/audio/test3.wav";

export default function App() {
  // Use #recorder in URL to access GIF recording tool
  const initialStep = typeof window !== 'undefined' && window.location.hash === "#recorder" ? 0 : 1;
  const [step, setStep] = useState(initialStep);
  const [sessionId, setSessionId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState({
    volume: { effector: null, intensity: 0.7 },
    pitch: { effector: null, intensity: 0.7 },
    timbre: { effector: null, intensity: 0.7 },
    beat: { effector: null, intensity: 0.7 },
  });
  const [customArmPath, setCustomArmPath] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicTime, setMusicTime] = useState(0);
  const audioRef = useRef(null);
  const timeUpdateRef = useRef(null);
  const sessionStartTime = useRef(null);

  // Initialize session ID and log session start
  useEffect(() => {
    const sid = getSessionFromURL() || generateSessionId();
    setSessionId(sid);
    sessionStartTime.current = Date.now();

    const condition = getConditionFromURL();
    logEvent(sid, 'session_start', {
      condition,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    });

    // Log session end on page unload
    const handleBeforeUnload = () => {
      const duration = Date.now() - sessionStartTime.current;
      const totalMappings = Object.values(mappings).filter(m => m.effector !== null).length;
      logEvent(sid, 'session_end', {
        duration,
        totalMappings,
        timestamp: Date.now(),
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Load analysis JSON
  useEffect(() => {
    fetch(ANALYSIS_URL)
      .then((res) => res.json())
      .then((data) => {
        setAnalysisData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load analysis data:", err);
        setLoading(false);
      });
  }, []);

  // Track audio time
  useEffect(() => {
    const update = () => {
      if (audioRef.current && !audioRef.current.paused) {
        setMusicTime(audioRef.current.currentTime);
      }
      timeUpdateRef.current = requestAnimationFrame(update);
    };
    timeUpdateRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(timeUpdateRef.current);
  }, []);

  // Log step changes
  const handleStepChange = useCallback((newStep) => {
    if (sessionId) {
      logEvent(sessionId, 'step_change', {
        from: step,
        to: newStep,
        timestamp: Date.now(),
      });
    }
    setStep(newStep);
  }, [step, sessionId]);

  const setMapping = useCallback((elemId, effectorId) => {
    setMappings((prev) => ({
      ...prev,
      [elemId]: { ...prev[elemId], effector: effectorId },
    }));
  }, []);

  const setIntensity = useCallback((elemId, val) => {
    setMappings((prev) => ({
      ...prev,
      [elemId]: { ...prev[elemId], intensity: val },
    }));
  }, []);

  const handlePlay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setMusicTime(0);
    }
  }, []);

  const handleUserInfoSubmit = useCallback((name) => {
    setUserName(name);
    if (sessionId) {
      logEvent(sessionId, 'user_info_submitted', {
        userName: name,
        timestamp: Date.now(),
      });
    }
  }, [sessionId]);

  const handleFinalSubmit = useCallback(() => {
    setSubmitted(true);
    if (sessionId) {
      logEvent(sessionId, 'final_submit', {
        userName,
        mappings,
        customArmPath,
        timestamp: Date.now(),
      });
    }
  }, [sessionId, userName, mappings, customArmPath]);

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingText}>Loading Music Avatar Studio...</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* User info form (shown before start) */}
      {!userName && step !== 0 && (
        <UserInfoForm onSubmit={handleUserInfoSubmit} />
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} src={AUDIO_URL} preload="auto" />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.logo}>
            <span style={{ color: "#f59e0b" }}>&diams;</span> Music Avatar Studio
          </h1>
          <p style={styles.subtitle}>Formative Study — Movement-Music Mapping</p>
        </div>
        <div style={styles.steps}>
          <button
            onClick={() => handleStepChange(1)}
            style={{ ...styles.stepBtn, ...(step === 1 ? styles.stepBtnActive : {}) }}
          >
            <span style={styles.stepNum}>1</span>
            Browse Movements
          </button>
          <div style={styles.stepDivider} />
          <button
            onClick={() => handleStepChange(2)}
            style={{ ...styles.stepBtn, ...(step === 2 ? styles.stepBtnActive : {}) }}
          >
            <span style={styles.stepNum}>2</span>
            Mapping Studio
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={styles.main}>
        {step === 0 && (
          <GifRecorder analysisData={analysisData} />
        )}
        {step === 1 && (
          <GestureGallery analysisData={analysisData} />
        )}
        {step === 2 && (
          <>
            <MappingStudio
              mappings={mappings}
              setMapping={setMapping}
              setIntensity={setIntensity}
              analysisData={analysisData}
              audioRef={audioRef}
              isPlaying={isPlaying}
              onPlay={handlePlay}
              onPause={handlePause}
              onReset={handleReset}
              musicTime={musicTime}
              customArmPath={customArmPath}
              onCustomArmPathChange={setCustomArmPath}
              sessionId={sessionId}
            />

            {/* Final submission section */}
            <div style={styles.submitSection}>
              <button
                style={{
                  ...styles.finalSubmitBtn,
                  ...(submitted ? styles.finalSubmitBtnSubmitted : {}),
                }}
                onClick={handleFinalSubmit}
                disabled={submitted}
              >
                {submitted ? '✓ Submitted' : 'Submit My Mappings'}
              </button>
              {submitted && (
                <p style={styles.thankYou}>
                  Thank you! Your responses have been recorded.
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  loadingScreen: {
    display: "flex", alignItems: "center", justifyContent: "center",
    height: "100vh", background: "#1c1917",
  },
  loadingText: { color: "#fafaf9", fontSize: 18, fontWeight: 600 },
  app: {
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    background: "#fafaf9", minHeight: "100vh", color: "#1c1917",
  },
  header: {
    background: "#1c1917", padding: "28px 0 0 0",
    position: "sticky", top: 0, zIndex: 100,
  },
  headerInner: { maxWidth: 1100, margin: "0 auto", padding: "0 32px 16px" },
  logo: { fontSize: 22, fontWeight: 700, color: "#fafaf9", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#a8a29e", margin: "4px 0 0" },
  steps: {
    display: "flex", alignItems: "center", maxWidth: 1100,
    margin: "0 auto", padding: "0 32px", gap: 0,
  },
  stepBtn: {
    padding: "12px 24px", fontSize: 14, fontWeight: 600, color: "#a8a29e",
    background: "transparent", border: "none", borderBottom: "3px solid transparent",
    cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
  },
  stepBtnActive: { color: "#fafaf9", borderBottomColor: "#f59e0b" },
  stepNum: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 22, height: 22, borderRadius: "50%", background: "#292524",
    fontSize: 11, fontWeight: 700,
  },
  stepDivider: { width: 32, height: 1, background: "#44403c" },
  main: { maxWidth: 1100, margin: "0 auto", padding: "0 32px 80px" },
  submitSection: {
    marginTop: 64,
    padding: "40px",
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  finalSubmitBtn: {
    padding: "16px 48px",
    fontSize: 18,
    fontWeight: 700,
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
  },
  finalSubmitBtnSubmitted: {
    background: "#10b981",
    cursor: "default",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
  },
  thankYou: {
    fontSize: 15,
    color: "#10b981",
    margin: 0,
    fontWeight: 600,
  },
};
