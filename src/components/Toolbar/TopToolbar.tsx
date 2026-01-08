import type { ToolMode } from '../../types';
import './TopToolbar.css';

interface TopToolbarProps {
  planName: string;
  toolMode: ToolMode;
  showGrid: boolean;
  showCoords: boolean;
  onToolModeChange: (mode: ToolMode) => void;
  onToggleGrid: () => void;
  onToggleCoords: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onShare: () => void;
  onSave: () => void;
  onMenuOpen: () => void;
  onTemplatesOpen: () => void;
  canUndo: boolean;
  canRedo: boolean;
  buildingCount: number;
  defensePower: number;
}

export default function TopToolbar({
  planName,
  toolMode,
  showGrid,
  showCoords,
  onToolModeChange,
  onToggleGrid,
  onToggleCoords,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onShare,
  onSave,
  onMenuOpen,
  onTemplatesOpen,
  canUndo,
  canRedo,
  buildingCount,
  defensePower
}: TopToolbarProps) {
  const tools: { mode: ToolMode; icon: string; label: string }[] = [
    { mode: 'select', icon: '👆', label: 'Select' },
    { mode: 'pan', icon: '✋', label: 'Pan' },
    { mode: 'delete', icon: '🗑️', label: 'Delete' },
  ];

  return (
    <div className="top-toolbar">
      <div className="toolbar-left">
        <button className="menu-btn" onClick={onMenuOpen} title="Menu">
          ☰
        </button>
        <div className="plan-info">
          <h1 className="plan-name">{planName}</h1>
          <div className="plan-stats">
            <span className="stat">🏗️ {buildingCount}</span>
            <span className="stat">⚔️ {defensePower.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="toolbar-center">
        <div className="tool-group">
          {tools.map(tool => (
            <button
              key={tool.mode}
              className={`tool-btn ${toolMode === tool.mode ? 'active' : ''}`}
              onClick={() => onToolModeChange(tool.mode)}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        <div className="divider" />

        <div className="tool-group">
          <button 
            className="tool-btn" 
            onClick={onUndo} 
            disabled={!canUndo}
            title="Undo"
          >
            ↩️
          </button>
          <button 
            className="tool-btn" 
            onClick={onRedo} 
            disabled={!canRedo}
            title="Redo"
          >
            ↪️
          </button>
        </div>

        <div className="divider" />

        <div className="tool-group">
          <button 
            className={`tool-btn ${showGrid ? 'active' : ''}`}
            onClick={onToggleGrid}
            title="Toggle Grid"
          >
            #
          </button>
          <button 
            className={`tool-btn ${showCoords ? 'active' : ''}`}
            onClick={onToggleCoords}
            title="Toggle Coordinates"
          >
            📍
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        <button className="action-btn templates" onClick={onTemplatesOpen} title="Templates">
          📋
        </button>
        <button className="action-btn danger" onClick={onClear} title="Clear All">
          🗑️
        </button>
        <button className="action-btn" onClick={onSave} title="Save">
          💾
        </button>
        <button className="action-btn primary" onClick={onExport} title="Export PNG">
          📷
        </button>
        <button className="action-btn accent" onClick={onShare} title="Share Link">
          🔗
        </button>
      </div>
    </div>
  );
}

