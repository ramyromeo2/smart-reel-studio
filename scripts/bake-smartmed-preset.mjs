#!/usr/bin/env node
// Bake a SmartMed preview preset → Remotion-renderable artifacts.
//
// Reads smartmed-presets.json, takes a preset name (or "current"), and writes:
//   - src/smartmed.css            (regenerated from preset values)
//   - smartmed-props.json         (regenerated text/pill/contact fields)
//   - src/SmartMedReel.tsx        (patched per-row tweaks array)
//
// Usage: node scripts/bake-smartmed-preset.mjs <preset-name | current>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/bake-smartmed-preset.mjs <preset-name | current>');
  process.exit(1);
}

const presetsPath = path.join(root, 'smartmed-presets.json');
if (!fs.existsSync(presetsPath)) {
  console.error(`Missing ${presetsPath}. Export from the preview first.`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
const preset = target === 'current' ? data.current : data.presets?.[target];

if (!preset) {
  console.error(`Preset "${target}" not found.`);
  console.error('Available presets:', Object.keys(data.presets || {}).join(', ') || '(none)');
  process.exit(1);
}

const v = (key, fallback = '') => (key in preset ? preset[key] : fallback);
const px = (key, fallback = 0) => {
  const x = v(key, fallback);
  return x === '' || x == null ? fallback : Number(x);
};

// ───────────────────────────────────────────────────────────────────
// 1) Generate src/smartmed.css
// ───────────────────────────────────────────────────────────────────
const css = `/* SMARTMED reel — auto-generated from preset "${target}". DO NOT EDIT BY HAND. */
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800&family=Tajawal:wght@500;600;700;800;900&display=swap');

.sm-video {
  direction: rtl;
  font-family: "${v('font-family-1', 'Tajawal')}", "Cairo", "Arial", sans-serif;
  background: #ffffff;
  color: ${v('text-color', '#194ea4')};
  overflow: hidden;
}

.sm-photo { position: absolute; inset: 0; overflow: hidden; }
.sm-photo img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transform-origin: center; will-change: transform;
}

/* ── Scene 1 ────────────────────────────────────────────────── */
.sm-headline {
  position: absolute;
  top: ${px('h-top', 14)}%;
  left: 0; right: 0;
  text-align: ${v('h-align', 'center')};
  direction: ${v('h-dir', 'rtl')};
  z-index: 5;
  display: flex; flex-direction: column;
  gap: ${px('h-gap', 0)}px;
}
.sm-headline-line {
  font-family: "${v('font-family-1', 'Tajawal')}", "Cairo", "Arial", sans-serif;
  font-size: ${px('h-size', 124)}px;
  line-height: 1.15;
  font-weight: ${px('h-weight', 500)};
  color: ${v('text-color', '#194ea4')};
  letter-spacing: -1px;
  will-change: transform, opacity;
}
.sm-subtitle {
  position: absolute;
  top: ${px('s-top', 31)}%;
  left: 0; right: 0;
  text-align: ${v('sub-align', 'center')};
  direction: ${v('sub-dir', 'rtl')};
  padding: 0 ${px('s-pad', 90)}px;
  font-family: "${v('font-family-1', 'Tajawal')}", "Cairo", "Arial", sans-serif;
  font-size: ${px('s-size', 44)}px;
  line-height: 1.4;
  font-weight: ${px('s-weight', 500)};
  color: ${v('text-color', '#194ea4')};
  will-change: transform, opacity;
  z-index: 5;
}

/* ── Scene 2: pills ─────────────────────────────────────────── */
.sm-pills {
  position: absolute;
  top: ${px('p-top', 26)}%;
  ${v('p-align', 'right') === 'left' ? `left: ${px('p-edge', 46)}px;`
    : v('p-align') === 'center' ? `left: 50%; transform: translateX(-50%);`
    : `right: ${px('p-edge', 46)}px;`}
  display: flex; flex-direction: column;
  gap: ${px('p-gap', 57)}px;
  z-index: 5;
}
.sm-pill {
  display: flex;
  align-items: center;
  justify-content: ${v('p-justify', 'flex-end')};
  flex-direction: ${v('p-flex-direction', 'row-reverse')};
  gap: ${px('p-icon-gap', 22)}px;
  padding: ${px('p-vpad', 18)}px ${px('p-hpad', 28)}px ${px('p-vpad', 18)}px ${px('p-hpad-inner', 18)}px;
  background: ${v('p-bg', '#ffffff')};
  border-radius: ${px('p-radius', 999)}px;
  box-shadow: 0 14px 36px rgba(0, 30, 90, ${(px('p-shadow', 18) / 100).toFixed(2)}),
              0 2px 6px rgba(0, 30, 90, 0.06);
  width: ${px('p-width', 656)}px;
  will-change: transform, opacity;
}
.sm-pill-text {
  font-family: "${v('font-family-2', 'Tajawal')}", "Cairo", "Arial", sans-serif;
  font-size: ${px('p-size', 48)}px;
  font-weight: ${px('p-weight', 700)};
  color: ${v('p-text-color', v('text-color', '#194ea4'))};
  letter-spacing: -0.3px;
  white-space: nowrap;
}
.sm-pill-icon {
  width: ${px('p-icon', 88)}px;
  height: ${px('p-icon', 88)}px;
  flex: none;
  display: grid;
  place-items: center;
  background: ${v('i-bg', '#e6f4fb')};
  border-radius: 999px;
  color: ${v('i-color', '#004e9e')};
  padding: ${px('i-pad', 18)}px;
  box-shadow: inset 0 -3px 8px rgba(0, 30, 90, 0.06);
  will-change: transform;
}
.sm-pill-icon svg { width: 100%; height: 100%; }

/* ── Scene 3: CTA + contacts ────────────────────────────────── */
.sm-cta-headline {
  position: absolute;
  top: ${px('c-h-top', 36.5)}%;
  left: 0; right: 0;
  text-align: ${v('c-h-align', 'center')};
  direction: ${v('c-h-dir', 'rtl')};
  padding: 0 ${px('c-h-pad', 0)}px;
  font-family: "${v('font-family-3', 'Tajawal')}", "Tajawal", "Cairo", "Arial", sans-serif;
  font-size: ${px('c-h-size', 95)}px;
  line-height: 1.1;
  font-weight: ${px('c-h-weight', 700)};
  color: ${v('text-color', '#194ea4')};
  letter-spacing: -1px;
  transform: translateX(${px('c-h-x', 0)}px);
  z-index: 5;
  will-change: transform, opacity;
}
.sm-cta-subtitle {
  position: absolute;
  top: ${px('c-s-top', 45)}%;
  left: 0; right: 0;
  text-align: ${v('c-s-align', 'center')};
  direction: ${v('c-s-dir', 'rtl')};
  padding: 0 ${px('c-s-pad', 90)}px;
  font-family: "${v('font-family-3', 'Tajawal')}", "Tajawal", "Cairo", "Arial", sans-serif;
  font-size: ${px('c-s-size', 42)}px;
  line-height: 1.35;
  font-weight: ${px('c-s-weight', 500)};
  color: ${v('text-color', '#194ea4')};
  transform: translateX(${px('c-s-x', 0)}px);
  z-index: 5;
  will-change: transform, opacity;
}

.sm-contact-list {
  position: absolute;
  top: ${px('c-list-top', 49)}%;
  right: ${px('c-list-right', 139)}px;
  width: 760px;
  display: flex;
  flex-direction: column;
  gap: ${px('c-row-gap', 32)}px;
  z-index: 5;
}
.sm-contact-row {
  width: 100%;
  height: 152px;
  display: flex;
  flex-direction: ${v('c-row-flow', 'row')};
  direction: ltr;
  justify-content: ${v('c-row-justify', 'flex-start')};
  align-items: center;
  border-bottom: 3px solid #B8CDF0;
  will-change: transform, opacity;
}
.sm-contact-row:last-child { border-bottom: none; }
.sm-contact-icon-wrap {
  width: 132px; min-width: 132px;
  display: flex; justify-content: center; align-items: center;
}
.sm-contact-icon {
  width: ${px('c-icon', 88)}px;
  height: ${px('c-icon', 88)}px;
  flex: none;
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${v('c-icon-bg', '#194ea4')};
  will-change: transform;
}
.sm-contact-icon svg { width: 100%; height: 100%; display: block; }
.sm-contact-divider {
  width: 3px;
  height: 78px;
  background: #AFC6EC;
  margin: 0 ${px('c-inner-gap', 38)}px;
  flex-shrink: 0;
}
.sm-contact-label {
  direction: ${v('c-label-dir', 'rtl')};
  text-align: ${v('c-label-align', 'left')};
  color: ${v('text-color', '#194ea4')};
  font-family: "${v('font-family-3', 'Tajawal')}", "Tajawal", "Cairo", sans-serif;
  font-size: ${px('c-label-size', 37)}px;
  font-weight: ${px('c-label-weight', 600)};
  white-space: nowrap;
  line-height: 1;
  min-width: 240px;
  margin-right: 24px;
}
.sm-contact-value {
  color: ${v('text-color', '#194ea4')};
  font-family: "${v('font-family-3', 'Tajawal')}", "Tajawal", "Cairo", sans-serif;
  font-size: ${px('c-value-size', 61)}px;
  font-weight: ${px('c-value-weight', 500)};
  line-height: 1;
  white-space: nowrap;
  direction: ${v('c-value-dir', 'ltr')};
  text-align: ${v('c-value-align', 'right')};
  margin-left: 24px;
  letter-spacing: -1px;
  flex: ${v('c-value-flex', '1 1 auto')};
}
.sm-contact-value.web { font-size: ${px('c-r3-value-size', 41)}px; }
.sm-contact-label.web { font-size: ${px('c-r3-label-size', 32)}px; }
`;

fs.writeFileSync(path.join(root, 'src', 'smartmed.css'), css);

// ───────────────────────────────────────────────────────────────────
// 2) Generate smartmed-props.json (texts + icons)
// ───────────────────────────────────────────────────────────────────
const props = {
  scene1Image: 'generated/smartmed/scene1.jpg',
  scene2Image: 'generated/smartmed/scene2.jpg',
  scene3Image: 'generated/smartmed/scene3.jpg',
  scene1HeadlineLine1: v('t-line1'),
  scene1HeadlineLine2: v('t-line2'),
  scene1Subtitle: v('t-subtitle'),
  scene2Pills: [1, 2, 3, 4].map((i) => ({
    text: v(`t-pill${i}`),
    icon: v(`i-pick-${i}`),
  })),
  scene3Headline: v('t-cta-headline'),
  scene3Subtitle: v('t-cta-subtitle'),
  scene3Contacts: [1, 2, 3].map((i) => ({
    icon: v(`c-row-${i}-icon`),
    label: v(`c-row-${i}-label`),
    value: v(`c-row-${i}-value`),
  })),
};

fs.writeFileSync(
  path.join(root, 'smartmed-props.json'),
  JSON.stringify(props, null, 2) + '\n'
);

// ───────────────────────────────────────────────────────────────────
// 3) Patch src/SmartMedReel.tsx tweaks array
// ───────────────────────────────────────────────────────────────────
const tsxPath = path.join(root, 'src', 'SmartMedReel.tsx');
let tsx = fs.readFileSync(tsxPath, 'utf8');

const tweaksLines = [1, 2, 3].map((i) => {
  const get = (suffix) => px(`c-r${i}-${suffix}`, 0);
  return `            { rowX: ${get('x')}, rowY: ${get('y')}, iconX: ${get('icon-x')}, iconY: ${get('icon-y')}, labelX: ${get('label-x')}, labelY: ${get('label-y')}, valueX: ${get('value-x')}, valueY: ${get('value-y')} },`;
}).join('\n');

const newTweaksBlock = `          const tweaks = [
${tweaksLines}
          ][i] ?? { rowX: 0, rowY: 0, iconX: 0, iconY: 0, labelX: 0, labelY: 0, valueX: 0, valueY: 0 };`;

tsx = tsx.replace(
  /          const tweaks = \[\s*\{[\s\S]*?\}\s*\]\[i\] \?\? \{ rowX: 0, rowY: 0, iconX: 0, iconY: 0, labelX: 0, labelY: 0, valueX: 0, valueY: 0 \};/,
  newTweaksBlock
);

fs.writeFileSync(tsxPath, tsx);

// ───────────────────────────────────────────────────────────────────
console.log(`✓ Baked preset "${target}"`);
console.log(`  • src/smartmed.css         — all CSS values from preset`);
console.log(`  • smartmed-props.json      — texts, pills, contacts`);
console.log(`  • src/SmartMedReel.tsx     — per-row tweaks array`);
console.log(`\nRun: npm run render:smartmed`);
