import { useEffect, useState } from 'react';
import { useDragDismiss } from '../../hooks/useDragDismiss';
import { trackEvent, Events } from '../../utils/analytics';
import './Modal.css';
import './WhatsNewModal.css';

interface Props {
  onStampAndShare: (names: string[]) => void;
  onStartBlank: () => void;
}

export default function OnboardingModal({ onStampAndShare, onStartBlank }: Props) {
  const { dragHandlers, sheetStyle } = useDragDismiss(onStartBlank);
  const [names, setNames] = useState(['', '', '']);

  useEffect(() => {
    trackEvent(Events.ONBOARDING_SHOWN);
  }, []);

  const setName = (index: number, value: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const sendToAlliance = () => {
    const cleaned = names.map((n) => n.trim()).filter(Boolean);
    trackEvent(Events.ONBOARDING_CHOICE, { choice: 'share', named: cleaned.length });
    onStampAndShare(cleaned);
  };

  const pickBlank = () => {
    trackEvent(Events.ONBOARDING_CHOICE, { choice: 'blank' });
    onStartBlank();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div
        className="modal-content whatsnew-modal"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" {...dragHandlers}>
          <h2>Name 3 players</h2>
          <button className="modal-close" onClick={pickBlank} aria-label="Close">
            X
          </button>
        </div>

        <div className="modal-body">
          <p className="whatsnew-intro">
            Diamond Defense is already on the grid. Put real names on the first
            three HQs, then send the plan to your alliance.
          </p>

          {['R5 / Marshal', 'R4', 'Member'].map((label, i) => (
            <label key={label} className="whatsnew-intro" style={{ display: 'block', marginBottom: 10 }}>
              <span style={{ display: 'block', fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{label}</span>
              <input
                type="text"
                value={names[i]}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={label}
                autoComplete="off"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'inherit',
                  font: 'inherit',
                }}
              />
            </label>
          ))}

          <div className="whatsnew-actions">
            <button className="whatsnew-primary" onClick={sendToAlliance}>
              Copy alliance link
            </button>
            <button className="whatsnew-secondary" onClick={pickBlank}>
              Start from a blank grid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
