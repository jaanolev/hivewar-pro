import { useState } from 'react';
import type { HivePlan } from '../../types';
import ExportPanel from './ExportPanel';
import LiveSharePanel from './LiveSharePanel';
import { useDragDismiss } from '../../hooks/useDragDismiss';
import './Modal.css';
import './ShareHub.css';

export type ShareTab = 'collaborate' | 'export';

interface Props {
  plan: HivePlan;
  stageRef: React.RefObject<any>;
  initialTab: ShareTab;
  isPro: boolean;
  onUpgrade: () => void;
  onClose: () => void;
}

export default function ShareHub({
  plan,
  stageRef,
  initialTab,
  isPro,
  onUpgrade,
  onClose,
}: Props) {
  const [tab, setTab] = useState<ShareTab>(initialTab);
  const { dragHandlers, sheetStyle } = useDragDismiss(onClose);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" {...dragHandlers}>
          <h2>Share “{plan.name}”</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="sharehub-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'collaborate'}
            className={`sharehub-tab ${tab === 'collaborate' ? 'active' : ''}`}
            onClick={() => setTab('collaborate')}
          >
            👥 Collaborate live
          </button>
          <button
            role="tab"
            aria-selected={tab === 'export'}
            className={`sharehub-tab ${tab === 'export' ? 'active' : ''}`}
            onClick={() => setTab('export')}
          >
            📷 Export &amp; post
          </button>
        </div>

        {tab === 'collaborate' ? (
          <div className="modal-body">
            <LiveSharePanel planId={plan.id} />
          </div>
        ) : (
          <ExportPanel
            plan={plan}
            stageRef={stageRef}
            isPro={isPro}
            onUpgrade={onUpgrade}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
