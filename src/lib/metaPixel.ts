// Meta (Facebook) Pixel integration helper for Biker AI

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    FACEBOOK_PIXEL_ID?: string;
    __metaPixelInitialized?: boolean;
  }
}

export const DEFAULT_PIXEL_ID = "1367412024814466";

/**
 * Initializes Meta Pixel with the provided Pixel ID or environment variable VITE_FACEBOOK_PIXEL_ID
 */
export function initMetaPixel(pixelIdOverride?: string): void {
  if (typeof window === 'undefined') return;
  if ((window as any).__metaPixelInitialized) return;

  const pixelId = pixelIdOverride || (import.meta as any).env?.VITE_FACEBOOK_PIXEL_ID || window.FACEBOOK_PIXEL_ID || DEFAULT_PIXEL_ID;

  if (!pixelId) {
    console.warn("[Meta Pixel] Nenhum ID de Pixel configurado.");
    return;
  }

  // Se o script do index.html já inicializou o window.fbq
  if (window.fbq && typeof window.fbq === 'function') {
    (window as any).__metaPixelInitialized = true;
    console.log(`[Meta Pixel] Pixel ${pixelId} verificado e ativo via script base.`);
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
    (window as any).__metaPixelInitialized = true;
    console.log(`[Meta Pixel] Inicializado dinamicamente com sucesso para ID: ${pixelId}`);
  } catch (err) {
    console.error("[Meta Pixel] Erro ao inicializar dinamicamente:", err);
  }
}

/**
 * Tracks a standard or custom Meta Pixel event
 */
export function trackPixelEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window !== 'undefined' && window.fbq && typeof window.fbq === 'function') {
    try {
      if (params && Object.keys(params).length > 0) {
        window.fbq('track', eventName, params);
      } else {
        window.fbq('track', eventName);
      }
      console.log(`[Meta Pixel] Evento enviado: ${eventName}`, params || '');
    } catch (err) {
      console.error(`[Meta Pixel] Erro ao enviar evento ${eventName}:`, err);
    }
  } else {
    console.warn(`[Meta Pixel] Tentativa de enviar '${eventName}', mas window.fbq não está disponível (AdBlock/Privacidade?).`);
  }
}

/**
 * Tracks custom event name
 */
export function trackCustomPixelEvent(customEventName: string, params?: Record<string, any>): void {
  if (typeof window !== 'undefined' && window.fbq && typeof window.fbq === 'function') {
    try {
      window.fbq('trackCustom', customEventName, params);
      console.log(`[Meta Pixel] Evento customizado enviado: ${customEventName}`, params || '');
    } catch (err) {
      console.error(`[Meta Pixel] Erro em evento customizado ${customEventName}:`, err);
    }
  }
}

/**
 * Eventos padrão do Meta Pixel com parâmetros aceitos oficialmente
 */
export const MetaPixelEvents = {
  pageView: () => trackPixelEvent('PageView'),
  lead: (data?: Record<string, any>) => trackPixelEvent('Lead', data),
  completeRegistration: (data?: Record<string, any>) => trackPixelEvent('CompleteRegistration', data),
  initiateCheckout: (value = 24.89, currency = 'BRL') => trackPixelEvent('InitiateCheckout', { value: Number(value), currency }),
  purchase: (value = 24.89, currency = 'BRL', orderId?: string) => trackPixelEvent('Purchase', { value: Number(value), currency, content_name: 'Assinatura Biker AI', order_id: orderId }),
  subscribe: (value = 24.89, currency = 'BRL', ltv = 298.68) => trackPixelEvent('Subscribe', { value: Number(value), currency, predicted_ltv: Number(ltv) }),
  addPaymentInfo: () => trackPixelEvent('AddPaymentInfo'),
  viewContent: (contentName: string, category?: string) => trackPixelEvent('ViewContent', { content_name: contentName, content_category: category }),
  contact: () => trackPixelEvent('Contact'),
  search: (searchString: string) => trackPixelEvent('Search', { search_string: searchString }),
};

