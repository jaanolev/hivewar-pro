import { useState, useRef, useCallback, useEffect, Suspense, lazy } from 'react';
import { useHivePlan } from './hooks/useHivePlan';
import { calculateDefensePower, generateId } from './utils/grid';
import type { PlacedBuilding } from './types';
import HiveGrid from './components/Grid/HiveGrid';
import TopToolbar from './components/Toolbar/TopToolbar';
import BuildingPalette from './components/Toolbar/BuildingPalette';
import PropertyPanel from './components/Panel/PropertyPanel';
import CanvasHints from './components/CanvasHints/CanvasHints';
import WhatsNewModal from './components/Modals/WhatsNewModal';
import OnboardingModal from './components/Modals/OnboardingModal';
import { HIVE_TEMPLATES } from './data/templates';
import LockIndicator from './components/Toolbar/LockIndicator';
import { getProStatus } from './utils/pro';
import { trackSessionStart, trackEvent, Events } from './utils/analytics';
import './App.css';

// Modals that only render on user interaction — load on demand so the
// initial JS bundle ships about half a megabyte lighter for organic
// /-landers, who are the entire current user base.
import type { ShareTab } from './components/Modals/ShareHub';
const MenuModal = lazy(() => import('./components/Modals/MenuModal'));
const TemplatesModal = lazy(() => import('./components/Modals/TemplatesModal'));
const HelpModal = lazy(() => import('./components/Modals/HelpModal'));
const UpgradeModal = lazy(() => import('./components/Modals/UpgradeModal'));
const ShareHub = lazy(() => import('./components/Modals/ShareHub'));

// Bump the suffix to re-announce when there's a new round of features.
const WHATS_NEW_KEY = 'hivewar-whatsnew-v1';
// First-run onboarding shown once to brand-new users.
const ONBOARDING_KEY = 'hivewar-onboarded-v1';

