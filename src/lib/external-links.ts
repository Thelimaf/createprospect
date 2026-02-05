// External Links Utility - Logging, URL normalization, and popup detection

export interface ExternalLinkLogContext {
  context: string;
  method: 'direct_anchor' | 'copy_clipboard' | 'qr_dialog' | 'open_app_new_tab' | 'window_open_test';
  url: string;
  leadId?: string;
}

/**
 * Log external link attempt for debugging
 */
export function logExternalLinkAttempt(params: ExternalLinkLogContext): void {
  console.log('[ExternalLink]', {
    ...params,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    isInIframe: isRunningInIframe(),
  });
}

/**
 * Check if app is running inside an iframe
 */
export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // If we can't access window.top due to cross-origin, we're in an iframe
    return true;
  }
}

// Known country codes with expected phone number lengths
const KNOWN_COUNTRY_CODES: Record<string, { code: string; minLen: number; maxLen: number }> = {
  '55':  { code: '55',  minLen: 12, maxLen: 13 }, // BR: 55 + DDD(2) + 8-9 digits
  '1':   { code: '1',   minLen: 11, maxLen: 11 }, // US/CA: 1 + 10 digits
  '54':  { code: '54',  minLen: 12, maxLen: 13 }, // AR
  '52':  { code: '52',  minLen: 12, maxLen: 13 }, // MX
  '351': { code: '351', minLen: 12, maxLen: 12 }, // PT
  '34':  { code: '34',  minLen: 11, maxLen: 11 }, // ES
  '44':  { code: '44',  minLen: 12, maxLen: 12 }, // UK
  '49':  { code: '49',  minLen: 12, maxLen: 14 }, // DE
  '33':  { code: '33',  minLen: 11, maxLen: 11 }, // FR
  '39':  { code: '39',  minLen: 12, maxLen: 12 }, // IT
  '56':  { code: '56',  minLen: 11, maxLen: 12 }, // CL
  '57':  { code: '57',  minLen: 12, maxLen: 12 }, // CO
  '51':  { code: '51',  minLen: 11, maxLen: 11 }, // PE
  '598': { code: '598', minLen: 11, maxLen: 12 }, // UY
};

/**
 * Normalize phone to international format
 * Intelligently detects if already has a valid country code
 */
export function normalizePhone(phone: string, defaultCountryCode: string = '55'): string {
  if (!phone) return phone;
  
  let digits = phone.replace(/\D/g, '');
  
  // Check if already starts with a known country code AND has valid length
  for (const [code, info] of Object.entries(KNOWN_COUNTRY_CODES)) {
    if (digits.startsWith(code) && digits.length >= info.minLen && digits.length <= info.maxLen) {
      return digits; // Already correct, don't modify
    }
  }
  
  // Remove leading zeros (common in some countries like UK)
  digits = digits.replace(/^0+/, '');
  
  // Add default country code
  return defaultCountryCode + digits;
}

/**
 * Normalize Brazilian phone number to format 55DDDNUMBER
 * @deprecated Use normalizePhone() instead for international support
 */
export function normalizePhoneBR(phone: string): string {
  return normalizePhone(phone, '55');
}

/**
 * Build WhatsApp URL using wa.me (universal format, works on mobile and desktop)
 * Never uses api.whatsapp.com or web.whatsapp.com
 */
export function buildWhatsAppUrl(phone: string, text?: string): string {
  // Use the smart normalizePhone function
  const normalizedPhone = normalizePhone(phone);
  
  if (text) {
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
  }
  
  return `https://wa.me/${normalizedPhone}`;
}

/**
 * Ensure URL has https:// protocol
 */
export function ensureHttps(url: string): string {
  if (!url) return url;
  
  const trimmed = url.trim();
  
  // Already has protocol
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  // Add https://
  return `https://${trimmed}`;
}

/**
 * Normalize Google Maps URL
 * Ensures it uses https://www.google.com/maps format
 */
export function normalizeMapsUrl(url: string): string {
  if (!url) return url;
  
  // Already a valid Google Maps URL
  if (url.includes('google.com/maps') || url.includes('maps.google.com')) {
    return ensureHttps(url);
  }
  
  // Return as-is if not a maps URL
  return url;
}

/**
 * Generate QR Code URL using api.qrserver.com
 */
export function getQrCodeUrl(dataUrl: string, size: number = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(dataUrl)}`;
}

/**
 * Test popup blocker by attempting window.open
 * Returns true if popup was blocked
 */
export function testPopupBlocker(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    
    setTimeout(() => {
      if (!w || w.closed || typeof w.closed === 'undefined') {
        resolve(true); // Blocked
      } else {
        resolve(false); // Not blocked
      }
    }, 100);
  });
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
