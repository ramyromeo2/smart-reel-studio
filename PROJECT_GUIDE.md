# Smart Reel Bulk Generator — Complete Guide

A code-first pipeline that turns text + AI images into vertical MP4 reels.

This is the working memory of our session — the project, the three reels we built, the workflow we developed, and every technique we learned along the way. Treat this as your reference manual.

---

## 1. What this project actually is

**The idea**: instead of editing videos by hand in Premiere/CapCut, we write the video as **code**. Each reel is a React component. We swap text + images, hit a command, and out comes an MP4. Bulk-friendly — feed a CSV of 100 rows, get 100 videos.

**The stack:**

```
CSV / JSON (content)
   ↓
AI image generation (Pollinations / fal.ai / ChatGPT)
   ↓
React + Remotion components (the actual video as code)
   ↓
Headless Chrome screenshots each frame
   ↓
ffmpeg encodes screenshots → H.264 MP4
   ↓
out/<slug>.mp4
```

**Why this approach is goated:**
- Bulk-generate hundreds of variants from one CSV
- Pixel-perfect repeatability — same input always produces same output
- Every CSS effect/animation in the browser works (filters, blurs, springs, glitch, particles)
- Costs ~$0 per video (free image gen) up to ~$0.03/video (paid image gen)
- Version-controllable — your "videos" are just text files

---

## 2. Repository layout

```
smart-reel-bulk-generator/
├── src/
│   ├── Root.tsx              ← registers all Remotion compositions
│   ├── index.ts              ← Remotion entry point
│   ├── SmartReel.tsx         ← Reel #1: medical/healthcare bulk template
│   ├── style.css             ← styles for SmartReel
│   ├── TokyoReel.tsx         ← Reel #2: cinematic neon travel reel
│   ├── tokyo.css             ← styles for TokyoReel
│   ├── RightCareReel.tsx     ← Reel #3: ref-video clone (5s build so far)
│   └── rightcare.css         ← styles for RightCareReel
├── scripts/
│   ├── render-bulk.mjs       ← CSV → bulk renders the SmartReel template
│   ├── render-tokyo.mjs      ← gens AI photos + renders TokyoReel
│   ├── render-rightcare.mjs  ← (could be added) gens AI photos + renders RightCareReel
│   └── lib/
│       └── gen-images.mjs    ← AI image generation (Pollinations + fal.ai)
├── public/
│   └── generated/            ← cached AI images per reel/slug
│       ├── tokyo/
│       └── rightcare/
├── content.csv               ← input rows for SmartReel bulk
├── sample-props.json         ← test props for SmartReel
├── tokyo-props.json          ← test props for TokyoReel
├── rightcare-props.json      ← test props for RightCareReel
├── preview.html              ← static HTML preview for fast iteration
├── out/                      ← rendered MP4s land here
├── tmp/                      ← scratch (intermediate frame extracts, etc.)
├── ref.mp4                   ← any reference video we're studying
└── package.json
```

---

## 3. The three reels we built

### Reel #1 — `SmartReel` (medical/healthcare bulk template)

- **What**: CSV-driven reel for Saudi medical brands. 5 scenes (Hook → Number → Cards w/ photos → Steps → Final CTA).
- **Vibe**: Bright, trustworthy, brand-blue. Arabic RTL.
- **Duration**: 35s (1050 frames @ 30fps).
- **Input**: A row of [content.csv](content.csv) with brand colors, headline, 5 card texts + AI image prompts, 3-step process texts, CTA, phone, website.
- **Use case**: Bulk-generate dozens of healthcare ads from one CSV.

**Render it:**
```bash
npm run render:bulk
```
This reads every row of [content.csv](content.csv) and produces an MP4 per row.

### Reel #2 — `TokyoReel` (cinematic neon)

- **What**: A premium 40-second travel reel — completely different aesthetic from SmartReel. Showcases advanced animation tricks.
- **Vibe**: Tokyo nightlife. Black + magenta + cyan. Cinematic. English LTR.
- **Duration**: 40s (1200 frames @ 30fps).
- **Animation tricks demonstrated**:
  - Typewriter character-by-character text reveal
  - Letter-spread (letter spacing animates outward)
  - RGB-split glitch effect on text
  - Numeric counter (0 → 48 ticks up)
  - Floating particle field
  - Ken Burns slow zoom + parallax pan
  - Vertical clip-path wipe transitions between locations
  - Pure-CSS map pin with spring drop + 3-ring pulse
  - Vignette + film grain

**Render it:**
```bash
npm run render:tokyo
```
Generates 8 AI photos (free via Pollinations or paid via fal.ai if `FAL_KEY` is set), then renders to `out/tokyo-48h.mp4`.

### Reel #3 — `RightCareReel` (clone of the family-support reference reel)

- **What**: A replication of the reference reel about family support during patient recovery. Replicating a real production-quality Saudi medical ad piece by piece.
- **Vibe**: Same as the reference — calm, trustworthy, brand-blue, Arabic RTL.
- **Duration**: First 5 seconds done (150 frames). Will extend to 27s when complete.
- **Status**: Scenes 1 (Family Hook) + 2 (Title Drop with circle reveal + headline + cyan pill subtitle) ✅. Scenes 3-6 pending.

**Render it:**
```bash
npm run render:rightcare
```
Output: `out/rightcare-v1.mp4` (the first 5 seconds).

---

## 4. How Remotion actually works under the hood

The single most important mental model to internalize:

> **Remotion renders React components 1,200 times, takes a screenshot each time, glues the screenshots into a video.**

That's the entire system. There is no magic.

### Frame-by-frame loop

```
for frame = 0 to durationInFrames - 1:
   tell React: "useCurrentFrame() now returns this number"
   React re-renders the components with new frame value
   each component computes its visual state for this frame
     (opacity, transform, color, position — all interpolations)
   Chrome paints the page (HTML + CSS + SVG)
   take a PNG screenshot of the viewport
   save the PNG
```

When you write:
```tsx
const opacity = interpolate(frame, [0, 30], [0, 1])
```
…you're saying *"at frame 0 opacity = 0, at frame 30 opacity = 1, smoothly interpolate."* When Remotion calls your component with `frame = 15`, your CSS literally becomes `opacity: 0.5` and Chrome paints it that way. At frame 16, React re-renders with new opacity. New screenshot.

**Every frame of every video we made is a literal browser screenshot.**

### Parallelism

Remotion isn't doing this one-at-a-time. The `--concurrency=50%` flag spawns multiple headless Chrome workers (we saw ~16 in `ps` during the Tokyo render). Each worker takes a chunk of frames simultaneously. Massive speedup.

### Final encode

Once all the PNGs exist, Remotion pipes them into a bundled `ffmpeg` binary (lives in `node_modules/@remotion/compositor-darwin-x64/ffmpeg`). ffmpeg encodes the frames + audio track to H.264 MP4. Out.

### What this means for what we can do

- **Any CSS effect works**: filters, blurs, gradients, animations, transforms, backdrop-blur, mix-blend-mode, clip-path, container queries
- **Any web tech works**: SVG, Canvas, WebGL, Three.js, even iframes
- **Any React library works**: framer-motion, lottie, d3, charts, all of it
- **Images load like in a browser** — that's why AI images go in [public/](public/) and we use `staticFile()` — Chrome serves them as if from a webserver

### Limits

- ~10-50ms per frame to paint in Chrome
- Heavy effects (huge blurs, lots of DOM nodes) slow each frame down
- Audio sync requires using `<Audio>` component, not HTML `<audio>` tag

---

## 5. AI image generation

We support three sources, ranked by quality vs cost vs friction:

### Pollinations.ai — FREE, no API key

- **Endpoint**: `https://image.pollinations.ai/prompt/<URL-encoded-prompt>?width=1080&height=1920&model=flux&seed=N`
- **Cost**: $0
- **Speed**: ~10-20s per image
- **Quality**: Pretty good with Flux model
- **Limitation**: occasional rate limits, less consistent
- **Use**: development, prototyping, anything where the image is a placeholder
- **Code**: [scripts/lib/gen-images.mjs](scripts/lib/gen-images.mjs) → `callPollinations`

This is how all 8 Tokyo reel images got made. Completely free.

### fal.ai — paid, fast, reliable

- **Endpoint**: `https://fal.run/fal-ai/flux/schnell`
- **Cost**: ~$0.003 per image (Flux schnell)
- **Speed**: ~2s per image
- **Quality**: Same Flux model on dedicated GPUs — way more consistent
- **Setup**: `export FAL_KEY=your_key` (sign up at fal.ai)
- **Use**: production, bulk runs, anything where you want consistency
- **Code**: [scripts/lib/gen-images.mjs](scripts/lib/gen-images.mjs) → `callFal`

### ChatGPT (DALL-E / gpt-image) — manual, best at humans

- **Where**: ChatGPT web app
- **Cost**: $20/mo Plus subscription
- **Speed**: ~30s per image, but interactive
- **Quality**: **Best at humans** — coherent multi-person scenes, accurate clothing/ethnicity, natural skin tones, follows detailed prompts faithfully
- **Use**: humans (especially groups), brand-critical hero shots
- **Workflow**: paste prompt into ChatGPT → it generates → you save the image into `public/generated/<reel>/<filename>.jpg`

