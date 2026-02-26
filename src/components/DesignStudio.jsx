'use client';

/**
 * DesignStudio (Page 2)
 * =====================
 * Two-phase creative flow:
 *   Phase A: IntentionBoard — express movement intentions
 *   Phase B: PoseEditor    — design 3 keyframe poses for a chosen intention
 *
 * When the user saves their pose design, calls onSave(keyframes).
 * If they skip, calls onSkip().
 */

import { useState } from 'react';
import IntentionBoard from './IntentionBoard';
import PoseEditor from './PoseEditor';

export default function DesignStudio({ sessionId, onSave, onSkip }) {
  // null = Phase A (intention board), non-null = Phase B (pose editor)
  const [selectedIntention, setSelectedIntention] = useState(null);

  const handleSelectIntention = (intention) => {
    setSelectedIntention(intention);
  };

  const handleBackToIntentions = () => {
    setSelectedIntention(null);
  };

  const handleSave = (keyframes) => {
    onSave({ keyframes, intentionText: selectedIntention?.text ?? '' });
  };

  if (selectedIntention !== null) {
    return (
      <PoseEditor
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
