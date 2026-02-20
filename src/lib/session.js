/**
 * Session Management Utilities
 * ============================
 * Handles session ID generation and URL parameter parsing.
 */

import { v4 as uuidv4 } from 'uuid';

export function generateSessionId() {
  return `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

export function getSessionFromURL() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('sessionId');
}

export function getConditionFromURL() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('condition') || 'default';
}
