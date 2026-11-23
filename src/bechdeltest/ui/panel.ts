import type { progress } from '../model.ts';
import type { Filters } from './filters.ts';

type Progress = ReturnType<typeof progress>;

type NumericFilter = 'kinopoiskMin' | 'imdbMin' | 'bechdelMin';

// Abbreviated labels get a tooltip that spells out what they filter by.
const CONTROLS: { key: NumericFilter; label: string; title?: string; values: number[] }[] = [
  { key: 'kinopoiskMin', label: 'KP ≥', title: 'Kinopoisk rating', values: [5, 6, 7, 8, 9] },
  { key: 'imdbMin', label: 'IMDb ≥', values: [5, 6, 7, 8, 9] },
  { key: 'bechdelMin', label: 'B ≥', title: 'Bechdel Test score', values: [1, 2, 3] },
];

type Props = Partial<{
  className: string;
  textContent: string;
  title: string;
  value: string;
  type: string;
  role: string;
  ariaLive: string;
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
  createElement('option', { value: '', textContent: '-' }),
  ...values.map((value) => createElement('option', { value: String(value), textContent: String(value) })),
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

  const genreSummary = createElement('summary');
  const genreOptions = createElement('div', { className: 'bte-genre-options' });
  const status = createElement('span', { className: 'bte-status', role: 'status', ariaLive: 'polite', hidden: true });

  const panel = createElement('div', { className: 'bte-filters' }, [
    ...CONTROLS.map(({ key, label, title }) => createElement('label', title ? { title } : {}, [label, selects.get(key)!])),
    createElement('details', { className: 'bte-genre-filter' }, [genreSummary, genreOptions]),
    status,
  ]);

  const renderGenreState = () => {
    const excluded = new Set(filters.excludedGenres);
    genreSummary.textContent = excluded.size ? `Genre − (${excluded.size})` : 'Genre −';
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

  const setProgress = ({ total, pending, failed }: Progress) => {
    if (pending) {
      status.dataset.state = 'loading';
      status.textContent = `Ratings ${total - pending} / ${total}`;
      status.title = '';
    } else if (failed) {
      status.dataset.state = 'failed';
      status.textContent = `${failed} unavailable`;
      status.title = 'Some ratings could not be loaded and will be retried on the next visit';
    } else {
      status.dataset.state = 'idle';
      status.textContent = '';
      status.title = '';
    }
    status.hidden = status.dataset.state === 'idle';
  };

  const firstGroup = list.querySelector(':scope > h2');
  if (firstGroup) firstGroup.before(panel);
  else list.prepend(panel);
  setFilters(filters);
  setGenres([]);

  return { setFilters, setGenres, setProgress };
};
