import React, { useState } from "react";
import { Workout } from "../types";
import { 
  Droplet, 
  Sparkles, 
  Info, 
  ChevronDown, 
  ChevronUp, 
} from "lucide-react";
import { getSimplifiedText } from "../utils/translation";

interface SmartHydrationTipProps {
  workout: Workout;
  isSimpleMode?: boolean;
}

interface HydrationResult {
  waterMl: number;
  sodiumMg: number;
  potassiumMg: number;
  carbsG: number;
  sipInterval: number;
  intensityLevel: string;
  advice: string;
  bottlesCount: number; // calculated as 500ml/750ml bottles
  gelEstimate: number; // estimated energy gels
}

export function calculateHydration(durationMinutes: number, targetZone: string, rpe: number): HydrationResult {
  const zone = (targetZone || "").toUpperCase();
  const effort = rpe || 5;

  let hourlyWater = 600; // ml/hr
  let hourlySodium = 400; // mg/hr
  let hourlyPotassium = 100; // mg/hr
  let hourlyCarbs = 0; // g/hr
  let sipInterval = 12; // minutes
  let intensityLevel = "Moderada";
  let advice = "";

  // 1. Determine hourly rates based on intensity / Zone / RPE
  if (zone.includes("Z1") || effort <= 2) {
    hourlyWater = 500;
    hourlySodium = 300;
    hourlyPotassium = 80;
    hourlyCarbs = 0;
    sipInterval = 15;
    intensityLevel = "Muito Leve";
    advice = "Treino leve com baixa taxa de suor. Água pura ou pequenos tabletes de sal são ideais. Evite excesso de calorias desnecessárias.";
  } else if (zone.includes("Z2") || effort <= 4) {
    hourlyWater = 620;
    hourlySodium = 480;
    hourlyPotassium = 110;
    hourlyCarbs = 30; // 30g starch/sugar per hour
    sipInterval = 12;
    intensityLevel = "Leve / Giro Confortável";
    advice = "Pedal confortável em ritmo de conversa. Básico bem feito: adicione uma pitada de sal ou cápsula eletrolítica se o pedal passar de 1h para reter líquido no sangue e evitar cãibras.";
  } else if (zone.includes("Z3") || effort <= 6) {
    hourlyWater = 750;
    hourlySodium = 650;
    hourlyPotassium = 150;
    hourlyCarbs = 45;
    sipInterval = 10;
    intensityLevel = "Moderado / Esforço Firme";
    advice = "Intensidade moderada-alta. Perda significativa de sais minerais pela transpiração. Use carbo líquido para manter os estoques de energia ativos.";
  } else if (zone.includes("Z4") || effort <= 8) {
    hourlyWater = 900;
    hourlySodium = 850;
    hourlyPotassium = 200;
    hourlyCarbs = 70;
    sipInterval = 8;
    intensityLevel = "Forte / No Limite";
    advice = "Treino forte no limite de fôlego. Sudorese acentuada. Alterne água pura com isotônico contendo carbo para reabastecer as pernas rapidamente.";
  } else {
    // Z5/Z6/Z7 or RPE 9-10
    hourlyWater = 1050;
    hourlySodium = 1000;
    hourlyPotassium = 250;
    hourlyCarbs = 85;
    sipInterval = 7;
    intensityLevel = "Muito Forte / Esforço Extremo";
    advice = "Estresse físico severo. Hidrate bem nas 2h anteriores. Durante o pedal forte, beba goles pequenos e precisos a cada tiro ou período de descanso.";
  }

  // 2. Adjust carbs for shorter workouts to avoid metabolic waste
  if (durationMinutes < 45) {
    hourlyCarbs = 0;
  }

  const durationHours = durationMinutes / 60;

  // 3. Overall math
  const waterMl = Math.round(hourlyWater * durationHours);
  const sodiumMg = Math.round(hourlySodium * durationHours);
  const potassiumMg = Math.round(hourlyPotassium * durationHours);
  const carbsG = Math.round(hourlyCarbs * durationHours);
  
  // Calculate handy helper representations:
  // e.g., 1 carb gel holds roughly 25g carbs.
  const gelEstimate = carbsG > 0 ? parseFloat((carbsG / 25).toFixed(1)) : 0;
  
  // 750ml bottles count approximation
  const bottlesCount = parseFloat((waterMl / 750).toFixed(1));

  return {
    waterMl,
    sodiumMg,
    potassiumMg,
    carbsG,
    sipInterval,
    intensityLevel,
    advice,
    bottlesCount,
    gelEstimate
  };
}

