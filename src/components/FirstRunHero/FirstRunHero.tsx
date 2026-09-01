import { useState, useEffect } from 'react';
import { trackEvent, Events } from '../../utils/analytics';
import './FirstRunHero.css';

interface Props {
  planName: string;
  buildingCount: number;
  onShare: () => void;
  onDismiss: () => void;
}

export default function FirstRunHero({ planName, buildingCount, onShare, onDismiss }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    trackEvent(Events.ONBOARDING_SHOWN);
    // Fade in after a brief moment to let the grid render
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    trackEvent(Events.ONBOARDING_CHOICE, { choice: 'hero_dismiss' });
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for fade out
  };

  const handleShare = () => {
    trackEvent(Events.ONBOARDING_CHOICE, { choice: 'hero_share' });
    onShare();
  };

  return (
    <div className={`first-run-hero ${isVisible ? 'visible' : ''}`}>
      <div className="first-run-hero-backdrop" onClick={handleDismiss} />
      <div className="first-run-hero-content">
        <div className="first-run-hero-icon">🎯</div>
        <h1 className="first-run-hero-title">Alliance War Plan Ready</h1>
        <p className="first-run-hero-subtitle">
          <strong>{planName}</strong> formation loaded with {buildingCount} positions.
          <br />
          Share this hive with your alliance on Discord.
        </p>
        <div className="first-run-hero-actions">
          <button className="first-run-hero-primary" onClick={handleShare}>
            📤 Copy alliance link
          </button>
          <button className="first-run-hero-secondary" onClick={handleDismiss}>
            I'll do it later
          </button>
        </div>
        <div className="first-run-hero-hint">
          ↓ Tap the grid below to see HQ positions ↓
        </div>
      </div>
    </div>
  );
}
