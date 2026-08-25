import { useEffect, useState } from 'react';
import { useDragDismiss } from '../../hooks/useDragDismiss';
import { trackEvent, Events } from '../../utils/analytics';
import './Modal.css';
import './WhatsNewModal.css';

interface Props {
  onStampAndShare: (names: string[]) => void | Promise<void>;
  onDismiss: () => void;
  onStartBlank: () => void;
}

export default function OnboardingModal({ onStampAndShare, onDismiss, onStartBlank }: Props) {
  const [names, setNames] = useState(['', '', '']);
  const [showNameFields, setShowNameFields] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  
  const handleClose = () => {
    trackEvent(Events.ONBOARDING_CHOICE, { choice: 'keep_template' });
    onDismiss();
  };
  
  const { dragHandlers, sheetStyle } = useDragDismiss(handleClose);

  useEffect(() => {
    trackEvent(Events.ONBOARDING_SHOWN);
    // Check if native share is available
    setHasNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
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
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content whatsnew-modal"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" {...dragHandlers}>
          <h2>🎯 Diamond Defense is ready!</h2>
          <button className="modal-close" onClick={handleClose} aria-label="Close">
            X
          </button>
        </div>

        <div className="modal-body">
          <p className="whatsnew-intro" style={{ marginBottom: 20 }}>
            Your hive formation is set up on the grid. Copy the link and share it with your alliance on Discord.
          </p>

          <div className="whatsnew-actions" style={{ marginBottom: 20 }}>
            <button 
              className="whatsnew-primary" 
              onClick={sendToAlliance}
              style={{ fontSize: 16, padding: '14px 24px' }}
            >
              {hasNativeShare ? '📤 Send to Discord' : '📋 Copy alliance link'}
            </button>
          </div>

          <div style={{ 
            borderTop: '1px solid rgba(255,255,255,0.1)', 
            paddingTop: 16, 
            marginTop: 16 
          }}>
            <button
              onClick={() => setShowNameFields(!showNameFields)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: 13,
                opacity: 0.7,
                textDecoration: 'underline',
                padding: 0,
                marginBottom: showNameFields ? 12 : 0,
              }}
            >
              {showNameFields ? '▼' : '▶'} Optional: Name your officers first
            </button>

            {showNameFields && (
              <div style={{ marginTop: 12 }}>
                {['R5 / Marshal', 'R4', 'Member'].map((label, i) => (
                  <label key={label} style={{ display: 'block', marginBottom: 10 }}>
                    <span style={{ display: 'block', fontSize: 12, opacity: 0.6, marginBottom: 4 }}>
                      {label} (optional)
                    </span>
                    <input
                      type="text"
                      value={names[i]}
                      onChange={(e) => setName(i, e.target.value)}
                      placeholder={label}
                      autoComplete="off"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'inherit',
                        font: 'inherit',
                        fontSize: 14,
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
              className="whatsnew-secondary" 
              onClick={pickBlank}
              style={{ fontSize: 13 }}
            >
              Start from a blank grid instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
