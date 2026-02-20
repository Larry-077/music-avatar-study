'use client';

/**
 * UserInfoForm
 * ============
 * Entry form to collect user name before they start the study.
 * Displayed as a modal overlay on initial page load.
 */

import { useState } from 'react';

export default function UserInfoForm({ onSubmit }) {
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    onSubmit(userName.trim());
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h2 style={styles.title}>Welcome to Music Avatar Studio</h2>
        <p style={styles.subtitle}>
          Before we begin, please tell us your name
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              setError(''); // Clear error on input
            }}
            style={styles.input}
            autoFocus
          />
          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.submitBtn}>
            Start Exploration
          </button>
        </form>

        <p style={styles.privacy}>
          Your responses will be used for research purposes only.
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(28, 25, 23, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  card: {
    background: '#fafaf9',
    borderRadius: 20,
    padding: '48px 40px',
    maxWidth: 480,
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: '0 0 8px',
    textAlign: 'center',
    color: '#1c1917',
  },
  subtitle: {
    fontSize: 15,
    color: '#78716c',
    textAlign: 'center',
    margin: '0 0 32px',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    padding: '14px 18px',
    fontSize: 16,
    border: '2px solid #e7e5e4',
    borderRadius: 10,
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  submitBtn: {
    padding: '14px',
    fontSize: 16,
    fontWeight: 700,
    background: '#f59e0b',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    marginTop: 8,
    transition: 'background 0.2s',
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
    margin: 0,
    textAlign: 'center',
  },
  privacy: {
    fontSize: 12,
    color: '#a8a29e',
    textAlign: 'center',
    margin: '24px 0 0',
    lineHeight: 1.5,
  },
};
