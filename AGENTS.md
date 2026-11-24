# AGENTS.md

- Run `npm run check` and `npm test` after every change.
- Never run `npm version` or push tags without an explicit request: a `v*` tag
  publishes to the Chrome Web Store.
- Keep `README.md` for end users only: no build steps, architecture or
  internals.
- When the data sent or the hosts contacted change, update `PRIVACY.md` and the
  permission justifications in `store/listing.md`.
