# Glitch logo sting — MOTION_DESIGN.md

**Status:** recipe / draft. No executable template or rendered comparison yet.

**Use for:** 2–4 s logo openings and end cards for tech, music, gaming and fashion brands.

## Look

| Element | Starting value |
| --- | --- |
| Background | Near black `#050505` or the brand's dark colour |
| Logo | The user's SVG or transparent PNG, unchanged in shape and colour once settled |
| Glitch | RGB channel split (red and cyan copies offset 4–12 px), horizontal slice displacement, brief scan lines |

## Motion

1. 0–0.6 s: signal noise and scan lines; logo fragments flash in displaced slices.
2. 0.6–1.4 s: two or three sharp glitch bursts (2–4 frames each) with RGB split.
3. 1.4 s: the logo snaps clean and holds; one final 2-frame flicker is optional.
4. Add a short digital sound hit on the snap; keep it optional and replaceable.

Build with CSS/SVG layers (three logo copies with `mix-blend-mode: screen` and clip-path slices) so timing stays editable. Generated video is not needed.

## Inputs

Required: logo file. Optional: tagline, brand colour, sound preference.

## Avoid

Distorting the logo in the final hold, flashing faster than three times per second for more than a moment (photosensitivity), glitch that lasts longer than the clean hold.

## Review

Final frame matches the supplied logo exactly; flashes stay within accessibility limits; the sting reads at 2× playback speed too.
