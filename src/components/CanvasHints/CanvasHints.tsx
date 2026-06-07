import { useEffect, useRef, useState } from 'react';
import type { PlacedBuilding } from '../../types';
import { getBuildingById } from '../../data/buildings';
import { trackEvent, Events } from '../../utils/analytics';
import './CanvasHints.css';

const DISMISSED_KEY = 'hivewar-hints-dismissed-v1';

interface Hint {
  id: string;
  message: string;
}

function pickHint(buildings: PlacedBuilding[]): Hint | null {
  const categories = new Set(
    buildings
      .map((b) => getBuildingById(b.buildingTypeId)?.category)
      .filter((c): c is string => !!c)
  );

  if (buildings.length === 0) {
    return {
      id: 'place-hq',
      message: 'Tap "Headquarters" in the toolbar, then tap the grid to place your HQ.',
    };
  }
  if (!categories.has('defense')) {
    return {
      id: 'add-defense',
      message: 'Now add defenses — walls, towers, and bunkers — around your HQ.',
    };
  }
  if (!categories.has('production')) {
    return {
      id: 'add-production',
      message: 'Add production buildings (factory, barracks, hospital) inside your defenses to power your hive.',
    };
  }
  if (buildings.length < 8) {
    return {
      id: 'keep-going',
      message: 'Looking good. A full hive usually has 30+ buildings — keep going.',
    };
  }
  // Graduated: stop showing hints once they're clearly building a real hive.
  return null;
}

interface CanvasHintsProps {
  buildings: PlacedBuilding[];
}

export default function CanvasHints({ buildings }: CanvasHintsProps) {
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(DISMISSED_KEY)
  );
  const lastShownIdRef = useRef<string | null>(null);

  const hint = dismissed ? null : pickHint(buildings);

  useEffect(() => {
    if (!hint) return;
    if (lastShownIdRef.current === hint.id) return;
    lastShownIdRef.current = hint.id;
    trackEvent(Events.HINT_SHOWN, { hintId: hint.id });
  }, [hint]);

  if (!hint) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    trackEvent(Events.HINT_DISMISSED, { hintId: hint.id });
    setDismissed(true);
  };

  return (
    <div className="canvas-hint" role="status" aria-live="polite">
      <span className="canvas-hint-icon" aria-hidden="true">💡</span>
      <span className="canvas-hint-text">{hint.message}</span>
      <button
        className="canvas-hint-close"
        onClick={handleDismiss}
        aria-label="Dismiss hint"
      >
        ✕
      </button>
    </div>
  );
}