export default function SmartHydrationTip({ workout, isSimpleMode = false }: SmartHydrationTipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Compute calculated recommendations
  const recommendation = calculateHydration(
    workout.duration,
    workout.targetZone,
    workout.rpe || 5
  );

  if (workout.duration <= 0) {
    return null;
  }

  return (
    <div 
      className={`rounded-2xl transition-all duration-300 border ${
        isOpen 
          ? "bg-slate-50/70 border-sky-200 shadow-3xs" 
          : "bg-slate-50/30 border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
      }`}
      id={`hydration-box-${workout.day}`}
    >
      {/* Trigger Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 text-left cursor-pointer transition-colors focus:outline-hidden"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-100 text-sky-600 rounded-lg">
            <Droplet className={`w-3.5 h-3.5 ${isOpen ? "fill-sky-500 animate-bounce" : ""}`} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block tracking-widest uppercase font-mono leading-none mb-0.5">
              {isSimpleMode ? "Guia Fácil de Hidratação 💧" : "Calculadora Fisiológica"}
            </span>
            <span className="text-xs font-heading font-extrabold text-slate-800 flex items-center gap-1">
              {isSimpleMode ? "Como se Hidratar no Pedal" : "Hidratação Inteligente"}
              <span className="text-[9px] bg-sky-100 text-sky-700 font-bold px-1.5 py-0.2 rounded-md font-sans">
                {recommendation.waterMl}ml
              </span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600">
          <span className="text-[10px] font-mono font-bold hidden sm:inline-block">
            {isOpen ? "Ocultar" : "Expandir Guia"}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
        </div>
      </button>

      {/* Expandable Body */}
      {isOpen && (
        <div className="px-4 pb-4.5 pt-1.5 space-y-4 border-t border-slate-100 animate-fadeIn text-xs text-slate-600 font-sans leading-relaxed">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* Water Block */}
            <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col justify-between h-20 shadow-2xs">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                {isSimpleMode ? "GARRAFA DE ÁGUA 💧" : "VOLUME DE ÁGUA"}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-base font-mono font-black text-sky-600">{recommendation.waterMl}</span>
                <span className="text-[10px] text-slate-500 font-bold font-mono">ml</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {isSimpleMode 
                  ? `≈ ${recommendation.bottlesCount} garrafa(s) de 750ml` 
                  : `≈ ${recommendation.bottlesCount} caramanhola(s) (garrafa comum de 750ml)`
                }
              </span>
            </div>

            {/* Sodium Block */}
            <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col justify-between h-20 shadow-2xs">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                {isSimpleMode ? "SAL E MINERAIS 🧂" : "REPOSIÇÃO DE SAL (SÓDIO)"}
              </span>
              {isSimpleMode ? (
                <>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-sans font-black text-amber-600">Sais Eletrolíticos</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium leading-none">
                    {workout.duration > 60 
                      ? "Recomendado levar cápsula ou sachê" 
                      : "Apenas água basta para este pedal!"}
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-base font-mono font-black text-amber-600">{recommendation.sodiumMg}</span>
                    <span className="text-[10px] text-slate-500 font-bold font-mono">mg</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    + {recommendation.potassiumMg}mg Potássio (Eletrolíticos)
                  </span>
                </>
              )}
            </div>

            {/* Carb Block */}
            <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col justify-between h-20 shadow-2xs">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                {isSimpleMode ? "COMIDA / ENERGIA 🍌" : "CARBOIDRATOS RECOMENDADOS"}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-base font-mono font-black text-lime-600">{recommendation.carbsG}</span>
                <span className="text-[10px] text-slate-500 font-extrabold font-mono">g</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                {recommendation.gelEstimate > 0 
                  ? `≈ ${recommendation.gelEstimate} gel ou banana` 
                  : "Pedal curto: desnecessário levar comida"}
              </span>
            </div>

            {/* Sip Frequency Block */}
            <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col justify-between h-20 shadow-2xs">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                {isSimpleMode ? "QUANDO BEBER ⏱️" : "FREQUÊNCIA DE GOLES"}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[10px] font-sans font-bold text-slate-400 shrink-0">A cada</span>
                <span className="text-base font-mono font-black text-slate-800">{recommendation.sipInterval}</span>
                <span className="text-[10px] text-slate-500 font-extrabold">min</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {isSimpleMode ? "Dê um gole regular!" : "Configure alertas no seu GPS! ⏱️"}
              </span>
            </div>

          </div>

          {/* Highlight coaching tip based on intensity */}
          <div className="p-3 bg-sky-500/5 rounded-xl border border-sky-500/10 flex items-start gap-2 text-[11px] leading-relaxed">
            <Sparkles className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-heading font-black text-[10px] text-sky-700 block uppercase tracking-wider mb-0.5">
                {isSimpleMode ? "DICA DE INTENSIDADE DO COACH:" : `Alerta de Desgaste: ${recommendation.intensityLevel}`}
              </span>
              <p className="text-slate-600 font-medium font-sans italic">
                "{isSimpleMode ? getSimplifiedText(recommendation.advice) : recommendation.advice}"
              </p>
            </div>
          </div>

          {/* Scientific Disclaimer text with info note */}
          <div className="flex items-start gap-1.5 text-[9.5px] text-slate-400/90 leading-tight">
            <Info className="w-3.5 h-3.5 text-slate-350 shrink-0 mt-0.5" />
            <p className="font-sans">
              {isSimpleMode 
                ? "Esses valores são calculados de forma segura para você treinar com saúde e sem cansaço excessivo. Beber água e comer corretamente evita cãibras, tontura e estafa precoce!"
                : "As taxas são baseadas nas diretrizes internacionais do ACSM (American College of Sports Medicine - Colégio Americano de Medicina do Esporte) para ciclismo em temperaturas normais (~21°C). Ajuste para mais se estiver quente ou se você suar bastante."
              }
            </p>
          </div>

        </div>
      )}

    </div>
  );
}
