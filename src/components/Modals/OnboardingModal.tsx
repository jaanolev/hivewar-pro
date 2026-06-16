import { useEffect } from 'react';
import { useDragDismiss } from '../../hooks/useDragDismiss';
import { trackEvent, Events } from '../../utils/analytics';
import './Modal.css';
import './WhatsNewModal.css';

interface Props {
  onStartFromTemplate: () => void;
  onStartBlank: () => void;
}

export default function OnboardingModal({ onStartFromTemplate, onStartBlank }: Props) {
  const { dragHandlers, sheetStyle } = useDragDismiss(onStartBlank);

  useEffect(() => {
    trackEvent(Events.ONBOARDING_SHOWN);
  }, []);

  const pickTemplate = (source: 'card' | 'button') => {
    trackEvent(Events.ONBOARDING_CHOICE, { choice: 'template', source });
    onStartFromTemplate();
  };

  const pickBlank = () => {
    trackEvent(Events.ONBOARDING_CHOICE, { choice: 'blank' });
    onStartBlank();
  };

  return (
    <div className="modal-overlay" onClick={pickBlank}>
      <div
        className="modal-content whatsnew-modal"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" {...dragHandlers}>
          <h2>🏰 Build your hive</h2>
          <button className="modal-close" onClick={pickBlank} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="whatsnew-intro">
            Get a head start with a ready-made layout, or design from scratch.
          </p>

          <button
            type="button"
            className="whatsnew-feature"
            onClick={() => pickTemplate('card')}
          >
            <span className="whatsnew-icon">📋</span>
            <div>
              <strong>Start from a template</strong>
              <p>
                Drop in a proven hive layout — defense formations, capitols and
                more — then tweak it to fit your alliance.
              </p>
            </div>
            <span className="whatsnew-feature-chevron" aria-hidden="true">→</span>
          </button>

          <div className="whatsnew-actions">
            <button
              className="whatsnew-primary"
              onClick={() => pickTemplate('button')}
            >
              Browse templates →
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
