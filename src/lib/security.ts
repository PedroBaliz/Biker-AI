/**
 * Input sanitization and validation utilities to ensure safety and prevent malformed inputs.
 */

export function sanitizeText(input: string, maxLen = 1000): string {
  if (!input) return "";
  
  // Trim leading/trailing whitespace
  let clean = input.trim();
  
  // Truncate to safe length
  if (clean.length > maxLen) {
    clean = clean.substring(0, maxLen);
  }

  // Remove potential harmful tags or script injections
  clean = clean
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "");

  return clean;
}

export function validateEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

export function sanitizeNumericInput(val: any, min = 0, max = 1000): number {
  const parsed = Number(val);
  if (isNaN(parsed)) return min;
  return Math.min(Math.max(parsed, min), max);
}
