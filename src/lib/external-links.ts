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

/**
 * Normalize Brazilian phone number to format 55DDDNUMBER
 */
export function normalizePhoneBR(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  // If already starts with 55, return as is
  if (digits.startsWith('55')) {
    return digits;
  }
  
  // Add country code
  return `55${digits}`;
}

/**
 * Build WhatsApp URL using wa.me (universal format, works on mobile and desktop)
 * Never uses api.whatsapp.com or web.whatsapp.com
 */
export function buildWhatsAppUrl(phone: string, text?: string): string {
  const normalizedPhone = normalizePhoneBR(phone);
  
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
