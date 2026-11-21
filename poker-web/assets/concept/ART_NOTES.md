The Feather/Step/Briar concept files are retained as source references only; the keepsake system has been removed and these images are not loaded by the game.

# Journey artwork — 2026-11-08

The forest, stone, feather, step and briar images are reused from
`asset-archive/web/concept/`, generated for the earlier Red web prototype.
Their original files are preserved. The forest is the distant Lantern Wood and
Broken Crossing background; the stone is foreground masonry; the three illustrated
objects are keepsakes with new poker-platformer effects.

Two new assets were generated with the built-in image-generation tool, then copied
into this project. No API/CLI fallback was used:

- `thorn-house.png`: a separate background for the final clearing.
- `parallax-oaks.png`: a true-alpha tree canopy, rendered as a separate image plane.

The runtime downsamples paintings once. All scenery then passes through the same
480×270 raster as the moving cards, player, enemies and impacts. Pixel sprites
retain their native scale. The oak sheet is framed once across the clearing rather
than tiled, avoiding visible cropped-edge seams.

The local crispness pass uses nearest-neighbor sampling, a shared 20-color
scenery palette, binary alpha, and two passes merging isolated color flecks into
adjacent clusters. This replaces the former smoothed reduction. It preserves
the source images and all parallax planes; keepsake illustrations are unaffected.

The depth planes move at 0.10× (distant painting), 0.24× (original woodland
silhouettes), 0.46× (transparent oaks), 1× (gameplay), and 1.12× (near foliage).
Foreground plants stay below foot level and are omitted over gaps. Motion Off
freezes background parallax and decorative drift and hides the passing foreground.

## Thorn House prompt

Use case: stylized-concept. Asset type: wide atmospheric background painting for a
side-scrolling pixel-art fairy-tale game called RED. Create a new environment-only
image, landscape aspect ratio 16:7. A haunted woodland manor called Thorn House,
distant and set among enormous twisted oak trees and tangled briars, deep muted
petrol teal forest mist, restrained aubergine shadows, clusters of scarlet leaves
near upper framing branches, a few very small warm amber windows. A decaying
steep-roof stone manor is placed in the RIGHT THIRD, mostly in the middle distance
behind atmospheric haze, not a playable foreground building. Left and center two
thirds have layered woods and quiet mist, interesting depth, plenty of visual
breathing room for game characters and platforms to be rendered separately.
Moonlight through upper branches; muted contrast across the lower half so cream
and red sprites remain easy to read. Rich painterly pixel-art environment with
crisp color clusters and limited fine noise, SNES dark fairy-tale mood, mature
beautifully art-directed environment, mossy old stone and bark. Absolutely NO
text, letters, logo, UI, cards, characters, enemies, collectible glowing orbs,
ground plane or foreground platform geometry. No foreground tree trunks blocking
the center. No photorealism. No generic flat vector shapes. This will be downsampled
to a 560x244-pixel background at runtime; prioritize strong silhouettes and
readable light.

## Parallax oak prompt

Use case: stylized-concept. Asset type: a separate transparent PNG parallax tree
layer for RED, a side-view dark fairy-tale pixel-art platformer. Wide landscape
16:7 composition, real transparent alpha background. Show one large ancient
twisted oak tree along the LEFT EDGE, its crooked trunk rooted below the bottom
edge and a beautiful arching gnarled branch reaching from top left across the
TOP QUARTER, with sparse moss and deep wine-red leaves. A second very thin crooked
trunk only at the far RIGHT EDGE. Everything else is transparent. At least the
middle 70 percent and lower middle 80 percent of the canvas must be empty
transparent air. Trees painted in dark petrol teal, plum-brown bark and restrained
scarlet foliage, crisp painterly pixel-art clusters matching an atmospheric SNES
fairy tale. Detailed silhouettes, pleasing moss and bark ridges, subtle moonlit
blue-green bark edges. This is a MIDGROUND LAYER to place over a separately painted
forest at a different scroll speed, NOT a complete scene. No sky, moon, fog,
ground, grass plane, house, scenery, text, frames, UI, game characters or
collectibles. No backdrop color. No checkerboard baked in. Do not place leaves or
branches through the central gameplay area. Intended to be downsampled to
560x244 pixels at runtime.

