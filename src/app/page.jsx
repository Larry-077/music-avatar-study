'use client';

/**
 * Main Application Page
 * ====================
 * Music Avatar Studio with three-step formative study flow.
 * - Step 1: Demo Gallery — see how music drives many movement mappings
 * - Step 2: Design Studio — express intentions, design a custom keyframe pose
 * - Step 3: Mapping Studio — choose a mapping for each music element
 */

import { useState, useRef, useEffect, useCallback } from "react";
import DemoGallery from "@/components/DemoGallery";
import Sketchpad from "@/components/Sketchpad";
import MappingStudio from "@/components/MappingStudio";
import GifRecorder from "@/components/GifRecorder";
import UserInfoForm from "@/components/UserInfoForm";
import { generateSessionId, getSessionFromURL, getConditionFromURL } from "@/lib/session";
import { logEvent } from "@/lib/logger";

export default function App() {
  // Use #recorder in URL to access GIF recording tool
  const initialStep = typeof window !== 'undefined' && window.location.hash === "#recorder" ? 0 : 1;
  const [step, setStep] = useState(initialStep);
  const [sessionId, setSessionId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Page 2 output: custom keyframe pose + intention text passed to Page 3
  const [customKeyframePose, setCustomKeyframePose] = useState(null);
  const [customIntentionText, setCustomIntentionText] = useState(null);

  const [mappings, setMappings] = useState({
    volume: { effector: 'none', intensity: 0.5 },
    pitch:  { effector: 'none', intensity: 0.5 },
    timbre: { effector: 'none', intensity: 0.5 },
    beat:   { effector: 'none', intensity: 0.5 },
  });

  // Lifted from MappingStudio so it persists when navigating to page 3 and back
  const [confirmedMappings, setConfirmedMappings] = useState({
    volume: null, pitch: null, timbre: null, beat: null,
  });
  const sessionStartTime = useRef(null);

  // Initialize session and log session_start
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

    const handleBeforeUnload = () => {
      const duration = Date.now() - sessionStartTime.current;
      const totalMappings = Object.values(mappings).filter(m => m.effector && m.effector !== 'none').length;
      logEvent(sid, 'session_end', { duration, totalMappings, timestamp: Date.now() });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleStepChange = useCallback((newStep) => {
    if (sessionId) {
      logEvent(sessionId, 'step_change', { from: step, to: newStep, timestamp: Date.now() });
    }
    setStep(newStep);
  }, [step, sessionId]);

  const setMapping = useCallback((elemId, effectorId) => {
    setMappings(prev => ({ ...prev, [elemId]: { ...prev[elemId], effector: effectorId } }));
  }, []);

  const setIntensity = useCallback((elemId, val) => {
    setMappings(prev => ({ ...prev, [elemId]: { ...prev[elemId], intensity: val } }));
  }, []);

  const handleUserInfoSubmit = useCallback((name) => {
    setUserName(name);
    if (sessionId) {
      logEvent(sessionId, 'user_info_submitted', { userName: name, timestamp: Date.now() });
    }
  }, [sessionId]);

  // Called by Page 2 when the user finishes sketchpad design
  // Sketchpad passes { designs: { volume, pitch, timbre, beat } }
  const handleKeyframePoseSaved = useCallback(({ designs }) => {
    setCustomKeyframePose(null);
    setCustomIntentionText(null);
    if (sessionId) {
      logEvent(sessionId, 'keyframe_design', {
        designs,
        timestamp: Date.now(),
      });
    }
    // Don't navigate — Sketchpad shows completion modal inline
  }, [sessionId, handleStepChange]);

  const handleFinalSubmit = useCallback(() => {
    setSubmitted(true);
    if (sessionId) {
      logEvent(sessionId, 'final_submit', {
        userName,
        intentionText: customIntentionText,
        mappings,
        timestamp: Date.now(),
      });
    }
  }, [sessionId, userName, customIntentionText, mappings, customKeyframePose]);

  return (
    <div style={styles.app}>
      {/* User info form (shown before start) */}
      {!userName && step !== 0 && (
        <UserInfoForm onSubmit={handleUserInfoSubmit} />
      )}

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
            Explore Examples
          </button>
          <div style={styles.stepDivider} />
          <button
            onClick={() => handleStepChange(2)}
            style={{ ...styles.stepBtn, ...(step === 2 ? styles.stepBtnActive : {}) }}
          >
            <span style={styles.stepNum}>2</span>
            Mapping Studio
          </button>
          <div style={styles.stepDivider} />
          <button
            onClick={() => handleStepChange(3)}
            style={{ ...styles.stepBtn, ...(step === 3 ? styles.stepBtnActive : {}) }}
          >
            <span style={styles.stepNum}>3</span>
            Design Your Own
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={styles.main}>
        {step === 0 && (
          <GifRecorder />
        )}

        {step === 1 && (
          <DemoGallery onNext={() => handleStepChange(2)} />
        )}

        {step === 2 && (
          <>
            <MappingStudio
              mappings={mappings}
              setMapping={setMapping}
              setIntensity={setIntensity}
              sessionId={sessionId}
              customKeyframePose={customKeyframePose}
              confirmedMappings={confirmedMappings}
              setConfirmedMappings={setConfirmedMappings}
            />

            {/* Final submission */}
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

        {step === 3 && (
          <Sketchpad
            sessionId={sessionId}
            onSave={handleKeyframePoseSaved}
            onSkip={() => handleStepChange(2)}
          />
        )}
      </main>
    </div>
  );
}

const styles = {
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
    marginTop: 64, padding: "40px", background: "#fff",
    borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
  },
  finalSubmitBtn: {
    padding: "16px 48px", fontSize: 18, fontWeight: 700,
    background: "#f59e0b", color: "#fff", border: "none",
    borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
  },
  finalSubmitBtnSubmitted: {
    background: "#10b981", cursor: "default",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
  },
  thankYou: { fontSize: 15, color: "#10b981", margin: 0, fontWeight: 600 },
};