export default function App() {
  const {
    plans,
    currentPlan,
    editorState,
    canUndo,
    canRedo,
    joinedViaShareLink,
    isViewOnly,
    bootstrapError,
    retryBootstrap,
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
    redo,
    hasEditLock,
    otherUserHoldsLock,
    isLockStale,
    canEdit,
    peerCount,
    takeLock,
    releaseLock,
  } = useHivePlan();

  const stageRef = useRef<any>(null);
  // On mobile (≤768px), start with palette closed so the grid is tappable.
  // Recordings showed visitors never placed buildings when a bottom drawer
  // covered the lower third of their screen on first load.
  const [paletteOpen, setPaletteOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > 768;
  });
  const [shareTab, setShareTab] = useState<ShareTab | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(
    () => !localStorage.getItem(WHATS_NEW_KEY)
  );
  const [onboarded, setOnboarded] = useState(
    () => !!localStorage.getItem(ONBOARDING_KEY)
  );
  const [toast, setToast] = useState<string | null>(null);
  const [firstRunShare, setFirstRunShare] = useState(false);
  const autoAppliedRef = useRef(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const dismissWhatsNew = () => {
    localStorage.setItem(WHATS_NEW_KEY, '1');
    setShowWhatsNew(false);
  };

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    localStorage.setItem(WHATS_NEW_KEY, '1'); // new users don't need the "what's new" recap
    setOnboarded(true);
    setShowWhatsNew(false);
  };
  
  // Pro status - read from localStorage
  const [isPro, setIsPro] = useState(() => getProStatus().isPro);

  // Track session on mount + handle payment success redirect
  useEffect(() => {
    trackSessionStart();
    
    // Check if returning from successful payment
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      // Show upgrade modal so user can enter their code/email
      setShowUpgradeModal(true);
      // Clean up URL but preserve view/share params
      urlParams.delete('payment');
      const newSearch = urlParams.toString();
      const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
      window.history.replaceState({}, '', newUrl);
      // Track the payment completion
      trackEvent(Events.PAYMENT_COMPLETED);
    }
  }, []);

  // Get selected building for property panel
  const selectedBuilding = currentPlan?.buildings.find(
    b => b.id === editorState.selectedBuildingId
  );

  // Handle selecting building type — on mobile (≤768px), close palette
  // after selection so the grid is visible for placement
  const handleSelectBuildingType = useCallback((typeId: string | null) => {
    selectBuildingType(typeId);
    if (typeId && window.innerWidth <= 768) {
      setPaletteOpen(false);
    }
  }, [selectBuildingType]);

  // Handle placing building on grid
  const handlePlaceBuilding = useCallback((gridX: number, gridY: number) => {
    if (editorState.selectedBuildingTypeId) {
      addBuilding(editorState.selectedBuildingTypeId, gridX, gridY, 1);
      trackEvent(Events.BUILDING_PLACED, { buildingType: editorState.selectedBuildingTypeId });
      // On mobile (≤768px), clear building selection after placement so the
      // property panel doesn't auto-open and cover the grid. User can tap the
      // placed building later if they want to edit it.
      if (window.innerWidth <= 768) {
        selectBuilding(null);
      }
    }
  }, [editorState.selectedBuildingTypeId, addBuilding, selectBuilding]);

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

  const stampHqNames = useCallback((buildings: PlacedBuilding[], names: string[]) => {
    const cleaned = names.map(n => n.trim()).filter(Boolean);
    if (!cleaned.length) return buildings;
    const rank = (id: string) => {
      if (id === 'hq-marshal') return 0;
      if (id === 'hq-r4') return 1;
      if (id === 'hq') return 2;
      return 99;
    };
    const targets = [...buildings]
      .filter(b => rank(b.buildingTypeId) < 99)
      .sort((a, b) => rank(a.buildingTypeId) - rank(b.buildingTypeId) || a.gridY - b.gridY || a.gridX - b.gridX);
    return buildings.map(b => {
      const idx = targets.findIndex(t => t.id === b.id);
      if (idx >= 0 && idx < cleaned.length) {
        return { ...b, playerName: cleaned[idx] };
      }
      return b;
    });
  }, []);

  useEffect(() => {
    if (!currentPlan || onboarded || autoAppliedRef.current) return;
    if (currentPlan.buildings.length > 0) return;
    const template = HIVE_TEMPLATES.find(t => t.id === 'diamond-defense');
    if (!template) return;
    autoAppliedRef.current = true;
    handleApplyTemplate(template.buildings);
    trackEvent(Events.ONBOARDING_CHOICE, { choice: 'template', source: 'auto' });
  }, [currentPlan, onboarded, handleApplyTemplate]);

  // Pre-select HQ when on a blank grid, so mobile users can tap once to place
  // instead of opening drawer → picking HQ → tapping grid (three steps).
  useEffect(() => {
    if (!currentPlan || isViewOnly) return;
    if (currentPlan.buildings.length === 0 && !editorState.selectedBuildingTypeId) {
      selectBuildingType('hq');
    }
  }, [currentPlan, isViewOnly, editorState.selectedBuildingTypeId, selectBuildingType]);

  // Calculate stats
  const buildingCount = currentPlan?.buildings.length || 0;
  const defensePower = currentPlan ? calculateDefensePower(currentPlan.buildings) : 0;

  if (!currentPlan) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-icon">🏰</div>
          <h1>HiveWar Pro</h1>
          {bootstrapError ? (
            <>
              <p style={{ color: '#ff6b6b', marginTop: '1rem' }}>{bootstrapError}</p>
              <button 
                onClick={retryBootstrap}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: '#4a90e2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Retry
              </button>
            </>
          ) : (
            <p>Loading your hive plans...</p>
          )}
        </div>
      </div>
    );
  }

  const showOnboarding = !onboarded && !shareTab && !joinedViaShareLink && currentPlan.buildings.length >= 5;

  return (
    <div className="app">
      <LockIndicator
        hasEditLock={hasEditLock}
        otherUserHoldsLock={otherUserHoldsLock}
        isLockStale={isLockStale}
        hasPeers={peerCount > 0}
        onTake={takeLock}
        onRelease={releaseLock}
        isViewOnly={isViewOnly}
      />

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
        onExport={() => setShareTab('export')}
        onShare={() => setShareTab('collaborate')}
        onSave={() => showToast('Saved')}
        onMenuOpen={() => setShowMenuModal(true)}
        onTemplatesOpen={() => setShowTemplatesModal(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        buildingCount={buildingCount}
        defensePower={defensePower}
        isViewOnly={isViewOnly}
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
          canEdit={canEdit}
        />
        {!showOnboarding && !shareTab && onboarded && (
          <CanvasHints
            buildings={currentPlan.buildings}
            selectedBuildingTypeId={editorState.selectedBuildingTypeId}
            isViewOnly={isViewOnly}
          />
        )}
      </main>

      {/* Building Palette */}
      {!isViewOnly && (
        <BuildingPalette
          selectedTypeId={editorState.selectedBuildingTypeId}
          onSelectType={handleSelectBuildingType}
          isOpen={paletteOpen}
          onToggle={() => setPaletteOpen(!paletteOpen)}
        />
      )}

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

      {/* Share hub (live collab + export/snapshot) */}
      {shareTab && currentPlan && (
        <Suspense fallback={null}>
          <ShareHub
            plan={currentPlan}
            stageRef={stageRef}
            initialTab={shareTab}
            isPro={isPro}
            onUpgrade={() => setShowUpgradeModal(true)}
            autoCopyView={firstRunShare}
            onClose={() => { setShareTab(null); setFirstRunShare(false); }}
          />
        </Suspense>
      )}

      {/* First-run onboarding for brand-new users (empty plan, never onboarded) */}
      {showOnboarding && (
        <OnboardingModal
          onDismiss={() => {
            // X button / overlay dismiss: just finish onboarding and show the hive.
            // Keep Diamond Defense on the grid. Do NOT open ShareHub.
            trackEvent(Events.ONBOARDING_CHOICE, { choice: 'dismiss' });
            finishOnboarding();
          }}
          onStampAndShare={async (names) => {
            if (currentPlan.buildings.length === 0) {
              console.error('[onboarding] Cannot share empty plan - template not yet applied');
              return;
            }
            updatePlan({ buildings: stampHqNames(currentPlan.buildings, names) });
            trackEvent(Events.NAMES_STAMPED, { count: names.length });
            finishOnboarding();
            
            // Generate share link inline and copy to clipboard, then show toast.
            // Don't open the full ShareHub on first-run — visitors should see
            // the hive immediately after copy, not another overlay to dismiss.
            try {
              const { getOrCreateShareTokens } = await import('./utils/cloudStorage');
              const { copyToClipboard } = await import('./utils/storage');
              const tokens = await getOrCreateShareTokens(currentPlan.id);
              const baseUrl = window.location.origin + window.location.pathname;
              const viewUrl = `${baseUrl}?view=${tokens.view_token}`;
              const clipboardText = `${currentPlan.name} — view only (paste in Discord)\n${viewUrl}`;
              const ok = await copyToClipboard(clipboardText);
              if (ok) {
                trackEvent(Events.COLLAB_LINK_COPIED, { type: 'view', source: 'first_run' });
                showToast('Copied. Paste it in Discord.');
              } else {
                showToast('Link ready — tap Share to copy it');
              }
            } catch (e) {
              console.error('[first-run] share link generation failed:', e);
              showToast('⚠️ Could not generate link — tap Share to try again');
            }
          }}
          onStartBlank={() => {
            if (currentPlan.buildings.length > 0) clearBuildings();
            finishOnboarding();
          }}
        />
      )}

      {/* One-time "what's new" announcement (yields to first-run onboarding) */}
      {showWhatsNew && !showOnboarding && !joinedViaShareLink && currentPlan && !shareTab && (
        <WhatsNewModal
          onClose={dismissWhatsNew}
          onTryCollab={() => {
            dismissWhatsNew();
            setShareTab('collaborate');
          }}
        />
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <Suspense fallback={null}>
          <MenuModal
            plans={plans}
            currentPlanId={currentPlan.id}
            onSelectPlan={switchPlan}
            onCreatePlan={createNewPlan}
            onDeletePlan={deletePlan}
            onRenamePlan={(name) => updatePlan({ name })}
            onImportPlan={handleImportPlan}
            onClose={() => setShowMenuModal(false)}
            editorControls={{
              canUndo,
              canRedo,
              showGrid: editorState.showGrid,
              showCoords: editorState.showCoords,
              onUndo: undo,
              onRedo: redo,
              onToggleGrid: toggleGrid,
              onToggleCoords: toggleCoords,
              onTemplates: () => setShowTemplatesModal(true),
              onClear: () => {
                if (confirm('Clear all buildings? This cannot be undone.')) {
                  clearBuildings();
                }
              },
              onSave: () => alert('Plan saved! ✓'),
            }}
          />
        </Suspense>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <Suspense fallback={null}>
          <TemplatesModal
            onApplyTemplate={handleApplyTemplate}
            onClose={() => setShowTemplatesModal(false)}
            onUpgrade={() => setShowUpgradeModal(true)}
            isPro={isPro}
            currentBuildingCount={buildingCount}
          />
        </Suspense>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <Suspense fallback={null}>
          <HelpModal
            isOpen={true}
            onClose={() => setShowHelpModal(false)}
          />
        </Suspense>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <Suspense fallback={null}>
          <UpgradeModal
            isOpen={true}
            onClose={() => setShowUpgradeModal(false)}
            onProStatusChange={setIsPro}
          />
        </Suspense>
      )}

      {/* Floating Buttons - Hidden during first-run to avoid being the only
           tap targets when visitor has not yet seen the hive */}
      {onboarded && (
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
      )}

      {/* Mobile tip */}
      {toast && <div className="app-toast">{toast}</div>}

      <div className="mobile-tip">
        <span>Pinch to zoom • Drag to pan • Tap to place</span>
      </div>
    </div>
  );
}

