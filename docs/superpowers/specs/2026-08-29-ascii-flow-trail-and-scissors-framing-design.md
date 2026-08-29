# ASCII Flow Trail and Scissors Framing Design

## Goal

Add a monochrome ASCII cursor trail behind the complete hero and enlarge the
existing ASCII scissors without clipping its silhouette. Preserve the URL
shortener as the primary interactive element and keep the About section,
bottom blur, and footer unchanged.

## Scope

- Add a decorative ASCII trail covering only the first-page hero.
- Make the trail follow pointer movement with momentum and a short fade.
- Keep the trail behind the hero content and the scissors.
- Correct the scissors' asymmetric geometric centering.
- Enlarge the scissors while keeping the complete silhouette visible on desktop
  and mobile.
- Preserve all shortening, result, clipboard, navigation, and LinkedIn behavior.

## Out of Scope

- Importing the Framer module at runtime.
- Copying Framer component source into the application.
- Adding a canvas, animation, or pointer-gesture dependency.
- Making the scissors respond to pointer movement, touch, scroll, or form state.
- Changing the hero's approved desktop column ratio.
- Changing backend, Azure, Docker, workflows, deployment, or API behavior.

## Architecture

Create a focused `AsciiFlowTrail` component backed by a 2D canvas. The component
owns pointer sampling, trail state, animation, resize handling, and drawing. It
is mounted as an absolute decorative layer inside a new hero wrapper and does
not share state with React Three Fiber.

Keep reusable trail math in a small pure module. Deterministic helpers calculate
grid cells and intensity from trail samples, allowing focused tests without a
browser canvas or animation loop.

The existing `AsciiScissorsHero` continues to own the Three.js canvas,
visibility, reduced-motion state, and responsive ASCII resolution. Scissors
framing changes remain inside the model/camera boundary and do not affect the
page grid.

## Hero Layering

The hero becomes a positioned container with this visual order:

1. Transparent black page background.
2. `AsciiFlowTrail`, absolute and restricted to the hero bounds.
3. Existing hero content and `AsciiScissorsHero`.
4. Existing fixed `DitheringOverlay` and `BottomBlur` according to their current
   page-level z-index behavior.

The trail canvas uses `aria-hidden="true"` and `pointer-events-none`. It cannot
receive focus, block selection, or intercept form interaction. Pointer position
is observed outside the canvas and converted to hero-local coordinates.

## Trail Appearance

- Character palette: ` .:-=+*#%@`.
- Foreground: white with per-cell opacity.
- Background: transparent.
- Monochrome only; no colored glow.
- Sparse output: cells with negligible intensity are not drawn.
- A compact grid and low overall opacity prevent competition with the form and
  scissors.
- Momentum smooths pointer movement; recent samples form a short fading tail.
- The effect is inspired by the supplied Framer reference, but implemented
  independently for this application.

Initial tuning targets are a 10-14 pixel cell size, 90-140 pixel influence
radius, 18-30 retained samples, and maximum alpha between 0.35 and 0.5. Browser
verification determines the final values within those ranges.

## Trail Lifecycle

- Resize the backing canvas to its rendered CSS size and current device pixel
  ratio, capped to avoid excessive work.
- Run `requestAnimationFrame` only while the hero is visible and reduced motion
  is not requested.
- Use `IntersectionObserver` with a low threshold to pause offscreen drawing.
- Remove pointer, resize, media-query, and observer listeners during cleanup.
- If `IntersectionObserver` is unavailable, keep the effect active while the
  component is mounted.
- If a 2D context cannot be created, render no trail and keep the hero usable.

With `prefers-reduced-motion: reduce`, do not track or animate the trail. The
existing scissors remains rendered in its static initial pose through its
current demand frameloop behavior.

## Scissors Framing

The procedural model is asymmetric around its local origin: its approximate
horizontal bounds are `-1.37` to `2.86`. Center the visual bounds by shifting
the model group approximately `-0.75` on X before applying ambient rotation.

Increase the model from its current `0.88` scale toward approximately `1.1`, and
move the camera from `z=6.5` toward approximately `z=5.7`. Final values must:

- Make the scissors occupy most of the right visual column on desktop.
- Keep both handles, both blade tips, and the center fastener visible throughout
  the approved Y rotation and X oscillation.
- Keep the complete silhouette visible in the mobile `38svh` region.
- Avoid horizontal page overflow.

The hero remains approximately `52% / 48%` at `768px` and above. Enlarging the
scissors must not reduce the form column or overlap the form.

## Accessibility and Input

- Both trail and scissors remain decorative and hidden from assistive
  technology.
- The trail layer never captures pointer events.
- Pointer movement influences only the trail, never the scissors or form.
- Keyboard focus order and visible focus styles remain unchanged.
- Touch movement does not drive the trail; mobile renders the scissors without
  adding gesture handling.
- Reduced motion stops continuous trail and scissors animation.

## Performance

- Use one 2D canvas and no additional dependency.
- Avoid React state updates per frame; mutable refs own animation data.
- Skip cells below the visibility threshold instead of drawing spaces.
- Cap device pixel ratio and sample count.
- Pause both rendering loops when the hero is offscreen.
- Keep the trail independent from the Three.js render loop so either layer can
  pause without forcing the other to redraw.

## Testing

Add focused tests for:

- Deterministic trail intensity/grid helper output.
- Decorative markup: `aria-hidden`, `pointer-events-none`, and hero-scoped
  positioning contract.
- The approved ASCII palette and transparent background contract.
- Existing scissors geometry and fallback tests.

Run all frontend tests, the production frontend build with
`VITE_API_URL=https://api.example.invalid`, and backend regression tests. Browser verification is required at
`1440x900` and `390x844`.

## Acceptance Criteria

1. A white monochrome ASCII trail follows the pointer within the complete hero.
2. The trail remains behind content and never blocks form interaction.
3. The trail does not continue drawing while the hero is offscreen or reduced
   motion is enabled.
4. The scissors is visibly larger and geometrically centered.
5. The complete scissors silhouette remains visible during its ambient motion.
6. Desktop preserves the approved `52% / 48%` layout.
7. Mobile preserves content-first order and the `38svh` scissors region.
8. No horizontal overflow exists at `1440x900` or `390x844`.
9. The URL shortening, loading, result, and clipboard flows are unchanged.
10. No Framer runtime, copied Framer module, or new dependency is introduced.
11. Frontend tests, frontend build, and backend tests pass.
