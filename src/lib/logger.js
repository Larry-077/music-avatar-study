/**
 * Client-side Event Logger
 * ========================
 * Sends user interaction events to the /api/log endpoint.
 */

export async function logEvent(sessionId, eventType, data) {
  if (!sessionId) {
    console.warn('logEvent called without sessionId');
    return;
  }

  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        eventType,
        data,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('Failed to log event:', err);
  }
}
