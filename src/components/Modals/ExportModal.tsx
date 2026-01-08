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
  incrementExportCount
} from '../../utils/storage';
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

  const shareUrl = planToShareUrl(plan);
  const remainingExports = getRemainingExports(isPro);
  const canDoExport = canExport(isPro);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPNG = async () => {
    if (!stageRef.current) return;
    if (!canDoExport) {
      alert('Export limit reached! Upgrade to Pro for unlimited exports.');
      return;
    }
    
    setExporting(true);
    try {
      const stage = stageRef.current;
      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      
      // Create download
      const link = document.createElement('a');
      link.download = `${plan.name.replace(/\s+/g, '_')}_hive.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      incrementExportCount();
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = () => {
    if (!canDoExport) {
      alert('Export limit reached! Upgrade to Pro for unlimited exports.');
      return;
    }
    const json = exportPlanAsJson(plan);
    downloadFile(json, `${plan.name.replace(/\s+/g, '_')}_hive.json`);
    incrementExportCount();
  };

  const handleExportCSV = () => {
    if (!canDoExport) {
      alert('Export limit reached! Upgrade to Pro for unlimited exports.');
      return;
    }
    const csv = exportPlanAsCsv(plan, originX, originY);
    downloadFile(csv, `${plan.name.replace(/\s+/g, '_')}_coords.csv`, 'text/csv');
    incrementExportCount();
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
