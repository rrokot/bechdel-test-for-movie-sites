import { clearCaches, countCacheEntries } from '../shared/cache.ts';
import { send, type BechdelStatus } from '../shared/messages.ts';

const BECHDELTEST_TABS = ['https://bechdeltest.com/*', 'https://www.bechdeltest.com/*'];

const requireElement = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const dbStatus = requireElement('#db-status');
const syncButton = requireElement<HTMLButtonElement>('#sync');
const cacheStatus = requireElement('#cache-status');
const clearButton = requireElement<HTMLButtonElement>('#clear-cache');

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const numberFormat = new Intl.NumberFormat();

const renderDb = ({ movies, syncedAt, syncing }: BechdelStatus) => {
  const synced = syncedAt === null ? 'not synced yet' : `updated ${dateFormat.format(syncedAt)}`;
  dbStatus.textContent = `${numberFormat.format(movies)} movies, ${syncing ? 'syncing…' : synced}`;
  syncButton.disabled = syncing;
};

const renderCache = async () => {
  const entries = await countCacheEntries();
  cacheStatus.textContent = `${numberFormat.format(entries)} cached ratings and ids`;
  clearButton.disabled = entries === 0;
};

syncButton.addEventListener('click', async () => {
  syncButton.disabled = true;
  dbStatus.textContent = 'Syncing…';
  try {
    renderDb(await send({ type: 'bechdel:sync' }));
  } catch (error) {
    dbStatus.textContent = `Sync failed: ${error instanceof Error ? error.message : String(error)}`;
    syncButton.disabled = false;
  }
});

clearButton.addEventListener('click', async () => {
  clearButton.disabled = true;
  await clearCaches();
  const tabs = await chrome.tabs.query({ url: BECHDELTEST_TABS });
  await Promise.all(tabs.map(({ id }) => (id === undefined ? null : chrome.tabs.reload(id))));
  await renderCache();
});

void send({ type: 'bechdel:status' }).then(renderDb);
void renderCache();
