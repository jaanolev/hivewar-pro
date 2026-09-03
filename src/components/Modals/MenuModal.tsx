import { useState, useRef } from 'react';
import type { HivePlan } from '../../types';
import { importPlanFromJson } from '../../utils/storage';
import { useDragDismiss } from '../../hooks/useDragDismiss';
import './Modal.css';

export interface MenuEditorControls {
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
  showCoords: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleGrid: () => void;
  onToggleCoords: () => void;
  onTemplates: () => void;
  onClear: () => void;
  onSave: () => void;
  onboarded?: boolean;
}

interface MenuModalProps {
  plans: HivePlan[];
  currentPlanId: string;
  onSelectPlan: (planId: string) => void;
  onCreatePlan: (name: string) => void;
  onDeletePlan: (planId: string) => void;
  onRenamePlan: (name: string) => void;
  onImportPlan: (plan: HivePlan) => void;
  onClose: () => void;
  editorControls: MenuEditorControls;
}

export default function MenuModal({
  plans,
  currentPlanId,
  onSelectPlan,
  onCreatePlan,
  onDeletePlan,
  onRenamePlan,
  onImportPlan,
  onClose,
  editorControls,
}: MenuModalProps) {
  const [newPlanName, setNewPlanName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPlan = plans.find(p => p.id === currentPlanId);
  const { dragHandlers, sheetStyle } = useDragDismiss(onClose);

  const handleCreate = () => {
    if (newPlanName.trim()) {
      onCreatePlan(newPlanName.trim());
      setNewPlanName('');
      setShowNewForm(false);
    }
  };

  const handleRename = () => {
    if (tempName.trim()) {
      onRenamePlan(tempName.trim());
      setEditingName(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const plan = importPlanFromJson(content);
      if (plan) {
        onImportPlan(plan);
        onClose();
      } else {
        alert('Invalid plan file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content menu-modal"
        style={sheetStyle}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" {...dragHandlers}>
          <h2>🗂️ My Hive Plans</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* First-run tip: guide users to copy alliance link */}
          {editorControls.onboarded === false && (
            <div className="menu-first-run-tip">
              💡 Copy the alliance link for Discord first
            </div>
          )}

          {/* Mobile-only: editor controls that don't fit in the slim
              phone toolbar (hidden on desktop via CSS). */}
          <div className="menu-editor-controls">
            <h4>Editor</h4>
            <div className="menu-control-grid">
              <button
                onClick={() => { editorControls.onUndo(); }}
                disabled={!editorControls.canUndo}
              >
                ↩️ Undo
              </button>
              <button
                onClick={() => { editorControls.onRedo(); }}
                disabled={!editorControls.canRedo}
              >
                ↪️ Redo
              </button>
              <button
                className={editorControls.showGrid ? 'active' : ''}
                onClick={editorControls.onToggleGrid}
              >
                # Grid
              </button>
              <button
                className={editorControls.showCoords ? 'active' : ''}
                onClick={editorControls.onToggleCoords}
              >
                📍 Coords
              </button>
              <button onClick={() => { onClose(); editorControls.onTemplates(); }}>
                📋 Templates
              </button>
              <button onClick={editorControls.onSave}>💾 Save</button>
              {editorControls.onboarded !== false && (
                <button
                  className="menu-control-danger"
                  onClick={editorControls.onClear}
                >
                  🗑️ Clear all
                </button>
              )}
            </div>
          </div>

          {/* Current plan actions */}
          {currentPlan && (
            <div className="current-plan-section">
              <div className="current-plan-header">
                <span className="current-badge">Current</span>
                {editingName ? (
                  <div className="rename-form">
                    <input
                      type="text"
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename()}
                      autoFocus
                    />
                    <button onClick={handleRename}>✓</button>
                    <button onClick={() => setEditingName(false)}>✕</button>
                  </div>
                ) : (
                  <h3 
                    onClick={editorControls.onboarded !== false ? () => { setEditingName(true); setTempName(currentPlan.name); } : undefined}
                    style={editorControls.onboarded === false ? { cursor: 'default' } : undefined}
                  >
                    {currentPlan.name} {editorControls.onboarded !== false && '✏️'}
                  </h3>
                )}
              </div>
              <div className="current-plan-stats">
                <span>🏗️ {currentPlan.buildings.length} buildings</span>
                <span>📅 {new Date(currentPlan.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* Plans list */}
          <div className="plans-list">
            <h4>All Plans ({plans.length})</h4>
            {plans.map(plan => (
              <div 
                key={plan.id}
                className={`plan-item ${plan.id === currentPlanId ? 'active' : ''}`}
              >
                <div 
                  className="plan-item-main"
                  onClick={() => { onSelectPlan(plan.id); onClose(); }}
                >
                  <span className="plan-name">{plan.name}</span>
                  <span className="plan-buildings">{plan.buildings.length} 🏗️</span>
                </div>
                {plans.length > 1 && editorControls.onboarded !== false && (
                  <button 
                    className="plan-delete"
                    onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id); }}
                    title="Delete plan"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* New plan form - hidden during first-run */}
          {editorControls.onboarded !== false && (
            <>
              {showNewForm ? (
                <div className="new-plan-form">
                  <input
                    type="text"
                    placeholder="Plan name..."
                    value={newPlanName}
                    onChange={e => setNewPlanName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    autoFocus
                  />
                  <button className="create-btn" onClick={handleCreate}>Create</button>
                  <button className="cancel-btn" onClick={() => setShowNewForm(false)}>Cancel</button>
                </div>
              ) : (
                <button 
                  className="new-plan-btn"
                  onClick={() => setShowNewForm(true)}
                >
                  ➕ New Hive Plan
                </button>
              )}
            </>
          )}

          {/* Import - hidden during first-run */}
          {editorControls.onboarded !== false && (
            <div className="import-section">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <button 
                className="import-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Import JSON
              </button>
            </div>
          )}

          {/* App info */}
          <div className="app-info">
            <h4>🏰 HiveWar Pro</h4>
            <p>Alliance hive planner for Last War: Survival</p>
            <span className="version">v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