This is what we use for the RightCare reel's family photo. ChatGPT crushed it where Pollinations couldn't get the composition right.

### Auto-fallback logic

The script picks automatically:
```js
const chosen = provider || (FAL_KEY ? 'fal' : 'pollinations');
```
If `FAL_KEY` is set → fal.ai. Otherwise → Pollinations. Zero code changes when you toggle keys.

### Image caching

Once generated, an image is saved to `public/generated/<slug>/<key>.jpg` and **never regenerated** unless you delete the file. Iteration is free — only first run pays the cost.

---

## 6. The workflow we developed for cloning reference videos

This is the playbook for "give me a reel like THAT one."

### Step 1 — Receive the reference

User drops an `.mp4` (or any video) into the project folder. Even Arabic-named files work — we just `cp` it to `ref.mp4` for sanity.

### Step 2 — Probe + extract frames

```bash
# Probe specs (width, height, fps, duration)
ffprobe -show_entries stream=width,height,r_frame_rate,duration,nb_frames ref.mp4

# Extract evenly-spaced frames as JPGs
ffmpeg -i ref.mp4 -filter:v scale=540:-1 -q:v 3 tmp/ref-frames/f_%03d.jpg
```

We grab ~17 frames covering the whole reel. Half-resolution is enough to analyze.

> Note: macOS doesn't ship with ffmpeg. We use the bundled Remotion binary at `node_modules/@remotion/compositor-darwin-x64/ffmpeg` (needs `DYLD_LIBRARY_PATH` set to the same dir so it can find its dylibs).

### Step 3 — Read every frame and write up a scene-by-scene analysis

Claude reads each extracted frame as an image and notes:
- Scene boundaries (where backgrounds/layouts change)
- Color palette (exact hex codes)
- Typography (font weight, casing, kashida-style elongation, alignment)
- Persistent overlay elements (corner logos, headers)
- Animation tricks per scene
- Pacing (how many frames each scene gets)

The result is a markdown breakdown that becomes the build spec.

### Step 4 — Plan in phases

Break the build into **bite-sized pieces**:
- **Phase A — Assets**: which AI images we need, with exact prompts
- **Phase B — Theme**: CSS palette, fonts, persistent header
- **Phase C — Scenes**: build each scene one at a time
- **Phase D — Wire up**: register composition, props, render script
- **Phase E — Iterate**: render, watch, polish

The user signs off on each piece before moving to the next.

### Step 5 — Generate assets

Either:
- **AI prompts via ChatGPT** for human-heavy scenes (RightCare workflow)
- **Pollinations.ai prompts** for fast iteration (Tokyo workflow)

User drops images into `public/generated/<reel>/`.

### Step 6 — Build scenes

Create `<ReelName>.tsx` + `<reel-name>.css`. Use shared animation primitives:
- `WordReveal` — word-by-word fade + rise
- `Typewriter` — character-by-character
- `LetterSpread` — letter-spacing animates outward
- `GlitchText` — RGB-split intro
- `Counter` — numeric tick-up
- `PhotoBackdrop` — image + overlay
- `Particles` — floating dots
- `CircleReveal` — radial glow scale-in
- `PillWipe` — clip-path stencil wipe

(These are scattered across the three `.tsx` files — could be extracted into `src/primitives/` if we keep going.)

### Step 7 — Render + review

```bash
npm run render:<reelname>
```

Pull frames from the output MP4 with the same ffmpeg flow. Compare side-by-side with the reference frames. Iterate timing, easing, positioning, colors. Render again. Repeat until matching.

### Step 8 — Browser preview for fast iteration

For visual tweaks (especially CSS values like overlay opacity, gradient stops, positions), render once → open a hand-written `preview.html` that mirrors the static end-state of the scene → live-tweak CSS values with sliders → bake approved values back into the Remotion CSS. Way faster than re-rendering for every visual nudge.

See [preview.html](preview.html) for the RightCare example.

#### SmartMed Hajj preview editor — 5-scene live studio (current)

**Major redesign on 2026-05-23**: the old pill / contact-row architecture was replaced with a Hajj-themed 5-scene format. Each scene has the same visual vocabulary — a sky-to-blue gradient badge at top, a 2-line headline with a smaller `<span>` second line, a gray subtitle, and 3 floating white callout pills with gradient icon chips. Scenes diverge in the body: Scene 1 has stacked pills, Scene 2 has slide-in "update" cards, Scene 3 draws an animated SVG path with a moving dot, Scene 4 has a checklist + progress bar, Scene 5 has confirm pills layered over a stethoscope SVG line. All animations are CSS keyframes (popIn / titleIn / popCard / updateIn / glowIn / drawPath / dotTravel / itemFly / checkPop / progressIn / fillBar) — Remotion seeks them per frame so no frame-by-frame interpolation in TSX is needed.

[smartmed-preview.html](smartmed-preview.html) is the editor:

- **5 scene tabs + ↻ Replay button** to restart the active scene's animations.
- Polished sticky toolbar: dirty/clean dot, `💾 Save` (Cmd/Ctrl+S), `⭐ Preset`, `⇕ Expand all`, presets dropdown with `🗑` delete, search box, scene chips (`All / S1 / S2 / S3 / S4 / S5`).
- Per-scene control card with: badge, headline 1, headline 2, subtitle, plus every callout's `small` and `strong` text and the bottom-bar `tag`. Input id convention: `t-<scene>-<field>` (e.g. `t-s1-p2-strong`) — auto-binds via `applyAllTexts()` to the matching DOM id.
- Auto-save draft to `smartmed-hajj-v1-draft`; canonical save on the Save button (`smartmed-hajj-v1`); presets at `smartmed-hajj-presets-v1`.
- `📋 Copy JSON` in the footer dumps `{ s1: {...}, s2: {...}, ... }` — paste into chat or save as `smartmed-props.json` to feed Remotion directly.

The render pipeline mirrors the editor 1:1:
- [src/smartmed.css](src/smartmed.css) — the same CSS the preview uses (with `100cqi` math swapped for plain `px` since the Remotion canvas is fixed 1080×1920).
- [src/SmartMedReel.tsx](src/SmartMedReel.tsx) — 5 `<Scene>` components wrapped in a `<SceneSlot>` (which is a `<Sequence>` + crossfade opacity tween). Each scene gets 150 frames (5s) + 10-frame crossfade; total duration `SMARTMED_DURATION = 750` frames (25s @ 30fps).
- [smartmed-props.json](smartmed-props.json) — `{ sN: { image, badge, h1, h2, sub, pieces: { ... } } }` for each scene.

**Image fallbacks:** scene4 and scene5 default to `scene2.jpg` and `scene3.jpg` respectively since dedicated jpegs don't exist yet — drop `scene4.jpg` / `scene5.jpg` into `public/generated/smartmed/` and update the props to point at them.

The legacy SmartMed preview (pills + contact rows + per-CSS-var sliders + DIN Next font system) was scrapped because the user wanted a tighter, more cinematic design language consistent across all scenes. The old controls (per-axis offsets, pill width / radius / shadow sliders, contact-row direction toggles) are gone — the new design is content-only editable, geometry is locked in CSS.

#### Legacy SmartMed preview editor (deprecated — kept here for context)

The pre-2026-05-23 version: a self-contained, single-file Arabic reel studio that mirrored three SmartMed scenes (headline, pills, CTA + contacts) and exposed every CSS variable as a control. Highlights:

