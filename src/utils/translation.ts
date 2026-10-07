/**
 * Unified translation helper to convert technical cycling jargon (Z1-Z7, FTP, Watts, threshold, etc.)
 * into friendly, sensation-based descriptions for "Modo Simples (Sensações)".
 */
export function getSimplifiedText(text: string | undefined): string {
  if (!text) return "";
  
  let result = text;
  
  // 1. Zone replacements, declared as one ordered table and evaluated per zone group
  //    (Z1 fully resolved before Z2, before Z3, ... so no rule can clobber another zone).
  //    Each friendly label keeps the original numeric token as a bracketed suffix,
  //    so the athlete can still see which zone the text refers to.
  const zoneTranslations: Array<{ zone: string; replacement: string; patterns: RegExp[] }> = [
    {
      zone: "Z1",
      replacement: "Muito Leve (Passeio bem calmo para girar as pernas, sem fazer nenhuma força) [Z1]",
      patterns: [
        /Zona\s*1\s*\(Recuperação\s*Ativa\)/gi,
        /Zona\s*1\s*\(Recuperação\)/gi,
        /Zona\s*Z1/gi,
        /Zona\s*1/gi,
        /Z1\s*\(Recuperação\s*Ativa\)/gi,
        /Z1\s*\(Recuperação\)/gi,
        /Z1\s*\(Regenerativo\)/gi,
        /\bZ1\b/g
      ]
    },
    {
      zone: "Z2",
      replacement: "Leve (Giro confortável onde você consegue conversar normalmente ou cantar sem perder o fôlego) [Z2]",
      patterns: [
        /Zona\s*2\s*\(Endurance\)/gi,
        /Zona\s*2\s*\(Resistência\)/gi,
        /Zona\s*Z2/gi,
        /Zona\s*2/gi,
        /Z2\s*\(Endurance\)/gi,
        /Z2\s*\(Resistência\)/gi,
        /\bZ2\b/g
      ]
    },
    {
      zone: "Z3",
      replacement: "Moderado (Esforço firme, o fôlego fica mais fundo e focado, mas você ainda tem total controle) [Z3]",
      patterns: [
        /Zona\s*3\s*\(Tempo\/Ritmo\)/gi,
        /Zona\s*3\s*\(Tempo\)/gi,
        /Zona\s*Z3/gi,
        /Zona\s*3/gi,
        /Z3\s*\(Tempo\/Ritmo\)/gi,
        /Z3\s*\(Tempo\)/gi,
        /Z3\s*\(Ritmo\)/gi,
        /\bZ3\b/g
      ]
    },
    {
      zone: "Z4",
      replacement: "Forte (Esforço pesado e pernas ardendo de cansaço. Respiração acelerada, você só consegue falar poucas palavras seguidas) [Z4]",
      patterns: [
        /Zona\s*4\s*\(Limiar\s*de\s*Lactato\)/gi,
        /Zona\s*4\s*\(Limiar\)/gi,
        /Zona\s*Z4/gi,
        /Zona\s*4/gi,
        /Z4\s*\(Limiar\s*de\s*Lactato\)/gi,
        /Z4\s*\(Limiar\)/gi,
        /\bZ4\b/g
      ]
    },
    {
      zone: "Z5",
      replacement: "Muito Forte (Fôlego extremo e coração batendo muito forte. Ritmo ofegante que você aguenta por no máximo alguns minutos) [Z5]",
      patterns: [
        /Zona\s*5\s*\(VO2\s*M[aá]ximo\)/gi,
        /Zona\s*Z5/gi,
        /Zona\s*5/gi,
        /Z5\s*\(VO2\s*M[aá]ximo\)/gi,
        /Z5\s*\(VO2\s*Max\)/gi,
        /\bZ5\b/g
      ]
    },
    {
      zone: "Z6",
      replacement: "Explosivo (Força total nas pernas para arrancadas rápidas ou subidas muito curtas de menos de 2 minutos) [Z6]",
      patterns: [
        /Zona\s*6\s*\(Capacidade\s+Anaer[oó]bica\)/gi,
        /Zona\s*Z6/gi,
        /Zona\s*6/gi,
        /Z6\s*\(Capacidade\s+Anaer[oó]bica\)/gi,
        /\bZ6\b/g
      ]
    },
    {
      zone: "Z7",
      replacement: "Explosão Máxima (Esforço de arrancada total com toda a força do seu corpo de poucos segundos) [Z7]",
      patterns: [
        /Zona\s*7\s*\(Pot[eê]ncia\s+Neuromuscular\)/gi,
        /Zona\s*Z7/gi,
        /Zona\s*7/gi,
        /Z7\s*\(Pot[eê]ncia\s+Neuromuscular\)/gi,
        /\bZ7\b/g
      ]
    }
  ];

  for (const { replacement, patterns } of zoneTranslations) {
    for (const pattern of patterns) {
      result = result.replace(pattern, replacement);
    }
  }

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
