#!/usr/bin/env node
// Bake a SmartMed Hajj preset → Remotion-renderable artifacts.
//   - src/smartmed-hajj.css        (regenerated from preset values)
//   - smartmed-hajj-props.json     (regenerated scene props)
//
// Usage: node scripts/bake-smartmed-hajj-preset.mjs <preset-name | current>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const target = process.argv[2] || 'current';

const presetsPath = path.join(root, 'smartmed-hajj-presets.json');
if (!fs.existsSync(presetsPath)) {
  console.error(`Missing ${presetsPath}.`);
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
const numOrUndef = (key) => {
  const x = v(key, '');
  return x === '' ? undefined : Number(x);
};

// ── Generate src/smartmed-hajj.css ──────────────────────────────
const bg = v('bg-color', '#ffffff');
const primary = v('primary-color', '#0B2A4A');
const accent = v('accent-color', '#1A9DD7');

const sceneTop = (n, fallback) => px(`s${n}-top`, fallback);
const sceneHSize = (n, fallback) => px(`s${n}-h-size`, fallback);
const sceneHWeight = (n, fallback) => px(`s${n}-h-weight`, fallback);
const sceneSSize = (n, fallback) => px(`s${n}-s-size`, fallback);
const sceneSGap = (n, fallback) => px(`s${n}-gap`, fallback);

const css = `/* SMARTMED HAJJ reel — auto-generated from preset "${target}". DO NOT EDIT BY HAND. */
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Cairo:wght@400;500;700;800&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

.smh-video {
  direction: rtl;
  font-family: "Tajawal", "Cairo", Arial, sans-serif;
  background: ${bg};
  color: ${primary};
  overflow: hidden;
}

.smh-bg { position: absolute; inset: 0; overflow: hidden; z-index: 0; }
.smh-bg img { width: 100%; height: 100%; object-fit: cover; display: block; }

.smh-text {
  position: absolute;
  width: 100%;
  padding: 0 ${px('text-pad-x', 90)}px;
  text-align: center;
  direction: rtl;
  z-index: 5;
}
.smh-text h1 {
  margin: 0;
  color: ${primary};
  font-family: "Tajawal", "Cairo", Arial, sans-serif;
  line-height: 1.15;
  letter-spacing: -1px;
}
.smh-text p {
  margin-top: 28px;
  color: ${accent};
  font-family: "Tajawal", "Cairo", Arial, sans-serif;
  font-weight: 600;
  line-height: 1.3;
}

.smh-s1-text { top: ${sceneTop(1, 230)}px; }
.smh-s1-text h1 { font-size: ${sceneHSize(1, 96)}px; font-weight: ${sceneHWeight(1, 800)}; }
.smh-s1-text p { font-size: ${sceneSSize(1, 48)}px; margin-top: ${sceneSGap(1, 28)}px; }

.smh-s2-text { top: ${sceneTop(2, 200)}px; }
.smh-s2-text h1 { font-size: ${sceneHSize(2, 92)}px; font-weight: ${sceneHWeight(2, 800)}; }
.smh-s2-text p { font-size: ${sceneSSize(2, 46)}px; margin-top: ${sceneSGap(2, 26)}px; }

.smh-s3-text { top: ${sceneTop(3, 200)}px; }
.smh-s3-text h1 { font-size: ${sceneHSize(3, 88)}px; font-weight: ${sceneHWeight(3, 800)}; }
.smh-s3-text p { font-size: ${sceneSSize(3, 44)}px; margin-top: ${sceneSGap(3, 26)}px; }

.smh-s4-text { top: ${sceneTop(4, 220)}px; }
.smh-s4-text h1 { font-size: ${sceneHSize(4, 92)}px; font-weight: ${sceneHWeight(4, 800)}; }
.smh-s4-text p { font-size: ${sceneSSize(4, 46)}px; margin-top: ${sceneSGap(4, 26)}px; }

.smh-s5-text { top: ${sceneTop(5, 240)}px; }
.smh-s5-text h1 { font-size: ${sceneHSize(5, 96)}px; font-weight: ${sceneHWeight(5, 800)}; }
.smh-s5-text p { font-size: ${sceneSSize(5, 48)}px; margin-top: ${sceneSGap(5, 28)}px; }

/* ── Scene 1 Hero card (Hajj opener) ────────────────────────── */
.smh-hero-area { position: absolute; text-align: center; z-index: 5; }
.smh-hero-ornament { position: absolute; top: -95px; right: 115px; width: 115px; height: 135px; opacity: 0.95; }
.smh-hero-ornament svg { width: 100%; height: 100%; overflow: visible; }
.smh-hero-dot { position: absolute; border-radius: 50%; }
.smh-hero-dot.blue { width: 10px; height: 10px; top: 55px; right: 25px; }
.smh-hero-dot.gold { width: 13px; height: 13px; top: 100px; right: 8px; }
.smh-hero-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 190px; padding: 13px 30px 11px;
  border-radius: 999px;
  color: #fff;
  font-weight: 800;
  box-shadow: 0 15px 35px rgba(201, 154, 58, 0.22);
  margin-bottom: 50px;
}
.smh-hero-h1 {
  line-height: 1.12;
  font-weight: 900;
  letter-spacing: -2px;
  margin-bottom: 34px;
  text-shadow: 0 8px 20px rgba(25, 78, 164, 0.08);
}
.smh-hero-h1 span { display: block; margin-top: 16px; font-weight: 900; }
.smh-hero-sub { line-height: 1.7; font-weight: 500; margin-bottom: 46px; }
.smh-hero-divider {
  width: 500px; height: 26px;
  margin: 0 auto 48px;
  display: flex; align-items: center; justify-content: center;
  gap: 18px;
}
.smh-hero-divider-line { width: 210px; height: 2px; display: inline-block; opacity: .75; }
.smh-hero-diamond { display: inline-block; width: 16px; height: 16px; transform: rotate(45deg); border-radius: 2px; }
.smh-hero-services {
  width: 620px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr 1px 1fr 1px 1fr;
  align-items: start;
}
.smh-hero-sep { width: 1px; height: 88px; opacity: .75; margin-top: 6px; }
.smh-hero-service { display: flex; flex-direction: column; align-items: center; gap: 13px; }
.smh-hero-service p { font-weight: 700; white-space: nowrap; margin: 0; }
`;

fs.writeFileSync(path.join(root, 'src', 'smartmed-hajj.css'), css);

// ── AnimSpec / Layers / Shapes / Markers readers ─────────────────
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
    if (marker.activateFrame === undefined) marker.activateFrame = 0;
    markers.push(marker);
  }
  return markers.sort((a, b) => (a.activateFrame ?? 0) - (b.activateFrame ?? 0));
}

