import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, UserProfile, TrainingPlan } from "../types";
import { apiFetch } from "../firebase";
import { MetaPixelEvents } from "../lib/metaPixel";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Calendar, 
  Activity, 
  Zap, 
  Heart, 
  Droplet, 
  ShieldCheck,
  RotateCcw
} from "lucide-react";

interface CoachChatProps {
  profile: UserProfile;
  plan: TrainingPlan | null;
  onApplyPlanUpdate?: (updatedPlan: TrainingPlan) => void;
  isPendingUser?: boolean;
  onUnlockClick?: () => void;
  // Optional backwards-compatible props (if passed by caller, ignored in favor of fresh session)
  chatHistory?: ChatMessage[];
  onSendMessage?: (message: string) => Promise<void>;
  isTyping?: boolean;
  onResetChat?: () => void;
}

const createInitialMessage = (profile: UserProfile, plan: TrainingPlan | null): ChatMessage => {
  const athleteFirstName = profile.name ? profile.name.trim().split(" ")[0] : "atleta";
  const welcomeText = plan
    ? `Olá, ${athleteFirstName}! Estou pronto para tirar dúvidas sobre seus treinos da Semana ${plan.weekNumber || 1}, nutrição, intensidade ou adaptar sua planilha. Como posso te ajudar hoje?`
    : `Olá, ${athleteFirstName}! Sou o seu Treinador de Ciclismo AI. Como posso te ajudar hoje com seus treinos, nutrição, ritmo ou evolução no pedal?`;

  return {
    id: `welcome-${Date.now()}`,
    sender: "treinador",
    text: welcomeText,
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  };
};

