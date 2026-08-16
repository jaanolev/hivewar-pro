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
  consumeFirstPlanPng,
  addBonusExports,
  canEarnMoreBonusExports,
  getBonusExports,
} from '../../utils/storage';
import { trackEvent, Events } from '../../utils/analytics';

interface ExportPanelProps {
  plan: HivePlan;
  stageRef: React.RefObject<any>;
  onClose: () => void;
  onUpgrade: () => void;
  isPro?: boolean;
}

// Snapshot/export tab body. Logic is unchanged from the original
// ExportModal; only the outer overlay/header chrome was removed so it
// can live inside ShareHub's tabbed shell.
export default function ExportPanel({
  plan,
  stageRef,
  onClose,
  onUpgrade,
  isPro = false,
}: ExportPanelProps) {
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

      if (!isPro) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(img, 0, 0);

          const watermarkText = 'Made with HiveWar Pro • hivewar.pro';
          const fontSize = Math.max(16, Math.floor(canvas.width / 40));
          ctx.font = `bold ${fontSize}px Arial, sans-serif`;

          const padding = 12;
          const barHeight = fontSize + padding * 2;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(watermarkText, canvas.width / 2, canvas.height - barHeight / 2);

          ctx.font = `${fontSize * 0.6}px Arial, sans-serif`;
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(
            'Upgrade to remove watermark',
            canvas.width / 2,
            canvas.height - barHeight / 2 + fontSize * 0.8
          );

          const link = document.createElement('a');
          link.download = `${plan.name.replace(/\s+/g, '_')}_hive.png`;
          link.href = canvas.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          if (!consumeFirstPlanPng()) incrementExportCount();
          trackEvent(Events.EXPORT_PNG, {
            buildingCount: plan.buildings.length,
            watermarked: true,
          });
          setExporting(false);
        };
        img.src = dataUrl;
      } else {
        const link = document.createElement('a');
        link.download = `${plan.name.replace(/\s+/g, '_')}_hive.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        incrementExportCount();
        trackEvent(Events.EXPORT_PNG, {
          buildingCount: plan.buildings.length,
          watermarked: false,
        });
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
    trackEvent(Events.EXPORT_CSV, {
      buildingCount: plan.buildings.length,
      originX,
      originY,
    });
  };

  return (
    <div className="modal-body">
      {!isPro && (
        <div className="export-limit-banner">
          <span className="limit-icon">📊</span>
          <span className="limit-text">
            {remainingExports > 0
              ? `${remainingExports} free exports remaining this month`
              : 'Export limit reached!'}
          </span>
          <button
            className="upgrade-small-btn"
            onClick={() => {
              onClose();
              onUpgrade();
            }}
          >
            Go Pro →
          </button>
        </div>
      )}

      <div className="export-section">
        <h3>🔗 Snapshot link</h3>
        <p className="export-desc">
          A frozen copy of this plan. Anyone with the link can view and copy
          it — great for Reddit/Discord posts. (For live editing with your
          alliance, use the Collaborate tab.)
        </p>
        <div className="link-input-group">
          <input type="text" value={shareUrl} readOnly className="link-input" />
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopyLink}
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

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

      <div className="export-section">
        <h3>📍 Export Coordinates (CSV)</h3>
        <p className="export-desc">Share player positions with your alliance</p>
        <div className="origin-inputs">
          <div className="origin-input">
            <label>Origin X:</label>
            <input
              type="number"
              value={originX}
              onChange={(e) => setOriginX(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="origin-input">
            <label>Origin Y:</label>
            <input
              type="number"
              value={originY}
              onChange={(e) => setOriginY(parseInt(e.target.value) || 0)}
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

      {!isPro && canEarnBonus && (
        <div className="share-reward-section">
          <div className="reward-header">
            <span className="reward-icon">🎁</span>
            <span className="reward-title">Earn +3 Free Exports!</span>
          </div>
          <p className="reward-desc">
            Share your hive on social media and get bonus exports
          </p>

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
                    window.open(
                      `https://reddit.com/r/LastWarMobileGame/submit?url=${encodeURIComponent(
                        shareUrl
                      )}&title=${encodeURIComponent(
                        `Check out my hive layout - ${plan.name}`
                      )}`,
                      '_blank'
                    );
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
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        `Planning my alliance hive with HiveWar Pro! 🏰`
                      )}&url=${encodeURIComponent(shareUrl)}`,
                      '_blank'
                    );
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

      <div className="export-tip">
        <span className="tip-icon">💡</span>
        <span>
          Pro tip: Share your PNG in #strategies on the Last War Discord for
          feedback!
        </span>
      </div>
    </div>
  );
}
