# Snapshot regression harness

Pixel-regression guard for the image generators. Renders a fixed matrix of
representative requests (every thumbnail/cover/logo style, aspect variants,
badge/winner/overlay features, league/team images, and a few cross-league
cases) and sha256-hashes each PNG.

## Commands

```bash
npm run snapshot:update   # render the matrix, write the baseline manifest
npm run snapshot          # render again, fail if any PNG hash changed
```

`snapshot:update` writes `manifest.json` (committed) and PNGs to `baseline/`
(git-ignored). `snapshot` renders to `current/` and compares hashes, exiting
non-zero on any CHANGED / errored / missing / new case.

## Verifying a pixel-preserving refactor

Rendering is deterministic given identical source-logo bytes, so do this in one
session:

1. On the pre-change tree: `npm run snapshot:update`
2. Apply the refactor
3. `npm run snapshot` -> every case must report **identical**

If a case legitimately should change, regenerate the baseline and review the
`baseline/<id>.png` vs `current/<id>.png` diff by eye.

## Notes

- The committed `manifest.json` is a convenience baseline. Upstream logo CDNs
  drift over time, so regenerate it right before a refactor rather than trusting
  an old commit.
- Adding a case to the matrix in `snapshot.js` requires a `snapshot:update` to
  record its baseline hash.
- The harness boots the server in-process on port 3199 with caching disabled so
  every request re-renders.
