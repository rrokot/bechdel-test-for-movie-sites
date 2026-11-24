import type { progress } from '../model.ts';
import type { Filters } from './filters.ts';

type Progress = ReturnType<typeof progress>;

type NumericFilter = 'kinopoiskMin' | 'imdbMin' | 'bechdelMin';

// In the order of the columns they sit above: the site's own Bechdel icon,
// then the IMDb and KP rating pills.
// Each column is named by a picture: the extension's Bechdel icon, then the
// IMDb and Kinopoisk logos.
const CONTROLS: { key: NumericFilter; name: string; logo: string; title: string; values: number[] }[] = [
  { key: 'bechdelMin', name: 'Bechdel', logo: 'bechdel', title: 'Minimum Bechdel Test score', values: [1, 2, 3] },
  { key: 'imdbMin', name: 'IMDb', logo: 'imdb', title: 'Minimum IMDb rating', values: [5, 6, 7, 8, 9] },
  { key: 'kinopoiskMin', name: 'Kinopoisk', logo: 'kinopoisk', title: 'Minimum Kinopoisk rating', values: [5, 6, 7, 8, 9] },
];

type Props = Partial<{
  className: string;
  textContent: string;
  title: string;
  value: string;
  type: string;
  role: string;
  ariaLive: string;
  ariaLabel: string;
  hidden: boolean;
}>;

const createElement = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  children: (Node | string)[] = [],
) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const createSelect = (values: number[]) => createElement('select', {}, [
  createElement('option', { value: '', textContent: '–' }),
  ...values.map((value) => createElement('option', { value: String(value), textContent: `${value}+` })),
]);

export const mountPanel = (
  list: HTMLElement,
  initial: Filters,
  onChange: (filters: Filters) => void,
) => {
  let filters = initial;
  let renderedGenresKey = '';

  const commit = (patch: Partial<Filters>) => {
    filters = { ...filters, ...patch };
    onChange(filters);
  };

  const selects = new Map(CONTROLS.map(({ key, values }) => {
    const select = createSelect(values);
    select.addEventListener('change', () => commit({ [key]: select.value ? Number(select.value) : null }));
    return [key, select];
  }));

  const genreCount = createElement('span', { className: 'bte-genre-count' });
  const genreSummary = createElement('summary', { title: 'Hide genres' }, [genreCount]);
  const genreOptions = createElement('div', { className: 'bte-genre-options' });
  const status = createElement('span', { className: 'bte-status', role: 'status', ariaLive: 'polite', hidden: true });

  const [bechdelFilter, ...ratingFilters] = CONTROLS.map(({ key, name, logo, title }) => (
    createElement('label', { className: 'bte-filter', title }, [
      createElement('span', { className: `bte-filter-name bte-logo-${logo}`, role: 'img', ariaLabel: name }),
      selects.get(key)!,
    ])
  ));
  const panel = createElement('div', { className: 'bte-filters' }, [
    bechdelFilter!,
    createElement('div', { className: 'bte-rating-filters' }, ratingFilters),
    createElement('div', { className: 'bte-filter' }, [
      createElement('span', { className: 'bte-filter-name bte-logo-genres', role: 'img', ariaLabel: 'Genres' }),
      createElement('details', { className: 'bte-genre-filter' }, [genreSummary, genreOptions]),
    ]),
    status,
  ]);

  const renderGenreState = () => {
    const excluded = new Set(filters.excludedGenres);
    genreCount.textContent = excluded.size ? String(excluded.size) : '';
    genreSummary.ariaLabel = excluded.size ? `Hidden genres: ${excluded.size}` : 'Hide genres';
    for (const button of genreOptions.querySelectorAll<HTMLButtonElement>('button')) {
      const isExcluded = excluded.has(button.value);
      button.ariaPressed = String(isExcluded);
      button.title = `${isExcluded ? 'Include' : 'Exclude'} ${button.value}`;
    }
  };

  const toggleGenre = (genre: string) => commit({
    excludedGenres: filters.excludedGenres.includes(genre)
      ? filters.excludedGenres.filter((item) => item !== genre)
      : [...filters.excludedGenres, genre],
  });

  const setFilters = (next: Filters) => {
    filters = next;
    selects.forEach((select, key) => { select.value = next[key] === null ? '' : String(next[key]); });
    renderGenreState();
  };

  const setGenres = (genres: string[]) => {
    const sorted = [...new Set([...genres, ...filters.excludedGenres])].sort((a, b) => a.localeCompare(b));
    if (sorted.join('|') === renderedGenresKey) return;
    renderedGenresKey = sorted.join('|');
    genreOptions.replaceChildren(...sorted.map((genre) => {
      const button = createElement('button', { type: 'button', className: 'bte-genre-option', value: genre, textContent: genre });
      button.addEventListener('click', () => {
        toggleGenre(genre);
        renderGenreState();
      });
      return button;
    }));
    renderGenreState();
  };

  // A ring fills up while ratings load; afterwards a warning icon remains only
  // if some of them failed.
  const setProgress = ({ total, pending, failed }: Progress) => {
    const loaded = total - pending;
    if (pending) {
      status.dataset.state = 'loading';
      status.style.setProperty('--bte-progress', String(total ? loaded / total : 0));
      status.textContent = '';
      status.title = `Loading ratings: ${loaded} of ${total}`;
    } else if (failed) {
      status.dataset.state = 'failed';
      status.textContent = String(failed);
      status.title = `${failed} ratings could not be loaded and will be retried on the next visit`;
    } else {
      status.dataset.state = 'idle';
      status.textContent = '';
      status.title = '';
    }
    status.ariaLabel = status.title;
    status.hidden = status.dataset.state === 'idle';
  };

  const firstGroup = list.querySelector(':scope > h2');
  if (firstGroup) firstGroup.before(panel);
  else list.prepend(panel);
  setFilters(filters);
  setGenres([]);

  return { setFilters, setGenres, setProgress };
};
