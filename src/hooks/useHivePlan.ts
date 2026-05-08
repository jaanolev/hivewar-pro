import { useState, useCallback, useEffect, useRef } from 'react';
import type { HivePlan, PlacedBuilding, EditorState, ToolMode } from '../types';
import { createEmptyPlan, generateId, canPlaceBuilding, isWithinGrid } from '../utils/grid';
import { getBuildingById } from '../data/buildings';
import {
  savePlansToStorage,
  loadPlansFromStorage,
  saveCurrentPlanId,
  loadCurrentPlanId,
  loadPlanFromUrl,
} from '../utils/storage';
import { listPlans, upsertPlan, deletePlanRow } from '../utils/cloudStorage';
import { useAuth } from '../lib/auth';

const MIGRATED_KEY = 'hivewar-migrated-to-cloud';
const SAVE_DEBOUNCE_MS = 500;

export function useHivePlan() {
  const { user, loading: authLoading } = useAuth();

  const [plans, setPlans] = useState<HivePlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<HivePlan | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    selectedBuildingId: null,
    selectedBuildingTypeId: null,
    toolMode: 'select',
    showGrid: true,
    showCoords: false,
    snapToGrid: true,
  });
  const [history, setHistory] = useState<PlacedBuilding[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Pending debounced cloud save (per plan id) so rapid edits coalesce.
  const saveTimers = useRef<Map<string, number>>(new Map());

  // Initialize once auth is ready: pull from cloud, migrate localStorage on
  // first run, fall back to creating an empty plan for brand-new users.
  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;

    async function bootstrap() {
      // URL-shared plan takes precedence as a one-shot view (existing behavior).
      // We don't auto-save it to the user's cloud account; they can save it
      // explicitly via the menu later if they want.
      const urlPlan = loadPlanFromUrl();
      if (urlPlan) {
        if (cancelled) return;
        setCurrentPlan(urlPlan);
        window.history.replaceState({}, '', window.location.pathname);
      }

      let cloudPlans = await listPlans();
      if (cancelled) return;

      // First-time migration: if cloud is empty and we have localStorage
      // plans from the pre-cloud era, push them up.
      const alreadyMigrated = localStorage.getItem(MIGRATED_KEY) === 'true';
      if (cloudPlans.length === 0 && !alreadyMigrated) {
        const localPlans = loadPlansFromStorage();
        if (localPlans.length > 0) {
          await Promise.all(localPlans.map((p) => upsertPlan(p, user!.id)));
          if (cancelled) return;
          cloudPlans = localPlans;
        }
        localStorage.setItem(MIGRATED_KEY, 'true');
      }

      setPlans(cloudPlans);
      // Mirror to localStorage as an offline cache.
      savePlansToStorage(cloudPlans);

      if (urlPlan) {
        // currentPlan already set to URL plan above.
        return;
      }

      const currentId = loadCurrentPlanId();
      const found = currentId ? cloudPlans.find((p) => p.id === currentId) : null;

      if (found) {
        setCurrentPlan(found);
      } else if (cloudPlans.length > 0) {
        setCurrentPlan(cloudPlans[0]);
        saveCurrentPlanId(cloudPlans[0].id);
      } else {
        const newPlan = createEmptyPlan('My First Hive');
        await upsertPlan(newPlan, user!.id);
        if (cancelled) return;
        setPlans([newPlan]);
        savePlansToStorage([newPlan]);
        setCurrentPlan(newPlan);
        saveCurrentPlanId(newPlan.id);
      }
    }

    bootstrap().catch((e) => console.error('[plan] bootstrap failed:', e));

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // Debounced cloud upsert per plan, keyed by plan id.
  const scheduleCloudSave = useCallback(
    (plan: HivePlan) => {
      if (!user) return;
      const timers = saveTimers.current;
      const existing = timers.get(plan.id);
      if (existing !== undefined) window.clearTimeout(existing);
      const handle = window.setTimeout(() => {
        timers.delete(plan.id);
        upsertPlan(plan, user.id).catch((e) =>
          console.error('[plan] cloud save failed:', e)
        );
      }, SAVE_DEBOUNCE_MS);
      timers.set(plan.id, handle);
    },
    [user]
  );

  // Save to history for undo/redo
  const pushToHistory = useCallback(
    (buildings: PlacedBuilding[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push([...buildings]);
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex]
  );

  // Update current plan and save (state + localStorage cache + debounced cloud)
  const updatePlan = useCallback(
    (updates: Partial<HivePlan>) => {
      if (!currentPlan) return;

      const updated = {
        ...currentPlan,
        ...updates,
        updatedAt: Date.now(),
      };

      setCurrentPlan(updated);

      setPlans((prev) => {
        const newPlans = prev.map((p) => (p.id === updated.id ? updated : p));
        savePlansToStorage(newPlans);
        return newPlans;
      });

      scheduleCloudSave(updated);
    },
    [currentPlan, scheduleCloudSave]
  );

  // Add building
  const addBuilding = useCallback(
    (buildingTypeId: string, gridX: number, gridY: number, level: number = 1) => {
      if (!currentPlan) return;

      const buildingType = getBuildingById(buildingTypeId);
      if (!buildingType) return;

      if (
        !isWithinGrid(
          gridX,
          gridY,
          buildingType.width,
          buildingType.height,
          currentPlan.gridWidth
        )
      ) {
        return;
      }

      const newBuilding: PlacedBuilding = {
        id: generateId(),
        buildingTypeId,
        gridX,
        gridY,
        rotation: 0,
        level,
      };

      if (!canPlaceBuilding(currentPlan.buildings, newBuilding)) {
        return;
      }

      const newBuildings = [...currentPlan.buildings, newBuilding];
      pushToHistory(currentPlan.buildings);
      updatePlan({ buildings: newBuildings });

      setEditorState((prev) => ({
        ...prev,
        selectedBuildingId: newBuilding.id,
        toolMode: 'select',
      }));
    },
    [currentPlan, updatePlan, pushToHistory]
  );

  // Update building
  const updateBuilding = useCallback(
    (buildingId: string, updates: Partial<PlacedBuilding>) => {
      if (!currentPlan) return;

      const buildingIndex = currentPlan.buildings.findIndex((b) => b.id === buildingId);
      if (buildingIndex === -1) return;

      const updatedBuilding = { ...currentPlan.buildings[buildingIndex], ...updates };

      if (updates.gridX !== undefined || updates.gridY !== undefined) {
        const buildingType = getBuildingById(updatedBuilding.buildingTypeId);
        if (buildingType) {
          if (
            !isWithinGrid(
              updatedBuilding.gridX,
              updatedBuilding.gridY,
              buildingType.width,
              buildingType.height,
              currentPlan.gridWidth
            )
          ) {
            return;
          }
          if (!canPlaceBuilding(currentPlan.buildings, updatedBuilding, buildingId)) {
            return;
          }
        }
      }

      const newBuildings = [...currentPlan.buildings];
      newBuildings[buildingIndex] = updatedBuilding;

      pushToHistory(currentPlan.buildings);
      updatePlan({ buildings: newBuildings });
    },
    [currentPlan, updatePlan, pushToHistory]
  );

  // Delete building
  const deleteBuilding = useCallback(
    (buildingId: string) => {
      if (!currentPlan) return;

      pushToHistory(currentPlan.buildings);
      const newBuildings = currentPlan.buildings.filter((b) => b.id !== buildingId);
      updatePlan({ buildings: newBuildings });

      setEditorState((prev) => ({
        ...prev,
        selectedBuildingId: null,
      }));
    },
    [currentPlan, updatePlan, pushToHistory]
  );

  // Rotate building
  const rotateBuilding = useCallback(
    (buildingId: string) => {
      if (!currentPlan) return;

      const building = currentPlan.buildings.find((b) => b.id === buildingId);
      if (!building) return;

      const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
      const currentIndex = rotations.indexOf(building.rotation);
      const newRotation = rotations[(currentIndex + 1) % 4];

      updateBuilding(buildingId, { rotation: newRotation });
    },
    [currentPlan, updateBuilding]
  );

  // Undo
  const undo = useCallback(() => {
    if (historyIndex < 0 || !currentPlan) return;

    const previousState = history[historyIndex];
    if (previousState) {
      updatePlan({ buildings: previousState });
      setHistoryIndex((prev) => prev - 1);
    }
  }, [history, historyIndex, currentPlan, updatePlan]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !currentPlan) return;

    const nextState = history[historyIndex + 1];
    if (nextState) {
      updatePlan({ buildings: nextState });
      setHistoryIndex((prev) => prev + 1);
    }
  }, [history, historyIndex, currentPlan, updatePlan]);

  // Clear all buildings
  const clearBuildings = useCallback(() => {
    if (!currentPlan) return;
    pushToHistory(currentPlan.buildings);
    updatePlan({ buildings: [] });
  }, [currentPlan, updatePlan, pushToHistory]);

  // Create new plan
  const createNewPlan = useCallback(
    (name: string) => {
      if (!user) return;
      const newPlan = createEmptyPlan(name);
      setPlans((prev) => {
        const updated = [...prev, newPlan];
        savePlansToStorage(updated);
        return updated;
      });
      setCurrentPlan(newPlan);
      saveCurrentPlanId(newPlan.id);
      setHistory([]);
      setHistoryIndex(-1);
      // Persist to cloud immediately so the new plan exists for upserts later.
      upsertPlan(newPlan, user.id).catch((e) =>
        console.error('[plan] createNewPlan cloud save failed:', e)
      );
    },
    [user]
  );

  // Switch plan
  const switchPlan = useCallback(
    (planId: string) => {
      const plan = plans.find((p) => p.id === planId);
      if (plan) {
        setCurrentPlan(plan);
        saveCurrentPlanId(planId);
        setHistory([]);
        setHistoryIndex(-1);
        setEditorState((prev) => ({ ...prev, selectedBuildingId: null }));
      }
    },
    [plans]
  );

  // Delete plan
  const deletePlan = useCallback(
    (planId: string) => {
      setPlans((prev) => {
        const updated = prev.filter((p) => p.id !== planId);
        savePlansToStorage(updated);

        if (currentPlan?.id === planId) {
          if (updated.length > 0) {
            setCurrentPlan(updated[0]);
            saveCurrentPlanId(updated[0].id);
          } else if (user) {
            const newPlan = createEmptyPlan('My Hive');
            updated.push(newPlan);
            setCurrentPlan(newPlan);
            saveCurrentPlanId(newPlan.id);
            savePlansToStorage(updated);
            upsertPlan(newPlan, user.id).catch((e) =>
              console.error('[plan] deletePlan replacement save failed:', e)
            );
          }
        }

        return updated;
      });

      // Cancel any pending debounced save for this plan, then delete from cloud.
      const pending = saveTimers.current.get(planId);
      if (pending !== undefined) {
        window.clearTimeout(pending);
        saveTimers.current.delete(planId);
      }
      deletePlanRow(planId).catch((e) =>
        console.error('[plan] cloud delete failed:', e)
      );
    },
    [currentPlan, user]
  );

  // Set tool mode
  const setToolMode = useCallback((mode: ToolMode) => {
    setEditorState((prev) => ({ ...prev, toolMode: mode }));
  }, []);

  // Select building type for placement
  const selectBuildingType = useCallback((typeId: string | null) => {
    setEditorState((prev) => ({
      ...prev,
      selectedBuildingTypeId: typeId,
      toolMode: typeId ? 'place' : 'select',
    }));
  }, []);

  // Select placed building
  const selectBuilding = useCallback((buildingId: string | null) => {
    setEditorState((prev) => ({
      ...prev,
      selectedBuildingId: buildingId,
    }));
  }, []);

  // Toggle settings
  const toggleGrid = useCallback(() => {
    setEditorState((prev) => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const toggleCoords = useCallback(() => {
    setEditorState((prev) => ({ ...prev, showCoords: !prev.showCoords }));
  }, []);

  return {
    // State
    plans,
    currentPlan,
    editorState,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,

    // Building operations
    addBuilding,
    updateBuilding,
    deleteBuilding,
    rotateBuilding,
    clearBuildings,

    // Plan operations
    updatePlan,
    createNewPlan,
    switchPlan,
    deletePlan,

    // Editor operations
    setToolMode,
    selectBuildingType,
    selectBuilding,
    toggleGrid,
    toggleCoords,
    undo,
    redo,
  };
}
