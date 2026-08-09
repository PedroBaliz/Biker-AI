// Meta (Facebook) Pixel integration helper for Biker AI

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

let isPixelInitialized = false;

/**
 * Initializes Meta Pixel with the provided Pixel ID or environment variable VITE_FACEBOOK_PIXEL_ID
 */
export function initMetaPixel(pixelIdOverride?: string): void {
  if (isPixelInitialized || (window as any).__metaPixelInitialized) return;

  const pixelId = pixelIdOverride || (import.meta as any).env?.VITE_FACEBOOK_PIXEL_ID || (window as any).FACEBOOK_PIXEL_ID;

  if (!pixelId) {
    console.warn("[Meta Pixel] Nenhum ID de Pixel configurado (VITE_FACEBOOK_PIXEL_ID não definido).");
    return;
  }

  // Se o script do index.html já inicializou o window.fbq e executou fbq('init', ...)
  if (window.fbq && typeof window.fbq === 'function') {
    isPixelInitialized = true;
    (window as any).__metaPixelInitialized = true;
    console.log(`[Meta Pixel] Já inicializado no HTML para o ID: ${pixelId}`);
    return;
  }

  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  try {
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
    isPixelInitialized = true;
    (window as any).__metaPixelInitialized = true;
    console.log(`[Meta Pixel] Inicializado com sucesso para o ID: ${pixelId}`);
  } catch (err) {
    console.error("[Meta Pixel] Erro ao inicializar:", err);
  }
}

/**
 * Tracks a standard or custom Meta Pixel event
 */
export function trackPixelEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  }
}

/**
 * Tracks custom event name
 */
export function trackCustomPixelEvent(customEventName: string, params?: Record<string, any>): void {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', customEventName, params);
  }
}

/**
 * Standard Events shortcuts
 */
export const MetaPixelEvents = {
  pageView: () => trackPixelEvent('PageView'),
  lead: (data?: Record<string, any>) => trackPixelEvent('Lead', data),
  initiateCheckout: (value = 29.90, currency = 'BRL') => trackPixelEvent('InitiateCheckout', { value, currency }),
  purchase: (value = 29.90, currency = 'BRL', orderId?: string) => trackPixelEvent('Purchase', { value, currency, content_name: 'Assinatura Biker AI', order_id: orderId }),
  completeRegistration: () => trackPixelEvent('CompleteRegistration'),
};
