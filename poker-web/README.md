# RED — The Gambler's Clearing

Standalone browser successor to the Godot poker prototype. No dependencies or
external runtime services; sprites, audio, and font are bundled locally.

Play on GitHub Pages: https://szabadkai.github.io/red-gamblers-clearing/

Run `npm start` from the repository root to open the game. Inside this folder,
`npm run dev` starts the same server, `npm test` runs the suite, and `npm run build`
creates the deployable `dist/`. GitHub Pages serves this build at the site root.

## Menus and local tools

Settings and the field guide are available from the title and pause menus. Continue journey takes priority when a checkpoint exists. New journey asks before replacing it. The audio mixer preserves the original sound preference. Motion follows the device until you choose Full or Reduced.

Use Tab or the arrow keys to navigate, and Escape to go back. On a controller use the D-pad, A to select, B to go back and left/right to change a setting.

All practice and review instructions below use `npm run dev -- --dev-tools` on the loopback address printed in the terminal. Choose **Developer tools**, select a preset, then **Start practice**. The release build contains the player menu and omits the developer module and review fixtures.

## Story campaign

The five clearings now carry the [Red Riding Hood script](../docs/STORY_SCRIPT.md).
Mother sends Red with a basket and Grandmother's cards. Meet the stranger, Pip,
Rowan, and Sister Wren before confronting the Wolf in Grandmother's bedroom.

| Clearing | Encounter |
| --- | --- |
| Lantern Wood | Briar Hart: committed charges and rising roots |
| The Huntsman's Bridge | Tollkeeper: chain sweeps, hook slams, and moving mill platforms |
| Moss Cavern | Rowan: a guarded duel, followed by a returning axe |
| Ruined Chapel | Bell Widow: falling silk and low sound rings |
| Thorn House | Wolf: bites and leaps; a playable rescue inside him; a final garden fight |

Twenty dialogue scenes use the repository's supporting-character sprites,
portraits, staged scenery, captions, and a paused simulation. Enter/Space/E
advances; Skip scene or holding Escape skips with the same progression outcome.
The finale ends with a playable walk home alongside Grandmother. Existing routes,
including the bridge's lower passage, remain intact.

Each boss, the swallowed rooms, and the garden have retry checkpoints. The Briar Hart's
lantern offers **Keep my hand** or **Deal five**. Keeping carries the cards, saved draw and draw meter.
Use the buttons, press 1 or 2, or select with left/right and confirm with Enter (A on a gamepad).
R restores full health and the chosen opening deal for the Hart. Other encounter checkpoints deal a fresh hand. Continue restores
saved dialogue at its current line or restarts the saved encounter. On a trail,
Continue after a reload returns to the last opened briar gate with the embers carried so far. Saves use `red.poker.story.v3`; older
journeys migrate by clearing name. A saved completed journey can replay the final
encounter. Practice never writes story progress.

Every boss can be beaten with ordinary movement and sword attacks. Rowan's guard
blocks damage and draw credit until he recovers. Rare hands and Dark Red still
provide their normal benefits. The Explore / practice selector is grouped into poker hands, foes (one entry per behaviour), the five bosses and the
explorable clearings.

Character artwork reuses the dungeon atlas and `Assets/doc.png`. Missing large
creatures and scene props are drawn on the native pixel grid. See
[story asset sources](assets/story/README.md). Dialogue is captioned and types out while the speaker
mumbles: one synthesised syllable per vowel, repitched per character (`voice` in `story-data.mjs`, samples
`voice_*` in `sfx.mjs`). The first press finishes a line, the next advances. Motion Off shows lines at once, unvoiced. The campaign uses compact arenas and staged in-engine
scenes; its timing and difficulty still need a full human playthrough.

Implementation: `story.mjs` owns progression and saves; `story-data.mjs` contains
dialogue and room layouts; `bosses.mjs` implements tells, attacks, and hazards;
`story-art.mjs` renders characters and sets. The underlying combat simulation
remains shared with existing card, movement, and enemy tests.

Run `npm test` and `npm run build` here. The 75 tests cover the existing routes and
mechanics plus story transitions, skip equivalence, validated saves, boss retries,
rescue-room reachability, hazard evasion, and defeating all six boss encounters
with a deterministic player using normal sword/movement inputs. The campaign
transition test uses direct damage to isolate progression; the boss playthrough
tests do not modify health or damage. These checks do not replace a full human
balance playthrough. Have a second developer review before merging.

