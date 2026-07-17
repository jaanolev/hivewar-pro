import { useState } from 'react';
import type { BuildingType } from '../../types';
import { BUILDING_TYPES, BUILDING_CATEGORIES } from '../../data/buildings';
import './BuildingPalette.css';

interface BuildingPaletteProps {
  selectedTypeId: string | null;
  onSelectType: (typeId: string | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function BuildingPalette({
  selectedTypeId,
  onSelectType,
  isOpen,
  onToggle
}: BuildingPaletteProps) {
  const [activeCategory, setActiveCategory] = useState<string>('headquarters');

  const filteredBuildings = BUILDING_TYPES.filter(b => b.category === activeCategory);

  return (
    <div className={`building-palette ${isOpen ? 'open' : ''}`}>
      <button className="palette-toggle" onClick={onToggle}>
        <span className="toggle-icon">{isOpen ? '▼' : '🏗️'}</span>
        <span className="toggle-text">{isOpen ? 'Close' : 'Buildings'}</span>
      </button>

      {isOpen && (
        <div className="palette-content">
          <h3 className="palette-title">Buildings</h3>

          {/* Category tabs — labels on mobile reduce dead taps on icon-only chips */}
          <div className="category-tabs" role="tablist" aria-label="Building categories">
            {BUILDING_CATEGORIES.map(cat => (
              <button
                type="button"
                key={cat.id}
                role="tab"
                aria-selected={activeCategory === cat.id}
                className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.name}
              >
                <span className="category-tab-icon" aria-hidden="true">{cat.icon}</span>
                <span className="category-tab-label">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Buildings grid */}
          <div className="buildings-grid">
            {filteredBuildings.map(building => (
              <BuildingCard
                key={building.id}
                building={building}
                isSelected={selectedTypeId === building.id}
                onSelect={() => onSelectType(selectedTypeId === building.id ? null : building.id)}
              />
            ))}
          </div>

          {/* Instructions — keep visible on mobile when a type is selected */}
          <div className={`palette-hint ${selectedTypeId ? 'palette-hint-active' : ''}`}>
            {selectedTypeId
              ? '👆 Tap the grid to place'
              : '👇 Select a building type'}
          </div>
        </div>
      )}
    </div>
  );
}

interface BuildingCardProps {
  building: BuildingType;
  isSelected: boolean;
  onSelect: () => void;
}

function BuildingCard({ building, isSelected, onSelect }: BuildingCardProps) {
  return (
    <button
      type="button"
      className={`building-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${building.name}, ${building.width} by ${building.height}`}
      style={{ '--building-color': building.color } as React.CSSProperties}
    >
      <div className="building-icon" aria-hidden="true">{building.icon}</div>
      <div className="building-name">{building.name}</div>
      <div className="building-size">{building.width}×{building.height}</div>
    </button>
  );
}