const MAX_SHAPES = 4;
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

const MAX_LAYERS = 3;
function readLayersForScene(sceneNum) {
  const layers = [];
  for (let i = 1; i <= MAX_LAYERS; i++) {
    const prefix = `s${sceneNum}-l${i}`;
    const src = v(`${prefix}-src`, '');
    if (!src) continue;
    const layer = { src };
    const numKeys = ['x', 'y', 'w', 'h', 'rotate', 'scale', 'opacity', 'z'];
    numKeys.forEach((k) => {
      const val = numOrUndef(`${prefix}-${k}`);
      if (val !== undefined) layer[k] = val;
    });
    const anim = readAnimSpec(prefix);
    if (anim) layer.anim = anim;
    layers.push(layer);
  }
  return layers.sort((a, b) => (a.z ?? 1) - (b.z ?? 1));
}

// ── Build per-scene SceneProps ───────────────────────────────────
function buildScene(n, defaultImage) {
  const scene = {
    image: v(`s${n}-image`, defaultImage),
    headline: v(`s${n}-h-text`, ''),
    subtitle: v(`s${n}-s-text`, ''),
  };
  const hAnim = readAnimSpec(`s${n}-h`);
  const sAnim = readAnimSpec(`s${n}-s`);
  if (hAnim) scene.headlineAnim = hAnim;
  if (sAnim) scene.subtitleAnim = sAnim;
  const layers = readLayersForScene(n);
  const shapes = readShapesForScene(n);
  const markers = readMarkersForScene(n);
  if (layers.length) scene.layers = layers;
  if (shapes.length) scene.shapes = shapes;
  if (markers.length) scene.markers = markers;
  return scene;
}

