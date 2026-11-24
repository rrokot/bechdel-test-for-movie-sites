# Chrome Web Store listing

Source for the fields of the Developer Dashboard. The name and the summary come
from the manifest (`src/manifest.ts`); everything else is entered by hand.

Name at most the four most visited sites in the description and point to the
project page for the rest: a bulleted list of all of them, and then a sentence
naming six, were both rejected as excessive keywords (violation "Yellow
Argon"), while the manifest summary naming four passed.

## Store listing

**Category:** Lifestyle → Entertainment
**Language:** English

### Description

See how a film portrays women before you watch it. Bechdel Test for Movie
Sites shows a movie's Bechdel Test score right next to its title on the movie
sites you already use.

The Bechdel Test, also called the Bechdel–Wallace test, asks three questions:
does the movie have at least two named women, do they talk to each other, and
do they talk about something other than a man? It is a simple, popular measure
of how female characters are represented in film. Scores come from
bechdeltest.com, where its community has rated more than 10,000 movies.

ON MOVIE SITES
A badge next to the title shows the score from 0 to 3 and links to the movie's
page on bechdeltest.com. Movies that are not rated yet get a link to add them.
It works on IMDb, Kinopoisk, Letterboxd, Rotten Tomatoes and seven more
popular movie sites; the full list is on the project page:
https://github.com/rrokot/bechdel-test-for-movie-sites

ON BECHDELTEST.COM
• Bechdel scores as red, yellow and green icons, so 0, 1 and 2 no longer look alike
• IMDb and Kinopoisk ratings before every movie, color-coded and linked
• Up to three genres per movie
• Filters by minimum Bechdel score, IMDb rating and Kinopoisk rating
• Genre exclusion, for example to hide horror movies
• Filters are remembered and synced between your devices

PRIVATE BY DESIGN
No account, no API key, no tracking. The extension keeps a local copy of the
public bechdeltest.com list and only sends movie IDs and titles to the rating
sources. It never records which pages you visit.

Unofficial: not affiliated with bechdeltest.com or any of the movie sites.

### Graphics

- Store icon: `static/icons/128.png`
- Small promo tile (440×280): `store/promo-440x280.png`
- Screenshots (1280×800, upload in this order):
  1. `store/screenshots/1-bechdeltest-ratings.png` — ratings, genres and filters on bechdeltest.com
  2. `store/screenshots/2-imdb.png` — badge on IMDb, with a disputed 3/3
  3. `store/screenshots/3-tmdb.png` — badge on TMDB
  4. `store/screenshots/4-rotten-tomatoes.png` — badge on Rotten Tomatoes

## Privacy practices

### Single purpose

Shows Bechdel Test scores from bechdeltest.com on movie catalog pages, and adds
movie ratings, genres and filters to bechdeltest.com.

### Permission justifications

**storage** — Keeps a local copy of the public bechdeltest.com movie list, so
scores appear instantly on catalog pages without a request per movie; caches
IMDb and Kinopoisk ratings; stores the user's filter settings.

**alarms** — Refreshes the local copy of the bechdeltest.com list once a day and
removes expired cache entries.

**Host permissions**

- bechdeltest.com — adds ratings and filters to its pages and downloads its
  public movie list.
- query.wikidata.org — maps catalog movie IDs to IMDb IDs and IMDb IDs to
  Kinopoisk IDs.
- api.graphql.imdb.com — loads IMDb ratings and genres for bechdeltest.com.
- rating.kinopoisk.ru, www.kinopoisk.ru — load Kinopoisk ratings for
  bechdeltest.com, and search Kinopoisk when Wikidata has no match.

**Content scripts on movie catalogs** (IMDb, Kinopoisk, Letterboxd, TMDB, Trakt,
Rotten Tomatoes, Metacritic, Douban, FilmAffinity, AlloCiné, Filmweb) — read the
movie ID from the page address (on Letterboxd and Douban also the IMDb ID the
page shows) and show the movie's Bechdel Test score next to its title.

### Remote code

No, I am not using remote code. All code is in the package.

### Data usage

Collects none of the listed data types. Certify all three statements: data is
not sold to third parties, not used or transferred for purposes unrelated to the
single purpose, and not used for creditworthiness or lending.

**Privacy policy URL:**
https://github.com/rrokot/bechdel-test-for-movie-sites/blob/main/PRIVACY.md
