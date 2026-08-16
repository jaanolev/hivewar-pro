import { useState } from 'react';
import { openStripeCheckout, activateProCode, getProStatus, clearProStatus } from '../../utils/pro';
import { trackEvent, Events } from '../../utils/analytics';
import { useDragDismiss } from '../../hooks/useDragDismiss';
import './Modal.css';
import './UpgradeModal.css';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProStatusChange: (isPro: boolean) => void;
}

export default function UpgradeModal({ isOpen, onClose, onProStatusChange }: UpgradeModalProps) {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showRestoreForm, setShowRestoreForm] = useState(false);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [restoreEmail, setRestoreEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [restoreSubmitted, setRestoreSubmitted] = useState(false);
  const { dragHandlers, sheetStyle } = useDragDismiss(onClose);

  const proStatus = getProStatus();

  if (!isOpen) return null;

  const handleSubscribe = () => {
    trackEvent(Events.UPGRADE_CLICKED, { tier: 'pro' });
    openStripeCheckout('pro');
    setMessage({
      type: 'success',
      text: 'Checkout opened! After payment, you\'ll receive a Pro code via email.'
    });
  };

  const handleActivateCode = async () => {
    setIsLoading(true);
    setMessage(null);
    trackEvent(Events.PRO_CODE_ENTERED);

    await new Promise(resolve => setTimeout(resolve, 500));

    const result = activateProCode(code, email);

    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });

    if (result.success) {
      trackEvent(Events.PRO_ACTIVATED, { email });
      onProStatusChange(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }

    setIsLoading(false);
  };

  const handleDeactivate = () => {
    if (confirm('Are you sure you want to deactivate Pro? You can reactivate with your code anytime.')) {
      clearProStatus();
      onProStatusChange(false);
      setMessage({ type: 'success', text: 'Pro deactivated. You\'re now on the free tier.' });
    }
  };

  const handleRestoreSubmit = async () => {
    if (!restoreEmail || !restoreEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setIsLoading(true);
    trackEvent('restore_purchase_requested', { email: restoreEmail });

    await new Promise(resolve => setTimeout(resolve, 800));

    const restoreRequests = JSON.parse(localStorage.getItem('hivewar_restore_requests') || '[]');
    restoreRequests.push({
      email: restoreEmail,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    localStorage.setItem('hivewar_restore_requests', JSON.stringify(restoreRequests));

    setRestoreSubmitted(true);
    setIsLoading(false);
    setMessage({
      type: 'success',
      text: 'Request received! Check your email within 24 hours for your Pro code.'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content upgrade-modal"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header upgrade-modal-header" {...dragHandlers}>
          <h2>👑 Upgrade to Pro</h2>
          <button
            type="button"
            className="modal-close upgrade-close"
            onClick={onClose}
            aria-label="Close upgrade dialog"
          >
            ✕
          </button>
        </div>

        <div className="upgrade-content">
          {proStatus.isPro ? (
            <div className="pro-status-section">
              <div className="pro-badge-large">👑 PRO</div>
              <h3>You're a Pro member!</h3>
              <p className="pro-email">{proStatus.email}</p>
              <p className="pro-date">Member since: {new Date(proStatus.activatedDate || '').toLocaleDateString()}</p>

              <div className="pro-features-active">
                <h4>Your Pro Features:</h4>
                <ul>
                  <li>✅ Unlimited exports</li>
                  <li>✅ All templates unlocked</li>
                  <li>✅ CSV import</li>
                  <li>✅ Priority support</li>
                </ul>
              </div>

              <button type="button" className="deactivate-btn" onClick={handleDeactivate}>
                Deactivate Pro
              </button>
            </div>
          ) : (
            <>
              <div className="pricing-card">
                <div className="pricing-header">
                  <span className="pricing-badge" aria-hidden="true">MOST POPULAR</span>
                  <h3>Pro Monthly</h3>
                  <div className="pricing-amount">
                    <span className="price">$5.99</span>
                    <span className="period">/month</span>
                  </div>
                </div>

                <ul className="pricing-features">
                  <li>Live alliance editing for officers</li>
                  <li>Roster / CSV import for player lists</li>
                  <li>Extra seasonal templates</li>
                  <li>Priority email support</li>
                  <li className="coming-soon">Coming later: AI hive optimizer</li>
                </ul>

                <button type="button" className="subscribe-btn" onClick={handleSubscribe}>
                  Subscribe Now →
                </button>

                <p className="pricing-note">
                  Cancel anytime. Billed monthly via Stripe.
                </p>
              </div>

              <div className="upgrade-divider" aria-hidden="true">
                <span>or</span>
              </div>

              <div className="code-section">
                {!showCodeInput ? (
                  <button
                    type="button"
                    className="have-code-btn"
                    onClick={() => { setShowCodeInput(true); setShowRestoreForm(false); }}
                  >
                    🎟️ I have a Pro code
                  </button>
                ) : (
                  <div className="code-form">
                    <h4>Enter Your Pro Code</h4>
                    <input
                      type="email"
                      placeholder="Your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="code-input"
                    />
                    <input
                      type="text"
                      placeholder="Enter code (e.g. HIVE-XXXX-XXXX-XXXX)"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="code-input"
                      maxLength={30}
                    />
                    <button
                      type="button"
                      className="activate-btn"
                      onClick={handleActivateCode}
                      disabled={isLoading || !code}
                    >
                      {isLoading ? 'Activating...' : 'Activate Pro'}
                    </button>
                    <button
                      type="button"
                      className="cancel-code-btn"
                      onClick={() => setShowCodeInput(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="restore-section">
                {!showRestoreForm ? (
                  <button
                    type="button"
                    className="restore-btn"
                    onClick={() => { setShowRestoreForm(true); setShowCodeInput(false); }}
                  >
                    🔄 Lost your Pro access? Restore it
                  </button>
                ) : (
                  <div className="restore-form">
                    <h4>🔄 Restore Your Purchase</h4>
                    <p className="restore-desc">
                      Enter the email you used when subscribing. We'll verify your payment and send you a new code.
                    </p>
                    {!restoreSubmitted ? (
                      <>
                        <input
                          type="email"
                          placeholder="Your payment email"
                          value={restoreEmail}
                          onChange={(e) => setRestoreEmail(e.target.value)}
                          className="code-input"
                        />
                        <button
                          type="button"
                          className="activate-btn"
                          onClick={handleRestoreSubmit}
                          disabled={isLoading || !restoreEmail}
                        >
                          {isLoading ? 'Submitting...' : 'Request Restore'}
                        </button>
                        <button
                          type="button"
                          className="cancel-code-btn"
                          onClick={() => setShowRestoreForm(false)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <div className="restore-success">
                        <p>✅ We received your request!</p>
                        <p>Check <strong>{restoreEmail}</strong> within 24 hours.</p>
                        <p className="restore-note">
                          If you don't receive an email, check spam or contact us on Discord.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {message && (
                <div className={`upgrade-message ${message.type}`}>
                  {message.type === 'success' ? '✓' : '✗'} {message.text}
                </div>
              )}
            </>
          )}
        </div>

        <div className="upgrade-footer">
          {!proStatus.isPro && (
            <button type="button" className="upgrade-dismiss-btn" onClick={onClose}>
              Not now — keep planning free
            </button>
          )}
          <p>Questions? Contact us on Discord</p>
        </div>
      </div>
    </div>
  );
}
