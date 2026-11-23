import { SITES } from './catalog/sites.ts';
import { BECHDELTEST_PAGES, FETCH_HOSTS } from './shared/config.ts';

const NAME = 'Bechdel Test for Movie Sites';
const pattern = (host: string) => `https://${host}/*`;

export const createManifest = (version: string): chrome.runtime.ManifestV3 => ({
  manifest_version: 3,
  name: NAME,
  // The Chrome Web Store rejects descriptions over 132 characters.
  // It is also the store's summary, which weighs most in store search after the name.
  description: 'Bechdel Test scores on IMDb, Letterboxd, TMDB, Rotten Tomatoes and more: '
    + 'see how a film portrays women before you watch it.',
  version,
  minimum_chrome_version: '130',
  icons: { 16: 'icons/16.png', 48: 'icons/48.png', 128: 'icons/128.png' },
  action: { default_title: NAME, default_popup: 'popup.html' },
  background: { service_worker: 'background.js' },
  content_scripts: [
    {
      matches: BECHDELTEST_PAGES,
      js: ['bechdeltest.js'],
      css: ['bechdeltest.css'],
      run_at: 'document_idle',
    },
    {
      matches: SITES.flatMap(({ hosts }) => hosts.map(pattern)),
      js: ['catalog.js'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'alarms', 'declarativeNetRequestWithHostAccess'],
  host_permissions: [...new Set([...BECHDELTEST_PAGES, ...FETCH_HOSTS.map(pattern)])],
});