- **Sticky toolbar** with a green/amber dot showing saved/dirty state, an explicit `💾 Save` button, named `⭐ presets` (save / load / delete via `localStorage` key `smartmed-presets-v1`), and a `↺ Reset to defaults`.
- **Search box + scene chips** filter the rows live — type "weight" or "padding" to narrow, or click `Scene 1 / 2 / 3 / All` to focus on one scene.
- **Collapsible group cards** (`<details class="group">`) keep the panel scannable; each group is tagged with the scene it belongs to so the chip filter can hide/show whole groups. The `.group` cards use `flex: 0 0 auto` inside the scrolling `.panel-body` so they keep their natural height instead of getting squished when the total content overflows the viewport (without that, the bottom accordions render half-cut).
- **Auto-save draft** to `smartmed-preview-v3-draft` on every change + canonical save on the Save button (`smartmed-preview-v3`). `Cmd/Ctrl+S` is wired to the Save button. If a preset is loaded in the dropdown when Save is clicked, the Save button **also writes the current state back into that named preset** under `smartmed-presets-v1` — so "Load preset → tweak → Save" updates the preset in place.
- **Toast notifications** confirm save / preset / reset actions.
- **Per-scene font dropdowns** include every Google Arabic font we use plus **DIN Next LT Arabic** loaded via `@font-face` from Riyad Bank's public CDN (Light/Regular/Medium/Bold). Same `@font-face` block is mirrored in [src/smartmed.css](src/smartmed.css) and the Remotion font loader in [src/SmartMedReel.tsx](src/SmartMedReel.tsx) probes for it via `document.fonts.load()` so the rendered MP4 doesn't fall back to Arial. Note: DIN Next is *available* but not the default — the baseline `.sm-*` selectors still use the `"Tajawal", "Cairo", "Arial"` stack. DIN Next only takes effect when you select it in a scene's font dropdown (which writes the `--font-family-N` CSS variable).
- **Direction + alignment panels** — every text node (headline, subtitle, pill row, contact label, contact value) has independent `direction` (RTL/LTR) and `text-align` controls, plus contact-row layout flow (`row` / `row-reverse`) and content justification.
- **Scene 2 pill flex controls** — each pill exposes `flex-direction` (`row` / `row-reverse` / `column` / `column-reverse`), `justify-content` (`flex-start` / `center` / `flex-end` / `space-between` / `space-around` / `space-evenly`) and a dedicated **text color** picker (separate from the icon/pill bg). Driven by `--p-flex-direction`, `--p-justify`, `--p-text-color` on the stage.
- **Scene 3 per-text fine-tune** — beyond the global "List Y / List right offset" that moves *all* contact rows together, each row (1/2/3) has its own X offset, Y offset, label font-size, value font-size, **icon X offset**, and **value X offset** that override the global values when set. The icon X / value X let you nudge the WhatsApp/Phone/Globe icon and its number/URL value independently within a row (separate from the whole-row offset). The CTA headline and subtitle each get their own X offset too. Per-row vars (`--c-rN-x`, `--c-rN-y`, `--c-rN-label-size`, `--c-rN-value-size`, `--c-rN-icon-x`, `--c-rN-value-x`) cascade from the globals (`--c-label-size`, `--c-value-size`) when unset, so existing presets render identically. Rows are tagged with `data-row="N"` in `renderContacts()` so the per-row attribute selectors target the right element. The `--c-row-gap` slider drives `gap` on `.sm-contact-list`, and `--c-inner-gap` drives the divider's horizontal margins.
- **`📋 Copy JSON` button** dumps the full state in the schema you paste back in chat. I bake those values into the Remotion CSS to render.
- **Init pass that fires `input`+`change` on every control after load** — fixes the "CSS variable falls back to its inline default because no event ever fired" bug that made fresh loads look wrong.

The flow is now: tweak in the browser → Save (or it auto-saves the draft) → optionally save as a preset → Copy JSON → paste in chat → I bake → re-render with `npm run render:smartmed`.

**Alternative file-based workflow (faster, more granular):** Click **📦 Export** in the footer to download `smartmed-presets.json` containing ALL named presets plus the current state. Drop the file at the repo root. Then tell Claude `bake preset "foo"` (or `bake current`) and Claude reads the file directly — every single input value is in the snapshot (raw `inputId → value` map), so Claude has access to far more granular detail than the curated Copy JSON output. Schema: `{ exportedAt, schemaVersion: 1, current: <snapshot>, presets: { name: <snapshot> } }`.

#### Auto-bake script: preset → Remotion (single command, zero manual edits)

[scripts/bake-smartmed-preset.mjs](scripts/bake-smartmed-preset.mjs) reads a named preset (or `current`) from `smartmed-presets.json` and regenerates **every** Remotion-side artifact from it so no value has to be hand-translated:

- **`src/smartmed.css`** is overwritten entirely from a template that interpolates each preset key into the right CSS property. Headers, subtitles, pill geometry, pill flex direction + justify-content, pill colors, all alignment (`text-align`, `direction`), the contact list gap, divider inner-gap, per-element font weights/sizes/colors, font-family stacks, transform offsets — all flow from the preset. The generated file is stamped `auto-generated from preset "<name>". DO NOT EDIT BY HAND.` at the top.
- **`smartmed-props.json`** is overwritten with the texts and icon picks (`scene1HeadlineLine1/2`, subtitle, 4 pill `{text, icon}` pairs, CTA headline/subtitle, 3 contact `{icon, label, value}` rows). This is the file Remotion reads via `--props=` when rendering.
- **`src/SmartMedReel.tsx`** has its per-row `tweaks` array (rowX/Y, iconX/Y, labelX/Y, valueX/Y for each of the 3 contact rows) regex-patched in place from the preset's `c-rN-*` keys.

Commands:
- `npm run bake:smartmed <preset>` — bake only (writes the 3 files above).
- `npm run bake-render:smartmed --preset=<preset>` — bake **and** render in one shot (chains `bake:smartmed` → `render:smartmed`).
- Direct: `node scripts/bake-smartmed-preset.mjs <preset-name | current>`.

**Promise:** every input visible in the preview studio maps to exactly one written byte in those three files — alignment, direction, every offset, every color, every font. If a render doesn't match the preview, the answer is **always** to tweak the value in the studio and re-bake, not to hand-edit Remotion files (which the script overwrites on next bake anyway).

#### Multi-project hub — [index.html](index.html) + [projects.json](projects.json) + the hub server

[index.html](index.html) at repo root is the **project hub** — a card grid that lists every project from [projects.json](projects.json). Each card opens that project's studio.

**Two ways to run it:**

