import { useState, useCallback, useEffect } from 'react';
import type { HivePlan, PlacedBuilding, EditorState, ToolMode } from '../types';
import { createEmptyPlan, generateId, canPlaceBuilding, isWithinGrid } from '../utils/grid';
import { getBuildingById } from '../data/buildings';
import {
  savePlansToStorage,
  loadPlansFromStorage,
  saveCurrentPlanId,
  loadCurrentPlanId,
  loadPlanFromUrl
} from '../utils/storage';

export function useHivePlan() {
  const [plans, setPlans] = useState<HivePlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<HivePlan | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    selectedBuildingId: null,
    selectedBuildingTypeId: null,
    toolMode: 'select',
    showGrid: true,
    showCoords: false,
    snapToGrid: true
  });
  const [history, setHistory] = useState<PlacedBuilding[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize from storage or URL
  useEffect(() => {
    // Check URL first for shared plan
    const urlPlan = loadPlanFromUrl();
    if (urlPlan) {
      setCurrentPlan(urlPlan);
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Load from local storage
    const savedPlans = loadPlansFromStorage();
    setPlans(savedPlans);

    const currentId = loadCurrentPlanId();
    if (currentId) {
      const plan = savedPlans.find(p => p.id === currentId);
      if (plan) {
        setCurrentPlan(plan);
        return;
      }
    }

    // Create new plan if none exists
    if (savedPlans.length === 0) {
      const newPlan = createEmptyPlan('My First Hive');
      setPlans([newPlan]);
      setCurrentPlan(newPlan);
      savePlansToStorage([newPlan]);
      saveCurrentPlanId(newPlan.id);
    } else {
      setCurrentPlan(savedPlans[0]);
      saveCurrentPlanId(savedPlans[0].id);
    }
  }, []);

  // Save to history for undo/redo
  const pushToHistory = useCallback((buildings: PlacedBuilding[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...buildings]);
      // Keep last 50 states
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Update current plan and save
  const updatePlan = useCallback((updates: Partial<HivePlan>) => {
    if (!currentPlan) return;

    const updated = {
      ...currentPlan,
      ...updates,
      updatedAt: Date.now()
    };

    setCurrentPlan(updated);

    // Update in plans list
    setPlans(prev => {
      const newPlans = prev.map(p => p.id === updated.id ? updated : p);
      savePlansToStorage(newPlans);
      return newPlans;
    });
  }, [currentPlan]);

  // Add building
  const addBuilding = useCallback((
    buildingTypeId: string,
    gridX: number,
    gridY: number,
    level: number = 1
  ) => {
    if (!currentPlan) return;

    const buildingType = getBuildingById(buildingTypeId);
    if (!buildingType) return;

    // Check bounds
    if (!isWithinGrid(gridX, gridY, buildingType.width, buildingType.height, currentPlan.gridWidth)) {
      return;
    }

    const newBuilding: PlacedBuilding = {
      id: generateId(),
      buildingTypeId,
      gridX,
      gridY,
      rotation: 0,
      level
    };

    // Check for overlaps
    if (!canPlaceBuilding(currentPlan.buildings, newBuilding)) {
      return;
    }

    const newBuildings = [...currentPlan.buildings, newBuilding];
    pushToHistory(currentPlan.buildings);
    updatePlan({ buildings: newBuildings });
    
    // Select the new building
    setEditorState(prev => ({
      ...prev,
      selectedBuildingId: newBuilding.id,
      toolMode: 'select'
    }));
  }, [currentPlan, updatePlan, pushToHistory]);

  // Update building
  const updateBuilding = useCallback((buildingId: string, updates: Partial<PlacedBuilding>) => {
    if (!currentPlan) return;

    const buildingIndex = currentPlan.buildings.findIndex(b => b.id === buildingId);
    if (buildingIndex === -1) return;

    const updatedBuilding = { ...currentPlan.buildings[buildingIndex], ...updates };
    
    // Check if new position is valid
    if (updates.gridX !== undefined || updates.gridY !== undefined) {
      const buildingType = getBuildingById(updatedBuilding.buildingTypeId);
      if (buildingType) {
        if (!isWithinGrid(updatedBuilding.gridX, updatedBuilding.gridY, buildingType.width, buildingType.height, currentPlan.gridWidth)) {
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
  }, [currentPlan, updatePlan, pushToHistory]);

  // Delete building
  const deleteBuilding = useCallback((buildingId: string) => {
    if (!currentPlan) return;

    pushToHistory(currentPlan.buildings);
    const newBuildings = currentPlan.buildings.filter(b => b.id !== buildingId);
    updatePlan({ buildings: newBuildings });
    
    setEditorState(prev => ({
      ...prev,
      selectedBuildingId: null
    }));
  }, [currentPlan, updatePlan, pushToHistory]);

  // Rotate building
  const rotateBuilding = useCallback((buildingId: string) => {
    if (!currentPlan) return;

    const building = currentPlan.buildings.find(b => b.id === buildingId);
    if (!building) return;

    const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
    const currentIndex = rotations.indexOf(building.rotation);
    const newRotation = rotations[(currentIndex + 1) % 4];

    updateBuilding(buildingId, { rotation: newRotation });
  }, [currentPlan, updateBuilding]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex < 0 || !currentPlan) return;
    
    const previousState = history[historyIndex];
    if (previousState) {
      updatePlan({ buildings: previousState });
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex, currentPlan, updatePlan]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !currentPlan) return;
    
    const nextState = history[historyIndex + 1];
    if (nextState) {
      updatePlan({ buildings: nextState });
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex, currentPlan, updatePlan]);

  // Clear all buildings
  const clearBuildings = useCallback(() => {
    if (!currentPlan) return;
    pushToHistory(currentPlan.buildings);
    updatePlan({ buildings: [] });
  }, [currentPlan, updatePlan, pushToHistory]);

  // Create new plan
  const createNewPlan = useCallback((name: string) => {
    const newPlan = createEmptyPlan(name);
    setPlans(prev => {
      const updated = [...prev, newPlan];
      savePlansToStorage(updated);
      return updated;
    });
    setCurrentPlan(newPlan);
    saveCurrentPlanId(newPlan.id);
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Switch plan
  const switchPlan = useCallback((planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
      saveCurrentPlanId(planId);
      setHistory([]);
      setHistoryIndex(-1);
      setEditorState(prev => ({ ...prev, selectedBuildingId: null }));
    }
  }, [plans]);

  // Delete plan
  const deletePlan = useCallback((planId: string) => {
    setPlans(prev => {
      const updated = prev.filter(p => p.id !== planId);
      savePlansToStorage(updated);
      
      // If we deleted current plan, switch to another
      if (currentPlan?.id === planId) {
        if (updated.length > 0) {
          setCurrentPlan(updated[0]);
          saveCurrentPlanId(updated[0].id);
        } else {
          const newPlan = createEmptyPlan('My Hive');
          updated.push(newPlan);
          setCurrentPlan(newPlan);
          saveCurrentPlanId(newPlan.id);
          savePlansToStorage(updated);
        }
      }
      
      return updated;
    });
  }, [currentPlan]);

  // Set tool mode
  const setToolMode = useCallback((mode: ToolMode) => {
    setEditorState(prev => ({ ...prev, toolMode: mode }));
  }, []);

  // Select building type for placement
  const selectBuildingType = useCallback((typeId: string | null) => {
    setEditorState(prev => ({
      ...prev,
      selectedBuildingTypeId: typeId,
      toolMode: typeId ? 'place' : 'select'
    }));
  }, []);

  // Select placed building
  const selectBuilding = useCallback((buildingId: string | null) => {
    setEditorState(prev => ({
      ...prev,
      selectedBuildingId: buildingId
    }));
  }, []);

  // Toggle settings
  const toggleGrid = useCallback(() => {
    setEditorState(prev => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const toggleCoords = useCallback(() => {
    setEditorState(prev => ({ ...prev, showCoords: !prev.showCoords }));
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
    redo
  };
}