export const CoachChat: React.FC<CoachChatProps> = ({
  profile,
  plan,
  onApplyPlanUpdate,
  isPendingUser,
  onUnlockClick,
  onResetChat,
}) => {
  // Ephemeral in-memory session state: always starts fresh on component mount
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createInitialMessage(profile, plan)]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom of active conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Start a fresh, clean conversation session
  const handleStartNewSession = () => {
    setMessages([createInitialMessage(profile, plan)]);
    setInputMessage("");
    if (onResetChat) {
      onResetChat();
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const cleanText = textToSend.trim();
    if (!cleanText || isTyping) return;

    // Check if user is pending / expired and prompt unlock
    if (isPendingUser && onUnlockClick) {
      onUnlockClick();
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "atleta",
      text: cleanText,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    // Keep messages strictly in memory for this active session
    const currentSessionHistory = [...messages, userMsg];
    setMessages(currentSessionHistory);
    setInputMessage("");
    setIsTyping(true);

    try {
      MetaPixelEvents.contact();

      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanText,
          profile,
          currentPlan: plan,
          messageHistory: currentSessionHistory
        })
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        // non-json response
      }

      if (!response.ok) {
        const errMsg = data?.error || data?.message || "Falha ao comunicar com o treinador.";
        throw new Error(errMsg);
      }

      const coachMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "treinador",
        text: data?.reply || "Entendido! Como posso ajudar mais com sua preparação?",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };

      setMessages(prev => [...prev, coachMsg]);

      // If user requested a plan adjustment and AI returned the updated plan
      if (data?.updatedPlan && onApplyPlanUpdate) {
        onApplyPlanUpdate(data.updatedPlan);
      }
    } catch (err: any) {
      console.error("Erro na comunicação com o Coach AI:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "treinador",
        text: `⚠️ Desculpe, não consegui processar a resposta neste momento: ${err.message || "Tente novamente em instantes."}`,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;
    await handleSendMessage(inputMessage);
  };

  const handleQuickQuestion = async (question: string) => {
    if (isTyping) return;
    await handleSendMessage(question);
  };

  // Quick suggestion chips
  const quickSuggestions = [
    { label: "Como dosar o esforço no próximo treino?", icon: Zap },
    { label: "Dicas de hidratação e sódio para hoje", icon: Droplet },
    { label: "Estou fadigado, posso fazer descanso ativo?", icon: Heart },
    { label: "Quero trocar o dia do meu treino longo", icon: Calendar },
    { label: "Como melhorar meu ritmo em subidas?", icon: Activity },
  ];

  // Simple Markdown Parser for clean presentation
  const renderFormattedMessage = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Bullets
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const content = line.trim().substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-inherit my-1 leading-relaxed">
            {renderInlineMarkdown(content)}
          </li>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="leading-relaxed my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-black text-inherit">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[700px] max-h-[82vh] bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-fadeIn">
      {/* Top Coach Header Bar */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-5 py-4 flex items-center justify-between gap-4 border-b border-slate-800 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-3.5 relative z-10 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-lime-500 to-emerald-400 text-slate-950 flex items-center justify-center font-heading font-black text-base shrink-0 shadow-sm relative">
            <Bot className="w-6 h-6 text-slate-950" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-sm sm:text-base text-white truncate">
                Treinador Biker AI
              </h3>
              <span className="px-2 py-0.5 bg-lime-400 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded-md shrink-0">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 font-sans">
              <span>Especialista em Fisiologia & Ciclismo</span>
              {plan && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-lime-400/90 font-mono font-bold">Semana {plan.weekNumber || 1}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action button to reset / start a new clean session */}
        <button
          type="button"
          onClick={handleStartNewSession}
          disabled={isTyping}
          className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white border border-slate-750 text-xs font-semibold font-sans transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
          title="Limpar e iniciar uma nova conversa com o Coach AI"
        >
          <RotateCcw className="w-3.5 h-3.5 text-lime-400" />
          <span className="hidden sm:inline">Nova Conversa</span>
        </button>
      </div>

      {/* Athlete Status & Plan Banner */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-sans">
          <span className="font-bold text-slate-800">Atleta:</span>
          <span>{profile.name || "Ciclista"}</span>
          <span className="text-slate-300">•</span>
          <span className="capitalize text-slate-700 font-medium">{profile.level || "Intermediário"}</span>
          {profile.goal && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700 font-medium">Meta: {profile.goal}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Diretrizes ACSM & Zonas Fisiológicas</span>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 bg-lime-100 text-lime-700 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-heading font-black text-slate-800 text-base">Olá, {profile.name || "atleta"}!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Pergunte qualquer dúvida sobre seus treinos, hidratação, intensidade ou solicite alterações na sua planilha semanal.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === "atleta";
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[90%] sm:max-w-[82%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div 
                  className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold shadow-xs ${
                    isUser ? "bg-slate-900 text-lime-400" : "bg-lime-400 text-slate-950 font-heading font-black"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                
                <div className="space-y-1.5 min-w-0">
                  <div 
                    className={`rounded-2xl p-4 text-xs sm:text-[13px] leading-relaxed shadow-xs transition-all ${
                      isUser 
                        ? "bg-slate-900 text-white rounded-tr-none font-sans" 
                        : "bg-white text-slate-800 rounded-tl-none border border-slate-200/90 shadow-2xs font-sans"
                    }`}
                  >
                    {renderFormattedMessage(msg.text)}
                  </div>
                  
                  <span className={`text-[10px] text-slate-400 font-mono tracking-wider block px-1 ${
                    isUser ? "text-right" : "text-left"
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Loading / Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 mr-auto max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-lime-400 text-slate-950 font-heading font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-200/90 shadow-2xs flex items-center gap-2">
              <span className="w-2 h-2 bg-lime-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-lime-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-lime-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-[11px] font-sans text-slate-500 font-medium ml-1">
                Treinador analisando dados...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="p-2 sm:px-4 sm:py-2.5 bg-white border-t border-slate-150 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 shrink-0 hidden sm:inline">
          Exemplos rápidos:
        </span>
        {quickSuggestions.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              disabled={isTyping}
              onClick={() => handleQuickQuestion(item.label)}
              className="text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-50 py-1.5 px-3 rounded-full shrink-0 flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/60 shadow-2xs whitespace-nowrap"
            >
              <Icon className="w-3 h-3 text-slate-500" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-white border-t border-slate-200/80 flex items-center gap-2 shrink-0">
        <input 
          ref={inputRef}
          type="text" 
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={isTyping}
          placeholder="Pergunte qualquer coisa livremente (nutrição, pneus, subidas, dores, marchas, ajustes)..."
          className="flex-1 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 rounded-2xl px-4 py-3.5 outline-hidden border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-900/10 font-sans transition-all disabled:opacity-50"
        />
        <button 
          type="submit"
          disabled={!inputMessage.trim() || isTyping}
          className="h-11 px-5 bg-slate-900 hover:bg-slate-850 text-lime-400 font-heading font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-sm active:scale-95"
        >
          <span>Enviar</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
