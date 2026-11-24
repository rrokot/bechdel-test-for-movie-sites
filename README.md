# Bechdel Test for Movie Sites

A Chrome extension that shows [bechdeltest.com](https://bechdeltest.com/)
scores on popular movie sites, and adds IMDb and Kinopoisk ratings, genres and
filters to bechdeltest.com itself.

It is an unofficial project, not affiliated with bechdeltest.com, IMDb or the
other sites.

![Bechdel Test badge on IMDb](store/screenshots/2-imdb.png)

## Install

- **[Chrome Web Store](https://chromewebstore.google.com/detail/bechdel-test-for-movie-si/ejfehpefannfcgfgphjojahbolaoojci)**
- **From a release** — download `bechdel-test-for-movie-sites-*.zip` from the
  [latest release](https://github.com/rrokot/bechdel-test-for-movie-sites/releases/latest),
  unpack it, then open `chrome://extensions`, turn on **Developer mode** and
  choose **Load unpacked**.

It works in Chrome 130 or newer and other Chromium-based browsers.

## On movie sites

Every movie page gets a badge next to its title with the Bechdel Test score
from 0 to 3, linking to the movie on bechdeltest.com. A question mark marks a
3 that contributors dispute. Movies that are not rated yet get a link to add
them.

| Site | Movie pages |
| --- | --- |
| IMDb | `imdb.com/title/…` |
| Kinopoisk | `kinopoisk.ru/film/…`, `/series/…` |
| Letterboxd | `letterboxd.com/film/…` |
| TMDB | `themoviedb.org/movie/…`, `/tv/…` |
| Trakt | `trakt.tv/movies/…`, `/shows/…` |
| Rotten Tomatoes | `rottentomatoes.com/m/…`, `/tv/…` |
| Metacritic | `metacritic.com/movie/…`, `/tv/…` |
| Douban | `movie.douban.com/subject/…` |
| FilmAffinity | `filmaffinity.com/…/film….html` |
| AlloCiné | `allocine.fr/film/fichefilm_gen_cfilm=….html` |
| Filmweb | `filmweb.pl/film/…`, `/serial/…` |

## On bechdeltest.com

![Ratings and filters on bechdeltest.com](store/screenshots/1-bechdeltest-ratings.png)

- Kinopoisk (KP) and IMDb ratings before each movie title, color-coded and
  linked to the title pages
- Up to three IMDb genres per movie
- Filters by minimum KP rating, IMDb rating and Bechdel score, plus genre
  exclusion; settings sync across tabs and devices

Ratings that are still loading or failed to load never hide a movie.

## Toolbar popup

The popup shows how many movies the local Bechdel Test list holds and when it
was last updated. It can update the list on demand and clear the cached
ratings. The list also updates by itself once a day.

## Troubleshooting

- **No KP ratings on bechdeltest.com.** Kinopoisk may be asking for a captcha
  or a sign-in check. Open [kinopoisk.ru](https://www.kinopoisk.ru/) once and
  reload the page.
- **A rating failed to load.** It is retried on your next visit.
- **A movie page has no badge.** The site's movie ID is probably not linked to
  an IMDb ID on Wikidata yet.

## Privacy

No account, no tracking, no servers of its own. The extension only sends movie
IDs and titles to bechdeltest.com, IMDb, Kinopoisk and Wikidata, and keeps
everything else in Chrome storage on your device. See the [privacy policy](PRIVACY.md).

## License

[MIT](LICENSE)