The final oak runtime surface is 860×244 to keep its cropped edges outside the
camera throughout the clearing. Source files are unmodified.

## Cave and chapel polish — local v2

Generated with the built-in `image_gen` tool, not the CLI. Workspace source files:

- `poker-web/assets/concept/moss-cavern-v2.png`
- `poker-web/assets/concept/ruined-chapel-v2.png`
- `poker-web/assets/concept/interior-props-v2.png`
- `poker-web/assets/concept/masonry-v2.png`

The PNGs are preserved generation outputs. The game creates its final pixel surfaces
once during loading: nearest-neighbor rasterization, the shared scenery palette,
binary alpha, isolated-fleck cleanup, and deterministic edge constraints. The two
panoramas repeat horizontally at 768×256 logical pixels. Individual props have
fixed logical-pixel dimensions and are always rendered at 2 world units per pixel.
The distant, middle, near, and foreground layers scroll at 0.12, 0.30, 0.54, and
1.12 camera speed. Props are spaced at different intervals to avoid regular columns.

Masonry uses a 96×96 logical-pixel tile and nine restrained tone variants per
material. The variants retain common stone geometry and share their boundary
pixels; shifting stone courses between variants was rejected because it made
visible joins. The runtime crops the horizontal framing rim before matching
opposite edges. Cave and chapel have separate material tints. The source images
are not themselves claimed to have mathematically matching edges.

`tests/material-preview.html` checks the actual prepared surfaces, after palette
conversion: zero mismatched edge channels for both panoramas and all 81 variant
pairs in both directions for each terrain material. It also displays repeated
panoramas and mixed tile grids for visual inspection. `tests/journey-preview.html`
shows the final environments. Motion Off freezes decorative parallax.

### Moss Cavern generation prompt

Use case: stylized-concept. Create ONE production background texture for RED, a sophisticated dark fairy-tale side-scrolling pixel-art game. Wide panoramic 3:1 aspect ratio. MOSS CAVERN beneath an ancient forest: huge irregular mossy limestone vaults, tangled descending oak roots, layered broken aqueduct remnants disappearing into deep teal distance, pools of cool blue light, sparse rusty red roots and foliage, tiny warm lantern niches. Carefully composed foreground-free middle distance with dark quiet lower half for readable combat. Beautiful varied silhouettes and depth comparable to a richly illustrated moonlit fairy-tale forest. Strict crisp pixel-art technique: large deliberate flat color clusters, hard stair-step contours, restrained 24-color petrol teal / slate / moss sage / muted plum / amber palette, no antialiasing, no blur, no fine speckle, no painterly fuzzy texture. Designed to read at 640x240 logical pixels. HORIZONTALLY SEAMLESS REPEAT: the left and right boundaries must continue the same dim rock and mist structures at identical heights and colors, no framing columns or unique bright focal point at an edge, continuous visual rhythm; not a mirrored scene. Texture fills entire image. No foreground platforms, ground plane, characters, enemies, objects resembling glowing collectible orbs, UI, words, border, or typography. This is the distant layer only; near roots and playable terrain will be separate.

### Ruined Chapel generation prompt

Use case: stylized-concept. ONE production background texture for RED, a sophisticated dark fairy-tale side-scrolling pixel-art platformer. Wide panoramic 3:1 ratio. RUINED CHAPEL hidden in the same ancient moonlit forest: majestic fractured gothic vaults and varied narrow arched windows, collapsed rose window ribs and distant cloister corridors, pale teal moonlight beyond openings, mossy stone, restrained old burgundy hanging banners and a few tiny amber votive lights. Rich architectural variation, asymmetrical damage and deliberate composition, layered depth, haunting and beautiful. Mid-distance only; the playable floor and near pillars will be separate. Dark quieter lower half behind the combat lane. Strict crisp pixel art designed to read at 640x240 logical pixels: confident chunky flat color clusters, hard stepped silhouettes, controlled 24-color petrol teal / slate / muted aubergine / sage / old gold palette. NO painterly blur, no antialiasing, no grain, no noisy microtexture. HORIZONTALLY SEAMLESS REPEAT: left and right edges continue matching dark recessed masonry and atmospheric colors at the same heights, keep distinctive windows and lighting away from boundaries, no framing border, not a mirrored scene. Entire image is texture. No foreground platforms, ground plane, characters, enemies, collectible orbs, text, logos, UI, borders. Match the sophistication of an illustrated fairy-tale forest but with legible hand-placed pixel clusters.

