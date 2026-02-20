/**
 * API Route: GET /api/sessions
 * =============================
 * Query sessions and events (for researchers).
 *
 * Usage:
 *   GET /api/sessions              → all sessions
 *   GET /api/sessions?sessionId=X  → events for session X
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export async function GET(request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // Query events for a specific session
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return NextResponse.json({ session_id: sessionId, events: data });
    } else {
      // Query all sessions
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ sessions: data });
    }
  } catch (error) {
    console.error('[API] Sessions query error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
