'use client';

/**
 * IntentionBoard (Page 2 — Phase A)
 * ==================================
 * Lets users express multiple movement intentions before
 * designing a keyframe pose. Each intention can be a short
 * text description of how they want the character to move.
 *
 * Once they have at least one intention, they pick one to
 * "design" (proceed to PoseEditor).
 */

import { useState } from 'react';

const EXAMPLE_PROMPTS = [
  'Raise arms high when the music gets loud',
  'Bounce and pulse with the beat',
  'Sway gently like floating on water',
  'Crouch low then explode upward',
];

function makeIntention(text = '') {
  return { id: Date.now() + Math.random(), text };
}

export default function IntentionBoard({ onSelect, onSkip }) {
  const [intentions, setIntentions] = useState([makeIntention()]);

  const addIntention = () => {
    setIntentions(prev => [...prev, makeIntention()]);
  };

  const removeIntention = (id) => {
    setIntentions(prev => prev.filter(i => i.id !== id));
  };

  const updateText = (id, text) => {
    setIntentions(prev => prev.map(i => i.id === id ? { ...i, text } : i));
  };

  const useExample = (id, example) => {
    updateText(id, example);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h2 style={styles.title}>How should the character move?</h2>
        <p style={styles.desc}>
          Describe one or more ideas for how you want the character to react to music.
          You can add as many as you like — then choose one to turn into a pose design.
        </p>
      </div>

      <div style={styles.cards}>
        {intentions.map((intention, idx) => (
          <IntentionCard
            key={intention.id}
            intention={intention}
            index={idx}
            onTextChange={(text) => updateText(intention.id, text)}
            onRemove={intentions.length > 1 ? () => removeIntention(intention.id) : null}
            onUseExample={(ex) => useExample(intention.id, ex)}
            onSelect={() => onSelect(intention)}
          />
        ))}
      </div>

      <button style={styles.addBtn} onClick={addIntention}>
        + Add another idea
      </button>

      <div style={styles.footer}>
        <button style={styles.skipBtn} onClick={onSkip}>
          Skip — use a preset movement instead
        </button>
      </div>
    </div>
  );
}

function IntentionCard({ intention, index, onTextChange, onRemove, onUseExample, onSelect }) {
  const [showExamples, setShowExamples] = useState(false);

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardIndex}>Idea {index + 1}</span>
        {onRemove && (
          <button style={styles.removeBtn} onClick={onRemove}>✕</button>
        )}
      </div>

      <textarea
        style={styles.textarea}
        placeholder="Describe the movement… e.g. 'arms shoot up when the beat drops'"
        value={intention.text}
        onChange={e => onTextChange(e.target.value)}
        rows={3}
      />

      <div style={styles.exampleRow}>
        <button
          style={styles.exampleToggle}
          onClick={() => setShowExamples(v => !v)}
        >
          {showExamples ? '▲' : '▼'} Example prompts
        </button>
      </div>

      {showExamples && (
        <div style={styles.exampleList}>
          {EXAMPLE_PROMPTS.map(ex => (
            <button
              key={ex}
              style={styles.exampleChip}
              onClick={() => { onUseExample(ex); setShowExamples(false); }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <button
        style={{
          ...styles.selectBtn,
          opacity: intention.text.trim() ? 1 : 0.4,
          cursor: intention.text.trim() ? 'pointer' : 'not-allowed',
        }}
        disabled={!intention.text.trim()}
        onClick={onSelect}
      >
        Design a pose for this idea →
      </button>
    </div>
  );
}

const styles = {
  wrap: { paddingTop: 40 },
  header: { marginBottom: 36 },
  title: { fontSize: 28, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.02em' },
  desc: { fontSize: 15, color: '#78716c', margin: 0, maxWidth: 660, lineHeight: 1.6 },

  cards: { display: 'flex', flexDirection: 'column', gap: 20 },
  card: {
    background: '#fff', border: '2px solid #e7e5e4',
    borderRadius: 16, padding: '24px 24px 20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardIndex: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8a29e' },
  removeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#a8a29e', fontSize: 14, padding: '2px 6px', borderRadius: 6,
  },

  textarea: {
    width: '100%', minHeight: 80, padding: '12px 14px',
    fontSize: 14, lineHeight: 1.6, color: '#1c1917',
    border: '1.5px solid #e7e5e4', borderRadius: 10,
    background: '#fafaf9', resize: 'vertical', outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  },

  exampleRow: { marginTop: 10 },
  exampleToggle: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: '#a8a29e', fontWeight: 600, padding: 0,
  },
  exampleList: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 },
  exampleChip: {
    textAlign: 'left', padding: '8px 12px', fontSize: 13, color: '#44403c',
    background: '#fafaf9', border: '1px solid #e7e5e4', borderRadius: 8,
    cursor: 'pointer', transition: 'background 0.15s',
  },

  selectBtn: {
    marginTop: 16, width: '100%', padding: '12px 20px',
    fontSize: 14, fontWeight: 700,
    background: '#1c1917', color: '#fff',
    border: 'none', borderRadius: 10, transition: 'opacity 0.15s',
  },

  addBtn: {
    marginTop: 20, padding: '12px 24px',
    fontSize: 14, fontWeight: 600,
    background: '#fff', border: '2px dashed #d6d3d1',
    borderRadius: 12, cursor: 'pointer', color: '#78716c',
    width: '100%', transition: 'border-color 0.15s',
  },

  footer: { marginTop: 32, textAlign: 'center' },
  skipBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 13, color: '#a8a29e', textDecoration: 'underline',
  },
};