For local visual review, open `tests/story-review.html` from the dev server. It
uses practice state, can open every cutscene, and records an 18-second Hart fight
using scripted keyboard inputs and the actual game canvas. It and the separate
`tests/story-art-preview.html` are excluded from the release build.

[Scripted Hart gameplay capture](../docs/poker-prototype/story-hart-demo.mp4) ·
[Chapel scene](../docs/poker-prototype/story-chapel.jpg) ·
[Cottage scene](../docs/poker-prototype/story-cottage.jpg).
The recording uses normal keyboard events; it is a combat sample, not a full
campaign playthrough. Browser QA checked dialogue advancement and skipping,
exact-line reload/Continue, practice selection, pause/resume, death/retry,
and the opening, cottage, chapel, and rescue-room layouts.

## Play

A/D or arrows move. Hold Space for a higher jump; release for a short hop.
Shift dashes. Hold J for sword attacks. K plays the highlighted poker combination. The strongest is selected whenever your cards change. Q or the Cycle button previews other scoring combinations, including different suits in a three of a kind. Only the highlighted cards are spent. Click a card or press its slot number (1–5)
to throw that card for 6 damage and keep the rest. With a saved draw, the same
controls replace the chosen slot.
S or Down drops through raised platforms. P/Escape pauses. R retries the current clearing.
New journey in the menu starts from Lantern Wood.
A gamepad with the standard mapping also works: stick or d-pad moves (down drops through), A jumps, X swings,
Y plays the hand, LB cycles combinations, B/RB/RT dash, Start pauses. In scenes A advances and Start skips; at a card drop, left/right
take that card and B leaves it; A confirms the menu button. A saved card cannot be slotted from the pad (it still
fills a slot when a hand is played). Checked against a simulated pad only, not real hardware.
On touch screens (coarse pointer, or once the screen is touched) the left half of the world is a floating joystick:
it centres wherever the thumb lands, trails the thumb past its rim, and pulling it down drops through a ledge. Round
buttons fan out from the bottom-right corner: JUMP (largest, hold for a higher jump), SWORD, DASH and HAND.
They hide on the title, in scenes and at card choices; menus, dialogue, card choices and hand slots are tapped
directly. Checked with simulated touches in a 740×360 touch viewport, not on a real phone. The game is laid out
for landscape: on a touch screen held upright a prompt asks to turn the phone (tap to play upright anyway). Touch
devices also get a Full screen button (it locks landscape where the browser allows) and short vibrations on getting
hurt, finishers, kills and the bear's roar where the browser supports them (not iPhone Safari).
On touch screens text has minimum sizes (the stage-relative sizes fell to 5-8 px on a phone), the keyboard legend and
the chapter label are hidden, and scenes say "Tap to continue": a tap anywhere in a scene finishes the line, then
moves on (a click does the same on desktop).
`tests/harness.js` steps the game frame by frame in a browser for visual checks.
The card dock, health, settings and pause/help menus stay inside one 16:9 viewport.

Cross five authored clearings: Lantern Wood, Broken Crossing, Moss Cavern, Ruined Chapel, and Thorn House.
Each is 4800 units long, in four sections closed off by briar gates. A gate opens once every foe
before it has fallen and restores one heart; foes behind a closed gate stay dormant and cannot be hit.
Collect three embers in each, clear the last section, and reach its lantern. Retrying after a death
returns to the last opened gate with the earlier sections still cleared. Checkpoint posts preserve your
position after pits (falling costs a heart). The camera looks ahead: Red sits in the left third facing right and the right third facing left. It only shifts after
she has faced one way for 0.4 s and then eases over about a second, so quick turns to swing don't move the view. Movement uses fixed 60 Hz updates,
120 ms coyote time, a 140 ms jump buffer, variable jump height, ground/air
acceleration, and a brief invulnerable dash. Blur or hiding the tab pauses and
clears input. Progress saves at clearing entrances and at every opened briar gate in this browser. Continue returns to the
last opened gate (or the entrance) with five hearts and five fresh cards. Existing v1 saves migrate by destination; new saves use stable clearing IDs.
Practice never overwrites journey progress. Unavailable browser storage is
reported; there is no cross-device sync, and nothing is saved between gates.

