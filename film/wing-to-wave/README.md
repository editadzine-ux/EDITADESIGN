# Motion study 01 — fire → wing → wave

EditaDesign | *Chaos, by design.* Test shot for the full film: one drawn edge changes meaning three times.
7.0 s · 1920×1080 · 24 fps · H.264 + AAC.

| file | what |
|---|---|
| `out/EditaDesign_fire-wing-wave_study_1920x1080_24p.mp4` | master, with the three-note motif |
| `out/EditaDesign_fire-wing-wave_study_silent.mp4` | same picture, no sound |
| `out/EditaDesign_fire-wing-wave_study_review_3-4s_quarter-speed.mp4` | the middle second (3.0–4.0 s) at ¼ speed, for the "name the wipe" check |
| `out/contact-sheet.jpg` | 12 frames, 0–7 s |
| `render.py` | the picture: plates, hand-keyed contours, mesh, timing (all editable constants at the top) |
| `sound.py` | the motif, synthesised (D4 → A4 → E5) |
| `build.sh` | rebuilds everything from the original screenshots |

## The shot

| time | beat | what moves |
|---|---|---|
| 0.0–1.7 | Fire | close view of one butterfly between two flames; a bend travels along one yellow filament of the flame band, the neighbouring lines answer 3 frames later, and the bend arrives where the flame touches the wing root |
| 1.7–3.4 | Air | the same bend runs root→tip along the wing; the wing opens on its hinge (root leads, the outer edge lags, overshoots and settles); the space under it becomes the shape of the wave's hollow; the double reading is held ~8 frames |
| 3.4–5.5 | Water | the wing's upper edge rolls forward into the lip (body first, lip last, outer edge ahead of inner); blue striations enter from the shared edge and run outward along the veins; the wing's spotted lower margin lands on the wave's white inner rim; flames under the arch settle into burnt orange, flames on the sky side burn down to dark; a strand of foam peels off as the crest tips over |
| 5.5–7.0 | Recognition | the actual painting, held; only the foam, the strand (beading into droplets) and a few lines at the lip keep moving |

## How it is made

* **Plates.** Only the artwork is used. Phone and Pinterest UI are cropped out: fire source px x 328–712, y 730–946 at 5×, and wave px x 31–913, y 385–881 at 2.18×. At 5× the fire linework is re-inked: a soft re-quantisation onto the print's own 12-colour palette keeps the screen-print edges crisp instead of JPEG-soft.
* **One contour, keyed on both artworks** at the same landmarks: hinge / wing root ↔ where the lip leaves the wave body (P1), highest point of the arch (P3), inflection (P4), tip ↔ lip (P6). The coordinates are in `WING_A/B` and `WAVE_A/B`, in source pixels.
* **A strip mesh** (u along the edge, v across it) moves through three poses: rest wing → open wing (the wave silhouette at 0.5× pinned on the real hinge, blended 30 % with the real wing) → wave lip. Both textures are sampled through the mesh, so ink and paint stay anchored to the surface as it bends.
* **No wipes.** There is no iris, no picture-in-picture, no global dissolve and no zoom. The surroundings settle pixel by pixel, triggered by their distance to the moving contour. The backdrop never contains a second, static wave; the lip is removed from it and supplied only by the moving silhouette.
* **Camera.** Designed locked (`--locked`); the master adds a 2.8 % drift that settles onto the painting's true framing.

## Sound

Three notes in rising fifths. **D4**: a muted wooden pluck, completely dry (fire). **A4**: rides on a breath of band-passed air as the wing lifts (air). **E5**: starts dark, then its filter and room open, with a low wash under it (water). A few high grains mark the foam strand. 1.2 s of silence is left around the bend, and the wing moves with only breath under it. Levels: about −18 LUFS, peaks −6 dBFS.

## Rebuild

```bash
pip install numpy opencv-python-headless scipy
./build.sh /path/to/originals out            # master + silent + review
./build.sh /path/to/originals out --locked   # locked-camera variant
```
`originals/` must contain `1000158906.jpg` and `1000158936.jpg` from the film kit. They are not committed here: both are third-party artworks captured from Pinterest, and their rights need clearing before any public use of this study or the film.
