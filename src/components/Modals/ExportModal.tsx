import { useState } from 'react';
import type { HivePlan } from '../../types';
import { 
  planToShareUrl, 
  exportPlanAsJson, 
  exportPlanAsCsv,
  downloadFile, 
  copyToClipboard,
  canExport,
  getRemainingExports,
  incrementExportCount,
  addBonusExports,
  canEarnMoreBonusExports,
  getBonusExports
} from '../../utils/storage';
import { trackEvent, Events } from '../../utils/analytics';
import './Modal.css';

interface ExportModalProps {
  plan: HivePlan;
  stageRef: React.RefObject<any>;
  onClose: () => void;
  onUpgrade: () => void;
  isPro?: boolean;
}

export default function ExportModal({ plan, stageRef, onClose, onUpgrade, isPro = false }: ExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [originX, setOriginX] = useState(plan.originX || 100);
  const [originY, setOriginY] = useState(plan.originY || 100);
  const [showShareReward, setShowShareReward] = useState(false);
  const [bonusEarned, setBonusEarned] = useState(false);

  const shareUrl = planToShareUrl(plan);
  const remainingExports = getRemainingExports(isPro);
  const canDoExport = canExport(isPro);
  const bonusExports = getBonusExports();
  const canEarnBonus = canEarnMoreBonusExports();

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      trackEvent(Events.SHARE_LINK_COPIED);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPNG = async () => {
    if (!stageRef.current) return;
    if (!canDoExport) {
      trackEvent(Events.EXPORT_LIMIT_HIT, { type: 'png' });
      alert('Export limit reached! Upgrade to Pro for unlimited exports.');
      return;
    }
    
    setExporting(true);
    try {
      const stage = stageRef.current;
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      
      // For free users, add watermark
      if (!isPro) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Add watermark
          const watermarkText = 'Made with HiveWar Pro • hivewar.pro';
          const fontSize = Math.max(16, Math.floor(canvas.width / 40));
          ctx.font = `bold ${fontSize}px Arial, sans-serif`;
          
          // Semi-transparent background bar
          const padding = 12;
          const barHeight = fontSize + padding * 2;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
          
          // Watermark text
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(watermarkText, canvas.width / 2, canvas.height - barHeight / 2);
          
          // Small "Go Pro" hint
          ctx.font = `${fontSize * 0.6}px Arial, sans-serif`;
          ctx.fillStyle = '#f59e0b';
          ctx.fillText('Upgrade to remove watermark', canvas.width / 2, canvas.height - barHeight / 2 + fontSize * 0.8);
          
          // Download
          const link = document.createElement('a');
          link.download = `${plan.name.replace(/\s+/g, '_')}_hive.png`;
          link.href = canvas.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          incrementExportCount();
          trackEvent(Events.EXPORT_PNG, { buildingCount: plan.buildings.length, watermarked: true });
          setExporting(false);
        };
        img.src = dataUrl;
      } else {
        // Pro users: no watermark
        const link = document.createElement('a');
        link.download = `${plan.name.replace(/\s+/g, '_')}_hive.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        incrementExportCount();
        trackEvent(Events.EXPORT_PNG, { buildingCount: plan.buildings.length, watermarked: false });
        setExporting(false);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExporting(false);
    }
  };

  const handleExportJSON = () => {
    if (!canDoExport) {
      trackEvent(Events.EXPORT_LIMIT_HIT, { type: 'json' });
      alert('Export limit reached! Upgrade to Pro for unlimited exports.');
      return;
    }
    const json = exportPlanAsJson(plan);
    downloadFile(json, `${plan.name.replace(/\s+/g, '_')}_hive.json`);
    incrementExportCount();
    trackEvent(Events.EXPORT_JSON, { buildingCount: plan.buildings.length });
  };

  const handleExportCSV = () => {
    if (!canDoExport) {
      trackEvent(Events.EXPORT_LIMIT_HIT, { type: 'csv' });
      alert('Export limit reached! Upgrade to Pro for unlimited exports.');
      return;
    }
    const csv = exportPlanAsCsv(plan, originX, originY);
    downloadFile(csv, `${plan.name.replace(/\s+/g, '_')}_coords.csv`, 'text/csv');
    incrementExportCount();
    trackEvent(Events.EXPORT_CSV, { buildingCount: plan.buildings.length, originX, originY });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export & Share</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Export limit warning */}
          {!isPro && (
            <div className="export-limit-banner">
              <span className="limit-icon">📊</span>
              <span className="limit-text">
                {remainingExports > 0 
                  ? `${remainingExports} free exports remaining this month`
                  : 'Export limit reached!'}
              </span>
              <button className="upgrade-small-btn" onClick={() => { onClose(); onUpgrade(); }}>
                Go Pro →
              </button>
            </div>
          )}

          {/* Share Link */}
          <div className="export-section">
            <h3>🔗 Share Link</h3>
            <p className="export-desc">Anyone with this link can view and copy your hive plan</p>
            <div className="link-input-group">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="link-input"
              />
              <button 
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyLink}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* Export PNG */}
          <div className="export-section">
            <h3>📷 Export as Image</h3>
            <p className="export-desc">Perfect for sharing on Discord or Reddit</p>
            <button 
              className="export-btn primary"
              onClick={handleExportPNG}
              disabled={exporting || !canDoExport}
            >
              {exporting ? 'Exporting...' : '📷 Download PNG'}
            </button>
          </div>

          {/* Export CSV - Coordinates */}
          <div className="export-section">
            <h3>📍 Export Coordinates (CSV)</h3>
            <p className="export-desc">Share player positions with your alliance</p>
            <div className="origin-inputs">
              <div className="origin-input">
                <label>Origin X:</label>
                <input 
                  type="number" 
                  value={originX} 
                  onChange={e => setOriginX(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="origin-input">
                <label>Origin Y:</label>
                <input 
                  type="number" 
                  value={originY}
                  onChange={e => setOriginY(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <button 
              className="export-btn secondary"
              onClick={handleExportCSV}
              disabled={!canDoExport}
            >
              📍 Download CSV
            </button>
          </div>

          {/* Export JSON */}
          <div className="export-section">
            <h3>💾 Export as JSON</h3>
            <p className="export-desc">Save full plan data for backup or sharing</p>
            <button 
              className="export-btn secondary"
              onClick={handleExportJSON}
              disabled={!canDoExport}
            >
              💾 Download JSON
            </button>
          </div>

          {/* Share Reward Section - For Free Users */}
          {!isPro && canEarnBonus && (
            <div className="share-reward-section">
              <div className="reward-header">
                <span className="reward-icon">🎁</span>
                <span className="reward-title">Earn +3 Free Exports!</span>
              </div>
              <p className="reward-desc">Share your hive on social media and get bonus exports</p>
              
              {!showShareReward ? (
                <button 
                  className="show-share-btn"
                  onClick={() => setShowShareReward(true)}
                >
                  Show me how →
                </button>
              ) : (
                <div className="share-options">
                  <div className="share-buttons">
                    <button
                      className="share-social-btn reddit"
                      onClick={() => {
                        window.open(`https://reddit.com/r/LastWarMobileGame/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`Check out my hive layout - ${plan.name}`)}`, '_blank');
                        if (!bonusEarned) {
                          addBonusExports(3);
                          setBonusEarned(true);
                          trackEvent('share_reward_earned', { platform: 'reddit' });
                        }
                      }}
                    >
                      📢 Share on Reddit
                    </button>
                    <button
                      className="share-social-btn discord"
                      onClick={async () => {
                        await copyToClipboard(`Check out my hive layout! ${shareUrl}`);
                        alert('Link copied! Paste it in your Discord server.');
                        if (!bonusEarned) {
                          addBonusExports(3);
                          setBonusEarned(true);
                          trackEvent('share_reward_earned', { platform: 'discord' });
                        }
                      }}
                    >
                      💬 Copy for Discord
                    </button>
                    <button
                      className="share-social-btn twitter"
                      onClick={() => {
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Planning my alliance hive with HiveWar Pro! 🏰`)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                        if (!bonusEarned) {
                          addBonusExports(3);
                          setBonusEarned(true);
                          trackEvent('share_reward_earned', { platform: 'twitter' });
                        }
                      }}
                    >
                      🐦 Share on X
                    </button>
                  </div>
                  {bonusEarned && (
                    <div className="bonus-earned">
                      ✅ +3 exports added! You now have {remainingExports + 3} exports.
                    </div>
                  )}
                  <p className="bonus-info">
                    Current bonus: {bonusExports}/15 exports earned
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Discord tip */}
          <div className="export-tip">
            <span className="tip-icon">💡</span>
            <span>Pro tip: Share your PNG in #strategies on the Last War Discord for feedback!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
