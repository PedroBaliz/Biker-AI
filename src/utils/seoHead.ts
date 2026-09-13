/**
 * Utility for managing document head tags and SEO metadata dynamically
 */

export interface SeoMetaConfig {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  ogType?: string;
  keywords?: string[];
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

const DEFAULT_ORIGIN = "https://ais-pre-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app";

export const HOME_SEO_CONFIG: SeoMetaConfig = {
  title: "Biker AI | Treinos de Ciclismo Personalizados com IA",
  description: "Crie treinos de ciclismo personalizados de acordo com seu objetivo, nível e rotina. Planeje sua evolução com o Biker AI.",
  canonicalUrl: DEFAULT_ORIGIN + "/",
  ogImage: DEFAULT_ORIGIN + "/biker_ai_icon.jpg",
  ogType: "website",
  keywords: [
    "treino de ciclismo personalizado",
    "planilha de treino ciclismo",
    "Biker AI",
    "treinador de ciclismo IA",
    "periodização ciclismo",
    "zonas de treino ciclismo",
    "cálculo FTP ciclismo",
    "ciclismo de estrada",
    "mountain bike"
  ],
  jsonLd: [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Biker AI",
      "url": DEFAULT_ORIGIN + "/",
      "description": "Crie treinos de ciclismo personalizados de acordo com seu objetivo, nível e rotina. Planeje sua evolução com o Biker AI.",
      "applicationCategory": "SportsApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "16.90",
        "priceCurrency": "BRL",
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "2027-12-31"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "158",
        "bestRating": "5"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Biker AI",
      "url": DEFAULT_ORIGIN + "/",
      "description": "Crie treinos de ciclismo personalizados de acordo com seu objetivo, nível e rotina. Planeje sua evolução com o Biker AI."
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Biker AI",
      "url": DEFAULT_ORIGIN + "/",
      "logo": DEFAULT_ORIGIN + "/biker_ai_icon.jpg",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "bikeraisupport@gmail.com",
        "contactType": "customer service"
      }
    }
  ]
};

export function updateSeoMeta(config: SeoMetaConfig): void {
  if (typeof document === "undefined") return;

  // 1. Update Title
  document.title = config.title;

  // 2. Helper to set or create <meta>
  const setMeta = (name: string, content: string, isProperty = false) => {
    const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let element = document.querySelector(selector) as HTMLMetaElement | null;
    if (!element) {
      element = document.createElement("meta");
      if (isProperty) {
        element.setAttribute("property", name);
      } else {
        element.setAttribute("name", name);
      }
      document.head.appendChild(element);
    }
    element.setAttribute("content", content);
  };

  // 3. Primary Meta Tags
  setMeta("description", config.description);
  if (config.keywords && config.keywords.length > 0) {
    setMeta("keywords", config.keywords.join(", "));
  }

  // 4. Canonical URL
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement("link");
    canonicalLink.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute("href", config.canonicalUrl);

  // 5. Open Graph Tags
  setMeta("og:title", config.title, true);
  setMeta("og:description", config.description, true);
  setMeta("og:url", config.canonicalUrl, true);
  setMeta("og:type", config.ogType || "article", true);
  if (config.ogImage) {
    setMeta("og:image", config.ogImage, true);
  }
  setMeta("og:site_name", "Biker AI", true);
  setMeta("og:locale", "pt_BR", true);

  // 6. Twitter Card Tags
  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", config.title);
  setMeta("twitter:description", config.description);
  setMeta("twitter:url", config.canonicalUrl);
  if (config.ogImage) {
    setMeta("twitter:image", config.ogImage);
  }

  // 7. Dynamic JSON-LD Structured Data
  if (config.jsonLd) {
    let scriptTag = document.getElementById("dynamic-seo-jsonld") as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = "dynamic-seo-jsonld";
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(config.jsonLd);
  }
}
