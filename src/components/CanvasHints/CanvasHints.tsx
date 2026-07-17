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

function pickProgressiveHint(buildings: PlacedBuilding[]): Hint | null {
  const categories = new Set<string>();
  for (const b of buildings) {
    const category = getBuildingById(b.buildingTypeId)?.category;
    if (category) categories.add(category);
  }

  if (buildings.length === 0) {
    return {
      id: 'place-hq',
      message:
        'Tap "Buildings", pick Headquarters, then tap the grid to place your HQ.',
    };
  }
  if (!categories.has('defense')) {
    return {
      id: 'add-defense',
      message:
        'Now add defenses — walls, towers, and bunkers — around your HQ.',
    };
  }
  if (!categories.has('production')) {
    return {
      id: 'add-production',
      message:
        'Add production buildings (factory, barracks, hospital) inside your defenses to power your hive.',
    };
  }
  if (buildings.length < 8) {
    return {
      id: 'keep-going',
      message: 'Looking good. A full hive usually has 30+ buildings — keep going.',
    };
  }
  return null;
}

interface CanvasHintsProps {
  buildings: PlacedBuilding[];
  selectedBuildingTypeId?: string | null;
}

export default function CanvasHints({
  buildings,
  selectedBuildingTypeId = null,
}: CanvasHintsProps) {
  const [progressiveDismissed, setProgressiveDismissed] = useState(
    () => !!localStorage.getItem(DISMISSED_KEY)
  );
  // Soft-dismiss place coach for the current selection only
  const [placeCoachHiddenFor, setPlaceCoachHiddenFor] = useState<string | null>(
    null
  );
  const lastShownIdRef = useRef<string | null>(null);

  const showPlaceCoach =
    !!selectedBuildingTypeId &&
    placeCoachHiddenFor !== selectedBuildingTypeId;

  const placeHint: Hint | null = showPlaceCoach
    ? {
        id: 'place-selected',
        message: (() => {
          const type = getBuildingById(selectedBuildingTypeId!);
          return type
            ? `Tap the grid to place ${type.icon} ${type.name}.`
            : 'Tap the grid to place the selected building.';
        })(),
      }
    : null;

  const progressiveHint = progressiveDismissed
    ? null
    : pickProgressiveHint(buildings);

  // Place coach wins while a building type is selected
  const hint = placeHint ?? progressiveHint;

  useEffect(() => {
    if (!hint) return;
    const trackId =
      hint.id === 'place-selected'
        ? `place-selected:${selectedBuildingTypeId ?? ''}`
        : hint.id;
    if (lastShownIdRef.current === trackId) return;
    lastShownIdRef.current = trackId;
    trackEvent(Events.HINT_SHOWN, {
      hintId: hint.id,
      buildingType: selectedBuildingTypeId ?? undefined,
    });
  }, [hint, selectedBuildingTypeId]);

  if (!hint) return null;

  const handleDismiss = () => {
    if (hint.id === 'place-selected' && selectedBuildingTypeId) {
      trackEvent(Events.HINT_DISMISSED, {
        hintId: hint.id,
        buildingType: selectedBuildingTypeId,
      });
      setPlaceCoachHiddenFor(selectedBuildingTypeId);
      return;
    }
    localStorage.setItem(DISMISSED_KEY, '1');
    trackEvent(Events.HINT_DISMISSED, { hintId: hint.id });
    setProgressiveDismissed(true);
  };

  return (
    <div
      className={`canvas-hint ${hint.id === 'place-selected' ? 'canvas-hint-place' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="canvas-hint-icon" aria-hidden="true">
        {hint.id === 'place-selected' ? '👆' : '💡'}
      </span>
      <span className="canvas-hint-text">{hint.message}</span>
      <button
        type="button"
        className="canvas-hint-close"
        onClick={handleDismiss}
        aria-label="Dismiss hint"
      >
        ✕
      </button>
    </div>
  );
}
