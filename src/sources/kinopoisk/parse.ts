export type Candidate = {
  kinopoiskId: string;
  titles: string[];
  year: number | null;
};

export type FilmPage = Candidate & { directors: string[] };

const YEAR = /\b(?:18|19|20)\d{2}\b/;
const TRAILING_YEAR_IN_PARENS = /\s*\((?:18|19|20)\d{2}\)\s*$/;
const FILM_ID_IN_PATH = /\/film\/(\d+)(?:\/|$)/;
const PERSON_ID_IN_PATH = /\/name\/(\d+)/;
// "142 мин": a number followed by a unit word.
const RUNNING_TIME = /^\d+\s*\D+$/u;
const TRAILING_RUNNING_TIME = /,\s*\d+\s*\D+$/u;

export const filmIdFromUrl = (url: string | null | undefined) => (
  url?.match(FILM_ID_IN_PATH)?.[1] ?? null
);

const parseYear = (text: string | null | undefined) => {
  const year = Number.parseInt(text?.match(YEAR)?.[0] ?? '', 10);
  return Number.isInteger(year) ? year : null;
};

const parseHtml = (text: string) => new DOMParser().parseFromString(text, 'text/html');

// Film pages render person names in Russian; the original spelling only lives
// in the embedded Apollo state, keyed by person id.
const originalPersonName = (pageText: string, personId: string) => {
  const match = pageText.match(new RegExp(
    `"Person:${personId}"\\s*:\\s*\\{[^{}]{0,1200}?"originalName":("(?:\\\\.|[^"\\\\])*"|null)`,
  ));
  if (!match?.[1] || match[1] === 'null') return '';
  try {
    return JSON.parse(match[1]) as string;
  } catch {
    return '';
  }
};

export const parseFilmPage = (pageText: string, pageUrl: string): FilmPage | null => {
  const page = parseHtml(pageText);
  const kinopoiskId = filmIdFromUrl(pageUrl)
    ?? filmIdFromUrl(page.querySelector('link[rel="canonical"]')?.getAttribute('href'));
  if (!kinopoiskId) return null;

  const heading = page.querySelector('h1')?.textContent
    ?.replace(TRAILING_YEAR_IN_PARENS, '')
    .trim();
  const directors = [...page.querySelectorAll('[data-test-id="directors"] a[href*="/name/"]')]
    .flatMap((link) => {
      const personId = link.getAttribute('href')?.match(PERSON_ID_IN_PATH)?.[1];
      return [link.textContent, personId ? originalPersonName(pageText, personId) : ''];
    })
    .filter((name): name is string => Boolean(name));

  return {
    kinopoiskId,
    titles: [heading, page.querySelector('[class*="originalTitle"]')?.textContent]
      .filter((title): title is string => Boolean(title)),
    year: parseYear(page.querySelector('[data-test-id="year"]')?.textContent),
    directors,
  };
};

// The grey line is "Original title, 142 мин"; for local titles it is just the
// running time, which must not be mistaken for a title.
const originalTitleFromSubtitle = (text: string | null | undefined) => {
  const subtitle = text?.trim() ?? '';
  if (RUNNING_TIME.test(subtitle)) return '';
  return subtitle.replace(TRAILING_RUNNING_TIME, '').trim();
};

export const parseSearchResults = (pageText: string): Candidate[] => (
  [...parseHtml(pageText).querySelectorAll('.element')].flatMap((element) => {
    const link = element.querySelector<HTMLElement>('.info .name a[data-id]');
    const kinopoiskId = link?.dataset.id ?? filmIdFromUrl(link?.getAttribute('href'));
    if (!kinopoiskId) return [];
    return [{
      kinopoiskId,
      titles: [link?.textContent, originalTitleFromSubtitle(element.querySelector('.info > span.gray')?.textContent)]
        .filter((title): title is string => Boolean(title)),
      year: parseYear(element.querySelector('.info .name .year')?.textContent),
    }];
  })
);
