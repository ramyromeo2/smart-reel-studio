#!/usr/bin/env node
// Bake a SmartLab preview preset → Remotion-renderable artifacts.
//
// Reads smartlab-presets.json, takes a preset name (or "current"), and writes:
//   - src/smartlab.css        (regenerated from preset values)
//   - smartlab-props.json     (regenerated text/cards/contacts fields)
//
// Usage: node scripts/bake-smartlab-preset.mjs <preset-name | current>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/bake-smartlab-preset.mjs <preset-name | current>');
  process.exit(1);
}

const presetsPath = path.join(root, 'smartlab-presets.json');
if (!fs.existsSync(presetsPath)) {
  console.error(`Missing ${presetsPath}. Export from the SmartLab studio first.`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
const preset = target === 'current' ? data.current : data.presets?.[target];

if (!preset) {
  console.error(`Preset "${target}" not found.`);
  console.error('Available:', Object.keys(data.presets || {}).join(', ') || '(none)');
  process.exit(1);
}

const v = (key, fallback = '') => (key in preset ? preset[key] : fallback);
const px = (key, fallback = 0) => {
  const x = v(key, fallback);
  return x === '' || x == null ? fallback : Number(x);
};

// ── Generate src/smartlab.css ───────────────────────────────
const bg = v('bg-color', '#ffffff');
const primary = v('primary-color', '#071B3A');
const accent = v('accent-color', '#1A9DD7');

const css = `/* SMARTLAB reel — auto-generated from preset "${target}". DO NOT EDIT BY HAND. */
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

.sl-video {
  direction: rtl;
  font-family: "Tajawal", Arial, sans-serif;
  background: ${bg};
  color: ${primary};
  overflow: hidden;
}

.sl-bg { position: absolute; inset: 0; overflow: hidden; z-index: 0; }
.sl-bg img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* ── Scene 1 ─────────────────────────────────────────────── */
.sl-s1-text {
  position: absolute;
  top: ${px('s1-top', 245)}px;
  width: 100%;
  text-align: center;
  direction: rtl;
  z-index: 5;
}
.sl-s1-text h1 {
  margin: 0;
  color: ${primary};
  font-family: "Tajawal", Arial, sans-serif;
  font-size: ${px('s1-h-size', 58)}px;
  font-weight: ${px('s1-h-weight', 400)};
  line-height: 1.25;
  letter-spacing: -0.5px;
}
.sl-s1-text p {
  margin: ${px('s1-gap', 22)}px 0 0;
  color: ${accent};
  font-family: "Tajawal", Arial, sans-serif;
  font-size: ${px('s1-s-size', 36)}px;
  font-weight: 400;
  line-height: 1.3;
}

/* ── Scene 2 ─────────────────────────────────────────────── */
.sl-s2-text {
  position: absolute;
  top: ${px('s2-top', 210)}px;
  width: 100%;
  padding: 0 90px;
  text-align: center;
  direction: rtl;
  z-index: 5;
}
.sl-s2-text h1 { margin: 0; color: ${primary}; font-size: ${px('s2-h-size', 62)}px; font-weight: 500; line-height: 1.25; }
.sl-s2-text .sl-s2-subtitle { margin: 22px 0 ${px('s2-gap', 42)}px; color: ${accent}; font-size: ${px('s2-s-size', 38)}px; font-weight: 500; line-height: 1.3; }
.sl-benefits { display: inline-flex; flex-direction: column; gap: ${px('s2-bgap', 18)}px; align-items: flex-start; }
.sl-benefit { display: flex; align-items: center; gap: 18px; color: ${primary}; font-size: ${px('s2-b-size', 34)}px; font-weight: 500; line-height: 1.25; white-space: nowrap; }
.sl-check {
  width: 42px; height: 42px;
  border: 3px solid ${accent};
  border-radius: 50%;
  color: ${accent};
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
  font-family: Arial, sans-serif;
  font-weight: 700;
  flex-shrink: 0;
}

/* ── Scene 3 ─────────────────────────────────────────────── */
.sl-services { position: absolute; top: ${px('s3-top', 135)}px; width: 100%; padding: 0 145px; text-align: center; direction: rtl; z-index: 5; }
.sl-services h1 { margin: 0; color: ${primary}; font-size: ${px('s3-h-size', 72)}px; font-weight: 500; line-height: 1.1; }
.sl-services .sl-services-subtitle { margin-top: 14px; color: ${accent}; font-size: ${px('s3-s-size', 44)}px; font-weight: 500; line-height: 1.2; }
.sl-cards { margin-top: ${px('s3-cgap-top', 38)}px; display: grid; grid-template-columns: 1fr 1fr; gap: ${px('s3-card-gap', 22)}px 28px; direction: rtl; }
.sl-card { height: ${px('s3-card-h', 152)}px; background: rgba(255,255,255,0.94); border-radius: 28px; box-shadow: 0 14px 34px rgba(7,27,58,0.09), inset 0 0 0 1px rgba(26,157,215,0.04); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.sl-card i { font-size: ${px('s3-card-icon', 56)}px; color: ${accent}; margin-bottom: 16px; line-height: 1; }
.sl-card p { margin: 0; color: ${primary}; font-size: ${px('s3-card-text', 28)}px; font-weight: 500; line-height: 1.25; }

/* ── Scene 4 ─────────────────────────────────────────────── */
.sl-outro { position: absolute; top: ${px('s4-top', 255)}px; width: 100%; text-align: center; direction: rtl; padding: 0 120px; z-index: 5; }
.sl-brand-logo { width: ${px('s4-logo-w', 360)}px; margin: 0 auto ${px('s4-logo-gap', 70)}px; display: block; }
.sl-outro h1 { margin: 0; color: ${primary}; font-size: ${px('s4-h-size', 82)}px; font-weight: 500; line-height: 1.1; letter-spacing: -1px; }
.sl-outro .sl-outro-subtitle { margin-top: 28px; color: ${accent}; font-size: ${px('s4-s-size', 42)}px; font-weight: 500; line-height: 1.25; }
.sl-contact-list { margin: ${px('s4-list-top', 58)}px auto 0; width: fit-content; display: flex; flex-direction: column; gap: ${px('s4-list-gap', 28)}px; direction: ltr; }
.sl-contact-row { display: grid; grid-template-columns: 80px 28px 1fr; align-items: center; gap: 24px; text-align: left; }
.sl-icon-circle { width: 70px; height: 70px; border-radius: 50%; background: rgba(26,157,215,0.08); display: flex; align-items: center; justify-content: center; }
.sl-icon-circle i { color: ${accent}; font-size: 42px; }
.sl-divider { width: 3px; height: 58px; background: ${accent}; border-radius: 20px; }
.sl-contact-text { color: ${primary}; font-size: ${px('s4-c-size', 44)}px; font-weight: 500; line-height: 1; font-family: "Tajawal", Arial, sans-serif; }
.sl-contact-text.number { font-family: "DIN Alternate", Arial, sans-serif; font-weight: 700; letter-spacing: 0.5px; }
`;

fs.writeFileSync(path.join(root, 'src', 'smartlab.css'), css);

// ── Build an AnimSpec from preset keys ──────────────────────
// Reads `<prefix>-anim`, `<prefix>-anim-dur`, `<prefix>-anim-delay`, and optional
// `<prefix>-loop`. Skips a field if the preset doesn't have it (component
// defaults take over). Returns undefined if NONE of the keys are set, so
// the SmartLab default props win (lets old presets render unchanged).
function readAnimSpec(prefix) {
  const entry = v(`${prefix}-anim`, '');
  const dur = v(`${prefix}-anim-dur`, '');
  const delay = v(`${prefix}-anim-delay`, '');
  const loop = v(`${prefix}-loop`, '');
  if (!entry && !dur && !delay && !loop) return undefined;
  const spec = {};
  if (entry) spec.entry = entry;
  if (dur !== '') spec.durFrames = Number(dur);
  if (delay !== '') spec.delayFrames = Number(delay);
  if (loop && loop !== 'none') spec.loop = loop;
  return spec;
}

const numOrUndef = (key) => {
  const x = v(key, '');
  return x === '' ? undefined : Number(x);
};

// Phase 4 — Animated markers. Sequenced pulsing dots with callouts.
const MAX_MARKERS = 4;
function readMarkersForScene(sceneNum) {
  const markers = [];
  for (let i = 1; i <= MAX_MARKERS; i++) {
    const prefix = `s${sceneNum}-marker-${i}`;
    const enabled = v(`${prefix}-enabled`, '');
    const x = numOrUndef(`${prefix}-x`);
    const y = numOrUndef(`${prefix}-y`);
    if (enabled !== 'true' || x === undefined || y === undefined) continue;
    const marker = { x, y };
    const numFields = ['activateFrame', 'durationFrames', 'labelOffsetX', 'labelOffsetY', 'ringSize', 'dotSize', 'labelSize'];
    const strFields = ['label', 'color', 'labelBg', 'labelColor'];
    numFields.forEach((f) => {
      const val = numOrUndef(`${prefix}-${f}`);
      if (val !== undefined) marker[f] = val;
    });
    strFields.forEach((f) => {
      const val = v(`${prefix}-${f}`, '');
      if (val !== '') marker[f] = val;
    });
    // activateFrame is required for predictable scheduling — default 0
    if (marker.activateFrame === undefined) marker.activateFrame = 0;
    markers.push(marker);
  }
  return markers.sort((a, b) => (a.activateFrame ?? 0) - (b.activateFrame ?? 0));
}

// Phase 3 — Shape primitives. Collect shape definitions from preset keys
// s<N>-shape-<i>-* for i ∈ 1..MAX_SHAPES. Empty/missing `kind` = slot disabled.
const MAX_SHAPES = 3;
function readShapesForScene(sceneNum) {
  const shapes = [];
  for (let i = 1; i <= MAX_SHAPES; i++) {
    const prefix = `s${sceneNum}-shape-${i}`;
    const kind = v(`${prefix}-kind`, '');
    if (!kind || kind === 'none') continue;
    const shape = { kind };
    const numFields = ['x', 'y', 'w', 'h', 'x2', 'y2', 'rotate', 'opacity', 'z', 'fontSize', 'fontWeight'];
    const strFields = ['stroke', 'fill', 'text', 'fontFamily'];
    numFields.forEach((f) => {
      const val = numOrUndef(`${prefix}-${f}`);
      if (val !== undefined) shape[f] = val;
    });
    strFields.forEach((f) => {
      const val = v(`${prefix}-${f}`, '');
      if (val !== '') shape[f] = val;
    });
    const sw = numOrUndef(`${prefix}-stroke-width`);
    if (sw !== undefined) shape.strokeWidth = sw;
    const anim = readAnimSpec(prefix);
    if (anim) shape.anim = anim;
    shapes.push(shape);
  }
  return shapes.sort((a, b) => (a.z ?? 5) - (b.z ?? 5));
}

// Collect image layers for a scene from preset keys s<N>-l<i>-*
// Returns an array of layer objects with non-empty src, sorted by z-index.
// Each layer also gets its own AnimSpec from s<N>-l<i>-anim* keys.
// MAX_LAYERS controls how many slots the studio is expected to expose;
// extending this number doesn't break anything (just allows more layers).
const MAX_LAYERS = 3;
function readLayersForScene(sceneNum) {
  const layers = [];
  for (let i = 1; i <= MAX_LAYERS; i++) {
    const prefix = `s${sceneNum}-l${i}`;
    const src = v(`${prefix}-src`, '');
    if (!src) continue; // empty src = slot disabled, skip
    const layer = { src };
    const x = numOrUndef(`${prefix}-x`);
    const y = numOrUndef(`${prefix}-y`);
    const w = numOrUndef(`${prefix}-w`);
    const h = numOrUndef(`${prefix}-h`);
    const rotate = numOrUndef(`${prefix}-rotate`);
    const scale = numOrUndef(`${prefix}-scale`);
    const opacity = numOrUndef(`${prefix}-opacity`);
    const z = numOrUndef(`${prefix}-z`);
    if (x !== undefined) layer.x = x;
    if (y !== undefined) layer.y = y;
    if (w !== undefined) layer.w = w;
    if (h !== undefined) layer.h = h;
    if (rotate !== undefined) layer.rotate = rotate;
    if (scale !== undefined) layer.scale = scale;
    if (opacity !== undefined) layer.opacity = opacity;
    if (z !== undefined) layer.z = z;
    const anim = readAnimSpec(prefix);
    if (anim) layer.anim = anim;
    layers.push(layer);
  }
  // Stable sort by z (lower z first → renders below higher z)
  return layers.sort((a, b) => (a.z ?? 1) - (b.z ?? 1));
}

// ── Generate smartlab-props.json ────────────────────────────
const props = {
  scene1Image: 'generated/smartlab/scene1.jpg',
  scene2Image: 'generated/smartlab/scene2.jpg',
  scene3Image: 'generated/smartlab/scene3.jpg',
  scene4Image: 'generated/smartlab/scene4.jpg',

  scene1Headline: v('s1-h-text'),
  scene1Subtitle: v('s1-s-text'),
  s1HeadlineAnim: readAnimSpec('s1-h'),
  s1SubtitleAnim: readAnimSpec('s1-s'),

  scene2Headline: v('s2-h-text'),
  scene2Subtitle: v('s2-s-text'),
  scene2Benefits: [v('s2-b1'), v('s2-b2'), v('s2-b3')].filter(Boolean),
  s2HeadlineAnim: readAnimSpec('s2-h'),
  s2SubtitleAnim: readAnimSpec('s2-s'),
  s2BenefitsAnim: readAnimSpec('s2-benefits'),
  s2BenefitsStaggerFrames: numOrUndef('s2-benefits-stagger'),

  scene3Headline: v('s3-h-text'),
  scene3Subtitle: v('s3-s-text'),
  scene3Cards: [1, 2, 3, 4].map((i) => ({
    icon: v(`s3-c${i}-i`),
    text: v(`s3-c${i}-t`).replace(/\\n/g, '\n'),
  })),
  s3HeadlineAnim: readAnimSpec('s3-h'),
  s3SubtitleAnim: readAnimSpec('s3-s'),
  s3CardsAnim: readAnimSpec('s3-cards'),
  s3CardsStaggerFrames: numOrUndef('s3-cards-stagger'),

  scene4Logo: '',
  scene4Headline: v('s4-h-text'),
  scene4Subtitle: v('s4-s-text'),
  scene4Contacts: [
    { icon: v('s4-c1-i'), text: v('s4-c1-t') },
    {
      icon: v('s4-c2-i'),
      text: v('s4-c2-t'),
      isNumber: v('s4-c2-num') === 'true',
    },
  ],
  s4LogoAnim: readAnimSpec('s4-logo'),
  s4HeadlineAnim: readAnimSpec('s4-h'),
  s4SubtitleAnim: readAnimSpec('s4-s'),
  s4ContactsAnim: readAnimSpec('s4-contacts'),
  s4ContactsStaggerFrames: numOrUndef('s4-contacts-stagger'),

  // Scene durations (seconds). Default 5.0s each → 18s total reel.
  scene1DurationSec: numOrUndef('s1-dur'),
  scene2DurationSec: numOrUndef('s2-dur'),
  scene3DurationSec: numOrUndef('s3-dur'),
  scene4DurationSec: numOrUndef('s4-dur'),
  crossfadeFrames: numOrUndef('crossfade-frames'),

  // Image layers per scene (Phase 2). Empty array = no overlays.
  scene1Layers: readLayersForScene(1),
  scene2Layers: readLayersForScene(2),
  scene3Layers: readLayersForScene(3),
  scene4Layers: readLayersForScene(4),

  // Shape primitives per scene (Phase 3).
  scene1Shapes: readShapesForScene(1),
  scene2Shapes: readShapesForScene(2),
  scene3Shapes: readShapesForScene(3),
  scene4Shapes: readShapesForScene(4),

  // Animated markers per scene (Phase 4).
  scene1Markers: readMarkersForScene(1),
  scene2Markers: readMarkersForScene(2),
  scene3Markers: readMarkersForScene(3),
  scene4Markers: readMarkersForScene(4),
};

// Strip empty layer/shape/marker arrays for cleaner JSON
['scene1Layers', 'scene2Layers', 'scene3Layers', 'scene4Layers',
 'scene1Shapes', 'scene2Shapes', 'scene3Shapes', 'scene4Shapes',
 'scene1Markers', 'scene2Markers', 'scene3Markers', 'scene4Markers'].forEach((k) => {
  if (Array.isArray(props[k]) && props[k].length === 0) delete props[k];
});

// Strip undefined keys so JSON stays clean
Object.keys(props).forEach((k) => {
  if (props[k] === undefined) delete props[k];
});

fs.writeFileSync(
  path.join(root, 'smartlab-props.json'),
  JSON.stringify(props, null, 2) + '\n'
);

console.log(`✓ Baked preset "${target}"`);
console.log(`  • src/smartlab.css         — all CSS values from preset`);
console.log(`  • smartlab-props.json      — texts, cards, contacts`);
console.log(`\nRun: npm run render:smartlab`);
