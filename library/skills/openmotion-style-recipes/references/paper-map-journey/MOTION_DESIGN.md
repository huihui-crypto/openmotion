# Paper map journey — MOTION_DESIGN.md

**Status:** recipe / draft. No executable template or rendered comparison yet.

**Use for:** travel explainers, itineraries, destination introductions and expansion stories (offices, stores, launches).

## Look

| Element | Starting value |
| --- | --- |
| Map | Cream paper base `#F3EEDF`, mint paper terrain `#BFE3D0`, water in pale blue; layered cut-paper edges with soft shadows |
| Route | One red line `#D7263D`, dashed while travelling, solid once completed |
| Stops | Paper-cut landmark or photo cutout per stop, with a small label tag |
| Type | Clean sans for place names; a bigger number for day or stop order |

## Motion

- Open on the whole country or region, then zoom to the first stop (1–1.5 s ease-in-out).
- Draw the route between stops along an SVG path; the camera follows the line head.
- At each stop, pop the landmark up from the map like a pop-up book (300 ms), hold 2–4 s with one fact.
- Close by pulling back to show the full completed route.

## Inputs

Required: place list in order, one fact per stop, aspect ratio. Optional: photos, narration. Map outlines must come from an open dataset with its licence recorded; do not trace copyrighted maps.

## Avoid

Wrong geography or invented borders, more than five stops in 30 seconds, labels that overlap the route.

## Review

Stop order and positions are geographically correct; each label is readable; the route never jumps; the map data source and licence are recorded.
