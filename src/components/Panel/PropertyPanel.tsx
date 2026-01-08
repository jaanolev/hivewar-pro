import type { PlacedBuilding } from '../../types';
import { getBuildingById } from '../../data/buildings';
import './PropertyPanel.css';

interface PropertyPanelProps {
  building: PlacedBuilding | null;
  onUpdate: (updates: Partial<PlacedBuilding>) => void;
  onRotate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function PropertyPanel({
  building,
  onUpdate,
  onRotate,
  onDelete,
  onClose
}: PropertyPanelProps) {
  if (!building) return null;

  const buildingType = getBuildingById(building.buildingTypeId);
  if (!buildingType) return null;

  return (
    <div className="property-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="building-icon-large">{buildingType.icon}</span>
          <div>
            <h3>{buildingType.name}</h3>
            <span className="building-category">{buildingType.category}</span>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="panel-content">
        {/* Position */}
        <div className="property-group">
          <label className="property-label">Position</label>
          <div className="property-row">
            <div className="input-group">
              <span className="input-prefix">X</span>
              <input
                type="number"
                value={building.gridX}
                onChange={(e) => onUpdate({ gridX: parseInt(e.target.value) || 0 })}
                min={0}
                max={50 - buildingType.width}
              />
            </div>
            <div className="input-group">
              <span className="input-prefix">Y</span>
              <input
                type="number"
                value={building.gridY}
                onChange={(e) => onUpdate({ gridY: parseInt(e.target.value) || 0 })}
                min={0}
                max={50 - buildingType.height}
              />
            </div>
          </div>
        </div>

        {/* Level */}
        <div className="property-group">
          <label className="property-label">Level</label>
          <div className="level-selector">
            <input
              type="range"
              min={1}
              max={buildingType.maxLevel}
              value={building.level}
              onChange={(e) => onUpdate({ level: parseInt(e.target.value) })}
            />
            <span className="level-value">{building.level}</span>
          </div>
        </div>

        {/* Rotation */}
        <div className="property-group">
          <label className="property-label">Rotation</label>
          <div className="rotation-btns">
            {[0, 90, 180, 270].map(deg => (
              <button
                key={deg}
                className={`rotation-btn ${building.rotation === deg ? 'active' : ''}`}
                onClick={() => onUpdate({ rotation: deg as 0 | 90 | 180 | 270 })}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* Player Name */}
        <div className="property-group">
          <label className="property-label">Player Name (Optional)</label>
          <input
            type="text"
            className="text-input"
            placeholder="Enter player name..."
            value={building.playerName || ''}
            onChange={(e) => onUpdate({ playerName: e.target.value })}
          />
        </div>

        {/* Notes */}
        <div className="property-group">
          <label className="property-label">Notes</label>
          <textarea
            className="text-input notes-input"
            placeholder="Add notes..."
            value={building.notes || ''}
            onChange={(e) => onUpdate({ notes: e.target.value })}
          />
        </div>
      </div>

      <div className="panel-actions">
        <button className="action-btn-panel rotate" onClick={onRotate}>
          🔄 Rotate
        </button>
        <button className="action-btn-panel delete" onClick={onDelete}>
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}

