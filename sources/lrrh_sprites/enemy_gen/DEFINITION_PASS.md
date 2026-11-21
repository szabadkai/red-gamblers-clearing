# Boar and stag definition pass

The editable pixel grids in `wild_boar_poses.lua` and `forest_stag_poses.lua`
define the updated artwork. The boar has connected fur shading, a separate eye
socket, ivory tusk and muted snout. The stag has stepped antler shading, a
clearer cheek and stronger separation between its haunch, shoulder and legs.

All 34 frames per character retain the original 32×32 cells, transparency masks,
sheet layout and frame durations. No opaque pixels were added or removed. The
256×192 runtime sheets contain only fully opaque or fully transparent pixels.
Animation and gameplay code are unchanged.

Regenerate from the repository root with an Aseprite executable on PATH:

```sh
aseprite -b --script sources/lrrh_sprites/enemy_gen/wild_boar.lua
aseprite -b --script sources/lrrh_sprites/enemy_gen/forest_stag.lua
cp sources/lrrh_sprites/wild_boar_sheet.png sources/lrrh_sprites/forest_stag_sheet.png poker-web/assets/cast/
npm test
npm run build
```

The generators also update the editable `.aseprite` files, JSON metadata and
animation previews beside the source sheets. Original asset rights notices
remain applicable.

Review all six animation states in
[`enemy-definition-before-after.gif`](../../../docs/poker-prototype/enemy-definition-before-after.gif).
The comparison uses nearest-neighbor enlargement; it does not change the source
resolution. Run `npm start` to see the boars in Lantern Wood and the stags in
Huntsman's Bridge.

Validation: 151 tests passed; production build passed. Pixel-by-pixel alpha
comparison and animation metadata comparison passed for both sheets.