Every third landed sword swing in a row is a finisher: 5 damage instead of 2 (10 instead of 4 as Dark Red), a
harder knockback and a two-frame hit stop, swung with the character pack's rising crescent slash (`attack2`, unused
before). After 4 s standing still Red glances around (the pack's `look_intro` row), then again every 7 s. The chain breaks after 1.1 s without a landed swing or when Red is hurt.
Hearts mend: playing a pair or better that spends at least one heart card restores one heart (kickers and lone
high cards do not count, and nothing is gained at full health). The hand panel says so, the heart it would
restore is shown dim red, and card-drop hints mark choices that would make a mending hand.
The other suits add their own flavour the same way (`FLAVOURS` in `model.mjs`), so every pair carries two: spades make
the bolt pierce every foe in line, each diamond spent fills a notch of the draw meter, and clubs knock foes back and
daze them for 1.2 s (gold stars; bosses shrug it off). The hand panel lists them under the effect, the banner names
them when played, and card-drop hints include them.

Each clearing is graded S to D when its boss falls: 100 points, minus 6 per heart lost, 15 per retry and 1 per 4 s
over par (at most 20), plus 5 for a flush or better (`gradeClearing` in `story.mjs`; par is about twice the soak bot's
time). The tally survives retries and is saved with the story. The clearing screen shows the grade and what earned it;
the best grade and best time per clearing are kept in `red.poker.records` and the best grade shows beside the
clearing's name on the title screen.

Thorn House's painted backdrop gets only a light dusk wash (it used to be greyed out), its undergrowth uses the
terrain sheet's bushes in dusk greens with scarlet berries (`house-bushes`, built in `prepareScenery`) instead of the
bright cartoon bush from the old forest strip, and lone warm lights (lit windows, lamps) survive the scenery
speck cleanup. Moss Cavern's briar gates are lighter so they read against the cave.

Long ledges no longer all carry the same banner: by ledge, a banner, a curtain of swaying vines or roots, or a small
lamp on a chain hangs underneath.

Lantern Wood has blinking fireflies near the trail and Moss Cavern has water dripping from the roof and splashing on
the floor (Motion Off freezes both).

The room inside the Wolf is a dark ribcage that breathes (Motion Off holds it still), with pieces of the rooms he
swallowed hanging in it: the kitchen door, hearth and table, a chapel window and bell, a turning mill wheel. Its ledges
are flesh with a bone lip. The walk home uses Lantern Wood's painted forest and grass under a dawn wash with a low sun.
The health display blinks at one heart (not with Motion Off).
The last hit plays out as a 0.9 s slowed death beat (Red's silhouette burns red, the scene dims) before the retry
screen; falling into a pit skips it.

Five unique cards are dealt initially. Three landed sword swings drop one
face-down card near the enemy. Touch it to pause combat and reveal two choices.
World cards render behind enemy sprites so they cannot obscure a combat pose.
Click a choice or press 1/2 to take that exact card; the other is discarded and
combat resumes. Escape leaves the pickup and both choices intact. Step away and
return to reopen it. Uncollected pickups keep their own distinct card pairs.
If your hand is full, the chosen card is saved; click a slot or press 1–5 to
replace it. Use that saved card before collecting another pickup. K consumes
only the matching combination, keeps kickers, and automatically fills a slot
with the saved card. Spent cards reshuffle. Poker never earns draw credit.

Pairs are heavy bolts; two pair explodes; trips and straights pierce. Flushes and
higher activate six seconds of Dark Red with double sword damage and faster
movement. Full house fires both ways; four of a kind bursts around Red; straight
flush combines burst and wave. Practice deals reset into a flat testing arena;
Retry clearing leaves practice and restores the saved clearing. They never silently alter a normal run.
The Card drop practice starts with a pair and offers a third seven versus an
ace of spades, demonstrating immediate trips versus building toward a flush.

Scouts use the smaller teal 19-pixel body from the dungeon sheet (the old 26-pixel orc is reserved for brutes). Player, living enemies, and corpses use the same shared native-pixel scale. Scouts patrol until aware of Red, chase, leap to reachable higher ledges, then
telegraph a committed lunge. A separate four-frame idle loop plays during patrol pauses. Brutes telegraph a wider slam and can also traverse reachable platforms.
Both expose recovery time. Sword hits interrupt scouts, runners and mages, but a brute or guard that has begun
its slam braces through them: it flashes white, takes the damage and still slams, so leave its reach and punish
the recovery. A played poker hand does break the slam. Brutes can be jumped
over; scouts can be dodged behind. On a story trail, foes ignore Red until that clearing's opening scene has played. A platform graph plans multi-hop routes, including climbing, same-height gaps,
and dropping through one-way ledges. Every transfer obeys measured jump reach;
unreachable surfaces do not cause teleportation.

In the story journey, each clearing's three embers unlock a dedicated boss room. Defeating the boss advances the story. Keepsakes and their upgrades remain removed.

Three additional characters use their own idle and movement frames from the dungeon sheet: Goblin Runner (fast committed lunge, 10 HP), Lantern Mage (0.8-second tell followed by a fixed aimed shot, 18 HP), and Iron Guard (0.85-second slam tell and long recovery, 42 HP). Shots can be jumped, dashed through, or cut with a sword; parries earn no draw credit. All three use the same platform-routing graph as scouts. The practice menu offers isolated fights plus direct exploration of the two new environments.

Ravens fly (`flyer`, 8 HP; every flyer uses the `raven` sheet, the older `forest_crow` sheet is bundled but unused): they perch until they notice Red, hover above and to one side, then dive
along a dotted tell at the ground under her. The dive is aimed when the tell begins, so stepping aside evades it;
the bird then sits where it landed for 0.9 s, which is the moment to strike. They ignore ledges, roam their whole
gated section, return to their perch when Red is out of sight, and fall to the ground when killed in the air.
Thirteen former ground runners on the Huntsman's Bridge, in Moss Cavern and in the Ruined Chapel are now flyers;
the remaining runners there are boars. Practice has a Raven entry.

Stags charge (`charger`, 30 HP): from up to 220 away on Red's ledge a stag rears for 0.7 s (attack row, a line on
the ground shows the run), then charges up to 300 along the ledge on its special row and stops where the ledge
ends. Jump it or dash through it. It does not flinch from sword hits while rearing or charging (a played hand stops
it) and is open for 1.1 s afterwards. Four of the five guards on the Huntsman's Bridge are now charging stags. Two of the Ruined Chapel's seven heavies
(brambles and living trees) became boars: a no-dodge test brawler took 2.4 hits per foe there against 1.1–1.4 elsewhere,
now 1.95.

Wisps (`will_o_wisp`, `lost_wisp`; still `mage` behaviour) cast on their attack row. Once a wisp has cast, if Red is
within 170 when it is next free to act it blinks instead: 0.5 s on its special row, during which it cannot be hit,
reappearing 190 past her on a ledge near hers. It always casts again before it can blink again, so the opening is
the 1.35 s after a shot. Practice has Stag and Wisp entries.

Every caster's tell is now the first half of its attack row, and its shot matches it: witches throw a violet bolt,
mushrooms a spore puff, wisps the teal orb, hunters arrows (`SHOT_LOOK` in `cast.mjs`). A witch alternates her bolt
with a hex: for a 1 s tell on her special row the ground Red stood on is marked violet, then flames burn there for
0.5 s. Leaving the mark avoids it; staggering or killing her during the tell cancels it.

Brambles are rooted: they never walk or hop. From within 112 they raise a vine for 0.85 s and lash 120 ahead of
themselves only, so being out of reach or behind them is safe. Like other heavies they brace through sword hits
during the tell and are open for 1.1 s after. Practice has Witch and Brambles entries.

Four more creatures use the special row of their sheet:
- Living tree: when Red is 90–260 away it marks the ground under her for 0.9 s, then roots stand there for 0.4 s
  (at most once every 3 s). It still walks and slams up close. A played hand during the tell cancels the roots.
- Spore mushroom: once it has spat, if Red is within 95 when it is next free it swells for 0.6 s and bursts into a
  cloud 150 wide that hangs for 1.6 s and hurts inside. It must spit again before it can cloud again.
- Ghost hunter: like the wisps it slips away after a shot when Red is within 170, but it glides through her in
  ghost form over 0.5 s instead of vanishing. It cannot be hit on the way.
- Brown bear: at half health it roars for 0.8 s, once, then walks 1.6 times as fast and slams that much sooner;
  its health bar turns red.
Foe and boss attacks have sounds: a thud for slams, lashes and landings, a twang for arrows and casts, a whoosh for
lunges, charges, dives and boss strikes, and a crackle when a hex, roots or a spore cloud erupts (`sfx.mjs`).
Patches are drawn over the foreground foliage so a bush never hides a tell; the tree's tell is a dark crack with
green tips that push up as it runs out. Patches (`world.patches`: the hex, the roots, the cloud) share one rule: a tell owned by a foe, cancelled if that
foe is staggered or killed first, then a harmful area. Practice has Tree, Mushroom, Ghost hunter and Bear entries.

The opening is two short scenes (nine lines in all), then a lone wolf to fight: the hunter that used to share its
ledge waits further along the first section. Plain scouts and runners get a first-time hint too ("watch the wind-up,
dash through the lunge"), and plain casters one about dodging or cutting shots.
On a journey, the first time each kind of foe notices Red a one-line hint names its counter (`hintFor` in
`enemies.mjs`), and the first time Red is hurt holding a hand that would mend, a hint says so. Each hint shows once;
the set is kept in this browser (`red.poker.hints`) and cleared by New journey. Practice never shows them.

In phase two the Wolf follows each leap with a second one at wherever Red has moved, with a fresh landing mark and
a 0.45 s tell ("HE LEAPS AGAIN"), then rests as usual.

Boss warnings have a shape per attack and brighten and pulse as the hit nears: a growing shadow with a warm rim where
the Wolf will land, a silk thread and shadow for each of the Widow's drops, a cracked band with green tips pushing up for
the Hart's roots, a scorched band with sparks for the Tollkeeper's slam (and the shadows inside the Wolf).

The title screen shows a pixel wordmark (`assets/ui/logo.png`, built by `sources/lrrh_sprites/ui/logo.lua`: shaded
letters with an ace of hearts behind the D) and hides the in-game HUD text behind it.

The clearing-complete screen lists foes defeated, falls, the clearing's time and the best poker hand played.

Each boss fight opens with a 2.2 s title card (name and role, under the hint line) and the boss waits 1.5 s before
it starts. At half health every boss takes one second-wind beat: a short hit stop, a shake, a dark burst and
"SECOND WIND", which marks the switch to its phase-two pattern.

`tests/soak.test.mjs` sends an invulnerable hunter (`tests/support/hunter.mjs`) through every clearing: it follows the
same ledge graph as the foes, swings at the nearest one and plays any pair. It checks that every foe can be reached
and killed and every gate opens; it does not dodge, so it says nothing about difficulty. It found that a foe on a
ledge overhanging lower ground hopped back onto its own ledge forever; hops down now clear the ledge's end.

The environment reuses the generated forest and stone from the earlier Red web
prototype. Generated
paintings are reduced once and then drawn into the same 960×540 presentation canvas as the
sprites. Scenery reduction uses nearest-neighbor sampling, a 20-color palette,
hard alpha edges and removal of isolated texture flecks; it does not blur or
dither. Original
terrain, foliage and character animation remain in use.
Moss Cavern and Ruined Chapel now use generated panoramic backgrounds, eight transparent modular props, and readable stone material, all prepared at the shared logical pixel pitch. Four independently scrolling depths replace the repetitive small columns. Terrain variants share exact edges, and panoramas wrap horizontally; `tests/material-preview.html` verifies the final runtime pixels and shows repeat grids. Source files and full generation prompts are in `assets/concept/ART_NOTES.md`.
Warm trail lanterns mark checkpoints; banners, mushrooms, falling leaves and
separate stone treatments distinguish the route. Thorn House has a new generated
background. Separate distant scenery, woodland silhouettes, transparent oak
canopy and foreground foliage scroll at distinct rates; Motion Off freezes the
background planes. See assets/concept/ART_NOTES.md for prompts and provenance. Sound is on by default and starts with the first click or key press; the Sound button's
setting is remembered in this browser. Music stops when paused or away.

## Storybook cast

Enemies and townsfolk use the Little Red Riding Hood roster from the Aseprite project
(`assets/cast/<name>_sheet.png`: 32×32 cells, rows idle/run/attack/special/hit/death).
`cast.mjs` keeps each behaviour (scout, brute, runner, mage, guard) and dresses it per clearing:
wolves, hunters and boars in Lantern Wood; stag, witch, boars and ravens on the bridge; ravens, boars, mushrooms and
wisps in the cavern; brambles, trees and the ghost hunter in the chapel; the wolf in disguise at Thorn House.
Windups play the attack row, hits flash, and corpses play the death row.
The ghost hunter, spore mushroom and will-o'-wisp use `_small` sheets (24, 16 and 23 px tall, about 20% smaller than first drawn),
made like the other small sheets by deleting repeated rows and columns (`sources/lrrh_sprites/shrink/`).
Bowmen (rogue hunter, ghost hunter) use the ranged behaviour: they draw on the attack row and loose arrows.
Mother, the woodcutter and Grandmother stand at the start of the first two clearings and by the hearth,
and speak a line when Red is near. A hit foe slides back over about a fifth of a second instead of jumping there, and foes show a health bar only once
hurt. Enemy run cycles advance with distance travelled, so slow patrols walk and fast foes race. Hitboxes and balance are unchanged.

The Briar Hart, Tollkeeper and Bell Widow use 96×96, 48×48 and 64×64 cells respectively in `assets/bosses/`.
The Wolf uses the roster's `big_bad_wolf` sheet. The attack and special rows follow the combat timers.
The Widow's eight-frame walk follows distance traveled. She draws silk between her foreleg and veil before
the drops, and swings the brass bell beneath her abdomen to send out low rings. To replay both attacks,
start **Developer tools → Bell Widow → Start practice** and bring her below half health.
Her editable poses are in `sources/lrrh_sprites/boss_gen/bell_widow.lua`. Run it in Aseprite, then copy
`sources/lrrh_sprites/bosses/bell_widow_sheet.png` into `poker-web/assets/bosses/`.
The Huntsman's Bridge uses a 16×16 stone tileset. It shares native grass and masonry colors with Lantern Wood. Each crossing pairs a 160-pixel round arch with a 112-pixel relief arch and crops its last deck tile at the collision edge.
The tower, oaks, shrine and mossy boughs share the foreground cache in `bridge-art.mjs`.
Boss hits use body boxes measured from the art (`BOSS_BODY` in bosses.mjs) for the sword, bolts and blasts;
the Tollkeeper's chain sweep is drawn and only hurts where its tip has passed. On the flagged local server, add `?hitboxes` to the URL to see them.

## Files and checks

- `model.mjs`: deterministic movement, level, poker, combat, and card lifecycle.
- `enemies.mjs`: enemy state transitions and limited ledge-jump decisions.
- `game.mjs`: rendering, sprite animation, audio, input, moving cards and DOM HUD.
- `environment.mjs`: native-scale terrain tiles, cliff recesses, foliage and the home entrance.
- `scenery.mjs`: shared-raster generated art, atmosphere, trail lanterns and gates.
- `journey.mjs`: five clearing definitions and migrated browser persistence.
- `art.mjs`: pixel-grid snapping, anatomical sprite pivots, enemy frames and cast silhouettes.
- `animation.mjs`: character clip priority, contact/recovery timing, blink and air poses.
- `style.css`: responsive in-viewport HUD and pixel hearts.
- `tests/`: 54 tests, including a complete no-enemy route through all
  three embers to the lantern, deck conservation, movement timing, transformation,
  elevated attacks, and enemy states. The route test verifies geometry, not combat
  balance. Real browser inspection confirmed asset loading, pause/resume, hand
  consumption, and flush transformation without console errors. Draft checks
  cover frozen simulation, Escape/reopening, exact-card reserves, overlapping
  pickups, safe drop placement, and conservation of all 52 unique cards.
  Browser QA also verified Escape/reopening and choosing the seven, saving it,
  then replacing slot five to make three of a kind, with no console errors.
  Journey tests complete all five routes without upgrades or falls and exercise
  direct progression/retry, legacy migration, and malformed or blocked storage.
  These route tests remove enemies; they establish reachability, not combat balance.
  Earlier browser checks cover the opening climb/ember/combat,
  save/continue, card-choice Escape/reopening, and a visual parallax pan.
  A full human playthrough and balance pass across all five clearings remain useful.

The model is independent of rendering, so tests exercise the actual game rules.
The flagged local server exposes the read-only `window.__POKER_STATE__` diagnostic snapshot.

## Credits

Original project character, card, tileset and forest art is reused under its
existing terms; see `assets/ASSET_RIGHTS.md`. Audio credits are in
`assets/AUDIO_CREDITS.md`. Silkscreen by The Silkscreen Project Authors is bundled
under SIL Open Font License 1.1 (`assets/FONT_LICENSE.txt`):
https://github.com/googlefonts/silkscreen

The world and moving cards share a 960×540 canvas, enlarged without smoothing.
Original character and card assets retain their existing 2× world scale.
Character and enemy sprites use their native pixel scale without stretching.
Sword damage lands on the contact pose. Dark Red attack pivots account for the
eight-pixel left margin and six transparent rows below the feet. Both forms use
the original dash frames. Jump/fall clips hold their final pose; idle blinks are
spaced out. Entering Dark Red uses the Light-to-Dark clip; expiry uses the
Dark-to-Light clip and FX. Moving, jumping, dashing or attacking interrupts the
body morph while its FX finishes. A sword swing keeps its initial facing, form
and damage through expiry; refreshing active Dark Red does not replay the morph.
`tests/animation-preview.html` checks both transformation directions and a live
sequence of movement/attack poses with the same animation selector as the game.
Casts have chunky ink-edged silhouettes and cream cores. Animated comic starbursts
and WHAM / KRAK / K.O. markers emphasize heavy hits. Poker hits add 2–5 frames
(33–83 ms) of hit stop and a short, decaying camera shake. Feedback triggers once
per played hand on contact, including multi-target and twin-wave attacks. The
HUD stays still, pending input survives the freeze, and Motion Off disables shake.
Enemy slams use physical dust. Red's jumps, landings and ground dashes kick up small dust puffs (hidden with Motion Off).
Collectible embers have a larger ink-outlined gold orb, a steady white core, and
a four-pose sparkle/bob animation at six frames per second. Motion Off holds a
static pose; pickup positions and collection radius are unchanged.

Terrain reuses `Assets/tiles.png`; the home reuses the original gothic tileset,
with a timber porch, sign, lantern and three ember sockets. Its doorway lights
when all embers are collected. Ground gaps have dark recessed rock faces and
broken rope ends. Outdoor clearings keep their small plants and mushrooms, with
no repeated oval bushes on the trail or below the ground line. Interior rocks
and rubble stay over solid ground so they never bridge a chasm.
The world framing exposes more cliff depth below the grass.
Characters and bridge masonry render at two world units per source pixel.
The opening clearing retains its geometry and pickup positions. Its lantern now
leads onward; the home entrance completes the third clearing.
`tests/environment-preview.html` provides local art checks for the chasm and
both home states; it is excluded from the deployed build.
Transformation and magic bursts retain the original frame animation assets.

`tests/journey-preview.html` reviews all five scenes and provides a camera-pan
control for checking independent depth planes. It is excluded from deployment.
Screen captures are in `../docs/poker-prototype/`: `journey-play.mp4` and
`parallax-pan.mp4`, plus historical stills. The keepsake screen is no longer part of the game.

## Enemy and environment expansion QA

Run `npm test` and `npm run build` from this folder: 54 tests pass, including
five complete routes with enemies removed, new enemy tells/routing, hostile-shot
collision/parrying/pause, and old-save migration. Combat balance across a full
five-stage run still needs human playtesting.

Browser smoke check: open the local game, select Boar in Explore / practice,
press Start practice, approach with D, attack with J, jump with Space and play K.
Pause with P; repeat with Hunter and Living tree. Choose Explore Moss Cavern
or Explore Ruined Chapel for the authored encounters. No console warnings or
errors appeared during these checks. `../docs/poker-prototype/runner-combat.mp4`
is a short 3-fps sampled browser capture; `moss-cavern.jpg` and
`ruined-chapel.jpg` show the two environments in the game viewport.


The environment-v2 pass was checked in the browser with both Explore options,
including movement, jumping, combat, pause/resume, and Motion Off. The material
fixture checks 81 terrain variant pairs per theme in both directions and both
panorama edges after quantization. New screenshots: `moss-cavern-v2.jpg`,
`ruined-chapel-v2.jpg`, `character-scale-v2.jpg`; sampled traversal clip:
`environment-v2-play.mp4`, all under `../docs/poker-prototype/`.


## Huntsman’s Bridge showcase

The second clearing now uses authored stone arches, a windowed chapel ruin,
rooted red-leaf oaks, mossy boughs and a candlelit lower passage. Separate distant
ruins and waterfall scenery, subtle warm light pools, animated banners and leaves
provide depth. Motion Off freezes decorative drift, flicker and background parallax.
The hand keeps its existing card faces; the surrounding HUD and dock have darker
storybook framing. Stable clearing IDs preserve existing journey saves.

Run `npm run dev -- --dev-tools`, open **Developer tools** at the printed URL, and choose **Explore / practice →
Explore The Huntsman’s Bridge → Start practice**. This leaves journey saves untouched.
The area also appears normally as the second campaign clearing.

The [foreground comparison](../docs/poker-prototype/bridge-stone-comparison.png)
shows Lantern Wood and both bridge crossings at the same gameplay zoom. The [campaign screenshot](../docs/poker-prototype/bridge-stone-in-game.jpg)
shows it with the combat HUD. The [lower-passage replay](../docs/poker-prototype/bridge-stone-crossing.mp4)
follows Red across the deck and into the first arch with enemies removed.

`tests/bridge-preview.html` compares 480×270 and 960×540 rendering, shows landing
surfaces, pans the camera, and replays both routes using the real movement model
with enemies removed. It is excluded from the production build.

- Upper route: climb the left ruin, jump onto the oak bough for ember one, descend
  across the bridge, climb the middle ruin for ember two, then follow the next
  branches and right-hand ruin to ember three and the exit lantern.
- Lower passage: reach the bridge deck, move above the candlelit alcove, press S
  to drop to the lower shelf, move right, then jump to the root ledge and far bank.
- Automated checks cover all five completion routes, the lower passage reconnect,
  practice save isolation, combat, cards, animation and terrain edges.

This is the first environment showcase, not a replacement of every clearing's
art. Existing enemy sprites and combat abilities remain; a bespoke huntsman enemy
and a full five-clearing combat-balance pass are still future work.
Generated source assets and prompts are recorded in `assets/concept/ART_NOTES.md`.

Bridge verification (2026-11-13): 54 tests pass and the production build succeeds.
Browser review completed the upper replay with 3/3 embers and zero falls, and the
lower passage with zero falls. Live checks covered the opening jump, sword hits,
enemy damage/knockback, poker casting, card pickup and choice, dash, pause/resume,
and Motion Off; no console warnings or errors were reported. The art fixture's
sampled draw times were about 0.3–0.6 ms on this machine; this is not a full-game
frame-rate benchmark. Full combat balance remains unmeasured.

Evidence: `../docs/poker-prototype/huntsmans-bridge.jpg`, `bridge-combat.jpg`, and
`bridge-lower-route.mp4` (a short sampled replay with enemies removed).


## Atmospheric lighting pass

The renderer adds clearing-specific light shafts and low background mist, warm
lantern and collectible glows, platform-clipped character shadows, and luminous
spell trails. Atmosphere stays behind terrain and actors. Reduced Motion freezes
the new atmospheric drift and lantern flicker and removes spell-trail particles.
Gameplay rules, controls, source artwork and license notices are unchanged.
The reusable effects live in `lighting.mjs`, which is included in the static build.

Verification (2026-11-21): `npm test` passes all 148 tests; `npm run build` succeeds.
Browser checks covered all five clearings, Reduced Motion, sword combat, poker
casting, jumping, pause/resume, Settings and Field guide navigation. No browser
errors or warnings were reported. This was a visual smoke check, not a full
campaign balance or low-end-device performance benchmark.

To reproduce: run `npm run dev -- --dev-tools` from the repository root. Open
`/tests/graphics-preview.html` at the printed local URL, choose a clearing and
click **Show clearing**. **Reduced motion** toggles the display setting.
**Record combat · 8 seconds** replays movement, sword attacks, a jump, a flush
and a dash with practice invulnerability, then exposes a recording download.
The fixture is excluded from the production build. For live control checks, use
**Developer tools → Start practice**, D to approach, J to swing, K to cast,
Space to jump and P to pause.

Evidence in `../docs/poker-prototype/`: `graphics-wood.png` and
`graphics-chapel.png` are native renderer captures (DOM HUD text is not part of
the canvas); `graphics-gameplay.jpg` includes the live HUD;
`graphics-combat.mp4` is the eight-second canvas recording.


## Glowing woodland flora

Sparse ivory lilies and red mushroom clusters now decorate outdoor ledges and
banks; Moss Cavern uses teal mushrooms. The bridge opening has three clusters,
and the other opening views have two to four. Lilies have warm halos around
their bells, while cavern mushrooms glow teal. Lighting stays steady with
Reduced Motion. Decorations sit behind characters, avoid collectibles and
checkpoints, and do not alter collisions or controls.

The atlas is `assets/environment/woodland-flora.png`; editable sprite source and
provenance are in `../sources/woodland-flora/`. Placement and glow are handled
by `flora.mjs`. To inspect, run `npm run dev -- --dev-tools` from the repository
root, open `/tests/graphics-preview.html`, select a clearing and click **Show
clearing**. Live bridge review is under **Developer tools → The Huntsman’s
Bridge → Start practice**.

Verification (2026-11-21): all 148 tests pass and the production build succeeds.
Placement checks cover all five clearing geometries; browser review covered
bridge and cavern art, Reduced Motion, movement, sword animation and menu
pause/settings/resume. No browser errors or warnings were reported.
Screenshots in `../docs/poker-prototype/`: `woodland-flora-bridge.png`,
`woodland-flora-cave.png` (native renderer captures), and
`woodland-flora-gameplay.jpg` (live game with HUD).
