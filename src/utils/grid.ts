import type { PlacedBuilding, HivePlan, Position } from '../types';
import { getBuildingById } from '../data/buildings';

export const GRID_SIZE = 50; // 50x50 default grid
export const TILE_SIZE = 40; // pixels per tile at scale 1
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3;

// Convert grid coordinates to canvas pixels
export function gridToCanvas(gridX: number, gridY: number, tileSize: number = TILE_SIZE): Position {
  return {
    x: gridX * tileSize,
    y: gridY * tileSize
  };
}

// Convert canvas pixels to grid coordinates
export function canvasToGrid(canvasX: number, canvasY: number, tileSize: number = TILE_SIZE): Position {
  return {
    x: Math.floor(canvasX / tileSize),
    y: Math.floor(canvasY / tileSize)
  };
}

// Snap position to nearest grid point
export function snapToGrid(x: number, y: number, tileSize: number = TILE_SIZE): Position {
  return {
    x: Math.round(x / tileSize) * tileSize,
    y: Math.round(y / tileSize) * tileSize
  };
}

// Check if a building can be placed at position (no overlaps)
export function canPlaceBuilding(
  buildings: PlacedBuilding[],
  newBuilding: PlacedBuilding,
  excludeId?: string
): boolean {
  const newType = getBuildingById(newBuilding.buildingTypeId);
  if (!newType) return false;

  // Get new building bounds
  const newBounds = getBuildingBounds(newBuilding, newType.width, newType.height);

  for (const existing of buildings) {
    if (excludeId && existing.id === excludeId) continue;
    
    const existingType = getBuildingById(existing.buildingTypeId);
    if (!existingType) continue;

    const existingBounds = getBuildingBounds(existing, existingType.width, existingType.height);
    
    // Check for overlap
    if (boundsOverlap(newBounds, existingBounds)) {
      return false;
    }
  }

  return true;
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function getBuildingBounds(building: PlacedBuilding, width: number, height: number): Bounds {
  // Handle rotation - swap width/height for 90 or 270 degrees
  const isRotated = building.rotation === 90 || building.rotation === 270;
  const actualWidth = isRotated ? height : width;
  const actualHeight = isRotated ? width : height;

  return {
    left: building.gridX,
    right: building.gridX + actualWidth,
    top: building.gridY,
    bottom: building.gridY + actualHeight
  };
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

// Check if position is within grid bounds
export function isWithinGrid(gridX: number, gridY: number, width: number, height: number, gridSize: number = GRID_SIZE): boolean {
  return gridX >= 0 && gridY >= 0 && (gridX + width) <= gridSize && (gridY + height) <= gridSize;
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create empty hive plan
export function createEmptyPlan(name: string = 'New Hive Plan'): HivePlan {
  return {
    id: generateId(),
    name,
    description: '',
    gridWidth: GRID_SIZE,
    gridHeight: GRID_SIZE,
    buildings: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0'
  };
}

// Calculate total defense power (simplified formula)
export function calculateDefensePower(buildings: PlacedBuilding[]): number {
  let power = 0;
  
  for (const building of buildings) {
    const type = getBuildingById(building.buildingTypeId);
    if (!type) continue;

    // Base power by category
    const categoryPower: Record<string, number> = {
      headquarters: 100,
      defense: 50,
      production: 20,
      seasonal: 30,
      special: 10
    };

    const basePower = categoryPower[type.category] || 10;
    const levelMultiplier = 1 + (building.level * 0.1);
    const sizeMultiplier = type.width * type.height;

    power += basePower * levelMultiplier * sizeMultiplier;
  }

  return Math.round(power);
}