1. **Static (file://)** — just open `index.html` in your browser. Works fully, but `New Project` saves to localStorage (browser-only).

2. **Live (npm run hub)** — runs [scripts/hub-server.mjs](scripts/hub-server.mjs) at `http://localhost:4000/`. Now the hub:
   - Reads/writes `projects.json` directly via `GET/POST /api/projects`.
   - The **+ New Project** modal scaffolds files on disk: clones the chosen starter studio (smartmed / hajj / smartlab) into `<id>-preview.html`, `<id>-props.json`, `<id>-presets.json`, writes uploaded scene images to `public/generated/<id>/`, saves the optional HTML draft to `<id>-draft.html`, and rewrites image paths in the cloned studio so they point at the new folder.
   - Custom projects show a red `×` delete button — clicking it removes all the scaffolded files + the entry from `projects.json`. Built-ins are protected.
   - `POST /api/render { id }` and `POST /api/bake { id, preset }` spawn `npm run render:<id>` / `npm run bake:<id>` as detached background processes, log to `.hub-logs/`, and return the log path so the UI can poll via `GET /api/log?file=...`.
   - The index page detects server mode automatically (`location.protocol === 'http:'`) and shows a `🛰 Hub: localhost:4000` badge top-right.

Zero dependencies — `hub-server.mjs` only uses Node built-ins (`http`, `fs`, `path`, `child_process`).

Currently registered built-ins:
- **SmartMed** ([smartmed-preview.html](smartmed-preview.html), 3 scenes, 1080×1920 reel)
- **SmartLab** ([smartlab-preview.html](smartlab-preview.html), 4 scenes, 1080×1350 square-ish — Tajawal font, navy + cyan palette)
- **SmartMed — Hajj** ([smartmed-hajj-preview.html](smartmed-hajj-preview.html), 5 scenes, 1080×1920 — Hajj campaign with badges, white pills, animated SVG paths)

Each studio has a `← Hub` link in its toolbar to navigate back. Each studio's footer has a **🎬 Render** button that copies the bake+render command to the clipboard for you to paste into the terminal (in static mode); when the hub is live the same button can call `POST /api/render` directly.

#### Pill icon catalog (Scene 2)

12 pill icons available in each pill dropdown — defined as `<symbol>` in [smartmed-preview.html](smartmed-preview.html) and mirrored as `case` branches in the `Icon` component in [src/SmartMedReel.tsx](src/SmartMedReel.tsx). The bake script just passes the selected `i-pick-N` value through to props, so any icon you pick in the studio renders identically in the MP4.

| Value | Label | Visual |
|---|---|---|
| `home-med` | Home + medical | House with medical cross |
| `refresh` | Refresh | Circular arrow |
| `person-check` | Person + check | Person silhouette with check badge |
| `home-heart` | Home + heart | House with heart inside |
| `stethoscope` | Stethoscope | Stethoscope outline |
| `calendar-clock` | Calendar + clock | Calendar with clock overlay |
| `heart-pulse` | Heart + pulse | Heart with EKG line |
| `shield-check` | Shield + check | Shield with checkmark |
| `syringe` | Syringe | Diagonal syringe |
| `pill` | Pill / capsule | Horizontal capsule, split |
| `clock-24` | 24/7 clock | Clock with "24" inside |
| `clipboard-check` | Clipboard + check | Clipboard with checkmark |

To add more: drop a new `<symbol id="icon-<name>" viewBox="0 0 64 64">` block in the preview's SVG defs, add the same paths as a `case '<name>':` in `Icon` in [src/SmartMedReel.tsx](src/SmartMedReel.tsx), extend the `IconKind` union, and append `<option value="<name>">Label</option>` to each of the 4 pill dropdowns in [smartmed-preview.html](smartmed-preview.html). Same applies for contact icons but using `cicon-` prefix and the `ContactIcon` component.

---

## 7. Techniques we learned

### The CSS stencil for "blue around the subject"

When you want the brand color to fill the edges/corners of a frame but leave the subject (person/object) untouched, two approaches exist:

**Approach A — Pure CSS radial-gradient stencil** (we tried this):
```css
.tint {
  background: radial-gradient(
    ellipse 62% 72% at 50% 55%,
    transparent 0%,
    transparent 38%,
    rgba(31, 95, 181, 0.55) 75%,
    rgba(31, 95, 181, 0.88) 100%
  );
}
```
- ✅ No AI needed, instant
- ✅ Tunable in real time
- ❌ Soft edges; subject can still get some blue bleed on body parts near the edge
- ❌ Not pixel-perfect masking

**Approach B — Bake the blue into the AI photo** (the winning approach):
- Ask ChatGPT to generate the family in a **blue-toned room** — walls/curtains/lighting all in the brand blue, but skin tones natural
- No overlay needed; the photo itself IS the look
- ✅ Pixel-perfect, premium look
- ✅ No CSS hacks
- ❌ Locked to that color (regenerate to swap brands)

**Approach C — Subject masking via AI background removal** (we tried, abandoned):
- Run the photo through `rembg` / `remove.bg` / Replicate → get a transparent-bg PNG of just the subject
- Layer: warm photo → blue overlay → cutout PNG on top
- ✅ Pixel-perfect
- ❌ Extra build step, dep install pain (llvmlite hates macOS Intel without LLVM toolchain)

**Verdict**: Approach B is simplest and most premium. Use it unless you need to reuse the same photo across many brand colors.

### Saudi/Arabic typography in Remotion

- Set `direction: rtl` on the root scene element
- Use `font-family: "Tajawal", "Cairo", "DIN Next LT Arabic", "Arial", sans-serif` (Tajawal from Google Fonts is free + heavyweight)
- Import via `@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800;900&display=swap')` at the top of the CSS file. Remotion's Chrome can load Google Fonts.
- For Saudi medical brands, use the Black/950 weight — it matches the visual heaviness of the references
- Kashida elongation (`ـ` between letters) is real Arabic typography — appears in some reference reels for justified lines

### Ken Burns and parallax

```tsx
const zoom = interpolate(frame, [0, duration], [1.04, 1.12]); // 4% → 12% scale up
const pan = interpolate(frame, [0, duration], [-25, 25]);     // horizontal drift
<Img style={{ transform: `translate3d(${pan}px, 0, 0) scale(${zoom})` }} />
```
Add a `transform-origin: center` on the image. Boom — premium-feeling slow zoom + drift on any still photo.

### Spring animations vs interpolate

- `interpolate(frame, [in, out], [a, b], { easing })` — linear with custom easing
- `spring({ frame, fps, config: { damping, stiffness } })` — physical bouncy feel

Springs are mandatory for any "pop" reveal (cards landing, numbers scaling in, icons appearing). Linear `interpolate` is for sweeps, fades, zooms.

### Sequential reveals (staggered)

```tsx
{items.map((item, i) => {
  const start = baseStart + i * staggerFrames;
  const opacity = ramp(frame, start, 16);
  // ...
})}
```
Each item gets its own delayed start. The visual effect is a "wave" of elements appearing one after another. Standard for checklist build-ups, card grids, step sequences.

### Word-by-word headline reveal

Split a string on whitespace, render each word in its own `<span>` with a per-word delayed `ramp()`. Each word fades + rises independently. 10× more premium than a single fade-in of the whole headline.

---

## 8. Render commands cheat sheet

```bash
# SmartReel — bulk render every row of content.csv
npm run render:bulk

# SmartReel — render one sample
npm run render:one

# TokyoReel — gen AI photos + render
npm run render:tokyo

# RightCareReel — render the current built scenes
npm run render:rightcare

# Preview mode — visual editor in browser (hot reload, scrub timeline)
npm run studio
```

`npm run studio` is the secret weapon. Opens Remotion Studio in your browser. You see every composition, scrub the timeline, see live updates as you edit code. Use this 80% of the time you're tweaking visuals.

---

## 9. Customizing for your brand

### Quickest path — fork SmartReel for a new brand

1. Duplicate [src/SmartReel.tsx](src/SmartReel.tsx) → `src/MyBrandReel.tsx`
2. Duplicate [src/style.css](src/style.css) → `src/mybrand.css`
3. Open `MyBrandReel.tsx`, find the colors object in `defaultProps`, swap in your brand hex codes
4. Open `mybrand.css`, tweak fonts/sizes/spacing
5. Register in [src/Root.tsx](src/Root.tsx) (copy the existing `<Composition>` block)
6. Make a new props JSON file
7. Add npm script: `"render:mybrand": "remotion render src/index.ts MyBrandReel out/mybrand.mp4 --props=mybrand-props.json --overwrite"`
8. Render: `npm run render:mybrand`

### Swap the logo

Default uses CSS text placeholders. To use a real logo:
1. Save a transparent PNG to `public/generated/<reel>/logo.png`
2. In the `Header` component, swap the text div for `<Img src={staticFile('generated/<reel>/logo.png')} />`

### Bulk-generate from CSV

Already wired for SmartReel. To bulk-generate other reels, copy [scripts/render-bulk.mjs](scripts/render-bulk.mjs), point it at your new composition + props mapping.

---

## 10. Tips, gotchas, lessons learned

### Don't try to install rembg on macOS Intel without LLVM
- Needs llvmlite which needs LLVM toolchain that brew doesn't auto-install
- Use the Node.js alternative `@imgly/background-removal-node` if you need it, or just sidestep with the AI-baked-blue approach.

### `@import url('https://fonts.googleapis.com/...')` works in Remotion
Because Chrome literally loads it at render time. No need for `@remotion/google-fonts` unless you want bundle-time loading.

### Container queries (`100cqi`) work in Remotion's Chrome
We used them in [preview.html](preview.html) for responsive font sizing. Useful when scaling the same scene to multiple output sizes.

### object-fit: cover on the photo is your friend
Source AI photos are 9:16-ish but not always exactly 1080×1920. Wrap `<Img>` in a fixed container, set `width: 100%; height: 100%; object-fit: cover`. Photo fills correctly with reasonable cropping.

### Pollinations.ai seed matters
Same prompt + same seed = same image (deterministic). Change seed to get a totally different image. Useful for "reroll" without changing prompt.

### Cache aggressively
Image gen is the slow part. Once you have an image you like, never regenerate it unless you change the prompt. Caching is already built into `gen-images.mjs` — it checks `fs.existsSync(absPath)` before calling the API.

### Render times observed
- SmartReel 35s reel: ~30s render time (no image gen)
- TokyoReel 40s reel: ~3-4 min total (8 image gens via Pollinations + 30s Remotion)
- RightCareReel 5s build: ~10s render time

### Debugging frame issues
1. Reduce `durationInFrames` to like 30 so you only render the problem moment
2. Set `--frames=N:M` on the CLI to render a specific range
3. Use Remotion Studio for live debugging — way faster than blind rendering

---

## 11. What's left to build (RightCare specifically)

We're 5 seconds into a 27-second clone. Remaining:

- **Scene 3** — Crossfade to checklist stage (5-7s)
  - Family photo crossfades into hospital scene
  - Light blue rounded panel scales up from center
  - Right-side vertical cyan column appears for checkmark track
  - **Asset needed**: hospital/doctor photo (1 more ChatGPT generation)

- **Scene 4** — Checklist build (7-15s)
  - 4 Arabic bullet items reveal sequentially
  - Cyan circle + dark blue ✓ pops per item on the right column
  - Springs on each item

- **Scene 5** — CTA tail (15-20s)
  - 2-line fade-up text below the panel

- **Scene 6** — End card (20-27s)
  - White background
  - Big RIGHT CARE logo + Arabic cyan accent
  - "احجز موعدك الآن"
  - Typewriter phone number digits
  - Play/App Store badges

---

## 12. Quick reference — the entire session in one paragraph

We turned a code-as-video idea into three working reels: a CSV-driven Saudi medical template (SmartReel), a cinematic Tokyo travel showcase (TokyoReel), and an in-progress replication of a real Saudi healthcare ad about family support (RightCareReel). Along the way we built an AI image pipeline with three backends (Pollinations free, fal.ai paid, ChatGPT for humans), figured out that the cleanest way to get "brand color around the subject" is to bake the colored environment into the AI photo at generation time (rather than masking after), learned the CSS stencil technique with radial-gradient transparent zones for cases where you need post-hoc control, and developed a piece-by-piece workflow for cloning reference videos: probe → frame extract → analyze → plan in phases → generate assets → build scenes → render → preview-html for fast iteration → bake → ship. Every video is a React app screenshotted 1,200 times by headless Chrome and stitched into MP4 by ffmpeg.

---

*Last updated: end of session — RightCareReel at 5s, ready to extend.*

---

## 13. Studio → Motion Editor — Roadmap (Phase 0 → 5)

The SmartLab studio is being upgraded from a "tweak texts + sizes" tool into a real in-browser motion editor: pick animations from a library, control scene timing, layer images, draw shapes, build animated marker callouts. Below is the **single source of truth** for that work — current state, target state, and the path between them. Anyone (human or AI) picking this up cold should read top-to-bottom.

### Current state — Phase 0 ✅ (where we are today)

What works right now in **SmartLab** (the studio + bake pipeline target for the motion editor):
- 4-scene reel composition in [src/SmartLabReel.tsx](src/SmartLabReel.tsx), 540 frames @ 30fps (~18s), 1080×1350.
- Per-scene crossfade via `<SceneFade>` wrapper (18-frame overlap), Ken Burns zoom via `<SceneBg>`, word-stagger via `<WordStagger>`.
- Animations are **hardcoded inline** in each Scene component:
  - Scene 1: headline `WordStagger` (stagger 5, dur 20), subtitle fade+slide-up
  - Scene 2: headline `WordStagger`, subtitle fade+slide-up, 3 benefits slide-from-right + checkmark spring-pop
  - Scene 3: headline `WordStagger`, subtitle fade+slide-up, 4 cards spring-scale + Y drift + icon spring-pop
  - Scene 4: logo spring zoom+fade, headline `WordStagger` + **heartbeat sine pulse**, subtitle fade+slide-up, 2 contact rows slide-from-left + icon spring-pop
- Background audio: [public/audio/smartlab-bg.mp3](public/audio/smartlab-bg.mp3) with 0.5s fade-in/out via `<Audio volume={interpolate(...)} />`.
- Studio [smartlab-preview.html](smartlab-preview.html) controls **texts, sizes, positions, colors** — no animation controls, no scene-duration controls, no per-element timing controls. Stage shows static end-state per scene tab.
- Bake script [scripts/bake-smartlab-preset.mjs](scripts/bake-smartlab-preset.mjs) regenerates [src/smartlab.css](src/smartlab.css) + [smartlab-props.json](smartlab-props.json) from preset.
- Preset input-ID convention: `s<scene>-<element>-<prop>` (e.g. `s1-h-text`, `s2-b1`, `s3-c1-i`, `s4-c2-num`).
- Global preset keys: `bg-color`, `primary-color`, `accent-color`.

### Animation inventory (the things to put in a registry)

Counted from [src/SmartLabReel.tsx](src/SmartLabReel.tsx):

| Animation | Used by | Current source |
|---|---|---|
| `fade-up` | subtitles in every scene | inline `interpolate(opacity)+translateY` |
| `word-stagger` | every headline | `<WordStagger>` component |
| `slide-from-right` | Scene 2 benefits | inline `translateX(60→0)` |
| `slide-from-left` | Scene 4 contact rows | inline `translateX(50→0)` |
| `spring-scale-pop` | Scene 2 ✓, Scene 3 cards/icons, Scene 4 icons | inline `spring()` + `scale()` |
| `spring-zoom-fade` | Scene 4 logo | inline `spring()` + `scale()` + opacity ramp |
| `crossfade` | scene-to-scene | `<SceneFade>` |
| `ken-burns` | every scene background | `<SceneBg>` |
| `heartbeat` (sine pulse) | Scene 4 CTA `احجز الآن` | inline `Math.sin()` |

These 9 are our baseline. Phase 1 extracts them into a registry; Phase 5 expands the catalog (blur-in, letter-stagger, rotate-in, draw-line, etc.).

### 🎯 Phase 1 — Animation Library + Scene Timing Controls (~2 hrs)

**Goal:** Animations become first-class, named, swappable from the studio dropdown. Scene durations become editable.

**Files touched:**
1. **`src/animations.ts` (new)** — single export `animations` object. Each key is an animation name, each value is `(frame, start, dur, opts?) => { opacity?, transform?, filter? }`. Returns a partial CSS-in-JS style. Composable.
   - Start with the 9 from the inventory above.
   - Export `animationNames: string[]` for studio dropdown population.
   - Export `getAnimationStyle(name, frame, start, dur, opts)` helper.
2. **`src/SmartLabReel.tsx`** — refactor each inline animation into a call to `getAnimationStyle(props.s1HAnim, frame, headStart, props.s1HAnimDur)`. Keep `WordStagger` as a built-in helper since it returns multiple elements (still callable from registry as `word-stagger`).
3. **`smartlab-preview.html`** — add to each element's control group:
   - **Animation** dropdown (populated from `animationNames`)
   - **Duration** slider (frames, range 6–60)
   - **Delay** slider (frames from scene start, range 0–120)
   Add a **Scene Timing** group per scene with:
   - **Duration** slider (seconds, range 2.0–10.0, step 0.1)
   - Shows live total reel duration at top of toolbar.
4. **`scripts/bake-smartlab-preset.mjs`** — write new preset keys (`s1-h-anim`, `s1-h-anim-dur`, `s1-h-anim-delay`, `s1-dur`, etc.) into props.json. Also recompute `SMARTLAB_DURATION` based on summed scene durations and write it into a new exported constant or directly into Root.tsx via regex.

**New preset key schema (Phase 1 additions):**
```
s<N>-dur                  — scene N duration in seconds (default 5.0)
s<N>-<el>-anim            — animation name from registry (default per element)
s<N>-<el>-anim-dur        — animation duration in frames (default 20)
s<N>-<el>-anim-delay      — delay from scene start in frames (default sane per element)
```

Where `<N>` is 1..4 and `<el>` is one of: `h` (headline), `s` (subtitle), `b` (benefits group), `c` (cards group), `r` (contact rows group), `logo`, `cta` (Scene 4 headline).

**Acceptance criteria:**
- Studio shows scene duration sliders. Top toolbar shows live "Total: XX.Xs".
- Each element has an animation picker dropdown. Changing it updates the studio preview live (Phase 1 ships with live in-studio playback later — for now the dropdown just commits to props and the next render reflects it).
- Bake script produces a renderable reel with whatever animations you picked, at whatever scene durations.
- `npm run bake-render:smartlab --preset=current` works end-to-end.

### 🎯 Phase 2 — Layered Images per Scene (~3 hrs)

**Goal:** Each scene can have N image layers above the background, each individually positioned/transformed/animated.

**Schema additions:**
```
s<N>-layers               — JSON array of layer objects in the preset
  [{
    src: "generated/smartlab/scene2-overlay.png",
    x: 540, y: 800, w: 400, h: 400,
    rotate: 0, scale: 1, opacity: 1,
    shadow: "0 14px 34px rgba(0,0,0,.15)",
    tilt: { x: 8, y: -4 },         // CSS rotate3d for the 3D look
    anim: "scale-pop",
    animDur: 24, animDelay: 60,
    z: 2                            // z-index
  }, ...]
```

**Files touched:**
- **`smartlab-preview.html`** — new "Layers" sub-panel per scene with `+ Add Layer`, file picker, X/Y/W/H/rotate/scale/opacity sliders, animation picker, shadow + 3D tilt sliders.
- **`src/SmartLabReel.tsx`** — read `s1Layers`, `s2Layers`, etc. from props and render each as a positioned `<Img>` with the animation style applied.
- **Bake script** — pass the layer arrays through.

### 🎯 Phase 3 — Custom Elements / Shape Primitives (~4 hrs)

**Goal:** Add non-image elements: circles, lines, rectangles, dots, text boxes, arrows.

**Schema additions:**
```
s<N>-shapes               — JSON array
  [{
    kind: "circle" | "line" | "rect" | "dot" | "text" | "arrow",
    x, y, w, h,
    stroke, fill, strokeWidth,
    glow, shadow,
    text?, font?,                  // for kind: "text"
    points?,                       // for kind: "line" / "arrow" — [[x1,y1],[x2,y2],...]
    anim, animDur, animDelay
  }, ...]
```

Special: `kind: "line"` and `kind: "arrow"` get a `draw-line` animation that strokes the path from 0% to 100% over the duration (using `stroke-dasharray` + `stroke-dashoffset`).

**Files touched:**
- **`smartlab-preview.html`** — shape picker UI per scene
- **`src/SmartLabReel.tsx`** — `<Shape>` component that maps kind → SVG element with the right path/transform animation
- **`src/animations.ts`** — add `draw-line`, `draw-circle` (animated stroke)

### 🎯 Phase 4 — Animated Marker System (the Instagram thing) (~5 hrs)

**Goal:** On an image, place clickable-looking markers (dots with pulsing rings) that activate in sequence. Each marker has a callout (label, popup, connecting line). At time T1 marker 1 lights up + its callout appears; at T2 marker 1 fades and marker 2 lights up.

**This is the killer feature.** Used by every high-end product reel.

**Schema additions:**
```
s<N>-markers              — JSON array
  [{
    x: 320, y: 540,                // anchor position on the scene
    activate: 30,                  // frame in scene when this marker takes focus
    duration: 60,                  // frames it stays focused
    label: "Certified",
    labelOffset: { x: 80, y: -40 },
    color: "#1A9DD7",
    ringSize: 60,
    pulse: true,
    callout: {
      kind: "popup" | "tooltip" | "callout",
      text: "ISO 15189",
      font, color, bg, shadow
    },
    connector: {                   // optional line drawn from marker to callout
      stroke, strokeWidth, dashOnDraw: true
    }
  }, ...]
```

**Studio UI:** A "Marker Timeline" mode per scene — click on the scene preview to place a marker at that x,y. Drag a handle on a horizontal frame ruler to set activation time + duration. Type the callout text inline.

**Files touched:**
- **`smartlab-preview.html`** — marker placement overlay (click-to-add on stage), per-marker control rows, timeline scrubber UI
- **`src/SmartLabReel.tsx`** — `<MarkerLayer>` component: at each frame, computes which marker is "active" (current frame ∈ [activate, activate+duration]), renders the dot with pulse-ring, fades the callout in/out, animates the connector line draw
- **`src/animations.ts`** — add `pulse-ring`, `popup-pop`, `connector-draw`

### 🎯 Phase 5 — Polish / Animation Library Expansion (~2-3 hrs)

**Goal:** Make picking animations delightful. Curate more options.

- Visual animation picker: each option in the dropdown gets a 60×60 looping preview (an `<svg>` or tiny `<canvas>` running the animation in a thumbnail). User picks by sight, not by name.
- Animation **presets** (named bundles): `subtle / dramatic / playful / corporate / luxury` — each preset sets sensible defaults for all elements in one click.
- Optionally support **Lottie JSON** import as a special animation kind (`kind: "lottie", src: "animations/checkmark.json"`). Lottie files exported from After Effects let designers ship gold-standard animation directly.

**Library targets (Phase 5 adds to `animations.ts`):**
- Entries: `fade-up`, `fade-down`, `slide-left`, `slide-right`, `slide-up`, `slide-down`, `scale-pop`, `scale-in`, `blur-in`, `flip-in-x`, `flip-in-y`, `rotate-in`, `zoom-in`, `typewriter`, `letter-stagger`, `word-stagger`, `mask-reveal`
- Loops: `pulse`, `breathe`, `shake`, `bounce`, `float`, `glow`, `heartbeat`
- Exits: `fade-out`, `slide-out-left`, `slide-out-right`, `blow-up`, `dissolve`
- Group choreography: `stagger`, `cascade`, `wave`, `ripple`, `burst-from-center`
- Path-based: `draw-line`, `draw-svg-path`, `follow-curve`
- Background: `parallax`, `slow-zoom`, `ken-burns`, `pan-left`, `pan-right`

### Architecture decision: where animations live

**Picked approach: shared registry module imported by Remotion AND read by the studio at build time.**

```
src/animations.ts            (Remotion-side: the actual functions)
   ↓
scripts/bake-*-preset.mjs    (extracts animation names + reads preset choices)
   ↓
studio HTML                  (gets the list via a generated <script> include or inline JSON)
```

The studio doesn't import `src/animations.ts` directly (it's TypeScript and the studio is plain HTML), but the bake script writes a `studio-animations.json` next to it that lists names + defaults. The studio fetches that. Single source of truth = `src/animations.ts`; everything else mirrors.

