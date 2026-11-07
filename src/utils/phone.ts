/**
 * Phone formatting and WhatsApp URL utility for KKN SPACE
 */

/**
 * Normalizes any Indonesian phone number string to international standard (+62 XXX-XXXX-XXXX)
 */
export function formatInternationalPhone(phone: string): string {
  if (!phone) return '';
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');

  let nationalNumber = digits;
  if (digits.startsWith('62')) {
    nationalNumber = digits.slice(2);
  } else if (digits.startsWith('0')) {
    nationalNumber = digits.slice(1);
  }

  // Format into +62 XXX-XXXX-XXXX
  if (nationalNumber.length >= 9) {
    const part1 = nationalNumber.slice(0, 3);
    const part2 = nationalNumber.slice(3, 7);
    const part3 = nationalNumber.slice(7);
    return `+62 ${part1}-${part2}-${part3}`;
  }

  return `+62 ${nationalNumber}`;
}

/**
 * Extracts clean digits starting with 62 for WhatsApp wa.me links
 */
export function getWhatsAppDigits(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('62')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  return `62${digits}`;
}

/**
 * Generates official clickable WhatsApp direct URL
 */
export function getWhatsAppUrl(phone: string, defaultMessage?: string): string {
  const digits = getWhatsAppDigits(phone);
  if (!digits) return '#';
  const baseUrl = `https://wa.me/${digits}`;
  if (defaultMessage) {
    return `${baseUrl}?text=${encodeURIComponent(defaultMessage)}`;
  }
  return baseUrl;
}

/**
 * Masks phone number for privacy protection (unauthenticated public visitors)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const formatted = formatInternationalPhone(phone);
  // Example: +62 882-9692-4050 -> +62 882-••••-••••
  const parts = formatted.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-••••-••••`;
  }
  return '+62 ••••-••••-••••';
}
