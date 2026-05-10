import { useEffect, useState } from 'react';
import './LockIndicator.css';

interface Props {
  hasEditLock: boolean;
  otherUserHoldsLock: boolean;
  isLockStale: boolean;
  // True when at least one other user is known to be on this plan.
  // Used to suppress the indicator in the solo-editor case where it
  // would just be noise.
  hasPeers: boolean;
}

export default function LockIndicator({
  hasEditLock,
  otherUserHoldsLock,
  isLockStale,
  hasPeers,
}: Props) {
  // Tick a clock so "x seconds ago" stale countdowns refresh without
  // bloating the render cycle.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!otherUserHoldsLock) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 10_000);
    return () => window.clearInterval(id);
  }, [otherUserHoldsLock]);

  // Solo user editing their own plan — quiet pill, no indicator.
  if (!hasPeers && hasEditLock && !otherUserHoldsLock) return null;

  let kind: 'editing' | 'watching' | 'available';
  let label: string;
  let hint: string;

  if (hasEditLock) {
    kind = 'editing';
    label = "You're editing";
    hint = 'Your changes sync live to everyone with the link.';
  } else if (otherUserHoldsLock && !isLockStale) {
    kind = 'watching';
    label = 'Someone else is editing';
    hint = 'Watch live. The lock auto-releases after 3 min of no activity.';
  } else {
    kind = 'available';
    label = 'Available';
    hint = 'No active editor. Start editing to take the lock.';
  }

  return (
    <div className={`lock-indicator lock-${kind}`} role="status">
      <span className="lock-dot" aria-hidden="true" />
      <div className="lock-text">
        <strong>{label}</strong>
        <span className="lock-hint">{hint}</span>
      </div>
    </div>
  );
}