**Rejected alternatives:**
- ❌ Animation definitions in JSON: loses TypeScript type safety, can't compose, can't use `spring()` properly.
- ❌ Animation definitions in the studio HTML: would require duplicating in Remotion. Drift risk.
- ❌ Lottie-only: too heavy a dependency for the basics; great for premium add-ons in Phase 5.

### Handoff notes for whoever picks this up next

1. **Read this section first.** Phase 0 inventory + animation list is the map.
2. **Start with Phase 1 — animation registry + scene timing.** Everything downstream depends on it.
3. **Convention to preserve:** the studio's input IDs (`s<N>-<el>-<prop>`) are the canonical preset keys. Don't break them — many presets and the bake script depend on them.
4. **Don't change Remotion's prop schema lightly** — the bake script writes it, the studio's "Render" button shows a CLI command, but ultimately the user's `npm run render:smartlab` reads `smartlab-props.json`. Keep that file's shape stable across phases or version-bump it.
5. **When adding a new animation:** put it in `src/animations.ts`, run the bake script (which dumps `studio-animations.json`), reload the studio — it picks up the new option automatically. Test the animation in a scene with `npm run render:smartlab`.
6. **Update this section** when finishing a phase. Tick the ☐ → ✅. Add a line under "Phase X — DONE" describing what landed.

