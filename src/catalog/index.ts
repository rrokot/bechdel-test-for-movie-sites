import { send } from '../shared/messages.ts';
import { createBadge } from './badge.ts';
import { siteFor, type Site } from './sites.ts';

// How long a page may take to render its heading before the badge floats in
// the corner instead.
const FLOAT_DELAY_MS = 2000;

const showBadgeOnMoviePages = (site: Site) => {
  const badge = createBadge();
  let currentRefKey: string | null = null;
  let hasBadgeContent = false;
  let floatTimer: ReturnType<typeof setTimeout> | undefined;
  let placeFrame = 0;

  const cancelFloatTimer = () => {
    clearTimeout(floatTimer);
    floatTimer = undefined;
  };

  const floatInCorner = () => {
    floatTimer = undefined;
    if (!hasBadgeContent || document.querySelector(site.headingSelector)) return;
    badge.host.dataset.floating = '';
    document.body.append(badge.host);
  };

  // Single-page catalogs re-render their headings; put the badge back
  // whenever it is no longer inside the current one.
  const placeNextToHeading = () => {
    placeFrame = 0;
    if (!hasBadgeContent) return;
    const heading = document.querySelector(site.headingSelector);
    if (!heading) {
      if (!badge.host.isConnected) floatTimer ??= setTimeout(floatInCorner, FLOAT_DELAY_MS);
      return;
    }
    cancelFloatTimer();
    delete badge.host.dataset.floating;
    if (badge.host.parentElement !== heading) heading.append(badge.host);
  };

  const hide = () => {
    hasBadgeContent = false;
    cancelFloatTimer();
    badge.host.remove();
  };

  const refreshForCurrentUrl = async () => {
    const ref = site.identify(new URL(location.href), document);
    const refKey = ref && JSON.stringify(ref);
    if (refKey === currentRefKey) return;
    currentRefKey = refKey;
    hide();
    if (!ref) return;

    try {
      const { imdbId, movie } = await send({ type: 'bechdel:find', ref });
      if (currentRefKey !== refKey || !imdbId) return;
      badge.render(movie ? { kind: 'rated', movie } : { kind: 'unrated' });
      hasBadgeContent = true;
      placeNextToHeading();
    } catch (error) {
      console.warn('[Bechdel]', error);
    }
  };

  new MutationObserver(() => {
    placeFrame ||= requestAnimationFrame(placeNextToHeading);
  }).observe(document.body, { childList: true, subtree: true });
  // Fires for every URL change, including the History API calls SPAs make.
  navigation.addEventListener('currententrychange', () => void refreshForCurrentUrl());
  void refreshForCurrentUrl();
};

const site = siteFor(location.hostname);
if (site) showBadgeOnMoviePages(site);
