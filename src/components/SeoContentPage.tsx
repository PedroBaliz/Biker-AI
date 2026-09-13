import React, { useState, useEffect } from "react";
import {
  Bike,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Activity,
  ShieldCheck,
  Zap,
  Flame,
  Award,
  Share2,
  Check,
  ExternalLink,
  Target,
  ListOrdered
} from "lucide-react";
import { SeoArticle, SEO_ARTICLES } from "../data/seoArticlesData";
import { updateSeoMeta } from "../utils/seoHead";
import TermsOfUseModal from "./TermsOfUseModal";
import PrivacyPolicyModal from "./PrivacyPolicyModal";
import ContactModal from "./ContactModal";

interface SeoContentPageProps {
  article: SeoArticle;
  onNavigateHome: (targetGoal?: string) => void;
  onNavigateSlug: (slug: string) => void;
}

export const SeoContentPage: React.FC<SeoContentPageProps> = ({
  article,
  onNavigateHome,
  onNavigateSlug
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);

  // Sync SEO Head metadata & Structured Data
  useEffect(() => {
    window.scrollTo(0, 0);

    const canonicalUrl = `https://ais-pre-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app/${article.slug}`;

    const jsonLdData = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.h1,
        "description": article.metaDescription,
        "image": "https://ais-pre-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app/biker_ai_icon.jpg",
        "datePublished": article.publishedDate,
        "dateModified": article.updatedDate,
        "author": {
          "@type": "Organization",
          "name": "Biker AI - Treinador Inteligente de Ciclismo",
          "url": "https://ais-pre-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app/"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Biker AI",
          "logo": {
            "@type": "ImageObject",
            "url": "https://ais-pre-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app/biker_ai_icon.jpg"
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": canonicalUrl
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Início",
            "item": "https://ais-pre-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Guias de Ciclismo",
            "item": "https://ais-pre-ig3xpt2tylya4dpumxckiy-403337948550.us-west2.run.app/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": article.h1,
            "item": canonicalUrl
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": article.faq.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      }
    ];

    updateSeoMeta({
      title: article.title,
      description: article.metaDescription,
      canonicalUrl,
      keywords: article.keywords,
      jsonLd: jsonLdData
    });
  }, [article]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-lime-400 selection:text-slate-950">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigateHome()}
            className="flex items-center gap-2.5 group cursor-pointer text-left bg-transparent border-none p-0"
          >
            <div className="p-2 bg-lime-400 text-slate-950 rounded-xl shadow-[0_0_15px_rgba(163,230,53,0.3)] group-hover:scale-105 transition-transform">
              <Bike className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-heading font-black text-sm sm:text-base tracking-wider text-white uppercase block">
                BIKER <span className="text-lime-400">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden xs:block">
                Treinos de Ciclismo Personalizados
              </span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateHome()}
              className="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer hidden sm:inline-block"
            >
              ← Voltar ao Início
            </button>
            <button
              type="button"
              onClick={() => onNavigateHome(article.ctaGoal)}
              className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-heading text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lime-500/20 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>Criar Treino Grátis</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigateHome()}
            className="hover:text-lime-400 transition-colors cursor-pointer"
          >
            Início
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-500">Guias de Ciclismo</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-lime-400 font-medium truncate max-w-xs">{article.category}</span>
        </nav>

        {/* Article Header */}
        <header className="space-y-4 border-b border-slate-800 pb-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 bg-lime-400/10 text-lime-400 border border-lime-400/20 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {article.readingTime}
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Atualizado em {new Date(article.updatedDate).toLocaleDateString("pt-BR")}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-black text-white leading-tight tracking-tight">
            {article.h1}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-sans">
            {article.subheadline}
          </p>

          <div className="flex items-center justify-between pt-3 text-xs text-slate-400">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lime-400 font-black text-xs font-mono">
                BA
              </div>
              <div>
                <p className="text-slate-200 font-bold">Equipe Técnica Biker AI</p>
                <p className="text-[11px] text-slate-500">Treinamento & Periodização de Ciclismo</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
              title="Copiar link do guia"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedLink ? "Link copiado!" : "Compartilhar"}</span>
            </button>
          </div>
        </header>

        {/* Key Takeaways Box (Rich Snippet Hero) */}
        <section className="p-5 sm:p-6 bg-slate-900/60 border border-lime-500/20 rounded-2xl space-y-3.5 shadow-lg">
          <div className="flex items-center gap-2 text-lime-400 font-heading font-bold text-sm uppercase tracking-wider">
            <Award className="w-4 h-4 text-lime-400" />
            <span>Pontos Principais para Lembrar</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-200 font-sans">
            {article.summaryKeyTakeaways.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Table of Contents */}
        <nav className="p-4 sm:p-5 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2.5 text-xs">
          <div className="flex items-center gap-2 font-heading font-bold text-slate-300 uppercase tracking-wider">
            <ListOrdered className="w-4 h-4 text-lime-400" />
            <span>Neste Artigo</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {article.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 text-slate-300 hover:text-lime-400 transition-colors py-1 truncate"
              >
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="truncate">{section.title}</span>
              </a>
            ))}
            <a
              href="#exemplo-treino"
              className="flex items-center gap-2 text-slate-300 hover:text-lime-400 transition-colors py-1 truncate"
            >
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              <span className="truncate">Exemplo de Treino Prático</span>
            </a>
            <a
              href="#perguntas-frequentes"
              className="flex items-center gap-2 text-slate-300 hover:text-lime-400 transition-colors py-1 truncate"
            >
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              <span className="truncate">Perguntas Frequentes (FAQ)</span>
            </a>
          </div>
        </nav>

        {/* Article Body Sections */}
        <div className="space-y-12">
          {article.sections.map((section) => (
            <section key={section.id} id={section.id} className="space-y-4 scroll-mt-20">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
                {section.title}
              </h2>

              <div className="space-y-3.5 text-slate-300 text-sm sm:text-base leading-relaxed">
                {section.content.map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </div>

              {/* Table Data if available */}
              {section.tableData && (
                <div className="overflow-x-auto my-4 border border-slate-800 rounded-xl bg-slate-900/60 shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 uppercase font-mono font-bold">
                        {section.tableData.headers.map((h, hIdx) => (
                          <th key={hIdx} className="p-3 sm:p-3.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {section.tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className={`p-3 sm:p-3.5 ${cIdx === 0 ? "font-bold text-lime-400 font-mono" : "text-slate-300"}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Key Highlight Callout */}
              {section.keyHighlight && (
                <div className="p-4 bg-slate-900 border-l-4 border-lime-400 rounded-r-xl text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
                  {section.keyHighlight}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Structured Workout Example Section */}
        <section id="exemplo-treino" className="p-6 sm:p-8 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-6 shadow-xl scroll-mt-20">
          <div className="space-y-2 border-b border-slate-800 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-lime-500/10 text-lime-400 border border-lime-500/20 px-3 py-1 rounded-full">
                Sessão Recomendada
              </span>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-lime-400" />
                  {article.workoutExample.totalTime}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  {article.workoutExample.targetZone}
                </span>
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-black text-white">
              {article.workoutExample.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              {article.workoutExample.description}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400">
              Estrutura Minuto a Minuto:
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {article.workoutExample.steps.map((step, sIdx) => (
                <div
                  key={sIdx}
                  className="p-3.5 sm:p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-heading font-black text-lime-400 uppercase">
                        {step.phase}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {step.duration}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium">
                        {step.intensity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {step.description}
                    </p>
                  </div>
                  {step.cadence && (
                    <div className="shrink-0 text-right sm:border-l sm:border-slate-800 sm:pl-4">
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Cadência</span>
                      <span className="text-xs font-mono font-bold text-slate-300">{step.cadence}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1">
            <span className="text-lime-400 font-bold block font-heading text-xs">Orientação do Treinador:</span>
            <p className="font-sans leading-relaxed text-slate-300">
              {article.workoutExample.coachAdvice}
            </p>
          </div>
        </section>

        {/* High-Converting CTA Banner */}
        <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-lime-500/10 via-slate-900 to-slate-950 border-2 border-lime-400/30 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-lime-400/20 text-lime-400 border border-lime-400/30 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-lime-400" />
            <span>Inteligência Artificial para Ciclistas</span>
          </div>

          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-black text-white tracking-tight max-w-2xl mx-auto">
            Gere sua planilha de ciclismo personalizada em menos de 1 minuto
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto font-sans leading-relaxed">
            Informe seus dias livres, objetivo e nível. O Biker AI estrutura cada treino com base na sua rotina real, recalibrando automaticamente se você perder algum dia.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateHome(article.ctaGoal)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-heading text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:shadow-lime-500/20 cursor-pointer active:scale-95"
            >
              <span>{article.ctaButtonText}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateHome()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-heading text-xs font-bold uppercase tracking-wider rounded-2xl border border-slate-800 transition-all cursor-pointer"
            >
              <span>Ver Demonstração Interativa</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <Check className="w-3.5 h-3.5 text-lime-400 stroke-[3]" />
              Sem cartão de crédito
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Check className="w-3.5 h-3.5 text-lime-400 stroke-[3]" />
              3 dias de teste gratuito
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% online
            </span>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="perguntas-frequentes" className="space-y-4 scroll-mt-20">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-lime-400">Tire Suas Dúvidas</span>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-2.5 pt-2">
            {article.faq.map((item, fIdx) => {
              const isOpen = openFaqIndex === fIdx;
              return (
                <div
                  key={fIdx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : fIdx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-800/30 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-heading font-bold text-white">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-lime-400" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-xs sm:text-sm text-slate-300 font-sans leading-relaxed border-t border-slate-800/60">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Related Articles / Cross-Linking */}
        <section className="space-y-4 pt-6 border-t border-slate-800">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-lime-400">Continue Evoluindo</span>
            <h3 className="text-lg sm:text-xl font-heading font-bold text-white">
              Outros Guias Recomendados de Ciclismo
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {article.relatedSlugs.map((relSlug) => {
              const relArticle = SEO_ARTICLES[relSlug];
              if (!relArticle) return null;
              return (
                <button
                  key={relSlug}
                  type="button"
                  onClick={() => onNavigateSlug(relSlug)}
                  className="p-4 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-lime-500/40 text-left transition-all flex flex-col justify-between space-y-3 group cursor-pointer"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-lime-400">
                      {relArticle.category}
                    </span>
                    <h4 className="text-xs sm:text-sm font-heading font-bold text-slate-200 group-hover:text-white leading-snug">
                      {relArticle.h1}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-lime-400 font-bold pt-1">
                    <span>Ler guia</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 px-4 sm:px-6 md:px-12 text-slate-400 font-sans text-xs space-y-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 rounded-xl text-lime-400 border border-slate-800">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-white">BIKER AI</p>
              <p className="text-[10px] text-slate-500 font-mono">Planilhas Inteligentes de Ciclismo</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-xs">
            <button type="button" onClick={() => onNavigateHome()} className="hover:text-white transition-colors cursor-pointer text-slate-400">Início</button>
            <span>•</span>
            <button type="button" onClick={() => onNavigateSlug("treino-ciclismo-iniciante")} className="hover:text-white transition-colors cursor-pointer text-slate-400">Iniciantes</button>
            <span>•</span>
            <button type="button" onClick={() => onNavigateSlug("planilha-treino-ciclismo")} className="hover:text-white transition-colors cursor-pointer text-slate-400">Planilhas</button>
            <span>•</span>
            <button type="button" onClick={() => onNavigateSlug("zona-2-ciclismo")} className="hover:text-white transition-colors cursor-pointer text-slate-400">Zona 2</button>
            <span>•</span>
            <button type="button" onClick={() => onNavigateSlug("treino-100km")} className="hover:text-white transition-colors cursor-pointer text-slate-400">100 km</button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px]">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-slate-400 hover:text-lime-400 transition-colors cursor-pointer"
            >
              Termos de Uso
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="text-slate-400 hover:text-lime-400 transition-colors cursor-pointer"
            >
              Política de Privacidade
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="text-slate-400 hover:text-lime-400 transition-colors cursor-pointer"
            >
              Contato
            </button>
          </div>

          <p className="text-[10px] text-slate-500 font-mono">
            © 2026 Biker AI • Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <TermsOfUseModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />

    </div>
  );
};

export default SeoContentPage;
