# GitHub Pages deployment

Repository: [szabadkai/red-gamblers-clearing](https://github.com/szabadkai/red-gamblers-clearing)

Game: [RED — The Gambler’s Clearing](https://szabadkai.github.io/red-gamblers-clearing/)

Run these commands from the repository root with Node.js 24 (the CI version):

```sh
npm test
npm run build
```

There are no npm dependencies to install. The build creates `poker-web/dist/`
and checks its module imports, worker, HTML/CSS links, asset inventory and license
files against a nested project URL. Tests, local developer hooks, source artwork
and the archive are excluded from the release.

`.github/workflows/pages.yml` runs the tests and build on pushes to `main`, then
uploads only `poker-web/dist/` and deploys it to GitHub Pages. Repository Settings
→ Pages must use **GitHub Actions** as its build source. The workflow can also
be run manually from Actions. Wait for both build and deployment to succeed,
then open the published game and check Begin journey, dialogue, combat,
pause/resume, Settings and Field guide.

All runtime URLs are relative, including the music worker and fonts, so a
repository rename does not require rewriting game asset paths. The `/poker/`
route within the current project redirects to its root. GitHub repository
redirects and Pages URLs are separate: use the new published URL after a rename;
the former `/red-local/` Pages address is not maintained by this repository.

The repository rename keeps the same Pages origin (`szabadkai.github.io`), and
the game retains its existing local-storage keys, so browser saves and settings
remain available. Future renames should update the two READMEs, this document,
package names and the Git remote, then redeploy and check the new URL.
