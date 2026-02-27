'use client';

/**
 * DesignStudio (Page 2)
 * =====================
 * Two-phase creative flow:
 *   Phase A: IntentionBoard — express movement intentions
 *   Phase B: Sketchpad     — draw movement ideas on top of the character
 *
 * When the user saves their pose design, calls onSave(keyframes).
 * If they skip, calls onSkip().
 */

import { useState } from 'react';
import IntentionBoard from './IntentionBoard';
import Sketchpad from './Sketchpad';

export default function DesignStudio({ sessionId, onSave, onSkip }) {
  // null = Phase A (intention board), non-null = Phase B (pose editor)
  const [selectedIntention, setSelectedIntention] = useState(null);

  const handleSelectIntention = (intention) => {
    setSelectedIntention(intention);
  };

  const handleBackToIntentions = () => {
    setSelectedIntention(null);
  };

  const handleSave = (payload) => {
    onSave({ ...payload, intentionText: selectedIntention?.text ?? '' });
  };

  if (selectedIntention !== null) {
    return (
      <Sketchpad
        intention={selectedIntention}
        onSave={handleSave}
        onBack={handleBackToIntentions}
      />
    );
  }

  return (
    <IntentionBoard
      onSelect={handleSelectIntention}
      onSkip={onSkip}
    />
  );
}
