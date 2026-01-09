import { useState, useRef, useCallback, useEffect } from 'react';
import { useHivePlan } from './hooks/useHivePlan';
import { calculateDefensePower, generateId } from './utils/grid';
import type { PlacedBuilding } from './types';
import HiveGrid from './components/Grid/HiveGrid';
import TopToolbar from './components/Toolbar/TopToolbar';
import BuildingPalette from './components/Toolbar/BuildingPalette';
import PropertyPanel from './components/Panel/PropertyPanel';
import ExportModal from './components/Modals/ExportModal';
import MenuModal from './components/Modals/MenuModal';
import TemplatesModal from './components/Modals/TemplatesModal';
import HelpModal from './components/Modals/HelpModal';
import UpgradeModal from './components/Modals/UpgradeModal';
import { getProStatus } from './utils/pro';
import { trackSessionStart, trackEvent, Events } from './utils/analytics';
import './App.css';

export default function App() {
  const {
    plans,
    currentPlan,
    editorState,
    canUndo,
    canRedo,
    addBuilding,
    updateBuilding,
    deleteBuilding,
    rotateBuilding,
    clearBuildings,
    updatePlan,
    createNewPlan,
    switchPlan,
    deletePlan,
    setToolMode,
    selectBuildingType,
    selectBuilding,
    toggleGrid,
    toggleCoords,
    undo,
    redo
  } = useHivePlan();

  const stageRef = useRef<any>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Pro status - read from localStorage
  const [isPro, setIsPro] = useState(() => getProStatus().isPro);

  // Track session on mount
  useEffect(() => {
    trackSessionStart();
  }, []);

  // Get selected building for property panel
  const selectedBuilding = currentPlan?.buildings.find(
    b => b.id === editorState.selectedBuildingId
  );

  // Handle placing building on grid
  const handlePlaceBuilding = useCallback((gridX: number, gridY: number) => {
    if (editorState.selectedBuildingTypeId) {
      addBuilding(editorState.selectedBuildingTypeId, gridX, gridY, 1);
      trackEvent(Events.BUILDING_PLACED, { buildingType: editorState.selectedBuildingTypeId });
    }
  }, [editorState.selectedBuildingTypeId, addBuilding]);

  // Handle moving building
  const handleMoveBuilding = useCallback((buildingId: string, gridX: number, gridY: number) => {
    updateBuilding(buildingId, { gridX, gridY });
  }, [updateBuilding]);

  // Handle updating selected building
  const handleUpdateSelectedBuilding = useCallback((updates: Partial<PlacedBuilding>) => {
    if (editorState.selectedBuildingId) {
      updateBuilding(editorState.selectedBuildingId, updates);
    }
  }, [editorState.selectedBuildingId, updateBuilding]);

  // Handle rotate selected building
  const handleRotateSelected = useCallback(() => {
    if (editorState.selectedBuildingId) {
      rotateBuilding(editorState.selectedBuildingId);
    }
  }, [editorState.selectedBuildingId, rotateBuilding]);

  // Handle delete selected building
  const handleDeleteSelected = useCallback(() => {
    if (editorState.selectedBuildingId) {
      deleteBuilding(editorState.selectedBuildingId);
    }
  }, [editorState.selectedBuildingId, deleteBuilding]);

  // Handle import plan
  const handleImportPlan = useCallback((plan: { name: string; buildings: PlacedBuilding[]; description?: string }) => {
    createNewPlan(plan.name);
    // After creating, update with imported data
    updatePlan({ buildings: plan.buildings, description: plan.description });
  }, [createNewPlan, updatePlan]);

  // Handle apply template
  const handleApplyTemplate = useCallback((templateBuildings: PlacedBuilding[]) => {
    // Clone buildings with new IDs
    const newBuildings = templateBuildings.map(b => ({
      ...b,
      id: generateId()
    }));
    updatePlan({ buildings: newBuildings });
    trackEvent(Events.TEMPLATE_APPLIED, { buildingCount: newBuildings.length });
  }, [updatePlan]);

  // Calculate stats
  const buildingCount = currentPlan?.buildings.length || 0;
  const defensePower = currentPlan ? calculateDefensePower(currentPlan.buildings) : 0;

  if (!currentPlan) {
  return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-icon">🏰</div>
          <h1>HiveWar Pro</h1>
          <p>Loading your hive plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Top Toolbar */}
      <TopToolbar
        planName={currentPlan.name}
        toolMode={editorState.toolMode}
        showGrid={editorState.showGrid}
        showCoords={editorState.showCoords}
        onToolModeChange={setToolMode}
        onToggleGrid={toggleGrid}
        onToggleCoords={toggleCoords}
        onUndo={undo}
        onRedo={redo}
        onClear={() => {
          if (confirm('Clear all buildings? This cannot be undone.')) {
            clearBuildings();
          }
        }}
        onExport={() => setShowExportModal(true)}
        onShare={() => setShowExportModal(true)}
        onSave={() => {
          // Plans auto-save, but show feedback
          alert('Plan saved! ✓');
        }}
        onMenuOpen={() => setShowMenuModal(true)}
        onTemplatesOpen={() => setShowTemplatesModal(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        buildingCount={buildingCount}
        defensePower={defensePower}
      />

      {/* Main Grid Area */}
      <main className="grid-area">
        <HiveGrid
          buildings={currentPlan.buildings}
          gridWidth={currentPlan.gridWidth}
          gridHeight={currentPlan.gridHeight}
          editorState={editorState}
          onPlaceBuilding={handlePlaceBuilding}
          onSelectBuilding={selectBuilding}
          onMoveBuilding={handleMoveBuilding}
          onDeleteBuilding={deleteBuilding}
          stageRef={stageRef}
        />
      </main>

      {/* Building Palette */}
      <BuildingPalette
        selectedTypeId={editorState.selectedBuildingTypeId}
        onSelectType={selectBuildingType}
        isOpen={paletteOpen}
        onToggle={() => setPaletteOpen(!paletteOpen)}
      />

      {/* Property Panel (when building selected) */}
      {selectedBuilding && (
        <PropertyPanel
          building={selectedBuilding}
          onUpdate={handleUpdateSelectedBuilding}
          onRotate={handleRotateSelected}
          onDelete={handleDeleteSelected}
          onClose={() => selectBuilding(null)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          plan={currentPlan}
          stageRef={stageRef}
          onClose={() => setShowExportModal(false)}
          onUpgrade={() => setShowUpgradeModal(true)}
          isPro={isPro}
        />
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <MenuModal
          plans={plans}
          currentPlanId={currentPlan.id}
          onSelectPlan={switchPlan}
          onCreatePlan={createNewPlan}
          onDeletePlan={deletePlan}
          onRenamePlan={(name) => updatePlan({ name })}
          onImportPlan={handleImportPlan}
          onClose={() => setShowMenuModal(false)}
        />
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <TemplatesModal
          onApplyTemplate={handleApplyTemplate}
          onClose={() => setShowTemplatesModal(false)}
          onUpgrade={() => setShowUpgradeModal(true)}
          isPro={isPro}
        />
      )}

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onProStatusChange={setIsPro}
      />

      {/* Floating Buttons */}
      <div className="floating-buttons">
        {/* Pro Badge or Upgrade Button */}
        {isPro ? (
          <button 
            className="pro-fab"
            onClick={() => setShowUpgradeModal(true)}
            title="Pro Member"
          >
            👑
          </button>
        ) : (
          <button 
            className="upgrade-fab"
            onClick={() => {
              trackEvent(Events.UPGRADE_MODAL_OPENED, { source: 'fab' });
              setShowUpgradeModal(true);
            }}
            title="Upgrade to Pro"
          >
            ⭐
          </button>
        )}
        
        {/* Help Button */}
        <button 
          className="help-fab"
          onClick={() => {
            trackEvent(Events.HELP_OPENED);
            setShowHelpModal(true);
          }}
          title="Help & User Guide"
        >
          ❓
        </button>
      </div>

      {/* Mobile tip */}
      <div className="mobile-tip">
        <span>Pinch to zoom • Drag to pan • Tap to place</span>
      </div>
    </div>
  );
}
