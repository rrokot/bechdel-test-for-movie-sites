import { imdbCache } from '../../sources/caches.ts';
import { LINKS } from '../../shared/config.ts';
import type { MoviePatch, Update } from '../model.ts';
import { fetchImdbRatings, type ImdbRating } from '../../sources/imdb.ts';

const toPatch = (imdbId: string, { rating, votes, genres }: ImdbRating): MoviePatch => {
  const href = `${LINKS.imdbTitle}/${imdbId}/`;
  return {
    imdb: rating === null
      ? { status: 'missing', reason: 'no-rating', href }
      : { status: 'ready', rating, votes, href },
    genres,
  };
};

export const loadImdb = async (imdbIds: readonly string[], update: Update) => {
  const cached = await imdbCache.getMany(imdbIds);
  cached.forEach((data, imdbId) => update(imdbId, toPatch(imdbId, data)));

  const pending = imdbIds.filter((imdbId) => !cached.has(imdbId));
  if (!pending.length) return;

  let ratings: Map<string, ImdbRating>;
  try {
    ratings = await fetchImdbRatings(pending);
  } catch (error) {
    console.warn('[Bechdel ratings]', error);
    pending.forEach((imdbId) => update(imdbId, { imdb: { status: 'error', reason: 'source-unreachable' } }));
    return;
  }

  await Promise.all(pending.map(async (imdbId) => {
    const data = ratings.get(imdbId);
    if (!data) {
      update(imdbId, { imdb: { status: 'error', reason: 'title-error' } });
      return;
    }
    update(imdbId, toPatch(imdbId, data));
    await imdbCache.set(imdbId, data);
  }));
};
