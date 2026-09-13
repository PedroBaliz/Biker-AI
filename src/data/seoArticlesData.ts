export interface SeoArticleSection {
  id: string;
  title: string;
  content: string[];
  keyHighlight?: string;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoWorkoutStep {
  phase: string;
  duration: string;
  intensity: string;
  description: string;
  cadence?: string;
}

export interface SeoArticle {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  subheadline: string;
  category: "Iniciantes" | "Periodização" | "Fisiologia & Treino" | "Resistência & Desafios" | "Saúde & Performance";
  readingTime: string;
  publishedDate: string;
  updatedDate: string;
  keywords: string[];
  summaryKeyTakeaways: string[];
  sections: SeoArticleSection[];
  workoutExample: {
    title: string;
    description: string;
    totalTime: string;
    targetZone: string;
    steps: SeoWorkoutStep[];
    coachAdvice: string;
  };
  faq: SeoFaqItem[];
  ctaGoal: string;
  ctaButtonText: string;
  relatedSlugs: string[];
}

export const SEO_ARTICLES: Record<string, SeoArticle> = {
  "treino-ciclismo-iniciante": {
    slug: "treino-ciclismo-iniciante",
    title: "Treino de Ciclismo para Iniciantes: Guia do Zero ao Pedal Seguro | Biker AI",
    metaDescription: "Comece no ciclismo com o pé direito. Aprenda frequência ideal, cadência, controle de esforço e um plano prático para pedalar mais longe com o Biker AI.",
    h1: "Treino de Ciclismo para Iniciantes: Guia Completo do Zero ao Pedal Seguro",
    subheadline: "Descubra como estruturar seus primeiros treinos de bicicleta, evitar dores musculares, ajustar o ritmo certo e evoluir com consistência sem quebrar.",
    category: "Iniciantes",
    readingTime: "7 min de leitura",
    publishedDate: "2026-08-10",
    updatedDate: "2026-09-12",
    keywords: ["treino de ciclismo para iniciantes", "como começar no ciclismo", "planilha ciclismo iniciante", "cadência no pedal", "dor nas pernas bicicleta", "iniciante mountain bike", "iniciante speed"],
    summaryKeyTakeaways: [
      "Frequência inicial recomendada: 2 a 3 treinos por semana de 40 a 60 minutos em terreno plano.",
      "Cadência é prioridade: mantenha entre 80 e 90 RPM com marchas mais leves para poupar articulações do joelho.",
      "Esforço aeróbico conversacional: consiga falar frases curtas sem ficar sem ar nos primeiros meses.",
      "Bike fit básico: a perna nunca deve ficar totalmente esticada nem muito flexionada no ponto morto inferior do pedal.",
      "A inteligência artificial do Biker AI adapta a carga semana a semana conforme o seu corpo se acostuma ao estímulo."
    ],
    sections: [
      {
        id: "principios-basicos",
        title: "1. Os 3 Pilares Fundamentais do Ciclista Iniciante",
        content: [
          "O maior erro de quem começa a pedalar é tentar compensar a empolgação pedalando todos os dias com força máxima. No ciclismo, o coração e o sistema cardiovascular evoluem mais rápido que os tendões, a cartilagem dos joelhos e a musculatura lombar.",
          "Para garantir longevidade e evitar lesões por sobrecarga precoce, sua evolução precisa seguir três pilares fundamentais:",
          "• Consistência sobre Intensidade: Três treinos moderados de 45 minutos valem muito mais do que um único pedal de 3 horas no domingo que te deixa exausto durante 5 dias.",
          "• Giro sobre Força: Use marchas mais leves ('coroas menores na frente e catracas maiores atrás'). Rodar com cadência ágil ativa seu sistema cardiovascular e protege os ligamentos dos joelhos.",
          "• Recuperação Ativa: Os músculos ficam mais fortes durante o descanso, quando o organismo sintetiza novas fibras e enzimas mitocondriais."
        ],
        keyHighlight: "💡 Regra de Ouro do Biker AI: Termine os seus primeiros 15 treinos com a sensação de que conseguiria pedalar mais 15 minutos. Essa margem garante adaptação positiva sem fadiga crônica."
      },
      {
        id: "escala-esforco",
        title: "2. Como Medir Seu Esforço Sem Equipamentos Caros",
        content: [
          "Você não precisa de medidores de potência em watts ou monitores cardíacos topo de linha para começar com qualidade. A Escala de Percepção Subjetiva de Esforço (PSE / Escala de Borg Adaptada de 1 a 10) é validada cientificamente e altamente eficaz."
        ],
        tableData: {
          headers: ["Nível PSE (1-10)", "Sensação / Respiração", "Zona Equivalente", "Uso no Treino"],
          rows: [
            ["1 - 2", "Respiração normal, ritmo de passeio suave", "Z1 - Recuperação", "Aquecimento e desaquecimento"],
            ["3 - 4", "Respiração ritmada, consegue falar em frases completas", "Z2 - Resistência Base", "70% do seu volume semanal"],
            ["5 - 6", "Respiração profunda, fala em frases curtas ('sim', 'tudo bem')", "Z3 - Tempo", "Treinos de ritmo e subidas moderadas"],
            ["7 - 8", "Respiração pesada, falar se torna desconfortável", "Z4 - Limiar", "Tiros curtos (apenas após 4 semanas)"],
            ["9 - 10", "Ofegante, esforço máximo suportável por poucos segundos", "Z5 / Z6 - VO2 Máx", "Não recomendado para iniciantes"]
          ]
        }
      },
      {
        id: "rotina-semanal",
        title: "3. Estrutura Semanal Ideal para o Primeiro Mês",
        content: [
          "Para quem tem rotina de trabalho e família, a melhor divisão semanal é distribuir o tempo entre dias úteis e o fim de semana:",
          "• Terça-feira (40 min): Giro leve com ênfase em cadência constante (85 RPM) em percurso plano.",
          "• Quinta-feira (45 min): Rodagem contínua em Zona 2 com 3 a 4 acelerações curtas de 30 segundos para acordar as pernas.",
          "• Sábado ou Domingo (60 min): O 'longão' do iniciante, explorando novas ruas, parques ou estradas de terra leves, sempre hidratando a cada 15 minutos."
        ]
      },
      {
        id: "alimentacao-hidratacao",
        title: "4. Hidratação e Alimentação que Fazem a Diferença",
        content: [
          "Para treinos de até 1 hora, água fresca é suficiente. O segredo é não esperar sentir sede: dê um gole generoso a cada 12 a 15 minutos.",
          "Se o pedal passar de 75 minutos, leve uma caramanhola com isotônico ou água de coco e uma fonte prática de carboidrato (uma banana ou bisnaguinha com mel). Isso evita a temida 'hipoglicemia' ou 'martelada', quando o atleta perde subitamente a força motora."
        ]
      }
    ],
    workoutExample: {
      title: "Treino Prático: Rodagem Adaptativa de Iniciação",
      description: "Sessão de 45 minutos desenhada para construir eficiência mecânica e resistência sem acumular fadiga dolorosa.",
      totalTime: "45 minutos",
      targetZone: "Zona 1 e Zona 2 (PSE 3-4)",
      steps: [
        {
          phase: "Aquecimento",
          duration: "10 minutos",
          intensity: "PSE 2 a 3 (Z1)",
          description: "Giro bem solto em marcha leve, buscando manter cadência entre 80 e 85 RPM em asfalto plano.",
          cadence: "80-85 RPM"
        },
        {
          phase: "Bloco Principal",
          duration: "25 minutos",
          intensity: "PSE 3 a 4 (Z2)",
          description: "Rodagem estável. A cada 5 minutos, mude 1 dente na catraca para manter o fôlego controlado e o pedal redondo.",
          cadence: "85-90 RPM"
        },
        {
          phase: "Desaquecimento",
          duration: "10 minutos",
          intensity: "PSE 1 a 2 (Z1)",
          description: "Reduza o ritmo gradualmente. Deixe os músculos relaxarem e baixe a frequência cardíaca antes de descer da bicicleta.",
          cadence: "75-80 RPM"
        }
      ],
      coachAdvice: "Se sentir dor na ponta do joelho ao final, suba o canote do selim em 3 milímetros. Se sentir dor na parte de trás do joelho, abaixe 3 milímetros."
    },
    faq: [
      {
        question: "Quantas vezes por semana um iniciante deve pedalar?",
        answer: "O ideal são 2 a 3 vezes por semana em dias alternados (ex: terça, quinta e sábado). Isso dá 48 horas de recuperação para que o tecido muscular se repare e evolua."
      },
      {
        question: "Qual deve ser a velocidade média de um ciclista iniciante?",
        answer: "Esqueça a velocidade média nos primeiros meses! O vento, a altimetria e o trânsito distorcem essa métrica. Foque no tempo total em movimento (ex: 45 min) e na cadência de pedalada (80 a 90 RPM)."
      },
      {
        question: "Como o Biker AI ajuda quem está começando do zero?",
        answer: "O Biker AI calcula exatamente a carga segura com base nas suas respostas do onboarding e ajusta os treinos automaticamente caso você perca um dia por conta de compromissos ou chuva."
      }
    ],
    ctaGoal: "Iniciante",
    ctaButtonText: "Criar Minha Primeira Planilha de Ciclismo",
    relatedSlugs: ["planilha-treino-ciclismo", "zona-2-ciclismo", "treino-ciclismo-emagrecer"]
  },

  "planilha-treino-ciclismo": {
    slug: "planilha-treino-ciclismo",
    title: "Planilha de Treino de Ciclismo: Como Estruturar Sua Periodização | Biker AI",
    metaDescription: "Aprenda a estruturar uma planilha de treino de ciclismo eficiente. Conheça periodização, blocos de treino e distribuição de carga com o Biker AI.",
    h1: "Planilha de Treino de Ciclismo: Estrutura, Periodização e Resultados Reais",
    subheadline: "Pare de pedalar sem rumo. Entenda como uma planilha bem calculada transforma horas gastas na estrada em velocidade, potência e resistência duradoura.",
    category: "Periodização",
    readingTime: "8 min de leitura",
    publishedDate: "2026-08-15",
    updatedDate: "2026-09-12",
    keywords: ["planilha de treino ciclismo", "periodização ciclismo", "treino periodizado bike", "planilha mtb", "planilha speed", "modelo polarizado ciclismo", "sweet spot ciclismo"],
    summaryKeyTakeaways: [
      "Pedalar forte em todos os treinos leva à estagnação: o princípio polarizado (80% leve / 20% intenso) gera mais potência e menor risco de estafa.",
      "Uma boa planilha divide o ano em 4 fases: Base Aeróbica, Construção de Força, Pico Específico e Polimento (Tapering).",
      "Cada sessão precisa de um objetivo metabólico claro: aquecimento, parte principal com estímulos controlados e volta à calma.",
      "Planilhas estáticas em PDF/Excel falham quando imprevistos acontecem: a planilha adaptativa recalibra os dias restantes sem perder o ciclo.",
      "O Biker AI programa os picos de treino com antecedência para sua data de prova ou desafio pessoal."
    ],
    sections: [
      {
        id: "por-que-ter-planilha",
        title: "1. Por que Planilhas Aleatórias de Internet Não Funcionam?",
        content: [
          "Muitos ciclistas baixam tabelas genéricas na internet ou copiam os treinos de atletas profissionais no Strava. Esse é o caminho mais curto para a estagnação física ou lesões por overtraining.",
          "O organismo responde a doses individuais de estresse metabólico. Uma planilha precisa levar em conta a sua capacidade de recuperação atual, horas disponíveis de sono, idade, histórico de treinos e objetivo específico (seja subir uma serra de MTB ou fazer 100 km de estrada).",
          "Sem uma periodização pensada, o atleta passa tempo demais na 'Zona Cinzenta' (forte demais para recuperar, fraco demais para estimular adaptação máxima)."
        ],
        keyHighlight: "🎯 O segredo dos melhores atletas: os treinos fáceis devem ser verdadeiramente fáceis para que os treinos difíceis possam ser executados no limite exato exigido."
      },
      {
        id: "fases-periodizacao",
        title: "2. As 4 Fases de uma Periodização Eficiente no Ciclismo",
        content: [
          "O método consagrado de periodização no ciclismo moderno divide a evolução em ciclos bem definidos:",
          "• Fase de Base (4 a 8 semanas): Construção da malha capilar, expansão do volume plasmático e eficiência no uso de gorduras como combustível em Zona 2.",
          "• Fase de Construção / Build (4 a 6 semanas): Introdução sistemática de intervalos em Sweet Spot (88-93% do FTP) e Limiar de Lactato (Zona 4) para elevar o teto de potência sustentada.",
          "• Fase de Especialidade / Pico (3 a 4 semanas): Treinos específicos para a prova ou meta (subidas curtas e explosivas, ritmo de pelotão, descidas técnicas).",
          "• Fase de Polimento / Taper (1 a 2 semanas): Redução de 40-50% no volume mantendo a intensidade alta para eliminar a fadiga e chegar descansado com potência máxima."
        ],
        tableData: {
          headers: ["Fase do Ciclo", "Foco Principal", "Distribuição Típica", "Sessão Chave"],
          rows: [
            ["Base Aeróbica", "Eficiência Cardíaca e Z2", "85% Z2 / 15% Z3", "Longão progressivo de fim de semana"],
            ["Construção", "Aumento do FTP e Força", "75% Z2 / 25% Z4-Z5", "Intervalos 4x8 min no Limiar de Lactato"],
            ["Pico / Competição", "Especificidade de Prova", "70% Z2 / 30% Potência", "Simulado de ritmo e acelerações"],
            ["Polimento (Taper)", "Eliminação de Fadiga", "Volume Baixo / Tiros Rápidos", "Aquecimento + 3 tiros de 1 min soltos"]
          ]
        }
      },
      {
        id: "recalibracao-dinamica",
        title: "3. A Importância da Recalibração Diante dos Imprevistos",
        content: [
          "A vida real não segue uma folha de papel rígida. Se chover torrencialmente na quarta-feira ou se uma reunião de trabalho impedir seu pedal de 90 minutos, o que fazer? Tentar fazer os dois treinos na quinta-feira é receita para estresse muscular excessivo.",
          "O Biker AI soluciona esse problema através de inteligência adaptativa: quando você altera sua disponibilidade ou relata cansaço acumulado no questionário pós-treino, a IA recalibra as cargas dos dias seguintes para manter o objetivo semanal seguro."
        ]
      }
    ],
    workoutExample: {
      title: "Treino Modelo: Sweet Spot para Elevação do Limiar (FTP)",
      description: "Uma das sessões mais eficientes da ciência esportiva para ganhar velocidade sem o desgaste extenuante do esforço máximo.",
      totalTime: "60 minutos",
      targetZone: "Sweet Spot (88-93% do FTP / PSE 7)",
      steps: [
        {
          phase: "Aquecimento Progressivo",
          duration: "15 minutos",
          intensity: "Z1 evoluindo até Z3",
          description: "10 min em Z1-Z2 solto, seguido de 3 acelerações de 1 min em cadência alta (95 RPM) para irrigar a musculatura.",
          cadence: "85-95 RPM"
        },
        {
          phase: "Bloco 1 Sweet Spot",
          duration: "10 minutos",
          intensity: "90% FTP (PSE 7)",
          description: "Ritmo forte e contínuo. Foco na respiração rítmica. Você sente as pernas pesadas mas mantém o controle.",
          cadence: "85-90 RPM"
        },
        {
          phase: "Recuperação Ativa",
          duration: "5 minutos",
          intensity: "Z1 leve (PSE 2)",
          description: "Giro super leve em marcha solta para lavar lactato acumulado nas pernas.",
          cadence: "85 RPM"
        },
        {
          phase: "Bloco 2 Sweet Spot",
          duration: "10 minutos",
          intensity: "90% FTP (PSE 7)",
          description: "Segundo bloco repetindo a mesma cadência e concentração postural no guidão.",
          cadence: "85-90 RPM"
        },
        {
          phase: "Desaquecimento",
          duration: "10 minutos",
          intensity: "Z1 regenerativo",
          description: "Volta à calma completa com respiração pelo nariz para retorno cardiovascular estável.",
          cadence: "75-80 RPM"
        }
      ],
      coachAdvice: "Mantenha a parte superior do corpo relaxada, sem tensionar os ombros ou o pescoço durante o bloco Sweet Spot."
    },
    faq: [
      {
        question: "Quantas semanas dura uma planilha completa de ciclismo?",
        answer: "A maioria dos blocos eficientes é organizada em ciclos de 4 semanas (3 semanas de progressão de carga + 1 semana de regeneração ativa/deload), somando planos completos de 8 a 16 semanas para um objetivo."
      },
      {
        question: "Preciso ter potenciômetro para treinar por planilha?",
        answer: "Não! Potência (Watts) é excelente pela precisão instantânea, mas planilhas baseadas em Frequência Cardíaca (Zonas de FC) ou Percepção Subjetiva de Esforço (PSE) trazem resultados comprovados."
      },
      {
        question: "Como o Biker AI gera a planilha personalizada?",
        answer: "Você informa seus dias disponíveis, objetivo (subidas, emagrecimento, 100km, etc.), nível atual e métricas. A inteligência do Biker AI estrutura minuto a minuto seus treinos semanais."
      }
    ],
    ctaGoal: "Resistência",
    ctaButtonText: "Gerar Minha Planilha Estruturada com IA",
    relatedSlugs: ["treino-ciclismo-iniciante", "zona-2-ciclismo", "treino-100km"]
  },

  "treino-ciclismo-emagrecer": {
    slug: "treino-ciclismo-emagrecer",
    title: "Treino de Ciclismo para Emagrecer: Zonas e Queima de Gordura | Biker AI",
    metaDescription: "Entenda como o ciclismo queima gordura de forma sustentável. Conheça as zonas corretas de oxidação lipídica e planos de treino com o Biker AI.",
    h1: "Treino de Ciclismo para Emagrecer: Ciência, Zonas de Gordura e Frequência",
    subheadline: "Pedalar com força até a exaustão não é o caminho mais rápido para queimar gordura. Descubra como a fisiologia do ciclismo otimiza a recomposição corporal.",
    category: "Saúde & Performance",
    readingTime: "7 min de leitura",
    publishedDate: "2026-08-20",
    updatedDate: "2026-09-12",
    keywords: ["treino ciclismo para emagrecer", "ciclismo queima de gordura", "zona queima de gordura bike", "perder peso pedalando", "quantas calorias queima no pedal", "emagrecimento com bicicleta"],
    summaryKeyTakeaways: [
      "A intensidade moderada (Zona 2) recruta a maior porcentagem de ácidos graxos como substrato energético celular (ponto FatMax).",
      "Pedalar sempre em intensidade muito alta consome quase exclusivamente glicogênio muscular, gerando fome descontrolada no pós-treino.",
      "Uma combinação eficiente une 2 a 3 sessões aeróbicas longas com 1 sessão intervalada de alta intensidade (HIIT) semanal para acelerar o metabolismo basal (EPOC).",
      "Não faça jejum extremo em treinos intensos: consumir água e pequenas doses de eletrólitos mantém a taxa metabólica ativa e previne quedas glicêmicas.",
      "A regularidade semanal é 5x mais determinante para a perda de gordura do que a velocidade média de uma pedalada isolada."
    ],
    sections: [
      {
        id: "fisiologia-queima",
        title: "1. Como o Corpo Escolhe Combustível Durante o Pedal",
        content: [
          "O corpo humano utiliza duas fontes energéticas principais no ciclismo: gorduras (lipídios) e açúcares (glicogênio muscular e hepático).",
          "Em ritmos suaves a moderados (Zona 2, entre 60% e 70% da sua frequência cardíaca máxima), suas células musculares têm oxigênio abundante. Nessa condição, as mitocôndrias trabalham em capacidade máxima quebrando gorduras corporais para gerar energia.",
          "À medida que você aperta o passo e começa a ofegar (Zonas 4 e 5), o oxigênio celular se torna insuficiente para quebrar lipídios em tempo real. O corpo é obrigado a queimar reservas de açúcar rápido. O resultado? Você queima menos gordura em proporção e termina o treino com uma fome incontrolável por carboidratos refinados."
        ],
        keyHighlight: "💡 Fato Metabólico: O ponto conhecido como 'FatMax' ocorre na Zona 2. É o ritmo em que você queima a maior quantidade de gramas de gordura pura por minuto de pedal."
      },
      {
        id: "estrategia-semanal",
        title: "2. A Combinação Perfeita: Rodagem de Queima + 1 Sessão HIIT",
        content: [
          "Para maximizar a queima calórica sem comprometer sua massa muscular magra, a melhor estratégia comprovada pela medicina esportiva consiste em:",
          "• 2 sessões semanais em Zona 2 (50 a 80 minutos cada): Para manter a oxidação lipídica alta e ensinar seu corpo a usar gordura como combustível cotidiano.",
          "• 1 sessão semanal de HIIT ou Tiros Curtos (30 a 40 minutos): Séries curtas de 30 segundos no limite com 90 segundos de descanso. Esse estímulo gera o efeito EPOC (Excesso de Consumo de Oxigênio Pós-Exercício), mantendo o metabolismo queimando calorias por até 24 horas após guardar a bicicleta.",
          "• 1 longão recreativo no final de semana (90 a 120 minutos) em ritmo agradável."
        ]
      },
      {
        id: "erros-alimentares",
        title: "3. Os 3 Erros Fatais de Quem Tenta Emagrecer Pedalando",
        content: [
          "Erro 1: Não comer nada antes de treinos longos. Isso faz o corpo entrar em estado de estresse catabólico, quebrando massa muscular em vez de queimar gordura.",
          "Erro 2: Recompensar o treino com excessos. Pedalar 1 hora gasta entre 400 e 650 kcal. Se você tomar um açaí calórico de 800 kcal logo após, o balanço energético diário volta a ser positivo.",
          "Erro 3: Não beber água suficiente. A hidratação deficiente reduz em até 15% o rendimento muscular e retém líquidos no organismo."
        ]
      }
    ],
    workoutExample: {
      title: "Treino Prático: Queima Otimizada FatMax + Acelerações",
      description: "Sessão de 50 minutos combinando oxidação lipídica profunda em Zona 2 com pequenos picos metabólicos controlados.",
      totalTime: "50 minutos",
      targetZone: "Zona 2 (65% FC Máx / PSE 4)",
      steps: [
        {
          phase: "Aquecimento Gradual",
          duration: "10 minutos",
          intensity: "Z1 evoluindo a Z2",
          description: "Pedale em terreno plano com marcha macia até atingir a respiração ritmada de cruzeiro.",
          cadence: "85 RPM"
        },
        {
          phase: "Bloco Contínuo FatMax",
          duration: "25 minutos",
          intensity: "Zona 2 Estável",
          description: "Mantenha o esforço constante onde você ainda consegue conversar. Não acelere nas subidas curtas; troque marcha para não sair da zona.",
          cadence: "85-90 RPM"
        },
        {
          phase: "Picos de Ativação Metabólica",
          duration: "5 minutos",
          intensity: "5x (30s Forte / 30s Leve)",
          description: "Cinco acelerações de 30 segundos em marcha mais pesada, voltando imediatamente para marcha leve por 30 segundos.",
          cadence: "95 RPM nos tiros"
        },
        {
          phase: "Volta à Calma",
          duration: "10 minutos",
          intensity: "Z1 Regenerativo",
          description: "Giro super suave para soltar as pernas e restabelecer a frequência cardíaca de repouso.",
          cadence: "75-80 RPM"
        }
      ],
      coachAdvice: "Após esse treino, priorize uma refeição balanceada com proteínas magras (ovos, peito de frango) e vegetais para reparar fibras musculares."
    },
    faq: [
      {
        question: "Quantos quilos é possível perder pedalando por semana?",
        answer: "Uma perda de peso saudável e sustentável gira em torno de 0,5 kg a 1 kg por semana. Perdas mais rápidas geralmente representam perda de água e de massa muscular magra, o que diminui o metabolismo."
      },
      {
        question: "Pedalar ajuda a perder barriga?",
        answer: "A queima de gordura é sistêmica: o corpo queima reservas do corpo todo à medida que o balanço calórico geral fica negativo. Como o ciclismo recruta os maiores grupos musculares do corpo (glúteos, quadríceps e posteriores), a queima calórica total é muito alta."
      },
      {
        question: "O Biker AI calcula calorias e intensidades para emagrecer?",
        answer: "Sim! Ao selecionar 'Emagrecimento & Condicionamento' no onboarding, o Biker AI estrutura zonas aeróbicas precisas para queimar gordura com segurança sem gerar exaustão."
      }
    ],
    ctaGoal: "Emagrecimento",
    ctaButtonText: "Montar Meu Treino para Queimar Gordura",
    relatedSlugs: ["zona-2-ciclismo", "treino-ciclismo-iniciante", "planilha-treino-ciclismo"]
  },

  "treino-100km": {
    slug: "treino-100km",
    title: "Como Treinar para Fazer 100 km de Bike: Preparação e Ritmo | Biker AI",
    metaDescription: "Guia completo para atingir a marca dos 100 km de ciclismo (Gran Fondo). Progressão de volume, estratégia de ritmo, hidratação e nutrição com o Biker AI.",
    h1: "Como Treinar para Fazer 100 km de Bike: Preparação, Ritmo e Nutrição",
    subheadline: "O primeiro 'século' (100 km) é o marco de passagem de todo ciclista. Saiba como treinar o corpo e a mente para vencer a distância sem sofrimento.",
    category: "Resistência & Desafios",
    readingTime: "9 min de leitura",
    publishedDate: "2026-08-25",
    updatedDate: "2026-09-12",
    keywords: ["como treinar para fazer 100km de bike", "primeiro 100km ciclismo", "treino gran fondo", "nutrição para 100km bike", "quantas horas para pedalar 100km", "planilha 100km bike"],
    summaryKeyTakeaways: [
      "Não tente pular de 40 km para 100 km de uma vez: adote a progressão semanal de 10% a 15% no longão de fim de semana.",
      "Ritmo (Pacing) é tudo: pedalar forte nos primeiros 30 km garante que você vá quebrar feio no quilômetro 70.",
      "Nutrição horária obrigatória: consuma entre 30g e 60g de carboidratos a cada hora de pedal e beba de 500ml a 750ml de água com eletrólitos.",
      "O conforto na bicicleta é testado ao limite após 3 horas: selim, bermuda de ciclismo com forro de alta densidade e posição do guidão precisam estar alinhados.",
      "O Biker AI programa os picos de volume e as semanas de descanso (deload) para você chegar no dia dos 100 km no ponto ideal."
    ],
    sections: [
      {
        id: "progressao-volume",
        title: "1. A Regra de Ouro da Progressão de Quilometragem",
        content: [
          "Para completar 100 km com segurança, você não precisa pedalar 100 km antes do dia do desafio. O segredo está na capacidade de sustentação aeróbica cumulativa.",
          "Se você já pedala 45 km ou 50 km com tranquilidade, um plano de 6 a 8 semanas com aumento progressivo no longão do fim de semana é o caminho seguro:",
          "• Semana 1: Longão de 50 km",
          "• Semana 2: Longão de 60 km",
          "• Semana 3: Longão de 70 km",
          "• Semana 4 (Regeneração): Longão leve de 45 km para absorver os ganhos",
          "• Semana 5: Longão de 80 km",
          "• Semana 6: Longão de 88 km",
          "• Semana 7 (Polimento): Longão suave de 50 km",
          "• Semana 8: O Grande Dia dos 100 km!"
        ],
        keyHighlight: "💡 Segredo de Resistência: Se você consegue pedalar 80 km em ritmo de conversa e terminar bem alimentado, você tem capacidade fisiológica de sobra para completar 100 km."
      },
      {
        id: "estrategia-nutricao",
        title: "2. Estratégia de Combustível: Como Não Quebrar no Km 70",
        content: [
          "A famosa 'quebra' (ou bonk) que atinge os ciclistas entre o km 65 e 75 não é falta de perna: é esgotamento total do glicogênio corporal somado à desidratação celular.",
          "Para 100 km (geralmente entre 3h30 e 5h de pedal dependendo da altimetria), você deve seguir um plano de nutrição disciplinado desde o primeiro quilômetro:"
        ],
        tableData: {
          headers: ["Momento", "O que Consumir", "Quantidade", "Objetivo"],
          rows: [
            ["A cada 15-20 min", "Água fresca ou isotônico", "2 a 3 goles generosos (150-200ml)", "Prevenir desidratação e perda de sais"],
            ["A cada 45-50 min", "Gel de carboidrato, bananinha ou barra", "25 a 35g de carboidrato", "Manter glicose sanguínea estável"],
            ["Km 50 (Metade)", "Comida sólida (sanduíche de pão de forma com geleia ou batata cozida)", "1 porção leve de fácil mastigação", "Saciedade gástrica e conforto mental"],
            ["Pós-Pedal (até 45 min)", "Refeição rica em proteínas e carboidratos", "Prato completo balanceado", "Reparação das fibras e glicogênio"]
          ]
        }
      },
      {
        id: "conforto-bike",
        title: "3. Ergonomia e Equipamento Essencial",
        content: [
          "Após 3 horas montado no selim, pequenos incômodos viram dores insuportáveis se a bicicleta não estiver ajustada:",
          "• Bermuda com forro de densidade 80 ou superior: nunca use roupa íntima por baixo da bermuda de ciclismo para evitar atrito e assaduras.",
          "• Creme antiatrito: passe nas áreas de contato entre a pele e o forro.",
          "• Pressão dos pneus: pneus muito duros transmitem todas as irregularidades do asfalto para a coluna e braços. Ajuste a pressão adequada ao seu peso.",
          "• Kit de reparo: leve 2 câmaras reservas, espátulas, bomba de mão ou cartucho de CO2 e canivete multiuso."
        ]
      }
    ],
    workoutExample: {
      title: "Treino Modelo: Simulação de Ritmo Sustentado e Pacing",
      description: "Treino de meio de semana (75 minutos) para treinar economia de movimento e cadência estável antes do longão.",
      totalTime: "75 minutos",
      targetZone: "Zona 2 Alta e Zona 3 Baixa (Tempo Controlado)",
      steps: [
        {
          phase: "Aquecimento",
          duration: "15 minutos",
          intensity: "Zona 1 para Zona 2",
          description: "Suba a frequência cardíaca com calma, relaxando mãos e ombros.",
          cadence: "85 RPM"
        },
        {
          phase: "Bloco de Ritmo Gran Fondo 1",
          duration: "20 minutos",
          intensity: "Zona 2 Alta (70% FC Máx)",
          description: "Mantenha velocidade constante. Pratique beber água sem desviar a trajetória.",
          cadence: "88-92 RPM"
        },
        {
          phase: "Descanso Ativo",
          duration: "5 minutos",
          intensity: "Zona 1 Solto",
          description: "Alimente-se com uma fruta ou gel e rode com pernas soltas.",
          cadence: "80 RPM"
        },
        {
          phase: "Bloco de Ritmo Gran Fondo 2",
          duration: "20 minutos",
          intensity: "Zona 2 Alta / Z3 Baixa",
          description: "Mesmo ritmo sólido, simulando a segunda metade do percurso.",
          cadence: "88-92 RPM"
        },
        {
          phase: "Desaquecimento",
          duration: "15 minutos",
          intensity: "Zona 1 Regenerativo",
          description: "Finalização suave para descompressão da coluna e alívio da musculatura.",
          cadence: "75-80 RPM"
        }
      ],
      coachAdvice: "Durante o pedal dos 100 km, quando avistar uma subida, engate marchas leves antes da inclinação começar para manter a cadência alta e não queimar as pernas prematuramente."
    },
    faq: [
      {
        question: "Quanto tempo demora para fazer 100 km de bike?",
        answer: "A maioria dos ciclistas amadores completa 100 km no asfalto entre 3h30 e 5h (média de 20 a 28 km/h). No Mountain Bike (estrada de terra com subidas), o tempo pode variar de 4h30 a 6h30."
      },
      {
        question: "Qualquer pessoa consegue completar 100 km?",
        answer: "Sim, com treinamento progressivo, bike ajustada e alimentação adequada. Não é uma questão de velocidade máxima, mas de economia de energia e gestão de ritmo."
      },
      {
        question: "O Biker AI planeja os treinos até a data do meu desafio de 100 km?",
        answer: "Sim! Ao criar sua conta, você pode definir sua meta para 100 km e informar a data desejada. O Biker AI calcula toda a curva semanal de volume até o dia da conquista."
      }
    ],
    ctaGoal: "Resistência",
    ctaButtonText: "Preparar Meu Plano para os 100 km",
    relatedSlugs: ["planilha-treino-ciclismo", "zona-2-ciclismo", "treino-ciclismo-iniciante"]
  },

  "zona-2-ciclismo": {
    slug: "zona-2-ciclismo",
    title: "Zona 2 no Ciclismo: Guia de Potência, FC e Mitocôndrias | Biker AI",
    metaDescription: "Descubra por que os melhores ciclistas do mundo treinam 80% do tempo em Zona 2. Calcule sua faixa ideal de watts e batimentos com o Biker AI.",
    h1: "Zona 2 no Ciclismo: O Guia Definitivo de Potência, FC e Fisiologia",
    subheadline: "Entenda a ciência por trás da zona de treinamento que constrói a verdadeira base aeróbica, multiplica suas mitocôndrias e te faz pedalar mais rápido gastando menos energia.",
    category: "Fisiologia & Treino",
    readingTime: "8 min de leitura",
    publishedDate: "2026-08-28",
    updatedDate: "2026-09-12",
    keywords: ["zona 2 ciclismo", "o que é zona 2 no pedal", "como calcular zona 2 ciclismo", "treino polarizado ciclismo", "biogênese mitocondrial bike", "watts zona 2", "frequencia cardiaca zona 2"],
    summaryKeyTakeaways: [
      "Zona 2 corresponde a 55% a 75% do seu FTP (Potência) ou 60% a 70% da sua Frequência Cardíaca Máxima.",
      "É a zona de maior estímulo à biogênese mitocondrial: suas células produzem mais 'usinas de energia' capazes de queimar gorduras e limpar lactato.",
      "Teste da fala (Talk Test): na Zona 2 você consegue falar frases completas, mas seu interlocutor percebe pelo fôlego que você está se exercitando.",
      "O perigo da 'Zona Cinzenta': acelerar sem perceber para a Zona 3 gera fadiga do sistema nervoso autônomo sem trazer os benefícios celulares puros da Zona 2.",
      "Ciclistas do WorldTour (Tour de France) realizam até 80% do seu volume anual em Zona 2 para sustentar watts inacreditáveis nos momentos decisivos."
    ],
    sections: [
      {
        id: "o-que-e-zona-2",
        title: "1. O que é Exatamente a Zona 2?",
        content: [
          "Na metodologia clássica de 7 Zonas de Andrew Coggan e Hunter Allen, a Zona 2 é classificada como 'Resistência Aeróbica' (Endurance).",
          "Nessa intensidade, o recrutamento muscular ocorre quase exclusivamente através das Fibras Musculares de Contração Lenta (Tipo I). Essas fibras possuem altíssima densidade de mitocôndrias e vasos capilares sanguíneos.",
          "O lactato produzido durante a contração muscular é reciclado quase instantaneamente pelas próprias mitocôndrias através dos transportadores MCT-1. Ou seja: os níveis de lactato sanguíneo permanecem baixos e estáveis (geralmente entre 1.3 e 1.9 mmol/L)."
        ],
        tableData: {
          headers: ["Parâmetro de Medição", "Faixa de Zona 2", "Exemplo Prático (Atleta FTP 200W / FC Máx 185)"],
          rows: [
            ["Potência (% do FTP)", "55% a 75% do FTP", "110W a 150W contínuos"],
            ["Frequência Cardíaca (% FC Máx)", "60% a 70% da FC Máx", "111 a 130 bpm"],
            ["Percepção de Esforço (PSE 1-10)", "Nível 3 a 4", "Esforço moderado sustentável por 4 horas"],
            ["Teste da Fala", "Consegue conversar", "Consegue dialogar confortavelmente sem interrupções"]
          ]
        }
      },
      {
        id: "beneficios-celulares",
        title: "2. Por que a Zona 2 Deixa Você Muito Mais Rápido?",
        content: [
          "Muitos atletas amadores pensam: 'Se eu rodar tão devagar, vou ficar lento'. Esse é o maior mito do ciclismo de endurance.",
          "Treinar em Zona 2 gera adaptações fisiológicas que nenhum treino de alta intensidade consegue replicar sozinho:",
          "• Biogênese Mitocondrial: Aumenta em até 40% a quantidade e o volume das mitocôndrias nas fibras musculares.",
          "• Oxidação de Lactato: Treina seu organismo a usar o lactato como fonte primária de energia em vez de deixá-lo acumular e queimar as pernas nas subidas.",
          "• Economia de Glicogênio: Seu motor a combustão fica tão eficiente que você poupa os preciosos carboidratos musculares para os sprints finais ou fugas no pelotão.",
          "• Recuperação Rápida: Por não gerar estresse neuromuscular agressivo, você pode treinar novamente no dia seguinte com alto frescor físico."
        ],
        keyHighlight: "🔬 Conclusão Científica: Dr. Iñigo San Millán (fisiologista de campeões do Tour de France) demonstrou que a base mitocondrial em Zona 2 é o alicerce fundamental para sustentar potências elevadas no limiar."
      },
      {
        id: "erros-comuns-zona2",
        title: "3. Como Não Errar a Sua Zona 2 no Pedal Real",
        content: [
          "O erro mais comum ao treinar Zona 2 na rua é deixar o ego falar mais alto quando surge uma pequena subida ou quando outro ciclista ultrapassa na estrada.",
          "Aumentar a força em uma subida eleva o esforço para Zona 4 instantaneamente. Quando isso acontece, o organismo libera catecolaminas (adrenalina) e interrompe a oxidação lipídica mitocondrial por vários minutos!",
          "Dica Prática: Ao avistar qualquer inclinação na estrada, engate a marcha mais leve imediatamente e mantenha a mesma potência ou batimentos cardíacos, mesmo que sua velocidade caia para 14 km/h."
        ]
      }
    ],
    workoutExample: {
      title: "Treino Prático: Sessão Pura de Eficiência Mitocondrial",
      description: "Treino contínuo de 60 a 90 minutos para aprimoramento cardiovascular e capilarização muscular.",
      totalTime: "75 minutos",
      targetZone: "Zona 2 Estrita (65% FTP ou 65% FC Máx)",
      steps: [
        {
          phase: "Aquecimento",
          duration: "10 minutos",
          intensity: "Zona 1 (50% FTP)",
          description: "Pedaladas fáceis e leves, preparando circulação e lubrificação articular dos joelhos.",
          cadence: "85 RPM"
        },
        {
          phase: "Bloco Mitocondrial 1",
          duration: "25 minutos",
          intensity: "Zona 2 Contínua (65-70% FTP)",
          description: "Potência absolutamente plana. Mantenha mãos relaxadas no topo do guidão.",
          cadence: "85-90 RPM"
        },
        {
          phase: "Transição e Hidratação",
          duration: "5 minutos",
          intensity: "Zona 1 Leve",
          description: "Tome um gole de água fresca, ajuste a postura no selim e alongue o pescoço.",
          cadence: "80 RPM"
        },
        {
          phase: "Bloco Mitocondrial 2",
          duration: "25 minutos",
          intensity: "Zona 2 Contínua (65-70% FTP)",
          description: "Segunda metade mantendo os mesmos batimentos cardíacos sem deriva cardíaca excessiva.",
          cadence: "85-90 RPM"
        },
        {
          phase: "Volta à Calma",
          duration: "10 minutos",
          intensity: "Zona 1 Regenerativo",
          description: "Giro super solto para relaxamento muscular e encerramento limpo da sessão.",
          cadence: "75-80 RPM"
        }
      ],
      coachAdvice: "Se estiver usando frequência cardíaca, lembre-se de que em dias muito quentes ou com desidratação ocorre o 'Cardiac Drift' (os batimentos sobem mesmo sem você aumentar a força). Monitore a sensação respiratória."
    },
    faq: [
      {
        question: "Como saber se estou realmente na Zona 2 sem medidor de potência?",
        answer: "Use o teste da fala (Talk Test): você deve conseguir falar frases inteiras com facilidade, mas sem conseguir cantarolar. Se só conseguir falar 2 ou 3 palavras por fôlego, você já subiu para Zona 3 ou 4."
      },
      {
        question: "Quanto tempo devo passar na Zona 2 por semana?",
        answer: "Para atletas amadores, cerca de 70% a 80% do tempo total de pedal deve ser em Zona 2. Os 20% restantes devem ser divididos entre treinos de alta intensidade (Sweet Spot, Z4 e tiros curtos)."
      },
      {
        question: "O Biker AI calcula minhas zonas de Zona 2 automaticamente?",
        answer: "Sim! Na ferramenta 'Zonas de Treino' do Biker AI, você insere seu FTP ou Frequência Cardíaca Máxima e recebe a tabela com todas as suas 7 zonas científicas calculadas em tempo real."
      }
    ],
    ctaGoal: "Zonas de Treino",
    ctaButtonText: "Calcular Minhas Zonas de Treino no Biker AI",
    relatedSlugs: ["planilha-treino-ciclismo", "treino-ciclismo-emagrecer", "treino-100km"]
  }
};