### Modular prop atlas generation prompt

Use case: stylized-concept. Production pixel-art environment PROP ATLAS for RED, a richly illustrated dark fairy-tale side-view platformer. Real transparent alpha background. Exactly EIGHT isolated modular decorations arranged in a precise equal 4-column by 2-row grid, each object wholly inside its own cell with ample transparent padding; NO cell borders or labels. Top row left to right: (1) tall crooked moss-covered root and limestone column, (2) hanging cluster of branching roots and slender stalactites rooted at top of its cell, (3) grounded rock outcrop with lush moss and layered fern fronds, (4) a small irregular cluster of pale blue shelf mushrooms growing from a mossy rock. Bottom row left to right: (1) tall weathered gothic stone pillar with decorative capital and broken footing, (2) ruined pointed arch with empty transparent opening and trailing burgundy ivy, (3) fallen carved stone fragments with ferns and dark red ivy, (4) a small gothic candle shrine with three tiny amber candle flames. Same source pixel pitch for all props, intended to become a 512x256 logical-pixel atlas with 128x128 cells. Crisp carefully composed PIXEL ART with large intentional flat clusters, clear stair-step contours, no fine noise or antialiasing. Sophisticated weathered stone and bark shapes, rich restrained slate teal / sage moss / plum shadows / desaturated scarlet / antique gold palette. Side elevation orthographic view, no isometric or perspective ground planes. Leave all gaps and arch openings truly transparent, no backdrop, no ground plane, no checkerboard, no shadows on the transparency, no glow haze. Objects must not touch each other or cross cell boundaries. This set must visually belong to a beautiful layered moonlit woodland game.

### Masonry generation prompt

Use case: stylized-concept. A production seamless masonry MATERIAL TEXTURE for a sophisticated pixel-art fairy-tale platformer. Square image completely filled edge to edge with a flat orthographic side view of old hand-cut limestone blocks, varied large and small interlocking rectangular stones, a few subtly chipped corners, confident dark recessed mortar, restrained moss in occasional joints. No perspective, no lighting gradients across the whole image. Cohesive muted slate teal and gray-green palette, sage moss, small warm ivory bevel highlights. CRISP LOW-RESOLUTION PIXEL ART authored as if the entire texture were exactly 96 by 96 pixels, upscaled by nearest neighbor. About six courses of stone across the height, five to seven blocks across the width. Each block has only 2-3 large flat shade clusters, a simple stepped bevel, occasional single clean crack. Polished readable crafted stone, NO mottled camouflage, NO noisy flecks, no granular rock texture, no painterly shading, no blur, no antialiasing. Strict seamless repeat in both directions: the top matches the bottom and the left matches the right; blocks and mortar continue across boundaries with no border. Suitable for extracting a mutually compatible modular platform tileset. No plants projecting off the surface, objects, characters, labels, text, framing, or UI.

## Huntsman’s Bridge showcase — November 2026

Generated with the built-in image-generation tool, not the CLI. Source outputs
are preserved in this directory:

- `bridge-atlas-v1.png`: transparent tower, oak, bridge arch and candle shrine.
- `bridge-distance-v1.png`: opaque distant forest, aqueduct and ravine panorama.
- `bridge-bough-v1.png`: transparent mossy oak bough.

The playable bridge uses the same 16×16 native cells as Lantern Wood. The bank
grass, earth, stone ledge ends and sprigs come directly from
`assets/environment/terrain.png`. Three stone courses fit in each 16-pixel
wall tile. Cut, chipped, damp and lichen-covered stone have eight matching
edge configurations each. The two crossings use four native arch maps.
Moss on coping, pillars, branches and ledges uses the five greens sampled from
Lantern Wood turf. Only sunlit growth uses the bright tuft highlights.

