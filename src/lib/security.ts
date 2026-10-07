/**
 * Input sanitization and validation utilities to ensure safety and prevent malformed inputs.
 */

import DOMPurify from "dompurify";

/**
 * Hardened regex fallback used when DOMPurify is unavailable (e.g. SSR / non-DOM runtime).
 * Removes dangerous tags, inline event handlers (onclick, onerror, ...), and
 * javascript:/vbscript:/data: URIs.
 */
function sanitizeWithoutDomPurify(input: string): string {
  return input
    // Dangerous tags (including their content where applicable)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*\/?>/gi, "")
    // Inline event handlers: onerror=..., onclick="...", onmouseover='...'
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    // Dangerous URI schemes anywhere in the string
    .replace(/(javascript|vbscript|data)\s*:/gi, "");
}

export function sanitizeText(input: string, maxLen = 1000): string {
  if (!input) return "";

  // Trim leading/trailing whitespace
  let clean = input.trim();

  // Truncate to safe length
  if (clean.length > maxLen) {
    clean = clean.substring(0, maxLen);
  }

  // Sanitize markup: prefer DOMPurify with a strict allowlist, fall back to the
  // hardened regex path when no DOM implementation is present.
  if (typeof window !== "undefined" && DOMPurify && typeof DOMPurify.sanitize === "function") {
    clean = DOMPurify.sanitize(clean, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "link", "meta", "base", "form"],
      FORBID_ATTR: ["style", "srcset", "formaction", "onerror", "onload", "onclick"]
    });
    clean = sanitizeWithoutDomPurify(clean);
  } else {
    clean = sanitizeWithoutDomPurify(clean);
  }

  return clean;
}

export function validateEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

export function sanitizeNumericInput(val: string | number | null | undefined, min = 0, max = 1000): number {
  if (val === null || val === undefined || val === "") return min;
  const parsed = Number(val);
  if (isNaN(parsed)) return min;
  return Math.min(Math.max(parsed, min), max);
}
