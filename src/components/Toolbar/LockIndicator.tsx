import { useEffect, useState } from 'react';
import './LockIndicator.css';

interface Props {
  hasEditLock: boolean;
  otherUserHoldsLock: boolean;
  isLockStale: boolean;
  // True when at least one other user is on this plan. Used to suppress
  // the indicator entirely in the solo case (no need for a toggle).
  hasPeers: boolean;
  onTake: () => void;
  onRelease: () => void;
  isViewOnly?: boolean;
}

export default function LockIndicator({
  hasEditLock,
  otherUserHoldsLock,
  isLockStale,
  hasPeers,
  onTake,
  onRelease,
  isViewOnly = false,
}: Props) {
  // Tick a clock so any "x ago" relative timestamps refresh without
  // bloating the parent's render cycle.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!otherUserHoldsLock) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 10_000);
    return () => window.clearInterval(id);
  }, [otherUserHoldsLock]);

  // View-only watchers never see presence chips or lock CTAs.
  if (isViewOnly) return null;

  // Solo: nothing to coordinate, hide the pill.
  if (!hasPeers) return null;

  let kind: 'editing' | 'watching' | 'available';
  let label: string;
  let action: string;

  if (hasEditLock) {
    kind = 'editing';
    label = "You're editing";
    action = 'Stop editing';
  } else if (otherUserHoldsLock && !isLockStale) {
    kind = 'watching';
    label = 'Someone else is editing';
    action = 'Take over';
  } else {
    kind = 'available';
    label = 'No active editor';
    action = 'Start editing';
  }

  function handleClick() {
    if (hasEditLock) onRelease();
    else onTake();
  }

  return (
    <div className={`lock-indicator lock-${kind}`} role="status">
      <span className="lock-dot" aria-hidden="true" />
      <strong className="lock-label">{label}</strong>
      <button className="lock-toggle" onClick={handleClick} type="button">
        {action}
      </button>
    </div>
  );
}