### Phase status

- Phase 0 — Baseline (current state, Sept 2025–May 2026) — ✅
- Phase 1 — Animation Library + Scene Timing — ✅ **DONE (May 2026)**
- Phase 2 — Layered Images per Scene — ✅ **DONE (May 2026)**
- Phase 3 — Custom Elements / Shapes — ✅ **DONE (May 2026)**
- Phase 4 — Animated Marker System — ✅ **DONE (May 2026)**
- Phase 5 — Polish / Library Expansion (style presets v1) — ✅ **DONE (May 2026)**

**All 5 Phase 1-5 phases shipped in a single sprint. The SmartLab studio is now a real in-browser motion editor.**

### Phase 1 — DONE: What landed

**Files added:**
- [src/animations.ts](src/animations.ts) — animation registry. 17 named animations (entry: `none, fade-in, fade-up, fade-down, slide-from-right, slide-from-left, slide-up-large, scale-pop, spring-zoom-fade, scale-in, zoom-in, blur-in, rotate-in, word-stagger` + loop: `heartbeat, pulse, breathe`). Each is `(input: AnimInput) => CSSProperties`. Composable via `getCombinedStyle(entry, loop, input)`. `animationMeta` holds kind/defaultDur/label/blurb for each.

**Files changed:**
- [src/SmartLabReel.tsx](src/SmartLabReel.tsx) — every inline animation refactored to call into the registry. Per-element animations come from props (`s1HeadlineAnim`, `s2BenefitsAnim`, etc.) as `AnimSpec` objects (`{ entry, loop?, durFrames?, delayFrames? }`). Per-scene durations come from props (`scene1DurationSec` etc., defaults 5.0s each). `computeSmartLabDuration(props, fps)` is exported pure helper. The Composition's `durationInFrames` is set via `calculateMetadata` in Root.tsx so the duration auto-follows props.
- [src/Root.tsx](src/Root.tsx) — added `calculateMetadata` to the SmartLabReel `<Composition>` that calls `computeSmartLabDuration(props, 30)`. Bake script no longer needs to regex-patch the duration constant — it's data-driven.
- [scripts/bake-smartlab-preset.mjs](scripts/bake-smartlab-preset.mjs) — reads new preset keys (`s<N>-dur`, `s<N>-<el>-anim`, `s<N>-<el>-anim-dur`, `s<N>-<el>-anim-delay`, `s<N>-<group>-stagger`, `crossfade-frames`, `s4-h-loop`) and writes them as nested `AnimSpec` objects + scene-duration fields into [smartlab-props.json](smartlab-props.json). Undefined preset keys → key omitted from props → Remotion's defaults take over (backwards-compatible).
- [smartlab-preview.html](smartlab-preview.html) — new groups:
  - **⏱ Scene Timing** — 4 scene duration sliders (2.0–10.0s, step 0.1) + crossfade slider (0–36f).
  - **✨ Scene N Animations** — per-scene group with animation picker + duration + delay for each element. Scene 2 adds Benefits picker + stagger. Scene 3 adds Cards picker + stagger. Scene 4 adds Logo picker, Headline LOOP picker (heartbeat/pulse/breathe/none), Contacts picker + stagger.
  - Toolbar shows live `Total: XX.Xs · NNNf` indicator that updates as scene durations change.
  - **▶ Play preview** button — loops a JS-port of the entry animations on the active scene's labeled elements (`sl-s1-h1`, `sl-s1-p`, etc.) so users can see what they're picking BEFORE rendering. Resets styles when toggled off or when tab changes.
  - `SL_ANIMATIONS` constant defines the picker list (must stay in sync with `animations.ts`).

**Preset key conventions (locked, do not break in later phases):**

| Key | Type | Meaning |
|---|---|---|
| `s<N>-dur` | float | Scene N duration in seconds (default 5.0) |
| `s<N>-<el>-anim` | string | Entry animation name from registry |
| `s<N>-<el>-anim-dur` | int | Animation duration in frames |
| `s<N>-<el>-anim-delay` | int | Delay from scene start in frames |
| `s<N>-<group>-stagger` | int | Per-item stagger frames (benefits, cards, contacts) |
| `s4-h-loop` | string | Loop animation name for the CTA headline (`heartbeat` / `pulse` / `breathe` / `none`) |
| `crossfade-frames` | int | Scene-to-scene crossfade overlap (default 18) |

Where `<el>` ∈ `{h (headline), s (subtitle), benefits, cards, contacts, logo}` and `<N>` ∈ `1..4`.

**Verified working:** bake script with no preset → defaults → render → `out/smartlab-v1.mp4` (546f, ~18s) renders cleanly with all animations + background audio + heartbeat loop on `احجز الآن`.

**Limitations of the Phase 1 live preview playback:**
- It's a JS-port of the entry animations, not Remotion-rendered. Approximate visuals, not pixel-perfect with the MP4.
- Doesn't preview loop animations (heartbeat etc.) — those only show in the actual render.
- Doesn't preview group stagger (benefits/cards/contacts) — they animate as a single block.
- Doesn't preview Word Stagger letter-by-letter.
- These are intentional tradeoffs — full Remotion-in-browser preview is Phase 5 territory.

**How to add an animation in Phase 2+:**
1. Add fn to `animations` object + entry to `animationMeta` in [src/animations.ts](src/animations.ts).
2. Add matching entry to `SL_ANIMATIONS` array in [smartlab-preview.html](smartlab-preview.html).
3. Add corresponding case to `applyAnimStyle` in the studio JS (for live preview).
4. Done — dropdown picks it up, bake script passes it through, Remotion renders it.

