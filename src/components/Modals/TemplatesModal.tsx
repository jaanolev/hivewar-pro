import { useState, useEffect, useMemo } from 'react';
import type { HiveTemplate } from '../../data/templates';
import { HIVE_TEMPLATES, TEMPLATE_CATEGORIES } from '../../data/templates';
import { trackEvent, Events } from '../../utils/analytics';
import { useDragDismiss } from '../../hooks/useDragDismiss';
import './Modal.css';
import './TemplatesModal.css';

interface TemplatesModalProps {
  onApplyTemplate: (buildings: HiveTemplate['buildings']) => void;
  onClose: () => void;
  onUpgrade: () => void;
  isPro?: boolean;
  currentBuildingCount?: number;
}

function firstSelectable(
  templates: HiveTemplate[],
  isPro: boolean
): HiveTemplate | null {
  return (
    templates.find((t) => !t.isPro || isPro) ?? templates[0] ?? null
  );
}

export default function TemplatesModal({
  onApplyTemplate,
  onClose,
  onUpgrade,
  isPro = false,
  currentBuildingCount = 0,
}: TemplatesModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('defense');
  const [selectedTemplate, setSelectedTemplate] = useState<HiveTemplate | null>(
    null
  );
  const { dragHandlers, sheetStyle } = useDragDismiss(onClose);

  useEffect(() => {
    trackEvent(Events.TEMPLATE_VIEWED);
  }, []);

  const filteredTemplates = useMemo(
    () => HIVE_TEMPLATES.filter((t) => t.category === activeCategory),
    [activeCategory]
  );

  // Auto-select a usable template so Apply is always one tap away —
  // Clarity: users opened Browse templates then never applied.
  useEffect(() => {
    setSelectedTemplate(firstSelectable(filteredTemplates, isPro));
  }, [filteredTemplates, isPro]);

  const handleApply = (template: HiveTemplate) => {
    if (template.isPro && !isPro) {
      onClose();
      onUpgrade();
      return;
    }

    // Only ask for confirmation when there's real work to lose. New users
    // on an empty plan get the template applied silently.
    if (currentBuildingCount > 0) {
      const ok = confirm(
        `Replace the ${currentBuildingCount} building${
          currentBuildingCount === 1 ? '' : 's'
        } on your plan with "${template.name}"?`
      );
      if (!ok) {
        trackEvent(Events.TEMPLATE_APPLY_CANCELLED, {
          templateId: template.id,
          existingBuildings: currentBuildingCount,
        });
        return;
      }
    }

    onApplyTemplate(template.buildings);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content templates-modal"
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" {...dragHandlers}>
          <h2>📋 Hive Templates</h2>
          <button
            type="button"
            className="modal-close templates-close"
            onClick={onClose}
            aria-label="Close templates"
          >
            ✕
          </button>
        </div>

        <div className="modal-body templates-body">
          <p className="templates-intro">
            Pick a proven layout, then hit <strong>Apply</strong> to drop it on
            your grid.
          </p>

          <div className="template-categories">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                className={`template-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-name">{cat.name}</span>
              </button>
            ))}
          </div>

          <div className="templates-grid">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                role="button"
                tabIndex={0}
                className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''} ${template.isPro && !isPro ? 'locked' : ''}`}
                onClick={() => setSelectedTemplate(template)}
                onDoubleClick={() => handleApply(template)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedTemplate(template);
                  }
                }}
              >
                {template.isPro && !isPro && (
                  <div className="pro-badge">PRO</div>
                )}
                <div className="template-preview">
                  <div className="preview-grid">
                    {template.buildings.slice(0, 12).map((b, i) => (
                      <div
                        key={i}
                        className="preview-dot"
                        style={{
                          left: `${(b.gridX / 50) * 100}%`,
                          top: `${(b.gridY / 50) * 100}%`,
                          background: b.buildingTypeId.includes('marshal')
                            ? '#8B5CF6'
                            : b.buildingTypeId.includes('r4')
                              ? '#EC4899'
                              : b.buildingTypeId.includes('hq')
                                ? '#3B82F6'
                                : '#6B7280',
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="template-info">
                  <h4>{template.name}</h4>
                  <p>{template.description}</p>
                  <div className="template-meta">
                    <span className="building-count">
                      🏗️ {template.buildings.length}
                    </span>
                    {template.season && (
                      <span className="season-tag">{template.season}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedTemplate && (
            <div className="template-details">
              <div className="details-header">
                <h3>{selectedTemplate.name}</h3>
                {selectedTemplate.author && (
                  <span className="author">by {selectedTemplate.author}</span>
                )}
              </div>
              <p>{selectedTemplate.description}</p>
              <div className="details-stats">
                <div className="stat">
                  <span className="stat-label">Buildings</span>
                  <span className="stat-value">
                    {selectedTemplate.buildings.length}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">HQs</span>
                  <span className="stat-value">
                    {
                      selectedTemplate.buildings.filter((b) =>
                        b.buildingTypeId.includes('hq')
                      ).length
                    }
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Defenses</span>
                  <span className="stat-value">
                    {
                      selectedTemplate.buildings.filter(
                        (b) =>
                          b.buildingTypeId.includes('tower') ||
                          b.buildingTypeId.includes('bunker') ||
                          b.buildingTypeId.includes('wall')
                      ).length
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {!isPro && (
            <div className="pro-upsell">
              <span className="pro-icon">⭐</span>
              <div className="pro-text">
                <strong>Unlock All Templates</strong>
                <p>
                  Get Pro for exclusive seasonal layouts and community picks!
                </p>
              </div>
              <button
                type="button"
                className="upgrade-btn"
                onClick={() => {
                  onClose();
                  onUpgrade();
                }}
              >
                Upgrade €4.99/mo →
              </button>
            </div>
          )}
        </div>

        {selectedTemplate && (
          <div className="templates-apply-bar">
            <button
              type="button"
              className="apply-template-btn"
              onClick={() => handleApply(selectedTemplate)}
            >
              {selectedTemplate.isPro && !isPro
                ? '🔒 Unlock with Pro'
                : `✨ Apply “${selectedTemplate.name}”`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
