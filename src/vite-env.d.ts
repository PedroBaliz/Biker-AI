/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" liga o paywall no cliente (ADR-008). Precisa casar com PAYWALL_ENABLED no servidor. */
  readonly VITE_PAYWALL_ENABLED?: string;
  readonly VITE_FACEBOOK_PIXEL_ID?: string;
}