### Phase 2 — DONE: What landed

**Goal achieved:** each scene now supports up to 3 image layers between background and text, each individually positioned, transformed, animated.

**Files added/changed:**
- [src/SmartLabReel.tsx](src/SmartLabReel.tsx):
  - New `ImageLayer` type exported (`{ src, x?, y?, w?, h?, rotate?, scale?, opacity?, z?, anim? }`).
  - New props: `scene1Layers`, `scene2Layers`, `scene3Layers`, `scene4Layers` (each `ImageLayer[]`).
  - New `<Layers>` component — renders an array of layers as absolutely-positioned `<Img>` elements with the chosen animation applied. Empty `src` slots are skipped. Static `rotate` + `scale` compose with the anim's transform.
  - `<Layers>` injected into each Scene component between `<SceneBg>` and the text overlay.
- [scripts/bake-smartlab-preset.mjs](scripts/bake-smartlab-preset.mjs):
  - New `readLayersForScene(N)` helper. Reads `s<N>-l<i>-<prop>` keys for i ∈ 1..MAX_LAYERS, builds `ImageLayer` objects, sorts by z-index ascending.
  - Writes `scene<N>Layers` arrays to `smartlab-props.json`. Empty arrays are stripped for cleanliness.
- [smartlab-preview.html](smartlab-preview.html):
  - New collapsible "🖼️ Scene N Layers" group per scene (4 groups, collapsed by default).
  - Each group's `.group-content` is a `data-layers-host="N"` div that JS populates with 3 layer slots.
  - Each layer slot has compact controls: source path, X/Y (combined row), W/H (combined row), rotate, scale, opacity, z-index, animation picker + dur + delay.
  - Live preview: each `.scene` in the stage gets a `.layers-host` div. JS reads the layer inputs and creates/updates `<img>` elements there, applying position/size/rotate/scale/opacity/z. Updates instantly as you tweak sliders.
  - `MAX_LAYERS = 3` is a single constant. To allow more layers, bump it in both [smartlab-preview.html](smartlab-preview.html) and [scripts/bake-smartlab-preset.mjs](scripts/bake-smartlab-preset.mjs).

**New preset key schema (Phase 2 additions):**
```
s<N>-l<i>-src         string — path relative to public/ (empty = slot disabled)
s<N>-l<i>-x           int    — left position in design px
s<N>-l<i>-y           int    — top position in design px
s<N>-l<i>-w           int    — width in px (0 = auto/natural)
s<N>-l<i>-h           int    — height in px (0 = auto/natural)
s<N>-l<i>-rotate      float  — rotation in degrees
s<N>-l<i>-scale       float  — additional scale multiplier
s<N>-l<i>-opacity     float  — 0..1
s<N>-l<i>-z           int    — z-index (lower renders below)
s<N>-l<i>-anim        string — entry animation name from registry
s<N>-l<i>-anim-dur    int    — frames
s<N>-l<i>-anim-delay  int    — frames from scene start
```

Where N ∈ 1..4 and i ∈ 1..3.

**Verified working:** fixture preset with 1 layer (Scene 1, scaled background thumbnail at top-left, scale-pop animation) bakes correctly to `scene1Layers: [{...}]` in props.json and renders cleanly via Remotion.

**Phase 2 known limitations (target for Phase 5):**
- No 3D tilt (rotateX/rotateY) — flat 2D rotation only.
- No drop-shadow / glow — pure image, no styling layer.
- No layer reorder UI (drag-to-rearrange) — change z-index manually.
- No file upload — user puts file in `public/generated/<reel>/` and types the path. Browser file picker requires a backend.
- Studio live preview applies static transforms (rotate/scale/opacity) but not the entry animation. Use ▶ Play preview on the scene tab to see the entry animate (Phase 1 capability).

**Recipe to add a layer (user-facing flow):**
1. Drop the image at `public/generated/smartlab/<name>.png` (or wherever).
2. Open the studio → expand "🖼️ Scene N Layers" → fill in Layer 1's Source path: `generated/smartlab/<name>.png`.
3. Drag X/Y/W/H sliders to position it. Live preview updates as you drag.
4. Pick an animation, save the preset, export, bake, render.

### Phase 3 — DONE: Custom Shape Primitives

**Goal achieved:** each scene can place up to 3 vector shapes (circle, dot, rect, line, arrow, text) above the background, below the text overlay. SVG-rendered so they scale crisp at any size. Each gets its own animation from the registry.

**Files added/changed:**
- [src/SmartLabReel.tsx](src/SmartLabReel.tsx):
  - Exported `Shape` type (`{ kind, x, y, w, h, x2?, y2?, stroke, fill, strokeWidth, text?, fontSize?, rotate?, opacity?, z?, anim? }`) and `ShapeKind` union (`'circle' | 'rect' | 'line' | 'dot' | 'text' | 'arrow'`).
  - New props: `scene1Shapes` ... `scene4Shapes` (each `Shape[]`).
  - New `<Shapes>` component rendering a positioned `<svg>` with `viewBox="0 0 1080 1350"`. Each shape renders as native SVG (`<circle>`, `<rect>`, `<line>`, `<text>`, etc.) with animation styles applied. `line` and `arrow` use a `stroke-dasharray` + `stroke-dashoffset` trick for a "drawing in" effect during the animation window — head triangle for arrow drawn when stroke completes.
  - `<Shapes>` injected into each Scene component between `<Layers>` and the text overlay.
- [scripts/bake-smartlab-preset.mjs](scripts/bake-smartlab-preset.mjs): new `readShapesForScene(N)` that pulls `s<N>-shape-<i>-*` keys for i ∈ 1..3 and builds `Shape` objects sorted by z-index.
- [smartlab-preview.html](smartlab-preview.html):
  - New "📐 Scene N Shapes" group per scene with 3 shape slots.
  - Each slot has: Kind dropdown (none / circle / dot / rect / line / arrow / text), X/Y, W/H, X2/Y2 (line/arrow endpoints), Stroke + Fill colors, Stroke width, Text + Font size (for kind:text), Rotate, Opacity, Z-index, Animation picker + dur + delay.
  - Each scene gets a `.shapes-host` SVG layer for live preview. Reactive — drag any slider, the shape moves/resizes immediately on stage.

**New preset key schema (Phase 3 additions):**
```
s<N>-shape-<i>-kind           string — 'circle' | 'dot' | 'rect' | 'line' | 'arrow' | 'text' | '' (disabled)
s<N>-shape-<i>-x, -y          int — primary position
s<N>-shape-<i>-w, -h          int — size (w = diameter for circle/dot)
s<N>-shape-<i>-x2, -y2        int — secondary point for line/arrow
s<N>-shape-<i>-stroke         color hex
s<N>-shape-<i>-fill           color hex (use 'none' style for ring)
s<N>-shape-<i>-stroke-width   int
s<N>-shape-<i>-text           string (for kind:'text')
s<N>-shape-<i>-fontSize       int
s<N>-shape-<i>-rotate         float — degrees
s<N>-shape-<i>-opacity        0..1
s<N>-shape-<i>-z              int — render order
s<N>-shape-<i>-anim*          AnimSpec keys (registry)
```

Where N ∈ 1..4 and i ∈ 1..3.

**Phase 3 known limitations (target for later polish):**
- Drop-shadow / glow on SVG would require `<filter>` elements — not built yet.
- Arrow head is auto-sized from `stroke-width × 4`. Not separately configurable.
- No path-following / morphing yet (Phase 4 markers cover the "callout" use case).

### Phase 4 — DONE: Animated Marker System

**Goal achieved:** the Instagram-style "spot the feature" reel — clickable-looking pulsing dots on a scene's image, each labeled, activating in sequence with timed callouts.

**Files added/changed:**
- [src/SmartLabReel.tsx](src/SmartLabReel.tsx):
  - Exported `Marker` type (`{ x, y, activateFrame, durationFrames?, label?, labelOffsetX/Y?, color?, ringSize?, dotSize?, labelBg/Color/Size? }`).
  - New props `scene1Markers` ... `scene4Markers` (each `Marker[]`).
  - New `<Markers>` component rendering a per-scene SVG layer (z=6, above shapes but below text):
    - Each marker fades in over 12 frames at its `activateFrame`, fades out 12 frames before deactivation.
    - **Pulse ring**: SVG `<circle>` whose radius animates 0 → `ringSize` over 1s, opacity 0.7 → 0. Loops continuously while marker is active.
    - **Central dot** uses Remotion `spring()` for scale-pop entry.
    - **Inner highlight** dot inside the main dot for a polished glassy look.
    - **Connector line** drawn from marker to the callout (auto-orients based on labelOffsetX sign).
    - **Callout pill** — rounded `<rect>` + centered `<text>`. Size auto-derived from label length × fontSize.
  - `<Markers>` injected into each Scene between `<Shapes>` and the text overlay.
