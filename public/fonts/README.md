# Particle fonts

The canvas particle renderer needs glyph **outlines**, which means a real
`.ttf`/`.otf` parsed by opentype.js — not a webfont CSS class.

Bundled: `ChenYuluoyan-2.0-Thin.ttf` (same font a0kuma/font3d ships).

## Adding a justfont (or any web) font for exact particles

justfont serves dynamically-subset **woff2** via CSS classes — opentype.js
can't read those. To get real particles for a justfont family, convert it to a
`.ttf` first, then register it:

1. **woff2/otf → ttf** with [antlarr-suse/ttf-converter](https://github.com/antlarr-suse/ttf-converter):
   ```sh
   ttf-converter myfont.woff2 -o myfont.ttf
   ```
2. Drop `myfont.ttf` in this folder.
3. (Optional) generate the `@font-face` web set with
   [zoltan-dulac/css3FontConverter](https://github.com/zoltan-dulac/css3FontConverter):
   ```sh
   convertFonts.sh myfont.ttf
   ```
4. Add an entry to `PARTICLE_FONTS` in `src/canvas/fonts.js` (`ttf` = the URL,
   `family` = the `@font-face` name). It now appears in the "Particle font"
   picker with pixel-exact particles.

Until a matching `.ttf` is added, selecting a justfont family styles the
(invisible) DOM layer only; particles fall back to the active bundled TTF.
