/**
 * Confere titles/descriptions e gera HTML estático das rotas públicas
 * (build/<rota>/index.html) com canonical e og:url em https://ctsupera.com.br.
 * O nginx precisa de try_files $uri $uri/index.html para servir esses arquivos.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const routes = require('../src/seo/routes.json');
const SITE = routes.siteUrl;
const LIMITS = {
  '/': { title: 60, description: 155 },
  '/agendamento': { title: 60, description: 155 },
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function chars(value) {
  return Array.from(value).length;
}

function pageUrl(pagePath) {
  return pagePath === '/' ? `${SITE}/` : `${SITE}${pagePath}`;
}

function assertRoutes() {
  if (!Array.isArray(routes.pages) || routes.pages.length !== 5) {
    fail(`Esperadas 5 rotas públicas, encontrado ${routes.pages && routes.pages.length}`);
  }
  if (routes.siteUrl !== 'https://ctsupera.com.br') {
    fail(`siteUrl deve ser https://ctsupera.com.br, encontrado ${routes.siteUrl}`);
  }
  const paths = routes.pages.map((page) => page.path);
  for (const required of ['/', '/agendamento', '/supera-news', '/galeria', '/trabalhe-conosco']) {
    if (!paths.includes(required)) fail(`Rota pública ausente: ${required}`);
  }
  for (const page of routes.pages) {
    const limit = LIMITS[page.path] || { title: 70, description: 170 };
    if (chars(page.title) > limit.title) {
      fail(`Title longo (${chars(page.title)}/${limit.title}) em ${page.path}: ${page.title}`);
    }
    if (chars(page.description) > limit.description) {
      fail(
        `Description longa (${chars(page.description)}/${limit.description}) em ${page.path}: ${page.description}`
      );
    }
    if (/["<>]/.test(page.title + page.description + page.keywords)) {
      fail(`Metadado com aspas ou HTML em ${page.path}`);
    }
  }
}

function assertSourceHtml() {
  const index = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  for (const page of routes.pages) {
    if (!index.includes(page.title)) fail(`public/index.html não contém o title de ${page.path}`);
    if (!index.includes(page.description)) {
      fail(`public/index.html não contém a description de ${page.path}`);
    }
  }
  if (!index.includes('rel="canonical" href="https://ctsupera.com.br/"')) {
    fail('canonical da home ausente em public/index.html');
  }
  if (!index.includes('property="og:url" content="https://ctsupera.com.br/"')) {
    fail('og:url da home ausente em public/index.html');
  }

  const sitemap = fs.readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf8');
  const locs = sitemap.match(/<loc>[^<]+<\/loc>/g) || [];
  if (locs.length !== 5) fail(`sitemap deve ter 5 URLs, encontrado ${locs.length}`);
  for (const loc of locs) {
    if (!loc.startsWith('<loc>https://ctsupera.com.br')) {
      fail(`sitemap com URL fora do host canônico: ${loc}`);
    }
    if (loc.includes('www.ctsupera.com.br')) fail(`sitemap com www: ${loc}`);
  }

  const files = [
    path.join(root, 'public', 'index.html'),
    path.join(root, 'public', 'sitemap.xml'),
    path.join(root, 'public', 'robots.txt'),
  ];
  const bad = /https?:\/\/www\.ctsupera\.com\.br|http:\/\/ctsupera\.com\.br/i;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (bad.test(text)) fail(`${path.relative(root, file)} aponta para http ou www do site`);
  }
}

function replaceOnce(html, regex, replacement, label) {
  if (!regex.test(html)) fail(`Não achei ${label} no HTML gerado`);
  return html.replace(regex, replacement);
}

function applyPage(html, page) {
  const url = pageUrl(page.path);
  let out = html;
  out = replaceOnce(out, /<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`, 'title');
  out = replaceOnce(
    out,
    /(<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*\bcontent\s*=\s*["'])[\s\S]*?(["'])/i,
    `$1${page.description}$2`,
    'description'
  );
  out = replaceOnce(
    out,
    /(<meta\b[^>]*\bname\s*=\s*["']keywords["'][^>]*\bcontent\s*=\s*["'])[\s\S]*?(["'])/i,
    `$1${page.keywords}$2`,
    'keywords'
  );
  out = replaceOnce(
    out,
    /(<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*\bhref\s*=\s*["'])[\s\S]*?(["'])/i,
    `$1${url}$2`,
    'canonical'
  );
  out = replaceOnce(
    out,
    /(<meta\b[^>]*\bproperty\s*=\s*["']og:url["'][^>]*\bcontent\s*=\s*["'])[\s\S]*?(["'])/i,
    `$1${url}$2`,
    'og:url'
  );
  out = replaceOnce(
    out,
    /(<meta\b[^>]*\bproperty\s*=\s*["']og:title["'][^>]*\bcontent\s*=\s*["'])[\s\S]*?(["'])/i,
    `$1${page.title}$2`,
    'og:title'
  );
  out = replaceOnce(
    out,
    /(<meta\b[^>]*\bproperty\s*=\s*["']og:description["'][^>]*\bcontent\s*=\s*["'])[\s\S]*?(["'])/i,
    `$1${page.description}$2`,
    'og:description'
  );
  out = replaceOnce(
    out,
    /(<meta\b[^>]*\bname\s*=\s*["']twitter:title["'][^>]*\bcontent\s*=\s*["'])[\s\S]*?(["'])/i,
    `$1${page.title}$2`,
    'twitter:title'
  );
  out = replaceOnce(
    out,
    /(<meta\b[^>]*\bname\s*=\s*["']twitter:description["'][^>]*\bcontent\s*=\s*["'])[\s\S]*?(["'])/i,
    `$1${page.description}$2`,
    'twitter:description'
  );
  if (/https?:\/\/www\.ctsupera\.com\.br|http:\/\/ctsupera\.com\.br/i.test(out)) {
    fail(`HTML de ${page.path} ficou com http ou www`);
  }
  return out;
}

function prerenderBuild() {
  const buildIndex = path.join(root, 'build', 'index.html');
  if (!fs.existsSync(buildIndex)) {
    console.log('build/index.html ainda não existe; validação de fonte concluída.');
    return;
  }
  const html = fs.readFileSync(buildIndex, 'utf8');
  for (const page of routes.pages) {
    const rendered = applyPage(html, page);
    if (page.path === '/') {
      fs.writeFileSync(buildIndex, rendered);
      continue;
    }
    const dir = path.join(root, 'build', page.path.replace(/^\//, ''));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), rendered);
  }
  console.log('HTML público gerado com canonical https://ctsupera.com.br');
}

assertRoutes();
assertSourceHtml();
prerenderBuild();