- [scripts/bake-smartlab-preset.mjs](scripts/bake-smartlab-preset.mjs): new `readMarkersForScene(N)` reads `s<N>-marker-<i>-*` keys for i ∈ 1..4. Only markers with `enabled: 'true'` are included. Output array is sorted by `activateFrame` for deterministic scheduling.
- [smartlab-preview.html](smartlab-preview.html):
  - New "🎯 Scene N Markers" group per scene with 4 marker slots.
  - Each slot has: Enabled toggle, X/Y position, Label text, Activate-at frame, Duration frames, Color, Ring size, Dot size, Label X/Y offsets, Label font size, Label bg color, Label text color.
  - Per-scene `.markers-host` SVG layer renders static preview (dot + ring at 70% expansion + callout). Real frame-by-frame pulse is only visible in the rendered MP4.

**New preset key schema (Phase 4 additions):**
```
s<N>-marker-<i>-enabled       string — 'true' to render this marker, anything else = skip
s<N>-marker-<i>-x, -y         int — marker position (design px)
s<N>-marker-<i>-activateFrame int — frame in scene when marker activates
s<N>-marker-<i>-durationFrames int — frames marker stays active (default 90)
s<N>-marker-<i>-label         string — callout text
s<N>-marker-<i>-color         color — dot + ring + connector + callout border
s<N>-marker-<i>-ringSize      int — max pulse-ring radius
s<N>-marker-<i>-dotSize       int — central dot radius
s<N>-marker-<i>-labelOffsetX/Y int — callout offset from marker
s<N>-marker-<i>-labelSize     int — callout font size
s<N>-marker-<i>-labelBg       color — callout bg
s<N>-marker-<i>-labelColor    color — callout text color
```

Where N ∈ 1..4 and i ∈ 1..4.

**Marker sequencing pattern (the "Instagram product reel" effect):**
- Scene 2 has 5s = 150 frames available.
- Marker 1: activateFrame 40, duration 90 → visible from frame 40 to 130.
- Marker 2: activateFrame 100, duration 70 → visible from frame 100 to 170.
- They overlap from 100-130 (both shown) and marker 2 lingers after 1 fades.
- The sort in the bake script keeps them in chronological order in props.

**Phase 4 known limitations:**
- Click-to-place on the stage isn't wired (you set x/y via sliders). Phase 5 polish.
- No connector path curves — only straight lines from marker to callout.
- No marker-to-marker connecting lines (e.g., a tour path through the markers). Phase 5+.
- The studio preview shows markers statically — frame-based pulse is only in the rendered MP4.

### Phase 5 — DONE: Animation Style Presets (v1)

**Goal achieved:** one-click curated bundles that set every animation dropdown across the studio to a coherent style. Lets users get a polished result without picking 13+ dropdowns individually.

**5 style preset bundles in [smartlab-preview.html](smartlab-preview.html):**

| Preset | Vibe | Default duration |
|---|---|---|
| 🕊️ **Subtle** | All fade-ins. No movement, no springs. Calm. | 26f |
| 🎬 **Default** | Word-stagger headlines, slides for groups, springs for accents, heartbeat CTA | per-element |
| 💥 **Dramatic** | slide-up-large, blur-in, scale-pop. Bold and fast. | 24f |
| 🎉 **Playful** | Springs and rotations everywhere | 28f |
| 🎥 **Cinematic** | Slow blur-ins + camera zoom-ins. Premium feel. | 40f |

**How they work:**
- Each preset is a JS object `{ desc, map: { elementId: animationName }, durations: { default: N } }`.
- Clicking a preset button iterates `map` entries → sets `el.value = anim` → dispatches `change` event so the dirty marker and live preview update.
- Optional `durations.default` writes the same dur to every `*-anim-dur` slider in one sweep.
- Toast confirms which style was applied.

**Recipe to add a new style preset:**
1. Add an entry to `STYLE_PRESETS` in [smartlab-preview.html](smartlab-preview.html).
2. Add a button: `<button class="btn" data-style-preset="<name>">🎨 Name</button>` inside the "🎭 Animation Style Presets" group.
3. Done — click binding is already generic via `data-style-preset` attribute.

**Phase 5 deferred (future polish):**
- Visual animation picker with thumbnail previews of each animation playing in a 60×60 loop — Phase 5.1.
- Lottie JSON import as an animation kind — Phase 5.2.
- Click-to-place markers on the stage — Phase 5.3.
- Drop-shadow / glow / 3D tilt on layers + shapes — Phase 5.4.
- Auto-thumbnail of rendered MP4 in the project hub — Phase 5.5.

### What the SmartLab studio is now

After Phase 5, the SmartLab studio supports — all editable from the dashboard, all flowing to render via one bake script:
- 4 scenes with **per-scene duration sliders** (2.0–10.0s each) and **total reel duration indicator**
- **17 animations** in a typed registry shared between Remotion and the studio
- **Per-element animation picker** for every headline, subtitle, benefit group, card group, contact group, logo, and CTA (with separate loop animation for the CTA)
- **3 image layer slots per scene** with X/Y/W/H/rotate/scale/opacity/z + animation
- **3 shape primitives per scene** (circle/dot/rect/line/arrow/text) — SVG, animated, with stroke/fill/text controls
- **4 animated marker slots per scene** with sequenced activation, pulsing rings, and callouts
- **5 style preset bundles** for one-click consistency
- **▶ Live preview** that plays entry animations in the stage so users see what they're picking
- **📦 Export** → file on disk → bake script → Remotion MP4. End-to-end automation, no manual code edits between studio change and final video.

### Quick acceptance test (anyone can run)

```bash
# 1. Bake the fixture
node scripts/bake-smartlab-preset.mjs current

# 2. Render
npm run render:smartlab

# 3. Verify
# Expected: out/smartlab-v1.mp4 is ~10-11MB, 591 frames (~19.7s),
# contains layered scene1 thumbnail, animated circle in scene 2,
# horizontal line in scene 3, and 2 sequenced markers ("موثوق", "سريع")
# pulsing on scene 2's image.
```

The fixture preset in [smartlab-presets.json](smartlab-presets.json) `current` slot has working examples of every Phase 1-4 feature for regression testing.

---

## 14. Timeline polish (May 2026): Delete scenes + richer cross-project clipboard

Applied identically across **all three built-in studios** ([smartmed-preview.html](smartmed-preview.html), [smartmed-hajj-preview.html](smartmed-hajj-preview.html), [smartlab-preview.html](smartlab-preview.html)) and inherited automatically by any project scaffolded via the hub server — these are all under one dashboard, and behavior must stay consistent.

### 🗑 Permanent delete on each timeline tile

Each `.tl-scene` block in the timeline now exposes **two** controls (visible on hover): the existing `👁` hide toggle and a new `🗑` delete button.

Delete (`deleteScene(n)` in smartmed/hajj, `slDeleteScene(n)` in smartlab):
- Confirms with a `confirm()` dialog (calls out "built-in" vs custom).
- Removes from the DOM: the stage scene, the matching `details.group[data-scene="…"]`, the tab, and any per-scene `<style data-cloned-for="…">` (for cloned scenes).
- Clears the scene image override (`<id>-scene-images` localStorage key).
- Removes the scene from `tlState.order/visible/durations/template` and persists.
- If the user deleted the active scene, jumps to the first remaining scene.
- Refuses to delete the last remaining scene (toast: "Cannot delete the last scene").
- Reload the studio to restore built-in scenes.

The **👁 Show all** button was hardened in the same pass — it now iterates `tlState.order` instead of the original `ALL_SCENES` constant, so it no longer resurrects scenes the user just deleted.

### Richer cross-project paste

The scene clipboard schema gained a `cssVars` field:

```
{ project, sourceScene, snapshot, roles, sceneImage,
  cssVars: { "--s1-bg-color": "#fff", "--s1-h-anim-dur": "24", ... },
  timestamp }
```

On **copy**, `captureSceneCssVars(sc)` walks the stage element's inline `style` attribute and pulls every `--<var>` whose name matches the scene's prefix regex. These are the values written by `bindSliders` / `bindColors` / `bindSelects`, so any tweak the user can drag is now baked into the clipboard payload — including animation IDs and timing on smartlab.

On **paste**, `applySceneCssVars(targetScene, vars, sourceScene)` rewrites each var name through the source→target prefix substitution (`--s1-foo` → `--s5-foo`) and applies via `stage.style.setProperty`. This is additive: prefix-rewrite input apply still runs first (so the dirty/save pipeline catches the real `input` events), then the css-var pass plugs anything the target studio doesn't expose as a control. Cross-project pastes from a richer studio (smartlab) into a simpler one (smartmed) now visually carry over background colors, gradients, padding overrides — anything the source baked into stage CSS.

Toast format: `📥 Pasted S1→S5 (from smartlab): N applied (+ K via role) + image + M css vars, X skipped`.

### Why this matters

The user can hop between any project in the hub and Copy a scene in one studio → Paste into any other. The clipboard payload is studio-agnostic; richer source studios degrade gracefully into simpler targets (extra fields are silently skipped, but anything that does match — text, animations as CSS vars, image — lands). Deleting scenes is also a global capability now, not just a "duplicate-and-leave-the-junk" workaround.
