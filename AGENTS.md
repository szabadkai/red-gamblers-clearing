# Repository Guidelines

The browser poker platformer lives in `poker-web/`. Run `npm start`, `npm test`, and `npm run build` from the repository root. The static release is generated in `poker-web/dist/`. Keep reusable artwork, audio, source files and their license notices. See `docs/ASSET_INVENTORY.md` for the asset locations.

Keep gameplay rules in the simulation modules and DOM/canvas code in the renderer. Put focused regression checks under `poker-web/tests/`. For gameplay changes, capture a short recording and provide reproduction steps. Manually check combat and menu navigation before merging.

## Commit & Pull Request Guidelines
Follow the existing concise, imperative commit style (`fix enemy death state`, `add deathscreen`). Reference related issues in the commit body when available. Pull requests should include: summary of changes, test commands with their results, affected gameplay or UI, and any new controls. Add screenshots or GIFs for visual changes to UI, parallax, or combat feedback, and request review from a second developer before merge.
