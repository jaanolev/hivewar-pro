import { useState } from 'react';
import './Modal.css';
import './HelpModal.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpSection = 'getting-started' | 'interface' | 'guides' | 'faq' | 'tips';

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState<HelpSection>('getting-started');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📖 Help & User Guide</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="help-container">
          {/* Navigation Tabs */}
          <div className="help-tabs">
            <button 
              className={`help-tab ${activeSection === 'getting-started' ? 'active' : ''}`}
              onClick={() => setActiveSection('getting-started')}
            >
              🚀 Start
            </button>
            <button 
              className={`help-tab ${activeSection === 'interface' ? 'active' : ''}`}
              onClick={() => setActiveSection('interface')}
            >
              🖥️ Interface
            </button>
            <button 
              className={`help-tab ${activeSection === 'guides' ? 'active' : ''}`}
              onClick={() => setActiveSection('guides')}
            >
              📝 Guides
            </button>
            <button 
              className={`help-tab ${activeSection === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveSection('faq')}
            >
              ❓ FAQ
            </button>
            <button 
              className={`help-tab ${activeSection === 'tips' ? 'active' : ''}`}
              onClick={() => setActiveSection('tips')}
            >
              💡 Tips
            </button>
          </div>

          {/* Content */}
          <div className="help-content">
            {activeSection === 'getting-started' && (
              <div className="help-section">
                <h3>🏰 Welcome to HiveWar Pro!</h3>
                <p className="help-intro">
                  Visual hive planner for Last War: Survival alliances. Plan formations, 
                  assign positions, and coordinate your alliance like a pro!
                </p>

                <div className="help-card">
                  <h4>Quick Start (60 seconds)</h4>
                  <ol>
                    <li><strong>Load a template:</strong> Click 📋 Templates → Choose "Diamond Defense"</li>
                    <li><strong>Assign players:</strong> Click any building → Enter player name</li>
                    <li><strong>Export:</strong> Click 🔗 Share → Download PNG</li>
                    <li><strong>Share:</strong> Post the image to your Discord!</li>
                  </ol>
                </div>

                <div className="help-card">
                  <h4>Who is this for?</h4>
                  <table className="help-table">
                    <tbody>
                      <tr><td><strong>R5 (Marshal)</strong></td><td>Plan entire alliance layouts</td></tr>
                      <tr><td><strong>R4 (Officers)</strong></td><td>Review and suggest improvements</td></tr>
                      <tr><td><strong>Members</strong></td><td>Find your assigned position</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === 'interface' && (
              <div className="help-section">
                <h3>🖥️ Interface Overview</h3>

                <div className="help-card">
                  <h4>Top Toolbar</h4>
                  <table className="help-table">
                    <tbody>
                      <tr><td>☰</td><td><strong>Menu</strong></td><td>Manage multiple hive plans</td></tr>
                      <tr><td>👆</td><td><strong>Select</strong></td><td>Click to select/move buildings</td></tr>
                      <tr><td>✋</td><td><strong>Pan</strong></td><td>Drag to move canvas view</td></tr>
                      <tr><td>🗑️</td><td><strong>Delete</strong></td><td>Click buildings to remove</td></tr>
                      <tr><td>↩️ ↪️</td><td><strong>Undo/Redo</strong></td><td>Reverse or restore actions</td></tr>
                      <tr><td>📋</td><td><strong>Templates</strong></td><td>Pre-made formations</td></tr>
                      <tr><td>🔗</td><td><strong>Share</strong></td><td>Export PNG, CSV, JSON, Link</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="help-card">
                  <h4>Building Categories</h4>
                  <table className="help-table">
                    <tbody>
                      <tr><td>🏰</td><td><strong>Headquarters</strong></td><td>HQ, Marshal HQ, R4 HQ</td></tr>
                      <tr><td>🛡️</td><td><strong>Defense</strong></td><td>Walls, Anti-Air, Missile</td></tr>
                      <tr><td>🏭</td><td><strong>Production</strong></td><td>Farms, Mines, Factories</td></tr>
                      <tr><td>🤠</td><td><strong>Seasonal</strong></td><td>Event buildings</td></tr>
                      <tr><td>📍</td><td><strong>Special</strong></td><td>Markers, Notes</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="help-card">
                  <h4>Property Panel (Right Side)</h4>
                  <p>Click any building to see:</p>
                  <ul>
                    <li><strong>Position:</strong> X/Y grid coordinates</li>
                    <li><strong>Level:</strong> Building level (1-30)</li>
                    <li><strong>Rotation:</strong> 0°, 90°, 180°, 270°</li>
                    <li><strong>Player Name:</strong> Assign to member</li>
                    <li><strong>Notes:</strong> Tactical information</li>
                  </ul>
                </div>
              </div>
            )}

            {activeSection === 'guides' && (
              <div className="help-section">
                <h3>📝 Step-by-Step Guides</h3>

                <div className="help-card">
                  <h4>Guide 1: Create Your First Hive</h4>
                  <ol>
                    <li>Click 📋 Templates</li>
                    <li>Select "Diamond Defense"</li>
                    <li>Click on Marshal HQ (center crown)</li>
                    <li>Enter your R5's name in "Player Name"</li>
                    <li>Repeat for each position</li>
                    <li>Click 💾 Save</li>
                    <li>Click 🔗 Share → 📷 Download PNG</li>
                    <li>Share on Discord!</li>
                  </ol>
                </div>

                <div className="help-card">
                  <h4>Guide 2: Export Coordinates</h4>
                  <ol>
                    <li>Complete your plan with player names</li>
                    <li>Click 🔗 Share</li>
                    <li>In "Export Coordinates (CSV)" section:</li>
                    <li>Enter <strong>Origin X</strong>: Your hive's X coordinate in-game</li>
                    <li>Enter <strong>Origin Y</strong>: Your hive's Y coordinate in-game</li>
                    <li>Click 📍 Download CSV</li>
                    <li>Open in Excel → Share with alliance!</li>
                  </ol>
                </div>

                <div className="help-card">
                  <h4>Guide 3: Plan for S6 War</h4>
                  <ol>
                    <li>Click ☰ Menu → ➕ New Hive Plan</li>
                    <li>Name it "S6 War Formation"</li>
                    <li>Load a defensive template (Turtle Shell)</li>
                    <li>Customize for your alliance</li>
                    <li>Click 🔗 Share → Copy link</li>
                    <li>Send to R4 officers for review</li>
                  </ol>
                </div>
              </div>
            )}

            {activeSection === 'faq' && (
              <div className="help-section">
                <h3>❓ Frequently Asked Questions</h3>

                <div className="help-card faq-card">
                  <h4>Do I need an account?</h4>
                  <p>No! Everything saves to your browser automatically. No login required.</p>
                </div>

                <div className="help-card faq-card">
                  <h4>Will my plans be saved?</h4>
                  <p>Yes! Plans persist in your browser's local storage between sessions.</p>
                </div>

                <div className="help-card faq-card">
                  <h4>What is Origin X/Y?</h4>
                  <p>The coordinates where your grid's (0,0) maps to on the game's world map. 
                     Find your hive location in-game, enter those coords, and CSV export will 
                     show accurate game coordinates.</p>
                </div>

                <div className="help-card faq-card">
                  <h4>Can someone edit my shared plan?</h4>
                  <p>No. Shared links are view-only. Others can copy to their account but can't edit yours.</p>
                </div>

                <div className="help-card faq-card">
                  <h4>PNG vs CSV vs JSON?</h4>
                  <ul>
                    <li><strong>PNG:</strong> Image for Discord/Reddit</li>
                    <li><strong>CSV:</strong> Spreadsheet with coordinates</li>
                    <li><strong>JSON:</strong> Complete backup file</li>
                  </ul>
                </div>

                <div className="help-card faq-card">
                  <h4>How do I rotate a building?</h4>
                  <p>Click the building, then use rotation buttons (0°, 90°, 180°, 270°) in the Property Panel.</p>
                </div>
              </div>
            )}

            {activeSection === 'tips' && (
              <div className="help-section">
                <h3>💡 Tips & Best Practices</h3>

                <div className="help-card">
                  <h4>🏰 Formation Tips</h4>
                  <table className="help-table">
                    <tbody>
                      <tr><td>Marshal in CENTER</td><td>Hardest position to rally</td></tr>
                      <tr><td>R4s on CORNERS</td><td>First to spot incoming attacks</td></tr>
                      <tr><td>Weak players INSIDE</td><td>Protected by stronger members</td></tr>
                      <tr><td>Anti-Air near CENTER</td><td>Counters helicopter rallies</td></tr>
                      <tr><td>Leave NO GAPS</td><td>Enemies can teleport into gaps</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="help-card">
                  <h4>📋 Planning Tips</h4>
                  <table className="help-table">
                    <tbody>
                      <tr><td>Create MULTIPLE plans</td><td>Different situations need different formations</td></tr>
                      <tr><td>Name plans clearly</td><td>"S6 Defense", "Farm Mode", etc.</td></tr>
                      <tr><td>Add NOTES</td><td>Tactical reminders for officers</td></tr>
                      <tr><td>Export JSON backup</td><td>Restore if browser data is cleared</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="help-card">
                  <h4>⌨️ Keyboard Shortcuts</h4>
                  <table className="help-table">
                    <tbody>
                      <tr><td><code>Ctrl + Z</code></td><td>Undo</td></tr>
                      <tr><td><code>Ctrl + Y</code></td><td>Redo</td></tr>
                      <tr><td><code>Ctrl + S</code></td><td>Save</td></tr>
                      <tr><td><code>Delete</code></td><td>Delete selected building</td></tr>
                      <tr><td><code>Escape</code></td><td>Deselect / Close modal</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="help-footer">
          <p>🏰 HiveWar Pro v1.0.0 • Made for the Last War community</p>
        </div>
      </div>
    </div>
  );
}

