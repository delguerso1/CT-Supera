const SITE_URL = 'https://ctsupera.com.br';
const DEFAULT_IMAGE = `${SITE_URL}/hero-volei-praia.png`;

export const DEFAULT_META = {
  title: 'CT Supera | Vôlei de Praia, Esporte, Exercício e Saúde',
  description:
    'CT Supera: centro de treinamento de vôlei de praia. Treinos, exercício físico, saúde e bem-estar na praia. Agende sua aula experimental.',
  keywords:
    'vôlei de praia, volei de praia, esporte, praia, exercício físico, saúde, bem-estar, condicionamento físico, aula experimental, CT Supera',
  image: DEFAULT_IMAGE,
  path: '/',
};

export const PAGE_META = {
  home: {
    ...DEFAULT_META,
    path: '/',
  },
  agendamento: {
    title: 'Agendar Aula Experimental de Vôlei de Praia | CT Supera',
    description:
      'Agende sua aula experimental de vôlei de praia no CT Supera. Esporte, exercício físico e saúde com profissionais qualificados.',
    keywords:
      'aula experimental vôlei de praia, agendar treino, vôlei de praia, exercício físico, CT Supera',
    image: DEFAULT_IMAGE,
    path: '/agendamento',
  },
  superaNews: {
    title: 'Supera News | Notícias de Esporte e Vôlei de Praia',
    description:
      'Notícias do CT Supera sobre vôlei de praia, esporte, treinos, saúde e comunidade esportiva.',
    keywords: 'notícias vôlei de praia, esporte, CT Supera, supera news',
    image: DEFAULT_IMAGE,
    path: '/supera-news',
  },
  galeria: {
    title: 'Galeria | Vôlei de Praia, Treinos e Vida ao Ar Livre | CT Supera',
    description:
      'Fotos de treinos de vôlei de praia, exercício físico e momentos na praia no CT Supera.',
    keywords: 'galeria vôlei de praia, treinos na praia, esporte, CT Supera',
    image: DEFAULT_IMAGE,
    path: '/galeria',
  },
  trabalheConosco: {
    title: 'Trabalhe Conosco | Educação Física e Vôlei de Praia | CT Supera',
    description:
      'Trabalhe no CT Supera com vôlei de praia, educação física, esporte e saúde. Envie seu currículo.',
    keywords:
      'vagas educação física, professor vôlei de praia, trabalhar esporte, CT Supera',
    image: DEFAULT_IMAGE,
    path: '/trabalhe-conosco',
  },
};

export function absoluteUrl(path = '/') {
  if (!path || path === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