// ── Scene 1 Hero (Hajj card) ────────────────────────────────────
function buildScene1Hero() {
  const enabled = v('s1-hero-enabled', 'true');
  if (enabled !== 'true') return undefined;
  const hero = {
    enabled: true,
    image: v('s1-hero-image', v('s1-image', 'generated/smartmed/smartmed_2/scene1.png')),
    badgeText: v('s1-hero-badge-text', 'موسم الحج'),
    headline1: v('s1-hero-h1', 'قبل الحج...'),
    headline2: v('s1-hero-h2', 'اطمئن على صحتك'),
    sub1: v('s1-hero-sub1', 'رعاية طبية منزلية تمنحك'),
    sub2: v('s1-hero-sub2', 'راحة وطمأنينة قبل رحلتك'),
    services: [
      { icon: v('s1-hero-svc-1-icon', 'heart-pulse'), text: v('s1-hero-svc-1-text', 'قياس الضغط') },
      { icon: v('s1-hero-svc-2-icon', 'clipboard-meds'), text: v('s1-hero-svc-2-text', 'إدارة الأدوية') },
      { icon: v('s1-hero-svc-3-icon', 'microscope'), text: v('s1-hero-svc-3-text', 'فحص شامل') },
    ],
  };
  const numKeys = ['top', 'right', 'width', 'badgeSize', 'headline1Size', 'headline2Size', 'subSize', 'serviceTextSize'];
  numKeys.forEach((k) => {
    const val = numOrUndef(`s1-hero-${k}`);
    if (val !== undefined) hero[k] = val;
  });
  const strKeys = ['primaryColor', 'goldColor', 'subColor', 'badgeText2'];
  strKeys.forEach((k) => {
    const val = v(`s1-hero-${k}`, '');
    if (val !== '') hero[k] = val;
  });
  return hero;
}

const props = {
  scene1Hero: buildScene1Hero(),
  scene1: buildScene(1, 'generated/smartmed/smartmed_2/scene1.png'),
  scene2: buildScene(2, 'generated/smartmed/smartmed_2/scene4.png'),
  scene3: buildScene(3, 'generated/smartmed/smartmed_2/scene3.png'),
  scene4: buildScene(4, 'generated/smartmed/smartmed_2/scene5.png'),
  scene5: buildScene(5, 'generated/smartmed/smartmed_2/scene2.png'),
  scene1DurationSec: numOrUndef('s1-dur'),
  scene2DurationSec: numOrUndef('s2-dur'),
  scene3DurationSec: numOrUndef('s3-dur'),
  scene4DurationSec: numOrUndef('s4-dur'),
  scene5DurationSec: numOrUndef('s5-dur'),
  crossfadeFrames: numOrUndef('crossfade-frames'),
};

Object.keys(props).forEach((k) => {
  if (props[k] === undefined) delete props[k];
});

fs.writeFileSync(
  path.join(root, 'smartmed-hajj-props.json'),
  JSON.stringify(props, null, 2) + '\n'
);

console.log(`✓ Baked Hajj preset "${target}"`);
console.log(`  • src/smartmed-hajj.css       — regenerated`);
console.log(`  • smartmed-hajj-props.json    — regenerated`);
console.log(`\nRun: npm run render:smartmed-hajj`);
