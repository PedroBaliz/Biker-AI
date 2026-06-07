import React from "react";
import { UserProfile, ZoneInfo } from "../types";
import { Gauge, Heart, Zap, Sparkles } from "lucide-react";

interface ZoneCalculatorProps {
  profile: UserProfile;
}

export default function ZoneCalculator({ profile }: ZoneCalculatorProps) {
  const ftp = profile.ftp || 200;
  const fcMax = profile.maxHeartRate || 180;

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
    <div id="zone-calculator-section" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div id="zone-calc-header" className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
        <Gauge className="w-5 h-5 text-lime-600" />
        <div>
          <h3 className="font-heading font-semibold text-lg text-slate-800 leading-tight">Suas Zonas de Ritmo e Esforço</h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Calculadas para ajudar você a dosear a intensidade de cada pedalada</p>
        </div>
      </div>

      <div id="zone-calc-tabs" className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Potência */}
        <div id="power-zones-column">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500/10" />
              <h4 className="font-heading font-medium text-slate-700 text-sm">Zonas de Potência por Watts</h4>
            </div>
            {profile.hasPowerMeter ? (
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono font-medium text-slate-600">FTP: {ftp}W</span>
            ) : (
              <span className="text-xs text-slate-400 font-sans italic flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Estimado (Padrão 200W)
              </span>
            )}
          </div>

          <div id="power-zones-list" className="space-y-3">
            {powerZones.map((zone, idx) => (
              <div 
                key={zone.name} 
                id={`power-zone-${idx + 1}`}
                className={`p-3 rounded-xl border text-xs transition-all hover:translate-x-1 duration-200 shadow-sm ${getZoneColor(idx, 7)}`}
              >
                <div className="flex justify-between items-center font-semibold mb-1">
                  <span>{zone.name}</span>
                  <span className="font-mono bg-white/80 px-2 py-0.5 rounded shadow-xs border border-inherit">{zone.range}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium text-[10px] mb-1">
                  <span>Porcentagem: {zone.desc}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 font-sans">{zone.purpose}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Frequência Cardíaca */}
        <div id="hr-zones-column">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500/10" />
              <h4 className="font-heading font-medium text-slate-700 text-sm">Zonas de Frequência Cardíaca</h4>
            </div>
            {profile.hasHeartRate ? (
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono font-medium text-slate-600">FCmax: {fcMax} bpm</span>
            ) : (
              <span className="text-xs text-slate-400 font-sans italic flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Estimado (Padrão 180 bpm)
              </span>
            )}
          </div>

          <div id="hr-zones-list" className="space-y-3">
            {hrZones.map((zone, idx) => (
              <div 
                key={zone.name} 
                id={`hr-zone-${idx + 1}`}
                className={`p-3 rounded-xl border text-xs transition-all hover:translate-x-1 duration-200 shadow-sm ${getZoneColor(idx, 5)}`}
              >
                <div className="flex justify-between items-center font-semibold mb-1">
                  <span>{zone.name}</span>
                  <span className="font-mono bg-white/80 px-2 py-0.5 rounded shadow-xs border border-inherit">{zone.range}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium text-[10px] mb-1">
                  <span>Porcentagem: {zone.desc}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 font-sans">{zone.purpose}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
