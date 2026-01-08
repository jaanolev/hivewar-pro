import type { HivePlan } from '../types';
import LZString from 'lz-string';

const STORAGE_KEY = 'hivewar-plans';
const CURRENT_PLAN_KEY = 'hivewar-current';

// Local Storage operations
export function savePlansToStorage(plans: HivePlan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch (error) {
    console.error('Failed to save plans:', error);
  }
}

export function loadPlansFromStorage(): HivePlan[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load plans:', error);
    return [];
  }
}

export function saveCurrentPlanId(planId: string): void {
  localStorage.setItem(CURRENT_PLAN_KEY, planId);
}

export function loadCurrentPlanId(): string | null {
  return localStorage.getItem(CURRENT_PLAN_KEY);
}

// JSON Export/Import
export function exportPlanAsJson(plan: HivePlan): string {
  return JSON.stringify(plan, null, 2);
}

export function importPlanFromJson(jsonString: string): HivePlan | null {
  try {
    const plan = JSON.parse(jsonString);
    // Basic validation
    if (!plan.id || !plan.buildings || !Array.isArray(plan.buildings)) {
      throw new Error('Invalid plan format');
    }
    return plan as HivePlan;
  } catch (error) {
    console.error('Failed to import plan:', error);
    return null;
  }
}

// URL Share functionality using compression
export function planToShareUrl(plan: HivePlan): string {
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(plan));
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?plan=${compressed}`;
}

export function loadPlanFromUrl(): HivePlan | null {
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get('plan');
  
  if (!compressed) return null;

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    if (!decompressed) return null;
    return JSON.parse(decompressed) as HivePlan;
  } catch (error) {
    console.error('Failed to load plan from URL:', error);
    return null;
  }
}

// Download file helper
export function downloadFile(content: string, filename: string, type: string = 'application/json'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

// CSV Export for coordinates
export function exportPlanAsCsv(plan: HivePlan, originX: number = 0, originY: number = 0): string {
  const headers = ['Player Name', 'Building Type', 'Grid X', 'Grid Y', 'Game X', 'Game Y', 'Level', 'Rotation', 'Notes'];
  
  const rows = plan.buildings.map(b => {
    // Calculate game coordinates based on origin
    const gameX = originX + b.gridX;
    const gameY = originY + b.gridY;
    
    return [
      b.playerName || '',
      b.buildingTypeId,
      b.gridX.toString(),
      b.gridY.toString(),
      gameX.toString(),
      gameY.toString(),
      b.level.toString(),
      b.rotation.toString(),
      b.notes || ''
    ].map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

// Import from CSV (player list)
export function importPlayersFromCsv(csv: string): { name: string; x?: number; y?: number }[] {
  const lines = csv.trim().split('\n');
  const players: { name: string; x?: number; y?: number }[] = [];
  
  // Skip header if present
  const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cells[0]) {
      players.push({
        name: cells[0],
        x: cells[1] ? parseInt(cells[1]) : undefined,
        y: cells[2] ? parseInt(cells[2]) : undefined
      });
    }
  }
  
  return players;
}

// Track exports for freemium (stored in localStorage)
const EXPORT_COUNT_KEY = 'hivewar-exports';
const EXPORT_RESET_KEY = 'hivewar-export-reset';
const FREE_EXPORT_LIMIT = 3;

export function getExportCount(): number {
  // Reset count monthly
  const resetDate = localStorage.getItem(EXPORT_RESET_KEY);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  
  if (resetDate !== monthKey) {
    localStorage.setItem(EXPORT_RESET_KEY, monthKey);
    localStorage.setItem(EXPORT_COUNT_KEY, '0');
    return 0;
  }
  
  return parseInt(localStorage.getItem(EXPORT_COUNT_KEY) || '0');
}

export function incrementExportCount(): number {
  const current = getExportCount();
  const newCount = current + 1;
  localStorage.setItem(EXPORT_COUNT_KEY, newCount.toString());
  return newCount;
}

export function canExport(isPro: boolean = false): boolean {
  if (isPro) return true;
  return getExportCount() < FREE_EXPORT_LIMIT;
}

export function getRemainingExports(isPro: boolean = false): number {
  if (isPro) return Infinity;
  return Math.max(0, FREE_EXPORT_LIMIT - getExportCount());
}

