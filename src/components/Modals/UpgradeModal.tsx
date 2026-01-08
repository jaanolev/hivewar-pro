import { useState } from 'react';
import { openStripeCheckout, activateProCode, getProStatus, clearProStatus } from '../../utils/pro';
import { trackEvent, Events } from '../../utils/analytics';
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

    // Simulate network delay for UX
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

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 800));

    // Store the restore request locally (you'll see this in analytics)
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
      <div className="modal-content upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👑 Upgrade to Pro</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="upgrade-content">
          {proStatus.isPro ? (
            // Already Pro - Show status
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

              <button className="deactivate-btn" onClick={handleDeactivate}>
                Deactivate Pro
              </button>
            </div>
          ) : (
            // Not Pro - Show upgrade options
            <>
              {/* Pricing Card */}
              <div className="pricing-card">
                <div className="pricing-header">
                  <span className="pricing-badge">MOST POPULAR</span>
                  <h3>Pro Monthly</h3>
                  <div className="pricing-amount">
                    <span className="price">€4.99</span>
                    <span className="period">/month</span>
                  </div>
                </div>

                <ul className="pricing-features">
                  <li>✓ <strong>Unlimited</strong> exports (PNG, CSV, JSON)</li>
                  <li>✓ <strong>All templates</strong> unlocked</li>
                  <li>✓ CSV import for player lists</li>
                  <li>✓ Priority email support</li>
                  <li>✓ Early access to new features</li>
                  <li className="coming-soon">🔜 Real-time collaboration</li>
                  <li className="coming-soon">🔜 AI hive optimizer</li>
                </ul>

                <button className="subscribe-btn" onClick={handleSubscribe}>
                  Subscribe Now →
                </button>

                <p className="pricing-note">
                  Cancel anytime. Billed monthly via Stripe.
                </p>
              </div>

              {/* Divider */}
              <div className="upgrade-divider">
                <span>or</span>
              </div>

              {/* Code Activation */}
              <div className="code-section">
                {!showCodeInput ? (
                  <button 
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
                      placeholder="HIVE-XXXX-XXXX-XXXX"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="code-input"
                      maxLength={19}
                    />
                    <button 
                      className="activate-btn"
                      onClick={handleActivateCode}
                      disabled={isLoading || !code || !email}
                    >
                      {isLoading ? 'Activating...' : 'Activate Pro'}
                    </button>
                    <button 
                      className="cancel-code-btn"
                      onClick={() => setShowCodeInput(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Restore Purchase */}
              <div className="restore-section">
                {!showRestoreForm ? (
                  <button 
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
                          className="activate-btn"
                          onClick={handleRestoreSubmit}
                          disabled={isLoading || !restoreEmail}
                        >
                          {isLoading ? 'Submitting...' : 'Request Restore'}
                        </button>
                        <button 
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

              {/* Message */}
              {message && (
                <div className={`upgrade-message ${message.type}`}>
                  {message.type === 'success' ? '✓' : '✗'} {message.text}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="upgrade-footer">
          <p>Questions? Contact us on Discord</p>
        </div>
      </div>
    </div>
  );
}

