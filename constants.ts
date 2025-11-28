import type { Voice, TrackInfo } from './types';

// Full list of voices with Brazilian personas and optimized prompts
export const INITIAL_VOICES: Voice[] = [
  // --- MASCULINOS ---
  {
    id: 'iapetus',
    name: 'iapetus',
    displayName: 'Daniel Costa',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz jovem, enérgica e comercial. Perfeito para varejo, promoções e vídeos que precisam de dinamismo e agilidade.',
    prompt: 'Adote um tom extremamente enérgico, jovem e vendedor. Sua voz deve ter um ritmo ágil e dinâmico, com sorrisos audíveis para transmitir positividade e entusiasmo contagiante. Enfatize ofertas e benefícios com clareza e impacto. Ideal para comerciais de TV, rádio e internet que buscam conversão imediata. Evite soar monótono; a energia deve ser alta do início ao fim.',
    imageUrl: '/images/voices/daniel_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'charon',
    name: 'charon',
    displayName: 'Cadu',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz amigável, confiável e conversacional. A escolha ideal para podcasts, tutoriais e marcas que buscam proximidade.',
    prompt: 'Mantenha um tom natural, conversacional e amigável, como um amigo explicando algo interessante. O ritmo deve ser moderado e acolhedor, transmitindo confiança e credibilidade sem esforço. Use pausas naturais para respirar e conectar ideias. Perfeito para narrativas de marca, vídeos explicativos e conteúdo de redes sociais que exigem autenticidade e conexão humana.',
    imageUrl: '/images/voices/cadu_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'fenrir',
    name: 'fenrir',
    displayName: 'Bruno',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz profunda, impactante e cinematográfica. Indispensável para trailers, chamadas de ação e momentos épicos.',
    prompt: 'Use uma voz profunda, grave e ressonante. O tom deve ser sério, intenso e dramático, evocando grandiosidade e mistério. Fale com peso e autoridade, usando pausas estratégicas para criar tensão. Perfeito para trailers de filmes, aberturas de eventos e narrativas que exigem um impacto visceral. A voz deve comandar a atenção absoluta do ouvinte.',
    imageUrl: '/images/voices/bruno_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'algenib',
    name: 'algenib',
    displayName: 'Gabriel',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz descolada, moderna e vibrante. Ótimo para conteúdo tech, games e público jovem.',
    prompt: 'Adote um tom descolado, moderno e vibrante. Fale com um ritmo levemente acelerado e informal, usando entonações que conectem com o público jovem e antenado. Transmita empolgação e curiosidade. Ideal para vídeos de tecnologia, games, reviews e conteúdo para redes sociais como TikTok e YouTube Shorts.',
    imageUrl: '/images/voices/gabriel_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'algieba',
    name: 'algieba',
    displayName: 'Lucas',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz técnica, precisa e didática. Excelente para tutoriais complexos, cursos online e explicações detalhadas.',
    prompt: 'Mantenha um tom técnico, preciso e extremamente claro. A dicção deve ser articulada e o ritmo constante, facilitando a compreensão de informações complexas. Transmita conhecimento e segurança, sem ser arrogante. Ideal para cursos online, tutoriais de software, manuais em áudio e vídeos educativos.',
    imageUrl: '/images/voices/lucas_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'alnilam',
    name: 'alnilam',
    displayName: 'Pedro',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz grave, calma e segura. Transmite estabilidade e confiança para setor financeiro e imobiliário.',
    prompt: 'Use uma voz grave, calma e muito segura. O tom deve ser sóbrio e estável, transmitindo uma confiança inabalável. Fale pausadamente, dando peso a cada informação. Ideal para comunicados do setor financeiro, imobiliário, jurídico e mensagens institucionais que exigem seriedade e credibilidade.',
    imageUrl: '/images/voices/pedro_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'enceladus',
    name: 'enceladus',
    displayName: 'Rafael',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz heróica, inspiradora e motivacional. Perfeita para manifestos, vídeos de superação e esportes.',
    prompt: 'Adote um tom heróico, inspirador e motivacional. Fale com paixão e intensidade crescente, como se estivesse liderando uma equipe ou narrando uma grande conquista. Use ênfases emocionais para tocar o coração do ouvinte. Ideal para vídeos de esportes, manifestos de marca e mensagens de superação.',
    imageUrl: '/images/voices/rafael_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'gacrux',
    name: 'gacrux',
    displayName: 'Thiago',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz corporativa, neutra e direta. Ideal para comunicados internos, treinamentos e relatórios.',
    prompt: 'Mantenha um tom corporativo, neutro e direto ao ponto. A voz deve ser profissional e polida, sem excessos de emoção, focada puramente na transmissão eficiente da mensagem. Ideal para vídeos de treinamento, onboarding de funcionários, relatórios anuais e comunicados internos de grandes empresas.',
    imageUrl: '/images/voices/thiago_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'orus',
    name: 'orus',
    displayName: 'Marcos',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz clássica de locutor de rádio AM/FM. Timbre marcante para vinhetas e chamadas tradicionais.',
    prompt: 'Assuma o estilo clássico de um locutor de rádio FM. Projete a voz com ressonância e um leve sorriso no tom. Use as modulações típicas de rádio para criar dinamismo e familiaridade. Ideal para vinhetas, chamadas de programação, spots de rádio tradicionais e anúncios que buscam um toque nostálgico ou clássico.',
    imageUrl: '/images/voices/marcos_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'puck',
    name: 'puck',
    displayName: 'Davi',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz expressiva, teatral e brincalhona. Ótima para personagens, dublagens e conteúdo infantil.',
    prompt: 'Seja expressivo, teatral e brincalhão. Não tenha medo de variar o tom e o ritmo para dar vida ao texto. A voz deve ser colorida e cheia de personalidade, capaz de interpretar personagens e situações inusitadas. Ideal para dublagens, audiolivros infantis, animações e publicidade criativa.',
    imageUrl: '/images/voices/davi_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'rasalgethi',
    name: 'rasalgethi',
    displayName: 'Felipe',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz documental, curiosa e envolvente. Perfeita para vídeos de curiosidades, história e ciência.',
    prompt: 'Adote um tom documental, curioso e envolvente. Fale como se estivesse revelando um segredo fascinante ou explicando uma descoberta incrível. O ritmo deve ser fluido, conduzindo o ouvinte pela narrativa. Ideal para canais de curiosidades, documentários históricos, vídeos de ciência e exploração.',
    imageUrl: '/images/voices/felipe_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'schedar',
    name: 'schedar',
    displayName: 'Gustavo',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz vibrante, forte e esportiva. A cara de narrações de futebol, carros e ação.',
    prompt: 'Use uma voz vibrante, forte e cheia de adrenalina. O tom deve ser alto astral e potente, transmitindo a emoção de um estádio ou de uma pista de corrida. Fale com energia e projeção. Ideal para comerciais de carros, bebidas energéticas, chamadas de jogos de futebol e eventos esportivos.',
    imageUrl: '/images/voices/gustavo_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'umbriel',
    name: 'umbriel',
    displayName: 'Ricardo',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz sussurrada, intensa e misteriosa. Ideal para suspense, terror e teasers intrigantes.',
    prompt: 'Fale com uma voz sussurrada, intensa e cheia de mistério. Mantenha o volume baixo mas a intensidade alta, criando uma atmosfera de suspense e tensão. Use pausas longas e respiração controlada. Ideal para trailers de terror, contos de suspense, teasers misteriosos e campanhas que buscam intrigar o público.',
    imageUrl: '/images/voices/ricardo_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'zephyr',
    name: 'zephyr',
    displayName: 'André',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz terapêutica, calma e zen. Criada para aplicativos de meditação, saúde e bem-estar.',
    prompt: 'Adote um tom terapêutico, extremamente calmo e zen. A voz deve ser um refúgio de paz, com um ritmo lento e suave. Transmita serenidade e equilíbrio em cada palavra. Ideal para guias de meditação, aplicativos de yoga, vídeos de spa e conteúdos focados em saúde mental e bem-estar.',
    imageUrl: '/images/voices/andre_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'zubenelgenubi',
    name: 'zubenelgenubi',
    displayName: 'Eduardo',
    gender: 'Masculino',
    language: 'pt-BR',
    description: 'Voz de autoridade, madura e política. Transmite liderança e experiência.',
    prompt: 'Use uma voz de autoridade, madura e firme. O tom deve ser de liderança, transmitindo experiência e seriedade. Fale com convicção e clareza, projetando segurança. Ideal para campanhas políticas, manifestos de liderança, comunicados de crise e discursos oficiais.',
    imageUrl: '/images/voices/eduardo_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },

  // --- FEMININOS ---
  {
    id: 'achernar',
    name: 'achernar',
    displayName: 'Sofia',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz elegante, sofisticada e corporativa. Excelente para apresentações institucionais, luxo e tecnologia.',
    prompt: 'Assuma uma postura vocal elegante, polida e profissional. A dicção deve ser impecável e o tom, sereno e autoritário. Transmita inteligência e sofisticação em cada frase. Ideal para vídeos corporativos, manifestos de marcas de luxo e assistentes virtuais premium. Mantenha a calma e a clareza, evitando excessos emocionais, focando na precisão e na confiança.',
    imageUrl: '/images/voices/sofia_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'leda',
    name: 'leda',
    displayName: 'Alice',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz doce, empática e suave. Criada para audiolivros, meditações e contação de histórias emocionantes.',
    prompt: 'Adote um tom suave, doce e acolhedor. A voz deve soar como um abraço, transmitindo calma, empatia e carinho. O ritmo deve ser lento e fluido, ideal para relaxamento e conexão emocional. Perfeito para audiolivros infantis, guias de meditação e mensagens de bem-estar. Sorria levemente com a voz para trazer calor à voz. Evite qualquer estridência, pressa ou agressividade. O objetivo é criar uma conexão emocional profunda e relaxante com o ouvinte, transportando-o para a história ou estado de espírito desejado.',
    imageUrl: '/images/voices/alice_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'kore',
    name: 'kore',
    displayName: 'Luana',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz aveludada, sensual e marcante. Perfeita para cosméticos, moda e narrativas intensas.',
    prompt: 'Use uma voz aveludada, levemente grave e sensual. O tom deve ser envolvente e sofisticado, com um ritmo pausado que valoriza cada palavra. Transmita charme e mistério. Ideal para comerciais de perfumes, cosméticos, moda de alto padrão e narrativas que exigem um toque de sedução e elegância.',
    imageUrl: '/images/voices/luana_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'achird',
    name: 'achird',
    displayName: 'Beatriz',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz melodiosa, cantada e alegre. Ótima para publicidade musical, eventos e festas.',
    prompt: 'Adote um tom melodioso, quase cantado e muito alegre. A voz deve ter variações tonais ricas e expressivas, transmitindo felicidade e celebração. Fale com um sorriso aberto. Ideal para chamadas de shows, festivais, publicidade de eventos e produtos que vendem alegria e diversão.',
    imageUrl: '/images/voices/beatriz_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'aoede',
    name: 'aoede',
    displayName: 'Isabela',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz jovem, divertida e influencer. A escolha certa para blogs, unboxing e redes sociais.',
    prompt: 'Seja jovem, divertida e espontânea, como uma influenciadora digital conversando com seus seguidores. Use gírias (se o texto permitir) e entonações modernas. Transmita proximidade e autenticidade. Ideal para vídeos de unboxing, vlogs, tutoriais de maquiagem e conteúdo lifestyle para redes sociais.',
    imageUrl: '/images/voices/isabela_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'autonoe',
    name: 'autonoe',
    displayName: 'Camila',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz doce, inocente e infantil. Perfeita para brinquedos, produtos para crianças e personagens fofos.',
    prompt: 'Adote um tom doce, inocente e levemente infantil. A voz deve ser aguda e suave, transmitindo pureza e curiosidade. Fale com encanto e maravilha. Ideal para comerciais de brinquedos, produtos infantis, personagens de desenhos animados e narrativas para o público pré-escolar.',
    imageUrl: '/images/voices/camila_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'callirrhoe',
    name: 'callirrhoe',
    displayName: 'Julia',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz narrativa, clara e envolvente. Ideal para documentários, e-learning e vídeos explicativos.',
    prompt: 'Mantenha um tom narrativo, claro e muito envolvente. A voz deve ser neutra mas interessante, mantendo a atenção do ouvinte do início ao fim. A dicção deve ser perfeita. Ideal para documentários, vídeos de e-learning, treinamentos corporativos e explicações longas que precisam ser ouvidas com facilidade.',
    imageUrl: '/images/voices/julia_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'despina',
    name: 'despina',
    displayName: 'Fernanda',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz jornalística, séria e informativa. Transmite credibilidade para notícias e comunicados.',
    prompt: 'Assuma um tom jornalístico, sério e informativo. A voz deve ser firme e objetiva, transmitindo fatos com total credibilidade. Evite opiniões ou emoções na voz, foque na clareza e na imparcialidade. Ideal para notícias, boletins informativos, comunicados de imprensa e atualizações de mercado.',
    imageUrl: '/images/voices/fernanda_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'erinome',
    name: 'erinome',
    displayName: 'Mariana',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz conversacional, amiga e conselheira. Ótima para depoimentos e marcas de saúde.',
    prompt: 'Seja conversacional, calorosa e amiga. Fale como se estivesse dando um conselho para uma pessoa querida. Transmita apoio e compreensão. Ideal para depoimentos, comerciais de produtos de saúde e bem-estar, e marcas que buscam criar uma relação de confiança e cuidado com o consumidor.',
    imageUrl: '/images/voices/mariana_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'laomedeia',
    name: 'laomedeia',
    displayName: 'Larissa',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz aguda, vibrante e promocional. Perfeita para varejo popular e ofertas relâmpago.',
    prompt: 'Use uma voz aguda, vibrante e cheia de urgência. O tom deve ser alto e chamativo, feito para cortar o ruído e chamar a atenção. Fale rápido e com entusiasmo. Ideal para varejo popular, ofertas relâmpago, liquidações e anúncios que precisam gerar ação imediata.',
    imageUrl: '/images/voices/larissa_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'pulcherrima',
    name: 'pulcherrima',
    displayName: 'Valentina',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz de luxo, fashion e exclusiva. Ideal para desfiles, joalherias e marcas high-end.',
    prompt: 'Adote um tom de luxo, distante e exclusivo. A voz deve ser fria mas extremamente elegante, transmitindo superioridade e desejo. Fale devagar, saboreando as palavras. Ideal para vídeos de moda, comerciais de joias, carros de luxo e marcas que vendem exclusividade e status.',
    imageUrl: '/images/voices/valentina_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'sadachbia',
    name: 'sadachbia',
    displayName: 'Helena',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz madura, maternal e confiável. Transmite segurança para produtos de família e lar.',
    prompt: 'Use uma voz madura, maternal e profundamente confiável. O tom deve ser acolhedor e seguro, como o de uma mãe experiente. Transmita proteção e cuidado. Ideal para produtos de limpeza, alimentação, seguros familiares e marcas que focam no bem-estar do lar e da família.',
    imageUrl: '/images/voices/helena_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'sadaltager',
    name: 'sadaltager',
    displayName: 'Renata',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz de varejo, clara e convidativa. Ótima para supermercados e lojas de departamento.',
    prompt: 'Mantenha um tom de varejo, claro e muito convidativo. A voz deve ser simpática e acessível, anunciando produtos com um sorriso na voz. Ideal para locução de supermercados, lojas de departamento, catálogos de ofertas e anúncios de rádio locais.',
    imageUrl: '/images/voices/renata_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'sulafat',
    name: 'sulafat',
    displayName: 'Patrícia',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz de atendimento, polida e paciente. Perfeita para URAs, assistentes e tutoriais de serviço.',
    prompt: 'Assuma um tom de atendimento, extremamente polido e paciente. A voz deve ser suave e prestativa, transmitindo vontade de ajudar. Fale com clareza absoluta e ritmo moderado. Ideal para sistemas de URA, assistentes virtuais de atendimento, tutoriais de serviço e mensagens de espera telefônica.',
    imageUrl: '/images/voices/patricia_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  },
  {
    id: 'vindemiatrix',
    name: 'vindemiatrix',
    displayName: 'Tatiana',
    gender: 'Feminino',
    language: 'pt-BR',
    description: 'Voz didática, professoral e clara. A melhor escolha para aulas, explicações e treinamentos.',
    prompt: 'Adote um tom didático, professoral e cristalino. A voz deve ter autoridade intelectual, explicando conceitos com facilidade e paciência. Use ênfases para destacar termos importantes. Ideal para aulas online, vídeos educativos, explicações científicas e treinamentos técnicos.',
    imageUrl: '/images/voices/tatiana_voice_actor.png',
    demoUrl: '/trilha_principal.mp3'
  }
];

export const INITIAL_BACKGROUND_TRACKS: TrackInfo[] = [
  {
    name: 'Trilha Principal Local',
    url: '/trilha_principal.mp3',
  }
];