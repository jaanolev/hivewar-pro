// Core types for HiveWar Pro

export interface Position {
  x: number;
  y: number;
}

export interface BuildingType {
  id: string;
  name: string;
  category: 'headquarters' | 'defense' | 'production' | 'seasonal' | 'special';
  width: number;
  height: number;
  color: string;
  icon: string;
  maxLevel: number;
  description: string;
}

export interface PlacedBuilding {
  id: string;
  buildingTypeId: string;
  gridX: number;
  gridY: number;
  rotation: 0 | 90 | 180 | 270;
  level: number;
  playerName?: string;
  notes?: string;
}

export interface HivePlan {
  id: string;
  name: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  buildings: PlacedBuilding[];
  originX?: number;
  originY?: number;
  createdAt: number;
  updatedAt: number;
  version: string;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export type ToolMode = 'select' | 'place' | 'delete' | 'pan';

export interface EditorState {
  selectedBuildingId: string | null;
  selectedBuildingTypeId: string | null;
  toolMode: ToolMode;
  showGrid: boolean;
  showCoords: boolean;
  snapToGrid: boolean;
}
