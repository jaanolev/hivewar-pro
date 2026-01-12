// Pro subscription management

// Stripe Payment Links
// Note: The success_url redirect is configured in Stripe Dashboard
// Go to: Payment Links → Edit → After payment → Redirect to your website
// Set success URL to: https://lastwarmobilegameaddonapp.vercel.app/?payment=success#/
export const STRIPE_LINKS = {
  PRO_MONTHLY: 'https://buy.stripe.com/00weVcb8M3dCbKAg421oI00',
  // Add more tiers later:
  // PRO_YEARLY: 'https://buy.stripe.com/...',
  // ULTRA_MONTHLY: 'https://buy.stripe.com/...',
};

// Local storage keys
const PRO_STATUS_KEY = 'hivewar_pro_status';
const PRO_EMAIL_KEY = 'hivewar_pro_email';
const PRO_ACTIVATED_KEY = 'hivewar_pro_activated_date';

export interface ProStatus {
  isPro: boolean;
  email?: string;
  activatedDate?: string;
  tier?: 'free' | 'pro' | 'ultra';
}

// Get current Pro status
export function getProStatus(): ProStatus {
  try {
    const status = localStorage.getItem(PRO_STATUS_KEY);
    if (status) {
      return JSON.parse(status);
    }
  } catch (e) {
    console.error('Error reading Pro status:', e);
  }
  return { isPro: false, tier: 'free' };
}

// Set Pro status (called after successful payment verification)
export function setProStatus(email: string, tier: 'pro' | 'ultra' = 'pro'): void {
  const activatedDate = new Date().toISOString();
  const status: ProStatus = {
    isPro: true,
    email,
    activatedDate,
    tier,
  };
  localStorage.setItem(PRO_STATUS_KEY, JSON.stringify(status));
  localStorage.setItem(PRO_EMAIL_KEY, email);
  localStorage.setItem(PRO_ACTIVATED_KEY, activatedDate);
}

// Clear Pro status
export function clearProStatus(): void {
  localStorage.removeItem(PRO_STATUS_KEY);
  localStorage.removeItem(PRO_EMAIL_KEY);
  localStorage.removeItem(PRO_ACTIVATED_KEY);
}

// Secret admin codes (these always work, never expire)
const ADMIN_CODES = [
  'HIVE-ADMIN-2026-BOSS',
  'HIVE-DEV-UNLIM-ITED',
  'ADMIN',  // Simple shortcut
  'BOSS',   // Simple shortcut
];

// Activate Pro with a code (simple code system for manual fulfillment)
// Codes are in format: HIVE-XXXX-XXXX-XXXX
export function activateProCode(code: string, email: string): { success: boolean; message: string } {
  const upperCode = code.toUpperCase().trim();
  
  // Check admin codes first (always work, no email required)
  if (ADMIN_CODES.includes(upperCode)) {
    setProStatus(email || 'admin@hivewar.pro', 'ultra');
    return { success: true, message: '👑 Admin access activated! You have unlimited everything.' };
  }
  
  // For MVP: Accept any code that matches the pattern
  // In production: Validate against a database or Stripe
  const codePattern = /^HIVE-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  
  if (!codePattern.test(upperCode)) {
    return { success: false, message: 'Invalid code format. Codes look like: HIVE-XXXX-XXXX-XXXX' };
  }

  if (!email || !email.includes('@')) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  // Check if code was already used (simple check)
  const usedCodes = JSON.parse(localStorage.getItem('hivewar_used_codes') || '[]');
  if (usedCodes.includes(upperCode)) {
    return { success: false, message: 'This code has already been used.' };
  }

  // Activate Pro
  setProStatus(email, 'pro');
  
  // Mark code as used
  usedCodes.push(upperCode);
  localStorage.setItem('hivewar_used_codes', JSON.stringify(usedCodes));

  return { success: true, message: 'Pro activated! Enjoy unlimited exports and all features.' };
}

// Generate a Pro code (for admin use - you'll generate these after Stripe payments)
export function generateProCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HIVE-${segment()}-${segment()}-${segment()}`;
}

// Open Stripe checkout
export function openStripeCheckout(tier: 'pro' | 'ultra' = 'pro'): void {
  const url = tier === 'pro' ? STRIPE_LINKS.PRO_MONTHLY : STRIPE_LINKS.PRO_MONTHLY;
  window.open(url, '_blank');
}

// Check if user has Pro features
export function hasProFeature(feature: 'unlimited_exports' | 'all_templates' | 'csv_import' | 'collab'): boolean {
  const status = getProStatus();
  if (!status.isPro) return false;
  
  // Pro tier gets most features
  if (status.tier === 'pro') {
    return ['unlimited_exports', 'all_templates', 'csv_import'].includes(feature);
  }
  
  // Ultra gets everything
  if (status.tier === 'ultra') {
    return true;
  }
  
  return false;
}

