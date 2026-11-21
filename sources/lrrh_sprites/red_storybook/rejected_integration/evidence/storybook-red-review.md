# Storybook Red movement revision

The first version substituted card-throw poses for both melee attacks, slowed the
run cycle, omitted the sword crescents, and used the same spell gestures for the
transformation. This revision supplies dedicated movement and combat sheets.

## Try it

1. Run `npm start` from the repository root and open the printed URL with
   `?skin=storybook`, or choose Settings → Red’s appearance → Storybook Red.
2. Continue a journey. Move with A/D, jump with Space, dash with Shift and land
   while holding a direction. The cape and leg silhouettes change for each phase.
3. Hold J near a foe. The third connected combo swing uses the rising crescent;
   the other melee swings use the horizontal sword stroke. K plays the hand with
   the separate overhead attack.
4. Play a Flush or stronger hand to enter Dark Red. When stationary, the cloak
   closes, changes color and unfolds; movement can interrupt the body animation.
5. Pause with Escape, switch between Original Red and Storybook Red in Settings,
   then resume. Controls, hitboxes and damage remain the same.

For a repeatable bridge setup, run `npm run dev -- --dev-tools` and choose
Developer tools → The Huntsman’s Bridge → Start practice. This does not replace
the campaign checkpoint. The Flush preset provides a quick transformation check.

## Evidence

- `storybook-red-motion.gif`: original and revised animation sequences side by
  side, rendered using the runtime frame selectors.
- `storybook-red-gameplay.png`: revised character in the bridge practice area.
- `storybook-red-settings.png`: appearance selection in the settings menu.
- `storybook-red-gameplay.webm`: browser interaction recording.

The focused regression checks cover the impact window, distinct melee strokes,
light/dark stride periods, rise/fall settling, landing priority, blink cadence,
hurt/death overrides and morph direction. Browser checks cover menu persistence,
switching skins, movement, jumping, dashing, casting, melee damage, hurt, defeat
and retry. Generated artwork remains an adaptation of the original animation,
not a frame-for-frame redraw of every purchased source frame.
