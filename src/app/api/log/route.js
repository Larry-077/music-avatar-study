/**
 * API Route: POST /api/log
 * =========================
 * Records user events to Supabase database.
 * Handles both session metadata and individual events.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export async function POST(request) {
  try {
    // If Supabase is not configured, just return success (dev mode)
    if (!supabase) {
      console.log('[LOG] Supabase not configured, skipping event:', await request.json());
      return NextResponse.json({ success: true, dev: true });
    }

    const { sessionId, eventType, data, timestamp } = await request.json();

    // Validate input
    if (!sessionId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, eventType' },
        { status: 400 }
      );
    }

    // Handle session_start: create/update session record
    if (eventType === 'session_start') {
      const { error: sessionError } = await supabase
        .from('sessions')
        .upsert({
          id: sessionId,
          condition: data?.condition || 'default',
          started_at: timestamp,
          metadata: data,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (sessionError) {
        console.error('[API] Session upsert error:', sessionError);
        throw sessionError;
      }
    }

    // Handle session_end: update session record with duration and totals
    if (eventType === 'session_end') {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          ended_at: timestamp,
          duration_ms: data?.duration,
          total_mappings: data?.totalMappings,
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('[API] Session update error:', updateError);
        throw updateError;
      }
    }

    // Insert event record
    const { error: eventError } = await supabase
      .from('events')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        data: data,
        timestamp: timestamp,
      });

    if (eventError) {
      console.error('[API] Event insert error:', eventError);
      throw eventError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Log error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
