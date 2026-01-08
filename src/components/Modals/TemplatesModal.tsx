import { useState } from 'react';
import type { HiveTemplate } from '../../data/templates';
import { HIVE_TEMPLATES, TEMPLATE_CATEGORIES } from '../../data/templates';
import './Modal.css';
import './TemplatesModal.css';

interface TemplatesModalProps {
  onApplyTemplate: (buildings: HiveTemplate['buildings']) => void;
  onClose: () => void;
  onUpgrade: () => void;
  isPro?: boolean;
}

export default function TemplatesModal({
  onApplyTemplate,
  onClose,
  onUpgrade,
  isPro = false
}: TemplatesModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('defense');
  const [selectedTemplate, setSelectedTemplate] = useState<HiveTemplate | null>(null);

  const filteredTemplates = HIVE_TEMPLATES.filter(t => t.category === activeCategory);

  const handleApply = (template: HiveTemplate) => {
    if (template.isPro && !isPro) {
      onClose();
      onUpgrade();
      return;
    }
    
    if (confirm(`Apply "${template.name}" template? This will replace your current buildings.`)) {
      onApplyTemplate(template.buildings);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content templates-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Hive Templates</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Category tabs */}
          <div className="template-categories">
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`template-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-name">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Templates grid */}
          <div className="templates-grid">
            {filteredTemplates.map(template => (
              <div 
                key={template.id}
                className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''} ${template.isPro && !isPro ? 'locked' : ''}`}
                onClick={() => setSelectedTemplate(template)}
              >
                {template.isPro && !isPro && (
                  <div className="pro-badge">PRO</div>
                )}
                <div className="template-preview">
                  <div className="preview-grid">
                    {/* Mini preview of building positions */}
                    {template.buildings.slice(0, 12).map((b, i) => (
                      <div 
                        key={i}
                        className="preview-dot"
                        style={{
                          left: `${(b.gridX / 50) * 100}%`,
                          top: `${(b.gridY / 50) * 100}%`,
                          background: b.buildingTypeId.includes('marshal') ? '#8B5CF6' 
                            : b.buildingTypeId.includes('r4') ? '#EC4899'
                            : b.buildingTypeId.includes('hq') ? '#3B82F6'
                            : '#6B7280'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="template-info">
                  <h4>{template.name}</h4>
                  <p>{template.description}</p>
                  <div className="template-meta">
                    <span className="building-count">🏗️ {template.buildings.length}</span>
                    {template.season && <span className="season-tag">{template.season}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected template details */}
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
                  <span className="stat-value">{selectedTemplate.buildings.length}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">HQs</span>
                  <span className="stat-value">
                    {selectedTemplate.buildings.filter(b => b.buildingTypeId.includes('hq')).length}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Defenses</span>
                  <span className="stat-value">
                    {selectedTemplate.buildings.filter(b => 
                      b.buildingTypeId.includes('tower') || b.buildingTypeId.includes('bunker') || b.buildingTypeId.includes('wall')
                    ).length}
                  </span>
                </div>
              </div>
              <button 
                className="apply-template-btn"
                onClick={() => handleApply(selectedTemplate)}
              >
                {selectedTemplate.isPro && !isPro ? '🔒 Unlock with Pro' : '✨ Apply Template'}
              </button>
            </div>
          )}

          {/* Pro upsell */}
          {!isPro && (
            <div className="pro-upsell">
              <span className="pro-icon">⭐</span>
              <div className="pro-text">
                <strong>Unlock All Templates</strong>
                <p>Get Pro for exclusive seasonal layouts and community picks!</p>
              </div>
              <button className="upgrade-btn" onClick={() => { onClose(); onUpgrade(); }}>
                Upgrade €4.99/mo →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

