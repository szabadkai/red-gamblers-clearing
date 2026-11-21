# Woodland flora

Original pixel sprites authored for RED on 2026-11-21, inspired by the user's
reference direction: hanging ivory lilies and red woodland mushrooms. No pixels
were copied from the reference or any purchased sprite pack. The atlas and its
source remain part of this repository; no separate third-party asset license or
blanket reuse license is introduced.

Run `python3 sources/woodland-flora/generate.py` from the repository root with
Pillow installed to regenerate `poker-web/assets/environment/woodland-flora.png`.
The transparent atlas is 192×24 pixels, with six 32×24 cells drawn at 2× in-game.
The bottom row is the root anchor. The original editable shapes and palette are
in `generate.py`; `poker-web/flora.mjs` owns placement and lighting.

| Cell | Sprite |
| --- | --- |
| 0 | Tall ivory lilies, three hanging bells |
| 1 | Short ivory lilies, two bells |
| 2 | Large red mushroom cluster |
| 3 | Small red mushroom pair |
| 4 | Large teal mushroom cluster |
| 5 | Small teal mushroom pair |

Sparse groups follow real platform surfaces. The bridge opening has three
clusters, with lilies on its boughs and mushrooms on its bank. Other opening
views have two to four. No flora is placed on indoor furniture or in arenas.
Plants render behind actors, with space around embers, checkpoints and exits.
Lilies have warm per-bell light and a wider halo; cave mushrooms glow teal.
The glow is steady in both Full and Reduced Motion.

Review with `npm run dev -- --dev-tools`, then open
`/tests/graphics-preview.html` and select a clearing. Choose **Show clearing**.
Native renderer captures omit the DOM HUD; live browser screenshots include it.