`sources/bridge/make_tiles.py` rebuilds `assets/bridge/stone-tiles.png`,
`assets/bridge/moss-bough.png` and `bridge-arches.mjs` with Python and
Pillow. Each branch slice is drawn at its native dimensions. Earlier painted
bays are archived at `asset-archive/web/concept/bridge-stone-bays.png`.

### Atlas prompt

Use case: stylized-concept. Asset type: production TRANSPARENT game environment atlas, square image with FOUR equal square cells in a strict 2 by 2 grid, generous transparent padding within each cell, nothing crossing cell boundaries. No grid lines or labels. Reference image is ONLY visual style reference, do NOT reproduce its complete scene, characters, UI, cards, text or background. Create four independent isolated side-view architectural cutouts for a sophisticated fairy tale pixel platformer. Upper left: tall broken gothic stone chapel wall, one tall glowing amber arched window, mossy irregular ruined top, small attached hanging lantern; wall fills most of cell, flat base. Upper right: enormous ancient gnarled oak, trunk on RIGHT half, wide near-horizontal branch reaching LEFT at upper third height, root buttresses at base, sparse rich scarlet leaves on upper canopy; clear transparent air below branch left of trunk. Lower left: a single substantial grey mossy stone bridge ARCH module viewed perfectly side-on, FLAT horizontal walkable deck along top at 15 percent cell height, thick voussoir stones around large open arch, two broad piers descending to bottom corners, truly transparent open arch interior; no perspective, no background inside arch. Lower right: a ruined low stone tunnel shrine with a dark recessed gothic opening, warm candles, a small barrel and mossy rubble to either side; no ground beyond its flat base. Style: extremely beautiful deliberate pixel art, crisp stepped edges and clustered shading, charcoal outlines, grey slate masonry with warm ochre upper highlights, olive moss, burgundy ivy, petrol teal shadows, warm amber lights. Match reference's detailed stone and bark without painterly fuzz or noisy speckling. Every object entirely contained in its own cell, separated by transparency. These are reusable sprite assets NOT a screenshot. No scenery backdrop, characters, enemies, cards, letters, numbers, UI, border or watermarks. True alpha transparency everywhere outside objects and inside arch.

Style reference: `docs/red-concept/references/01-bridge-gameplay.png`.

### Distant panorama prompt

Use case: stylized-concept. Production DISTANT BACKGROUND ONLY for a side-scrolling pixel-art fairy tale game. Wide landscape 3:1 panorama, blue teal moonlit ancient forest with enormous layered tree silhouettes, distant ruined gothic aqueduct partly swallowed by forest in center-left, narrow waterfall descending through deep ravine center-right. Pale blue moonlight behind canopy at top center. Muted burgundy leaves sparsely at far upper corners. Lower half dark teal atmosphere and deep chasm; low contrast enough for a separate playable bridge and small red character to read. Deliberately composed spacious scene, sophisticated crisp pixel-art clusters and stepped silhouettes, gentle mist bands separating distance planes, no blurry texture, no tiny noisy flecks. Palette deep ink blue, slate blue, desaturated petrol, pale blue-grey highlights, extremely restrained warm amber window points. No foreground trunks, no playable ground or foreground platforms, no close bridge, no characters, no cards, no UI or text, no border. Detailed but quiet background, all bright highlights in upper half. Whole image filled, opaque.

### Bough prompt

Use case: stylized-concept. Production sprite for pixel-art side view platform game. ONE isolated horizontal ancient oak bough on true transparent background, wide 3:1 landscape. The bough runs from left edge toward a thicker broken root joint on right. Entire object fully visible with transparent margin. Long mostly straight almost horizontal moss-covered top suitable as a walkable platform. Underside gently bows, varies organically, several slender hanging rootlets. Rich layered gnarled bark with dark plum grooves and warm muted brown ridges, thick sage and olive moss fringe, tiny ochre grass tufts, a small restrained cluster of red ivy dangling beneath near left end. No canopy or tree trunk, no leaves above platform, no scenery or ground. Beautiful detailed crisp PIXEL ART with deliberate clusters, stepped edges, black-blue outlines, no painterly blur. Matches sophisticated moonlit gothic forest game. No text, UI, characters, backdrop or shadow outside object. Object occupies middle horizontal third of image height; empty transparent air above and below.
