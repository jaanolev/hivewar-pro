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

// Copy to clipboard with robust fallbacks for mobile/in-app browsers
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern Clipboard API (preferred, but fails in many mobile/in-app browsers)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('[clipboard] Modern API succeeded');
      return true;
    } catch (error) {
      console.warn('[clipboard] Modern API failed, trying fallback:', error);
      // Track that we need to use fallback (indicates browser/context issue)
      try {
        const { trackEvent, Events } = await import('./analytics');
        trackEvent(Events.CLIPBOARD_FALLBACK_USED, { 
          method: 'modern_api_failed',
          userAgent: navigator.userAgent.substring(0, 100)
        });
      } catch (e) {
        // Analytics import failed, continue without tracking
      }
    }
  }

  // Method 2: Legacy execCommand fallback (works in more contexts, including insecure contexts)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea invisible but still part of the document
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // For iOS Safari: setSelectionRange helps ensure selection works
    try {
      textArea.setSelectionRange(0, text.length);
    } catch (e) {
      // Some browsers don't support setSelectionRange
    }
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      console.log('[clipboard] execCommand fallback succeeded');
      return true;
    } else {
      console.warn('[clipboard] execCommand returned false');
    }
  } catch (error) {
    console.error('[clipboard] execCommand fallback failed:', error);
  }

  // All methods failed - track for monitoring
  try {
    const { trackEvent, Events } = await import('./analytics');
    trackEvent(Events.CLIPBOARD_ALL_METHODS_FAILED, { 
      userAgent: navigator.userAgent.substring(0, 100),
      isSecureContext: window.isSecureContext,
      hasClipboard: !!navigator.clipboard
    });
  } catch (e) {
    // Analytics import failed, continue without tracking
  }

  console.error('[clipboard] All copy methods failed');
  return false;
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
const BONUS_EXPORTS_KEY = 'hivewar-bonus-exports';
const SHARE_COUNT_KEY = 'hivewar-share-count';
const FREE_EXPORT_LIMIT = 3;
const FIRST_PNG_KEY = 'hivewar-first-png-used';

export function consumeFirstPlanPng(): boolean {
  if (localStorage.getItem(FIRST_PNG_KEY)) return false;
  localStorage.setItem(FIRST_PNG_KEY, '1');
  return true;
}

export function hasUsedFirstPlanPng(): boolean {
  return !!localStorage.getItem(FIRST_PNG_KEY);
}
const BONUS_PER_SHARE = 3;
const MAX_BONUS_EXPORTS = 15; // Cap bonus at 15 (5 shares max)

export function getExportCount(): number {
  // Reset count monthly
  const resetDate = localStorage.getItem(EXPORT_RESET_KEY);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  
  if (resetDate !== monthKey) {
    localStorage.setItem(EXPORT_RESET_KEY, monthKey);
    localStorage.setItem(EXPORT_COUNT_KEY, '0');
    // Keep bonus exports - they don't reset monthly
    return 0;
  }
  
  return parseInt(localStorage.getItem(EXPORT_COUNT_KEY) || '0');
}

export function getBonusExports(): number {
  return parseInt(localStorage.getItem(BONUS_EXPORTS_KEY) || '0');
}

export function getShareCount(): number {
  return parseInt(localStorage.getItem(SHARE_COUNT_KEY) || '0');
}

export function addBonusExports(amount: number = BONUS_PER_SHARE): number {
  const current = getBonusExports();
  const newBonus = Math.min(current + amount, MAX_BONUS_EXPORTS);
  localStorage.setItem(BONUS_EXPORTS_KEY, newBonus.toString());
  
  // Track share count
  const shareCount = getShareCount() + 1;
  localStorage.setItem(SHARE_COUNT_KEY, shareCount.toString());
  
  return newBonus;
}

export function getTotalExportLimit(isPro: boolean = false): number {
  if (isPro) return Infinity;
  return FREE_EXPORT_LIMIT + getBonusExports();
}

export function incrementExportCount(): number {
  const current = getExportCount();
  const newCount = current + 1;
  localStorage.setItem(EXPORT_COUNT_KEY, newCount.toString());
  return newCount;
}

export function canExport(isPro: boolean = false): boolean {
  if (isPro) return true;
  if (!hasUsedFirstPlanPng()) return true;
  return getExportCount() < getTotalExportLimit(false);
}

export function getRemainingExports(isPro: boolean = false): number {
  if (isPro) return Infinity;
  return Math.max(0, getTotalExportLimit(false) - getExportCount());
}

export function canEarnMoreBonusExports(): boolean {
  return getBonusExports() < MAX_BONUS_EXPORTS;
}

/**
 * Sanitize a share/view token from URL parameters.
 * Handles common issues like Discord backticks, trailing punctuation, and whitespace.
 * 
 * Tokens are 32 hex characters (UUID without dashes), so we:
 * 1. Decode URI components
 * 2. Strip leading/trailing whitespace
 * 3. Strip trailing punctuation that users add when pasting
 * 4. Extract only the hex token body
 * 
 * @param rawToken - The raw token string from URL parameters
 * @returns Sanitized token, or null if no valid token found
 */
export function sanitizeShareToken(rawToken: string | null): string | null {
  if (!rawToken) return null;
  
  try {
    let token = rawToken;
    
    // Decode URI component (e.g., %60 -> `)
    try {
      token = decodeURIComponent(token);
    } catch {
      // If decoding fails, use the original string
    }
    
    // Strip leading and trailing whitespace
    token = token.trim();
    
    // Strip trailing punctuation commonly added when pasting URLs
    // (backtick, quotes, period, comma, closing brackets, angle bracket, and %60)
    token = token.replace(/[`'",.\)\]\}>]+((%60)+)?$/g, '');
    
    // Extract the hex token: look for 32 consecutive hex characters
    // This handles cases where the token is embedded in other text
    const hexMatch = token.match(/([a-f0-9]{32})/i);
    if (hexMatch) {
      return hexMatch[1].toLowerCase();
    }
    
    // If no 32-char hex string found, return null (invalid token)
    return null;
  } catch (e) {
    console.error('[token] sanitization failed:', e);
    return null;
  }
}

