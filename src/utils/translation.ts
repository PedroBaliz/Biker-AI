/**
 * Unified translation helper to convert technical cycling jargon (Z1-Z7, FTP, Watts, threshold, etc.)
 * into friendly, sensation-based descriptions for "Modo Simples (Sensações)".
 */
export function getSimplifiedText(text: string | undefined): string {
  if (!text) return "";
  
  let result = text;
  
  // 1. Specific zone pattern replacements (longest/most specific first to avoid partial replacements)
  
  // Z1
  const z1Repl = "Muito Leve 🟢 (Passeio bem calmo para girar as pernas, sem fazer nenhuma força)";
  result = result.replace(/Z1\s*\(Recuperação\s*Ativa\)/gi, z1Repl);
  result = result.replace(/Z1\s*\(Recuperação\)/gi, z1Repl);
  result = result.replace(/Z1\s*\(Regenerativo\)/gi, z1Repl);
  result = result.replace(/\bZ1\b/g, z1Repl);
  result = result.replace(/Zona\s*1\s*\(Recuperação\s*Ativa\)/gi, z1Repl);
  result = result.replace(/Zona\s*1\s*\(Recuperação\)/gi, z1Repl);
  result = result.replace(/Zona\s*1/gi, z1Repl);
  result = result.replace(/Zona\s*Z1/gi, z1Repl);

  // Z2
  const z2Repl = "Leve 🟢 (Giro confortável onde você consegue conversar normalmente ou cantar sem perder o fôlego)";
  result = result.replace(/Z2\s*\(Endurance\)/gi, z2Repl);
  result = result.replace(/Z2\s*\(Resistência\)/gi, z2Repl);
  result = result.replace(/\bZ2\b/g, z2Repl);
  result = result.replace(/Zona\s*2\s*\(Endurance\)/gi, z2Repl);
  result = result.replace(/Zona\s*2\s*\(Resistência\)/gi, z2Repl);
  result = result.replace(/Zona\s*2/gi, z2Repl);
  result = result.replace(/Zona\s*Z2/gi, z2Repl);

  // Z3
  const z3Repl = "Moderado 🟡 (Esforço firme, o fôlego fica mais fundo e focado, mas você ainda tem total controle)";
  result = result.replace(/Z3\s*\(Tempo\/Ritmo\)/gi, z3Repl);
  result = result.replace(/Z3\s*\(Tempo\)/gi, z3Repl);
  result = result.replace(/Z3\s*\(Ritmo\)/gi, z3Repl);
  result = result.replace(/\bZ3\b/g, z3Repl);
  result = result.replace(/Zona\s*3\s*\(Tempo\/Ritmo\)/gi, z3Repl);
  result = result.replace(/Zona\s*3\s*\(Tempo\)/gi, z3Repl);
  result = result.replace(/Zona\s*3/gi, z3Repl);
  result = result.replace(/Zona\s*Z3/gi, z3Repl);

  // Z4
  const z4Repl = "Forte 🟠 (Esforço pesado e pernas ardendo de cansaço. Respiração acelerada, você só consegue falar poucas palavras seguidas)";
  result = result.replace(/Z4\s*\(Limiar\s*de\s*Lactato\)/gi, z4Repl);
  result = result.replace(/Z4\s*\(Limiar\)/gi, z4Repl);
  result = result.replace(/\bZ4\b/g, z4Repl);
  result = result.replace(/Zona\s*4\s*\(Limiar\s*de\s*Lactato\)/gi, z4Repl);
  result = result.replace(/Zona\s*4\s*\(Limiar\)/gi, z4Repl);
  result = result.replace(/Zona\s*4/gi, z4Repl);
  result = result.replace(/Zona\s*Z4/gi, z4Repl);

  // Z5
  const z5Repl = "Muito Forte 🔴 (Fôlego extremo e coração batendo muito forte. Ritmo ofegante que você aguenta por no máximo alguns minutos)";
  result = result.replace(/Z5\s*\(VO2\s*M[aá]ximo\)/gi, z5Repl);
  result = result.replace(/Z5\s*\(VO2\s*Max\)/gi, z5Repl);
  result = result.replace(/\bZ5\b/g, z5Repl);
  result = result.replace(/Zona\s*5\s*\(VO2\s*M[aá]ximo\)/gi, z5Repl);
  result = result.replace(/Zona\s*5/gi, z5Repl);
  result = result.replace(/Zona\s*Z5/gi, z5Repl);

  // Z6
  const z6Repl = "Explosivo 🔥 (Força total nas pernas para arrancadas rápidas ou subidas muito curtas de menos de 2 minutos)";
  result = result.replace(/Z6\s*\(Capacidade\s+Anaer[oó]bica\)/gi, z6Repl);
  result = result.replace(/\bZ6\b/g, z6Repl);
  result = result.replace(/Zona\s*6/gi, z6Repl);
  result = result.replace(/Zona\s*Z6/gi, z6Repl);

  // Z7
  const z7Repl = "Explosão Máxima 🔥 (Esforço de arrancada total com toda a força do seu corpo de poucos segundos)";
  result = result.replace(/Z7\s*\(Pot[eê]ncia\s+Neuromuscular\)/gi, z7Repl);
  result = result.replace(/\bZ7\b/g, z7Repl);
  result = result.replace(/Zona\s*7/gi, z7Repl);
  result = result.replace(/Zona\s*Z7/gi, z7Repl);

  // 2. Specific metrics and Cadence conversions
  result = result.replace(/(\d+)\s*RPM/gi, "$1 giros das pernas por minuto (ritmo de pedalada)");
  result = result.replace(/cadência\s+alta/gi, "giro bem rápido e leve nas pernas");
  result = result.replace(/cadência\s+baixa/gi, "giro mais pesado e lento (força)");
  result = result.replace(/cadência\s+de\s+(\d+)\s*-\s*(\d+)/gi, "pedalar girando entre $1 e $2 vezes por minuto");
  result = result.replace(/cadência/gi, "giro ou velocidade dos pedais");

  // 3. General Technical concepts to friendly sensations
  result = result.replace(/\bFTP\b/g, "seu esforço limite atual");
  result = result.replace(/\bFartlek\b/g, "brincadeira de ritmos (acelera e desacelera livremente de acordo com a vontade)");
  result = result.replace(/\bSweet\s+Spot\b/gi, "ritmo firme sustentável e eficiente");
  result = result.replace(/limiar\s+de\s+lactato/gi, "limiar de cansaço pesado");
  result = result.replace(/overtraining/gi, "excesso de treino ou cansaço acumulado");
  result = result.replace(/microciclo\s+de\s+progressão/gi, "ciclo de evolução do ritmo");
  result = result.replace(/supercompensação/gi, "ganho de força após descanso correto");
  result = result.replace(/mitocôndrias/gi, "pequenos motores que dão fôlego ao músculo");
  result = result.replace(/mitocondriais/gi, "motores de fôlego celular");
  result = result.replace(/glicogênio\s+muscular/gi, "tanque de energia guardado nos músculos");
  result = result.replace(/glicogênio/gi, "reservas de energia do corpo");
  result = result.replace(/capilarização\s+muscular/gi, "circulação de oxigênio nos músculos");
  result = result.replace(/\bwatts\b/gi, "peso/força do pedal");
  result = result.replace(/\bpotência\b/gi, "peso colocado nos pedais");
  result = result.replace(/frequência\s+cardíaca/gi, "batimento do seu coração");
  result = result.replace(/\bFC\b/g, "batimentos cardíacos");
  result = result.replace(/\bFCmax\b/g, "batimentos máximos do coração");
  result = result.replace(/\bintervalado\b/gi, "treino dividido em blocos de esforço e alívio");
  result = result.replace(/\bintervalados\b/gi, "treinos divididos em blocos de esforço e alívio");
  result = result.replace(/\bsprints\b/gi, "arrancadas rápidas");
  result = result.replace(/\bsprint\b/gi, "arrancada rápida");
  result = result.replace(/\btiros\b/gi, "estímulos fortes e rápidos");
  result = result.replace(/\btiro\b/gi, "estímulo forte e rápido");
  result = result.replace(/\baquecimento\b/gi, "aquecimento (preparação inicial do corpo)");
  result = result.replace(/\bdesaquecimento\b/gi, "volta à calma (giro leve final para relaxar)");
  result = result.replace(/\barrefecimento\b/gi, "volta à calma (giro leve final para relaxar)");
  result = result.replace(/\bVO2max\b/g, "fôlego máximo");
  result = result.replace(/\bVO2\s*max\b/gi, "fôlego máximo");
  result = result.replace(/\bVO2\b/g, "fôlego máximo");
  
  return result;
}
