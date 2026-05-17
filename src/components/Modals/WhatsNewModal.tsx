import { useDragDismiss } from '../../hooks/useDragDismiss';
import './Modal.css';
import './WhatsNewModal.css';

interface Props {
  onClose: () => void;
  onTryCollab: () => void;
}

export default function WhatsNewModal({ onClose, onTryCollab }: Props) {
  const { dragHandlers, sheetStyle } = useDragDismiss(onClose);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content whatsnew-modal"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" {...dragHandlers}>
          <h2>✨ New in HiveWar Pro</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="whatsnew-intro">Two big upgrades just landed:</p>

          <div className="whatsnew-feature">
            <span className="whatsnew-icon">☁️</span>
            <div>
              <strong>Your plans are saved to the cloud</strong>
              <p>
                No more losing layouts when you clear your browser or switch
                phones. Sign in to sync every plan across all your devices.
              </p>
            </div>
          </div>

          <div className="whatsnew-feature">
            <span className="whatsnew-icon">👥</span>
            <div>
              <strong>Plan together, live</strong>
              <p>
                Share one link and your whole alliance can view or edit the
                same hive in real time. One person edits at a time — hand off
                with a tap.
              </p>
            </div>
          </div>

          <div className="whatsnew-actions">
            <button className="whatsnew-primary" onClick={onTryCollab}>
              Try live collaboration →
            </button>
            <button className="whatsnew-secondary" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
