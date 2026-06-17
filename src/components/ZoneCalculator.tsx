import React from "react";
import { UserProfile, ZoneInfo } from "../types";
import { Gauge, Heart, Zap, Sparkles, BookOpen, Info } from "lucide-react";

interface ZoneCalculatorProps {
  profile: UserProfile;
}

export default function ZoneCalculator({ profile }: ZoneCalculatorProps) {
  const ftp = profile.ftp || 200;
  const fcMax = profile.maxHeartRate || 180;
  const [showGlossary, setShowGlossary] = React.useState(true);

  const powerZones = [
    { name: "Z1 - Pedal Leve / Giro", range: `< ${Math.round(ftp * 0.55)}W`, desc: "< 55% do FTP", purpose: "Aquecimento, soltura das pernas e descanso ativo após treinos fortes." },
    { name: "Z2 - Ritmo de Viagem", range: `${Math.round(ftp * 0.56)}W - ${Math.round(ftp * 0.75)}W`, desc: "56% a 75% do FTP", purpose: "Melhora do fôlego básico, queima saudável de energia e resistência geral para pedalar por horas." },
    { name: "Z3 - Ritmo Firme", range: `${Math.round(ftp * 0.76)}W - ${Math.round(ftp * 0.90)}W`, desc: "76% a 90% do FTP", purpose: "Velocidade média constante de estrada, ideal para treinar a força em planos e ventos moderados." },
    { name: "Z4 - Esforço Forte", range: `${Math.round(ftp * 0.91)}W - ${Math.round(ftp * 1.05)}W`, desc: "91% a 105% do FTP", purpose: "Melhora da força geral e resistência para aguentar subidas longas com bastante intensidade." },
    { name: "Z5 - Fôlego Máximo", range: `${Math.round(ftp * 1.06)}W - ${Math.round(ftp * 1.20)}W`, desc: "106% a 120% do FTP", purpose: "Intensidade muito alta para aumentar sua capacidade respiratória e fôlego sob cansaço severo." },
    { name: "Z6 - Força Explosiva", range: `${Math.round(ftp * 1.21)}W - ${Math.round(ftp * 1.50)}W`, desc: "121% a 150% do FTP", purpose: "Acelerações fortes para ultrapassagens, fugas ou subidas curtas de alta velocidade." },
    { name: "Z7 - Arrancada Máxima", range: `> ${Math.round(ftp * 1.51)}W`, desc: "> 150% do FTP", purpose: "Esforço extremo de poucos segundos para ganhar força explosiva e potência muscular instantânea." }
  ];

  const hrZones = [
    { name: "Z1 - Super Leve / Soltura", range: `< ${Math.round(fcMax * 0.65)} bpm`, desc: "< 65% da FCmax", purpose: "Aquecimento inicial ou pedalada tranquila para soltar as pernas e relaxar." },
    { name: "Z2 - Ritmo Confortável", range: `${Math.round(fcMax * 0.65)} - ${Math.round(fcMax * 0.79)} bpm`, desc: "65% a 79% da FCmax", purpose: "Resistência geral onde você consegue conversar normalmente sem perder o fôlego." },
    { name: "Z3 - Ritmo Moderado", range: `${Math.round(fcMax * 0.80)} - ${Math.round(fcMax * 0.89)} bpm`, desc: "80% a 89% da FCmax", purpose: "Velocidade moderada, respiração um pouco mais profunda, ideal para focar na postura e ritmo firme." },
    { name: "Z4 - Limite de Esforço", range: `${Math.round(fcMax * 0.90)} - ${Math.round(fcMax * 0.94)} bpm`, desc: "90% a 94% da FCmax", purpose: "Treino intenso, pernas começam a pesar bastante e a respiração fica acelerada." },
    { name: "Z5 - Esforço Extremo", range: `> ${Math.round(fcMax * 0.95)} bpm`, desc: ">= 95% da FCmax", purpose: "Força total e fôlego no limite máximo para simulação de competições ou picos de esforço." }
  ];

  const getZoneColor = (index: number, total: number) => {
    if (total === 7) {
      // Power zones colors
      const colors = [
        "bg-emerald-50 text-emerald-700 border-emerald-200", // Z1
        "bg-sky-50 text-sky-700 border-sky-200", // Z2
        "bg-amber-50 text-amber-700 border-amber-200", // Z3
        "bg-orange-50 text-orange-700 border-orange-200", // Z4
        "bg-rose-50 text-rose-700 border-rose-200", // Z5
        "bg-purple-50 text-purple-700 border-purple-200", // Z6
        "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" // Z7
      ];
      return colors[index] || "bg-gray-50 text-gray-700 border-gray-200";
    } else {
      // HR zones colors
      const colors = [
        "bg-emerald-50 text-emerald-700 border-emerald-200", // Z1
        "bg-sky-50 text-sky-700 border-sky-200", // Z2
        "bg-amber-50 text-amber-700 border-amber-200", // Z3
        "bg-orange-50 text-orange-700 border-orange-200", // Z4
        "bg-rose-50 text-rose-700 border-rose-200" // Z5
      ];
      return colors[index] || "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div id="zone-calculator-section" className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(15,23,42,0.03)] border border-slate-100/80 p-6 sm:p-8 animate-fadeInUp">
      <div id="zone-calc-header" className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-6">
        <div className="p-3 bg-lime-50 text-lime-605 rounded-2xl shadow-2xs">
          <Gauge className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-heading font-black text-slate-800 text-lg leading-snug">Zonas de Intensidade de Ciclismo</h3>
          <p className="text-xs text-slate-450 font-sans mt-0.5">Calculadas cientificamente para guiar o ritmo correto de cada pedalada</p>
        </div>
      </div>

      {/* Glossário Simplificado de Siglas e Termos */}
      <div className="mb-8 bg-slate-50 border border-slate-150/60 rounded-2xl p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setShowGlossary(!showGlossary)}
          className="w-full flex items-center justify-between font-heading font-bold text-slate-850 text-xs sm:text-sm cursor-pointer focus:outline-hidden"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-lime-650" />
            <span className="text-left leading-normal">Dicionário de Siglas e Termos Técnicos do Ciclismo</span>
          </div>
          <span className="text-[10px] bg-white border border-slate-200 text-slate-500 font-mono font-bold px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors shrink-0">
            {showGlossary ? "FECHAR GUIA" : "ABRIR GUIA"}
          </span>
        </button>
        
        {showGlossary && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200/60 pt-4 text-[11.5px] font-sans text-slate-600 leading-relaxed animate-fadeIn">
            <div className="space-y-3.5">
              <div>
                <strong className="text-slate-800 font-extrabold block mb-0.5 uppercase tracking-wider text-[9px] text-lime-700">FTP (Limiar de Potência Funcional):</strong>
                É a sua força base de pedalada. Significa a força máxima estimada em <strong className="text-slate-800 font-mono">Watts (W)</strong> que você aguenta manter continuamente nos pedais por 1 hora. É a base para calcular todas as zonas.
              </div>
              <div>
                <strong className="text-slate-800 font-extrabold block mb-0.5 uppercase tracking-wider text-[9px] text-lime-700">RPE / PSE (Percepção Subjetiva de Esforço):</strong>
                É o cansaço que você sente. Uma nota prática de <strong className="text-slate-800 font-mono">1 a 10</strong> sobre quão difícil o treino pareceu (1 = descansar no sofá, 10 = esforço tão extremo que quase desmaia).
              </div>
              <div>
                <strong className="text-slate-800 font-extrabold block mb-0.5 uppercase tracking-wider text-[9px] text-lime-700">bpm (Batimentos por Minuto):</strong>
                É a velocidade dos batimentos do seu coração. Indica quantas pulsações ocorrem a cada minuto durante o pedal.
              </div>
            </div>
            <div className="space-y-3.5">
              <div>
                <strong className="text-slate-800 font-extrabold block mb-0.5 uppercase tracking-wider text-[9px] text-lime-700">FCmax (Frequência Cardíaca Máxima):</strong>
                É o pico mais alto que seu coração aguenta bater de forma segura em esforço máximo. Usamos esse limite para criar suas faixas de batimentos ideias.
              </div>
              <div>
                <strong className="text-slate-800 font-extrabold block mb-0.5 uppercase tracking-wider text-[9px] text-lime-700">Zonas Fisiológicas de Esforço (Z1 a Z7):</strong>
                Faixas de esforço coordenadas. A <span className="font-bold text-emerald-600">Z1</span> regenera a musculatura, a <span className="font-bold text-sky-500">Z2</span> queima gordura e gera resistência, e a de alta intensidade (<span className="font-bold text-rose-600">Z5-Z7</span>) aumenta o fôlego pulmonar técnico.
              </div>
              <div>
                <strong className="text-slate-800 font-extrabold block mb-0.5 uppercase tracking-wider text-[9px] text-lime-700">VO2 Max (Oxigenação Máxima):</strong>
                Reflete o fôlego máximo do pulmão. Menos técnico: é o teto máximo de oxigênio que seu corpo consegue processar para manter os músculos cheios de energia nas acelerações brutas.
              </div>
            </div>
          </div>
        )}
      </div>

      <div id="zone-calc-tabs" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Potência */}
        <div id="power-zones-column" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-xl">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500/10" />
              </div>
              <h4 className="font-heading font-bold text-slate-805 text-sm">Zonas de Potência (Watts)</h4>
            </div>
            {profile.hasPowerMeter ? (
              <span className="text-xs bg-slate-100 px-3 py-1 rounded-xl font-mono font-bold text-slate-700 border border-slate-200">FTP: {ftp}W</span>
            ) : (
              <span className="text-[10px] text-slate-400 font-sans font-semibold italic flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <Sparkles className="w-3 h-3 text-amber-600" /> Watts Estimados
              </span>
            )}
          </div>

          <div id="power-zones-list" className="space-y-3">
            {powerZones.map((zone, idx) => (
              <div 
                key={zone.name} 
                id={`power-zone-${idx + 1}`}
                className={`p-4 rounded-2xl border text-xs transition-all hover:translate-x-1.5 duration-200 shadow-3xs ${getZoneColor(idx, 7)}`}
              >
                <div className="flex justify-between items-center font-black mb-1.5 font-heading">
                  <span className="text-sm">{zone.name}</span>
                  <span className="font-mono bg-white/95 px-2.5 py-1 rounded-lg shadow-3xs border border-inherit text-xs font-bold">{zone.range}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-bold text-[9px] uppercase tracking-wider mb-2 font-sans">
                  <span>Porcentagem Alvo: {zone.desc}</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-slate-650 font-sans">{zone.purpose}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Frequência Cardíaca */}
        <div id="hr-zones-column" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500/10" />
              </div>
              <h4 className="font-heading font-bold text-slate-850 text-sm">Zonas de Frequência Cardíaca</h4>
            </div>
            {profile.hasHeartRate ? (
              <span className="text-xs bg-slate-100 px-3 py-1 rounded-xl font-mono font-bold text-slate-700 border border-slate-200">FCmax: {fcMax} bpm</span>
            ) : (
              <span className="text-[10px] text-slate-400 font-sans font-semibold italic flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <Sparkles className="w-3 h-3 text-amber-600" /> BPM Estimados
              </span>
            )}
          </div>

          <div id="hr-zones-list" className="space-y-3">
            {hrZones.map((zone, idx) => (
              <div 
                key={zone.name} 
                id={`hr-zone-${idx + 1}`}
                className={`p-4 rounded-2xl border text-xs transition-all hover:translate-x-1.5 duration-200 shadow-3xs ${getZoneColor(idx, 5)}`}
              >
                <div className="flex justify-between items-center font-black mb-1.5 font-heading">
                  <span className="text-sm">{zone.name}</span>
                  <span className="font-mono bg-white/95 px-2.5 py-1 rounded-lg shadow-3xs border border-inherit text-xs font-bold">{zone.range}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-bold text-[9px] uppercase tracking-wider mb-2 font-sans">
                  <span>Porcentagem Alvo: {zone.desc}</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-slate-650 font-sans">{zone.purpose}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
