import seoRoutes from './routes.json';

const SITE_URL = seoRoutes.siteUrl;
const DEFAULT_IMAGE = `${SITE_URL}/hero-volei-praia.png`;

function metaFor(path) {
  const found = seoRoutes.pages.find((page) => page.path === path);
  if (!found) {
    throw new Error(`SEO sem rota pública: ${path}`);
  }
  return {
    title: found.title,
    description: found.description,
    keywords: found.keywords,
    image: DEFAULT_IMAGE,
    path: found.path,
  };
}

export const DEFAULT_META = metaFor('/');

export const PAGE_META = {
  home: metaFor('/'),
  agendamento: metaFor('/agendamento'),
  superaNews: metaFor('/supera-news'),
  galeria: metaFor('/galeria'),
  trabalheConosco: metaFor('/trabalhe-conosco'),
};

export function absoluteUrl(path = '/') {
  if (!path || path === '/') return `${SITE_URL}/`;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
