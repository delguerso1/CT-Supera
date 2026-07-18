import { useEffect } from 'react';
import { absoluteUrl, DEFAULT_META } from '../seo/pageMeta';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Atualiza title, description, canonical e Open Graph para a página atual.
 * Em SPA o HTML inicial (index.html) cobre crawlers; isto melhora compartilhamento no browser.
 */
export default function Seo({
  title = DEFAULT_META.title,
  description = DEFAULT_META.description,
  keywords = DEFAULT_META.keywords,
  image = DEFAULT_META.image,
  path = DEFAULT_META.path,
  noIndex = false,
}) {
  useEffect(() => {
    const url = absoluteUrl(path);
    document.title = title;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'keywords', keywords);
    upsertMeta(
      'name',
      'robots',
      noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    upsertLink('canonical', url);

    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:locale', 'pt_BR');
    upsertMeta('property', 'og:site_name', 'CT Supera');
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:alt', 'CT Supera — vôlei de praia e esporte');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
  }, [title, description, keywords, image, path, noIndex]);

  return null;
}
