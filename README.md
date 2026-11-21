# RED — The Gambler’s Clearing

A browser platformer in which Red builds poker hands to fight her way to Grandmother’s house. [Play the published game](https://szabadkai.github.io/red-gamblers-clearing/).

## Play locally

Double-click **Play.command** on macOS or **Play.bat** on Windows. Both open the game in your browser and work with Node.js or Python 3.

With Node.js installed, you can also run this from the repository root:

```sh
npm start
```

No dependency install or build is needed. The server normally opens http://127.0.0.1:4310/. If that port is busy, use the URL printed in the terminal. Leave the terminal open while playing and press Ctrl+C to stop.

Move with **A/D**, jump with **Space**, and swing the sword with **J**. **K** casts the highlighted combination. Your strongest hand is selected first. **Q**, the **Cycle** button, or **LB** on a controller cycles through other scoring combinations. Press **1–5** or click a card to throw it, or replace that slot when you have a saved draw.

To try the opening encounter, choose **Begin journey**, meet the stranger, and face right at the ford. Press **Q** once and **K** to play the jacks against the first wolf. Press **K** again to send the sevens through the boar and wolf on the far bank. You can also spend both pairs together.

At the final lantern in Lantern Wood, choose **Keep my hand** or **Deal five** before facing the Briar Hart. Both choices restore five hearts. Press **R** during the fight to retry with the same starting cards. [Watch the 11-second gameplay clip](docs/poker-prototype/lantern-wood-to-hart.mp4).

Open **Settings** from the title or pause menu to adjust music, effects, motion and full screen. **Field guide** covers controls, cards and clearing grades. During play, **P**, **Esc** or controller **Start** pauses the game. Choose **Title screen**, confirm, then **Continue journey** to return to your last checkpoint. [Watch the menu walkthrough](docs/poker-prototype/menu-walkthrough.mp4).

## Develop

| Command (repo root) | Result |
| --- | --- |
| `npm run dev` | Serve the game without opening a browser |
| `npm run dev -- --dev-tools` | Enable the local practice selector, review fixtures and diagnostics |
| `npm test` | Run the poker game’s tests |
| `npm run build` | Build the static site in `poker-web/dist/` |

Open **Developer tools** on the flagged loopback server to jump to a boss or try a preset hand. For the healing demonstration choose **Two pair · split the pairs** and **Start practice**. [Watch the practice replay](docs/poker-prototype/split-the-pairs.mp4).

Game code, runtime assets, and practice tools live in [poker-web](poker-web/README.md). The [Pages workflow](.github/workflows/pages.yml) publishes the static build at the site root. The `/poker/` route within the current site redirects to it.

The repository is named **red-gamblers-clearing**. See the
[deployment guide](docs/DEPLOYMENT.md) for release checks and rename behavior.
Editable artwork and music live in [sources](sources/README.md); reusable
prototype assets live in [asset-archive](asset-archive/README.md). Original
purchased packs remain in `Assets/` with their license notices.

## Artwork and audio

The [asset inventory](docs/ASSET_INVENTORY.md) lists the originals, archived web sprites, Godot art resources, music sources and concept references. Asset rights and credits are recorded in [ASSET_RIGHTS.md](ASSET_RIGHTS.md) and [the audio credits](poker-web/assets/AUDIO_CREDITS.md).

## Credits

### Audio

**Sound Effects** — [80 CC0 RPG SFX](https://opengameart.org/content/80-cc0-rpg-sfx) (CC0 Public Domain)
Used for attack, enemy, boss, pickup, checkpoint, transform, and UI sounds.

**Player Movement SFX** — [12 Player Movement SFX](https://opengameart.org/content/12-player-movement-sfx) (CC-BY 4.0 / CC-BY 3.0)
Used for jump, land, and player hurt.

**Forest Theme** — [Forest Whisper Theme](https://opengameart.org/content/forest-whisper-theme) by Cleyton Kauffman (CC0)

**Boss Theme** — [Dark Ambience Loop](https://opengameart.org/content/dark-ambience-loop) by Iwan Gabovitch (CC-BY 3.0)

### Art

- Tileset: [0x72 Dungeon Tileset II](https://0x72.itch.io/dungeontileset-ii)
- Licensed character animations (Light & Dark forms); purchased assets are not offered for reuse
- 6-layer parallax forest backgrounds


The illustrated forest, stone, and three card images were generated for this
project; see [art notes](docs/red-concept/ART_NOTES.md). Chapter scenery overlays
are code-drawn. No additional purchased asset packs were added for the campaign.
