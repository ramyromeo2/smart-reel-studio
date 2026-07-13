#!/usr/bin/env node
// Zero-dependency local hub server.
//
// - Serves the repo as static files at /  (so the Studio HTML pages run
//   under http://localhost:<port>/ instead of file://, which means fetch()
//   works and we get a real network round-trip for the API).
// - GET  /api/projects                — list built-in + custom projects
// - POST /api/projects                — scaffold a new custom project
//                                       { name, id, tagline, color, aspect,
//                                         scenes, starter, html, images }
// - DELETE /api/projects/:id          — remove a custom project (files +
//                                       projects.json entry; built-ins are
//                                       protected).
// - POST /api/render                  — { id } → spawns `npm run render:<id>`
//                                       in the background, returns its log
//                                       file path so the UI can poll/tail.
// - POST /api/bake                    — { id, preset } → same idea for the
//                                       bake scripts.
//
// Run it via:  npm run hub          (port 4000 by default)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { makeCancelSignal, openBrowser, renderStill, selectComposition } from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// Listen on multiple ports so users don't lose their per-origin localStorage
// when we change the default port. Override with PORT=... (single) or
// PORTS=4000,4001,... (multiple) env vars.
const PORTS = process.env.PORTS
  ? process.env.PORTS.split(',').map(s => Number(s.trim())).filter(Boolean)
  : process.env.PORT
    ? [Number(process.env.PORT)]
    : [4001];
const PORT = PORTS[0]; // for logging convenience
const PROJECTS_FILE = path.join(ROOT, 'projects.json');
const PACKAGE_FILE = path.join(ROOT, 'package.json');
const LOG_DIR = path.join(ROOT, '.hub-logs');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.mp3':  'audio/mpeg',
  '.mp4':  'video/mp4',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
};

const readJson  = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');

const BUILTIN_IDS = new Set(['smartmed', 'smartlab', 'smartmed-hajj', 'rightcare', 'smartreel', 'tokyo']);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    const MAX = 200 * 1024 * 1024; // 200MB cap for image uploads
    req.on('data', c => {
      size += c.length;
      if (size > MAX) { req.destroy(); reject(new Error('payload too large')); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, code, body, type = 'application/json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(payload);
}

function serveStatic(req, res, urlPath) {
  // Default to index.html for "/" and prevent directory traversal
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safe);
  if (!filePath.startsWith(ROOT)) return send(res, 403, '403 forbidden', 'text/plain');
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, '404 not found', 'text/plain');
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

// ── Project scaffolding ──────────────────────────────────────────
const STARTER_MAP = {
  'smartmed':      { studio: 'smartmed-preview.html',      props: 'smartmed-props.json' },
  'smartmed-hajj': { studio: 'smartmed-hajj-preview.html', props: 'smartmed-hajj-props.json' },
  'smartlab':      { studio: 'smartlab-preview.html',      props: 'smartlab-props.json' },
  'smartlab-posts': {
    studio: 'smartlab-posts-preview.html',
    props: 'smartlab-posts-props.json',
    advancedPoster: true,
  },
};

const STARTER_COMPOSITIONS = {
  'smartmed': 'SmartMedReel',
  'smartmed-hajj': 'SmartMedHajjReel',
  'smartlab': 'SmartLabReel',
  'smartlab-posts': 'SmartLabReel',
};

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function dataUrlToBuffer(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], buf: Buffer.from(m[2], 'base64') };
}

function extForMime(mime) {
  if (mime === 'image/png')  return '.png';
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif')  return '.gif';
  if (mime === 'image/svg+xml') return '.svg';
  return '.bin';
}

function rewriteProjectText(text, fromId, toId) {
  return String(text || '').split(fromId).join(toId);
}

function blankPosterTimeline(sceneCount = 1) {
  const count = Math.max(1, Math.min(20, Number(sceneCount) || 1));
  const order = Array.from({ length: count }, (_v, i) => String(i + 1));
  return {
    order,
    durations: Object.fromEntries(order.map((n) => [n, 5])),
    visible: Object.fromEntries(order.map((n) => [n, true])),
    template: {},
  };
}

function writeBlankAdvancedPosterState(id, sceneCount) {
  const timeline = blankPosterTimeline(sceneCount);
  writeJson(path.join(ROOT, `${id}-overlay-state.json`), {});
  writeJson(path.join(ROOT, `${id}-timeline.json`), timeline);
  writeJson(path.join(ROOT, `${id}-studio-state.json`), {
    canonical: { __timeline: timeline },
    presets: {},
    activePreset: '',
    timeline,
    sceneImages: {},
    overlayState: {},
  });
  fs.writeFileSync(
    path.join(ROOT, `${id}-recovery-state.js`),
    'window.__SMARTLAB_POSTS_RECOVERY_STATE__ = null;\n'
  );
}

function safeProjectId(id) {
  const clean = String(id || '').trim();
  return /^[a-z0-9][a-z0-9_-]*$/i.test(clean) ? clean : '';
}

function materializeOverlayImages(projectId, overlayState) {
  const generatedDir = path.join(ROOT, 'public', 'generated', projectId);
  const nextState = structuredClone(overlayState);
  Object.entries(nextState).forEach(([sceneId, doc]) => {
    if (!doc || typeof doc !== 'object') return;
    const img = typeof doc.backgroundImage === 'string' ? doc.backgroundImage : '';
    if (!img.startsWith('data:image/')) return;
    const parsed = dataUrlToBuffer(img);
    if (!parsed) return;
    ensureDir(generatedDir);
    const ext = extForMime(parsed.mime);
    const fileName = `overlay-bg-scene-${String(sceneId).replace(/[^a-z0-9_-]/gi, '')}${ext}`;
    fs.writeFileSync(path.join(generatedDir, fileName), parsed.buf);
    doc.backgroundImage = `public/generated/${projectId}/${fileName}`;
  });
  return nextState;
}

function makeBlankPosterStudio(studio) {
  return studio
    .replace(
      /<body>/,
      `<body class="blank-project">`
    )
    .replace(
      /body \{ display: flex; gap: 16px; padding: 16px; min-height: 100vh; \}/,
      `body { display: flex; gap: 16px; padding: 16px; min-height: 100vh; }
body.blank-project .scene > :not(.scene-bg):not(.layers-host):not(.shapes-host):not(.markers-host):not(.poster-overlay-host) {
  display: none !important;
}`
    )
    .replace(
      /public\/generated\/smartlab\/scene[1-4]\.jpg/g,
      'public/generated/blank-white.svg'
    )
    .replace(
      /<img class="sl-brand-logo" id="sl-s4-logo" src="[^"]*" alt="" onerror="[^"]*" \/>/,
      `<img class="sl-brand-logo" id="sl-s4-logo" src="" alt="" onerror="this.style.display='none'" />`
    );
}

function makeBlankSmartLabProps() {
  return {
    scene1Image: 'generated/blank-white.svg',
    scene2Image: 'generated/blank-white.svg',
    scene3Image: 'generated/blank-white.svg',
    scene4Image: 'generated/blank-white.svg',
    scene1Headline: '',
    scene1Subtitle: '',
    s1HeadlineAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s1SubtitleAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    scene2Headline: '',
    scene2Subtitle: '',
    scene2Benefits: [],
    s2HeadlineAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s2SubtitleAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s2BenefitsAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s2BenefitsStaggerFrames: 0,
    scene3Headline: '',
    scene3Subtitle: '',
    scene3Cards: [],
    s3HeadlineAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s3SubtitleAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s3CardsAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s3CardsStaggerFrames: 0,
    scene4Logo: '',
    scene4Headline: '',
    scene4Subtitle: '',
    scene4Contacts: [],
    s4LogoAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s4HeadlineAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s4SubtitleAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s4ContactsAnim: { entry: 'none', durFrames: 1, delayFrames: 0 },
    s4ContactsStaggerFrames: 0,
    scene1DurationSec: 5,
    scene2DurationSec: 5,
    scene3DurationSec: 5,
    scene4DurationSec: 5,
    crossfadeFrames: 18,
  };
}

function scaffoldProject(spec) {
  const { id, name, tagline, color, aspect, scenes, starter, html, images } = spec;

  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('id must be lowercase letters/numbers/dashes');
  if (BUILTIN_IDS.has(id)) throw new Error(`id "${id}" collides with a built-in project`);

  const projects = readJson(PROJECTS_FILE);
  if (projects.projects.some(p => p.id === id)) {
    throw new Error(`id "${id}" already exists in projects.json`);
  }

  const effectiveStarter = starter && starter !== 'blank' ? starter : 'smartlab-posts';
  const isBlankStarter = false;
  const starterCfg = STARTER_MAP[effectiveStarter];

  // Write uploaded images to public/generated/<id>/
  const imageDir = path.join(ROOT, 'public', 'generated', id);
  let imagesWritten = [];
  if (Array.isArray(images) && images.length) {
    ensureDir(imageDir);
    images.forEach((img, i) => {
      const parsed = dataUrlToBuffer(img.dataUrl);
      if (!parsed) return;
      const ext = extForMime(parsed.mime);
      // Prefer the user-provided name when safe; otherwise scene<i>.<ext>
      const safeName = (img.name || `scene${i + 1}${ext}`)
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const finalName = safeName.includes('.') ? safeName : (safeName + ext);
      const dest = path.join(imageDir, finalName);
      fs.writeFileSync(dest, parsed.buf);
      imagesWritten.push(`generated/${id}/${finalName}`);
    });
  }

  // Clone starter studio + props if requested
  let studioUrl = '';
  let propsFile = '';
  let presetsFile = '';
  if (starterCfg) {
    const newStudio = `${id}-preview.html`;
    const newProps  = `${id}-props.json`;

    // Copy studio HTML, rewrite any image references that point to the
    // starter's generated folder so they target this project's folder.
    let studio = fs.readFileSync(path.join(ROOT, starterCfg.studio), 'utf8');
    if (isBlankStarter) {
      studio = makeBlankPosterStudio(studio);
    }
    if (starterCfg.advancedPoster) {
      studio = rewriteProjectText(studio, effectiveStarter, id);
    }
    if (imagesWritten.length) {
      studio = studio.replace(
        /public\/generated\/(smartmed(?:_2)?|smartlab|smartmed-hajj|smartlab-posts|smartmed\/smartmed_2)\//g,
        `public/generated/${id}/`
      );
    }
    // If the user uploaded N images named scene1..N, point image src tags at them
    if (imagesWritten.length) {
      imagesWritten.forEach((relPath, i) => {
        const n = i + 1;
        studio = studio.replace(
          new RegExp(`public/generated/${id}/scene${n}\\.(?:jpg|jpeg|png|webp)`, 'g'),
          'public/' + relPath
        );
      });
    }

    // ── Namespace localStorage keys so the clone doesn't collide with
    //    its source studio's presets / audio / scene clipboard.
    //    Each studio uses keys like `<starter>-...` ('smartmed-v4',
    //    'smartmed-presets-v4', 'smartmed-audio-src', 'smartmed-active-preset',
    //    etc.). We swap the starter prefix for the new project's id.
    //    Order matters: longer prefixes (smartmed-hajj) must be replaced
    //    before shorter ones (smartmed) to avoid double-rewrites.
    const STARTER_KEY_PREFIXES = {
      'smartmed-hajj': ['smartmed-hajj'],
      'smartmed':      ['smartmed'],
      'smartlab':      ['smartlab'],
    };
    const prefixes = STARTER_KEY_PREFIXES[effectiveStarter] || [];
    prefixes.forEach(prefix => {
      // Match quoted string literals containing the prefix (with - suffix to
      // avoid matching things like 'smartmed.css' or class names).
      const re = new RegExp(`(['"\`])${prefix.replace(/-/g, '\\-')}(-[a-z0-9-]*)?\\1`, 'g');
      studio = studio.replace(re, (_match, quote, rest) => `${quote}${id}${rest || ''}${quote}`);
      // Also swap `PROJECT_ID = '<prefix>'` literal for scene clipboard
      const pidRe = new RegExp(`(PROJECT_ID\\s*=\\s*['"\`])${prefix.replace(/-/g, '\\-')}(['"\`])`, 'g');
      studio = studio.replace(pidRe, `$1${id}$2`);
    });

    fs.writeFileSync(path.join(ROOT, newStudio), studio);

    // Copy props if it exists
    const starterPropsPath = path.join(ROOT, starterCfg.props);
    if (fs.existsSync(starterPropsPath)) {
      let propsTxt = isBlankStarter
        ? JSON.stringify(makeBlankSmartLabProps(), null, 2) + '\n'
        : starterCfg.advancedPoster
          ? JSON.stringify(makeBlankSmartLabProps(), null, 2) + '\n'
          : fs.readFileSync(starterPropsPath, 'utf8');
      if (starterCfg.advancedPoster) {
        propsTxt = rewriteProjectText(propsTxt, effectiveStarter, id);
      }
      if (!isBlankStarter && imagesWritten.length) {
        propsTxt = propsTxt.replace(
          /generated\/(smartmed(?:_2)?|smartlab|smartmed-hajj|smartlab-posts|smartmed\/smartmed_2)\//g,
          `generated/${id}/`
        );
      }
      fs.writeFileSync(path.join(ROOT, newProps), propsTxt);
      propsFile = newProps;
    }
    studioUrl = newStudio;

    // Skeleton presets file
    presetsFile = `${id}-presets.json`;
    fs.writeFileSync(path.join(ROOT, presetsFile), JSON.stringify({
      schemaVersion: 1,
      current: {},
      presets: {},
    }, null, 2) + '\n');

    if (starterCfg.advancedPoster) {
      writeBlankAdvancedPosterState(id, scenes);
    }
  }

  // Save HTML draft if provided
  if (html) {
    fs.writeFileSync(path.join(ROOT, `${id}-draft.html`), html);
  }

  // Append to projects.json
  const newProject = {
    id,
    name,
    tagline,
    studioUrl,
    presetsFile: presetsFile || undefined,
    propsFile:   propsFile   || undefined,
    renderCommand: propsFile ? `npm run render:${id}` : undefined,
    videoOut: `out/${id}-v1.mp4`,
    scenes: Number(scenes) || 3,
    aspect,
    color,
    starter: effectiveStarter,
    advancedPoster: !!starterCfg?.advancedPoster,
    custom: true,
    createdAt: new Date().toISOString(),
  };
  projects.projects.push(newProject);
  writeJson(PROJECTS_FILE, projects);

  if (propsFile) {
    try {
      const pkg = readJson(PACKAGE_FILE);
      pkg.scripts = pkg.scripts || {};
      const projectEnv = starterCfg?.advancedPoster ? `REMOTION_PROJECT_ID=${id} ` : '';
      pkg.scripts[`render:${id}`] =
        `${projectEnv}remotion render src/index.ts ${STARTER_COMPOSITIONS[effectiveStarter]} out/${id}-v1.mp4 --props=${propsFile} --concurrency=50% --overwrite`;
      writeJson(PACKAGE_FILE, pkg);
    } catch (e) {
      console.warn(`[hub] could not update package.json render script:`, e.message);
    }
  }

  return {
    project: newProject,
    files: {
      imageDir: imagesWritten.length ? `public/generated/${id}/` : null,
      imagesWritten,
      studio: studioUrl || null,
      props:  propsFile || null,
      htmlDraft: html ? `${id}-draft.html` : null,
    },
  };
}

function deleteCustomProject(id) {
  const projects = readJson(PROJECTS_FILE);
  const existing = projects.projects.find(p => p.id === id);
  if (!existing) throw new Error(`project "${id}" not found`);
  if (!existing.custom && BUILTIN_IDS.has(id)) throw new Error(`built-in project "${id}" cannot be deleted`);

  // Remove from projects.json
  projects.projects = projects.projects.filter(p => p.id !== id);
  writeJson(PROJECTS_FILE, projects);

  try {
    const pkg = readJson(PACKAGE_FILE);
    if (pkg.scripts && pkg.scripts[`render:${id}`]) {
      delete pkg.scripts[`render:${id}`];
      writeJson(PACKAGE_FILE, pkg);
    }
  } catch (e) {
    console.warn(`[hub] could not remove package.json render script:`, e.message);
  }

  const removed = [];
  const tryRemove = (rel) => {
    const p = path.join(ROOT, rel);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      removed.push(rel);
    }
  };
  tryRemove(`${id}-preview.html`);
  tryRemove(`${id}-props.json`);
  tryRemove(`${id}-presets.json`);
  tryRemove(`${id}-overlay-state.json`);
  tryRemove(`${id}-studio-state.json`);
  tryRemove(`${id}-timeline.json`);
  tryRemove(`${id}-recovery-state.js`);
  tryRemove(`${id}-draft.html`);
  tryRemove(`public/generated/${id}`);
  return { id, removed };
}

// ── Background process runner (for render + bake) ────────────────
function runNpmScript(scriptName, extraEnv = {}) {
  ensureDir(LOG_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(LOG_DIR, `${scriptName.replace(/[^a-z0-9-]/gi, '_')}-${stamp}.log`);
  const out = fs.openSync(logPath, 'a');
  const env = { ...process.env, ...extraEnv };
  const child = spawn('npm', ['run', scriptName], {
    cwd: ROOT, env, detached: true, stdio: ['ignore', out, out],
  });
  child.once('error', (error) => {
    fs.writeSync(out, `\n[hub] failed to start npm script: ${error.message}\n`);
    fs.closeSync(out);
  });
  child.unref();
  return { logPath: path.relative(ROOT, logPath), pid: child.pid };
}

function renderConfigForProject(id) {
  const propsPath = `${id}-props.json`;
  if (!fs.existsSync(path.join(ROOT, propsPath))) return null;
  let project = null;
  try {
    project = readJson(PROJECTS_FILE).projects.find(p => p.id === id) || null;
  } catch (_) {}
  if (project?.starter === 'smartlab-posts' || project?.advancedPoster) {
    return { composition: 'SmartLabReel', propsPath, defaultOutput: `out/${id}-v1.mp4` };
  }
  if (id === 'smartlab' || id === 'smartlab-posts') {
    return { composition: 'SmartLabReel', propsPath, defaultOutput: `out/${id}-v1.mp4` };
  }
  if (id === 'smartmed') {
    return { composition: 'SmartMedReel', propsPath, defaultOutput: 'out/smartmed-v1.mp4' };
  }
  if (id === 'smartmed-hajj') {
    return { composition: 'SmartMedHajjReel', propsPath, defaultOutput: 'out/smartmed-hajj-v1.mp4' };
  }
  if (id === 'rightcare') {
    return { composition: 'RightCareReel', propsPath, defaultOutput: 'out/rightcare-v1.mp4' };
  }
  return null;
}

function localRemotionBinariesDir() {
  const dir = path.join(ROOT, '.hub-remotion-bin');
  const required = ['remotion', 'ffmpeg', 'ffprobe'];
  return required.every(name => fs.existsSync(path.join(dir, name))) ? dir : null;
}

function remotionRuntimeOptions() {
  // Prefer the real CLI entry over node_modules/.bin/remotion. When this
  // project is delivered as a zip/download, the .bin/ symlinks get flattened
  // into plain copies, so `.bin/remotion`'s `require('./dist/index')` resolves
  // to the nonexistent `.bin/dist/` and the render dies with
  // "Cannot find module './dist/index'". The package's own entry resolves
  // `./dist/index` correctly because it lives next to dist/.
  const cliEntry = path.join(ROOT, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
  const remotionBin = fs.existsSync(cliEntry)
    ? cliEntry
    : path.join(ROOT, 'node_modules', '.bin', 'remotion');
  const browserExecutable = path.join(
    ROOT,
    'node_modules',
    '.remotion',
    'chrome-headless-shell',
    'mac-x64',
    'chrome-headless-shell-mac-x64',
    'chrome-headless-shell'
  );
  const binariesDir = localRemotionBinariesDir();
  return { remotionBin, browserExecutable, binariesDir };
}

// A PNG export should capture the scene the way the studio shows it: fully
// revealed. Overlay elements with an entrance animation sit at opacity 0 on
// frame 0, so a frame-0 still comes out as "background only, no text/elements"
// (the video looks fine because it plays through the animation). Pick a frame
// just past the last element's entrance so everything has settled.
function settledFrameForScene(overlayState, sceneId, tlState) {
  const doc = overlayState && typeof overlayState === 'object' ? overlayState[sceneId] : null;
  const seconds = Number(tlState?.durations?.[sceneId]);
  const lastSceneFrame = Number.isFinite(seconds) && seconds > 0
    ? Math.max(0, Math.round(seconds * 30) - 1)
    : 149;
  if (!doc || !Array.isArray(doc.elements)) return 0;
  let maxEnd = 0;
  for (const el of doc.elements) {
    const a = el && el.animation;
    if (a && Number.isFinite(a.startFrame) && Number.isFinite(a.durationFrames)) {
      maxEnd = Math.max(maxEnd, a.startFrame + a.durationFrames);
    }
  }
  // +8 frames so eased animations fully finish; cap so we never overshoot a
  // short scene's duration.
  return Math.min(maxEnd + 8, 240, lastSceneFrame);
}

function settlePosterOverlaysForStill(posterOverlays) {
  if (!posterOverlays || typeof posterOverlays !== 'object') return posterOverlays;
  return Object.fromEntries(Object.entries(posterOverlays).map(([sceneId, doc]) => {
    if (!doc || typeof doc !== 'object') return [sceneId, doc];
    return [sceneId, {
      ...doc,
      backgroundAnimation: doc.backgroundAnimation
        ? { ...doc.backgroundAnimation, preset: 'none' }
        : doc.backgroundAnimation,
      elements: Array.isArray(doc.elements)
        ? doc.elements.map((element) => ({
            ...element,
            animation: element?.animation
              ? { ...element.animation, preset: 'none' }
              : element?.animation,
          }))
        : doc.elements,
    }];
  }));
}

function fitPosterOverlayAnimationsToTimeline(posterOverlays, tlState) {
  if (!posterOverlays || typeof posterOverlays !== 'object') return posterOverlays;
  return Object.fromEntries(Object.entries(posterOverlays).map(([sceneId, doc]) => {
    if (!doc || !Array.isArray(doc.elements)) return [sceneId, doc];
    const seconds = Number(tlState?.durations?.[sceneId]);
    if (!Number.isFinite(seconds) || seconds <= 0) return [sceneId, doc];
    const availableFrames = Math.max(1, Math.round(seconds * 30) - 8);
    const maxAnimationEnd = doc.elements.reduce((maxEnd, element) => {
      const start = Number(element?.animation?.startFrame);
      const duration = Number(element?.animation?.durationFrames);
      return Number.isFinite(start) && Number.isFinite(duration)
        ? Math.max(maxEnd, Math.max(0, start) + Math.max(1, duration))
        : maxEnd;
    }, 0);
    if (maxAnimationEnd <= availableFrames) return [sceneId, doc];
    const scale = availableFrames / maxAnimationEnd;
    return [sceneId, {
      ...doc,
      elements: doc.elements.map((element) => {
        const animation = element?.animation;
        const start = Number(animation?.startFrame);
        const duration = Number(animation?.durationFrames);
        if (!animation || !Number.isFinite(start) || !Number.isFinite(duration)) return element;
        const startFrame = Math.min(availableFrames - 1, Math.max(0, Math.round(start * scale)));
        const durationFrames = Math.max(
          1,
          Math.min(Math.max(1, Math.round(duration * scale)), availableFrames - startFrame),
        );
        return { ...element, animation: { ...animation, startFrame, durationFrames } };
      }),
    }];
  }));
}

function buildSceneOnlyTimeline(tlState, sceneId) {
  if (!sceneId || !tlState || typeof tlState !== 'object') return tlState;
  return {
    ...tlState,
    visible: Object.fromEntries(
      (Array.isArray(tlState.order) ? tlState.order : [])
        .map((n) => [String(n), String(n) === String(sceneId)])
    ),
  };
}

function prepareRemotionState({ id, tlState, overlayState, sceneId }) {
  const cfg = renderConfigForProject(id);
  if (!cfg) return null;
  ensureDir(LOG_DIR);
  ensureDir(path.join(ROOT, 'out'));
  const cleanSceneId = sceneId == null ? '' : String(sceneId).replace(/[^a-z0-9_-]/gi, '');
  const renderTlState = buildSceneOnlyTimeline(tlState, cleanSceneId);
  const tlPath = path.join(ROOT, `${id}-timeline.json`);
  const hadPreviousTimeline = fs.existsSync(tlPath);
  const previousTimeline = hadPreviousTimeline ? fs.readFileSync(tlPath, 'utf8') : null;
  if (renderTlState && typeof renderTlState === 'object') {
    fs.writeFileSync(tlPath, JSON.stringify(renderTlState, null, 2));
  }

  const overlayPath = path.join(ROOT, `${id}-overlay-state.json`);
  let renderOverlayState = overlayState;
  if (overlayState && typeof overlayState === 'object' && Object.keys(overlayState).length) {
    renderOverlayState = materializeOverlayImages(id, overlayState);
    writeJson(overlayPath, renderOverlayState);
  } else if (fs.existsSync(overlayPath)) {
    fs.unlinkSync(overlayPath);
  }

  const baseProps = readJson(path.join(ROOT, cfg.propsPath));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const renderPropsPath = path.join('.hub-logs', `props_${id.replace(/[^a-z0-9-]/gi, '_')}-${stamp}.json`);
  const fittedOverlayState = fitPosterOverlayAnimationsToTimeline(renderOverlayState, renderTlState);
  writeJson(path.join(ROOT, renderPropsPath), {
    ...baseProps,
    ...(renderTlState && typeof renderTlState === 'object' ? { _tlState: renderTlState } : {}),
    ...(fittedOverlayState && typeof fittedOverlayState === 'object' ? { posterOverlays: fittedOverlayState } : {}),
    _renderMuted: true,
  });

  const cleanup = () => {
    if (cleanSceneId && renderTlState && typeof renderTlState === 'object') {
      if (hadPreviousTimeline) fs.writeFileSync(tlPath, previousTimeline || '');
      else if (fs.existsSync(tlPath)) fs.unlinkSync(tlPath);
    }
    const fullPropsPath = path.join(ROOT, renderPropsPath);
    if (fs.existsSync(fullPropsPath)) fs.unlinkSync(fullPropsPath);
  };

  return { cfg, cleanSceneId, renderPropsPath, cleanup };
}

function runRemotionRender({ id, outputPath, propsPath }) {
  const cfg = renderConfigForProject(id);
  if (!cfg) return null;
  ensureDir(LOG_DIR);
  ensureDir(path.join(ROOT, 'out'));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(LOG_DIR, `render_${id.replace(/[^a-z0-9-]/gi, '_')}-${stamp}.log`);
  const out = fs.openSync(logPath, 'a');
  const finalOutput = outputPath || cfg.defaultOutput;
  const { remotionBin, browserExecutable, binariesDir } = remotionRuntimeOptions();
  const child = spawn(process.execPath, [
    remotionBin,
    'render',
    'src/index.ts',
    cfg.composition,
    finalOutput,
    `--props=${propsPath || cfg.propsPath}`,
    '--concurrency=50%',
    `--browser-executable=${browserExecutable}`,
    ...(binariesDir ? [`--binaries-directory=${binariesDir}`] : []),
    '--timeout=120000',
    '--muted',
    '--overwrite',
  ], {
    cwd: ROOT,
    env: { ...process.env, REMOTION_PROJECT_ID: id },
    stdio: ['ignore', out, out],
  });
  child.once('error', (error) => {
    fs.writeSync(out, `\n[hub] failed to start Remotion: ${error.message}\n`);
    fs.closeSync(out);
  });
  return { child, logPath: path.relative(ROOT, logPath), pid: child.pid, outputPath: finalOutput };
}

let stillBundlePromise = null;
let stillBrowserPromise = null;

// Remotion's `bundle()` copies `public/` into the bundle output once. With
// `enableCaching` + a persisted outDir, that copy is NOT refreshed on later
// builds, so scene images written to `public/generated/<id>/` after the
// bundle was first created are missing from the served bundle — renderStill
// then 404s on `…/public/generated/<id>/image-scene-N-….png` and the whole
// PNG export fails with a 500. Mirror current generated assets into the
// bundle before each still render. Cheap: only copies files that are absent
// or newer than the bundle's copy, so a no-change export does no work.
function syncGeneratedIntoBundle() {
  const srcRoot = path.join(ROOT, 'public', 'generated');
  const dstRoot = path.join(ROOT, '.hub-remotion-bundle', 'public', 'generated');
  if (!fs.existsSync(srcRoot)) return;
  const walk = (rel) => {
    const srcDir = path.join(srcRoot, rel);
    let entries;
    try { entries = fs.readdirSync(srcDir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const childRel = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) { walk(childRel); continue; }
      const src = path.join(srcRoot, childRel);
      const dst = path.join(dstRoot, childRel);
      try {
        const s = fs.statSync(src);
        let need = true;
        if (fs.existsSync(dst)) {
          const d = fs.statSync(dst);
          need = d.size !== s.size || s.mtimeMs > d.mtimeMs;
        }
        if (need) { ensureDir(path.dirname(dst)); fs.copyFileSync(src, dst); }
      } catch { /* skip unreadable file */ }
    }
  };
  walk('');
}

function getStillBundle() {
  if (!stillBundlePromise) {
    stillBundlePromise = bundle({
      entryPoint: path.join(ROOT, 'src', 'index.ts'),
      publicDir: path.join(ROOT, 'public'),
      outDir: path.join(ROOT, '.hub-remotion-bundle'),
      enableCaching: true,
      onProgress: () => {},
    }).catch((error) => {
      stillBundlePromise = null;
      throw error;
    });
  }
  return stillBundlePromise;
}

function getStillBrowser() {
  if (!stillBrowserPromise) {
    const { browserExecutable } = remotionRuntimeOptions();
    stillBrowserPromise = openBrowser('chrome', {
      browserExecutable,
      logLevel: 'warn',
    }).catch((error) => {
      stillBrowserPromise = null;
      throw error;
    });
  }
  return stillBrowserPromise;
}

// Serialize PNG renders and reuse the bundle/browser. A cancel signal limits
// every render, and a failed browser is discarded before the next request.
let stillRenderChain = Promise.resolve();
function runRemotionStill(args) {
  const next = stillRenderChain.then(() => runRemotionStillUnlocked(args));
  stillRenderChain = next.then(() => {}, () => {});
  return next;
}

async function runRemotionStillUnlocked({ id, outputPath, propsPath, frame = 0 }) {
  const cfg = renderConfigForProject(id);
  if (!cfg) return null;
  ensureDir(LOG_DIR);
  ensureDir(path.join(ROOT, 'out'));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(LOG_DIR, `still_${id.replace(/[^a-z0-9-]/gi, '_')}-${stamp}.log`);
  const startedAt = Date.now();
  const { browserExecutable, binariesDir } = remotionRuntimeOptions();
  const inputProps = readJson(path.join(ROOT, propsPath || cfg.propsPath));
  const envVariables = { REMOTION_PROJECT_ID: id };
  const { cancelSignal, cancel } = makeCancelSignal();
  const watchdog = setTimeout(cancel, 120000);
  try {
    const [serveUrl, puppeteerInstance] = await Promise.all([getStillBundle(), getStillBrowser()]);
    syncGeneratedIntoBundle();
    const composition = await selectComposition({
      serveUrl,
      id: cfg.composition,
      inputProps,
      envVariables,
      puppeteerInstance,
      browserExecutable,
      binariesDirectory: binariesDir,
      timeoutInMilliseconds: 120000,
      logLevel: 'warn',
    });
    const safeFrame = Math.min(
      Math.max(0, Number(frame) || 0),
      Math.max(0, composition.durationInFrames - 1),
    );
    await renderStill({
      serveUrl,
      composition,
      inputProps,
      envVariables,
      puppeteerInstance,
      browserExecutable,
      binariesDirectory: binariesDir,
      output: path.join(ROOT, outputPath),
      frame: safeFrame,
      imageFormat: 'png',
      overwrite: true,
      timeoutInMilliseconds: 120000,
      cancelSignal,
      logLevel: 'warn',
    });
    fs.writeFileSync(logPath, `[hub] rendered frame=${safeFrame}/${composition.durationInFrames - 1} in ${Date.now() - startedAt}ms\n`);
    return { logPath: path.relative(ROOT, logPath), outputPath };
  } catch (error) {
    fs.writeFileSync(logPath, `${error?.stack || error}\n[hub] still failed in ${Date.now() - startedAt}ms\n`);
    await closeStillRenderer();
    throw new Error(`still render failed — see ${path.relative(ROOT, logPath)}`);
  } finally {
    clearTimeout(watchdog);
  }
}

async function closeStillRenderer() {
  if (!stillBrowserPromise) return;
  try {
    const browser = await stillBrowserPromise;
    await browser.close({ silent: true });
  } catch (_) {}
  stillBrowserPromise = null;
}

async function warmStillRenderer() {
  const startedAt = Date.now();
  try {
    await Promise.all([getStillBundle(), getStillBrowser()]);
    console.log(`  PNG      → warm renderer ready in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  } catch (error) {
    console.warn(`  PNG warm-up failed: ${error.message}`);
  }
}

// ── Router ───────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  // CORS preflight (in case the studio pages call us from a different origin later)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  try {
    // ── API: list projects ───────────────────────────────
    if (pathname === '/api/projects' && req.method === 'GET') {
      const projects = readJson(PROJECTS_FILE);
      return send(res, 200, projects);
    }

    // ── API: create project ──────────────────────────────
    if (pathname === '/api/projects' && req.method === 'POST') {
      const body = await readBody(req);
      const spec = JSON.parse(body);
      const required = ['id', 'name'];
      for (const k of required) {
        if (!spec[k]) return send(res, 400, { error: `missing ${k}` });
      }
      const result = scaffoldProject(spec);
      return send(res, 201, result);
    }

    // ── API: delete project ──────────────────────────────
    if (pathname.startsWith('/api/projects/') && req.method === 'DELETE') {
      const id = pathname.slice('/api/projects/'.length);
      const result = deleteCustomProject(id);
      return send(res, 200, result);
    }

    // ── API: overlay state ───────────────────────────────
    if (pathname === '/api/overlay-state' && req.method === 'GET') {
      const id = safeProjectId(url.searchParams.get('id'));
      if (!id) return send(res, 400, { error: 'missing or invalid id' });
      const overlayPath = path.join(ROOT, `${id}-overlay-state.json`);
      if (!fs.existsSync(overlayPath)) return send(res, 200, {});
      return send(res, 200, readJson(overlayPath));
    }

    if (pathname === '/api/overlay-state' && req.method === 'POST') {
      const { id, overlayState } = JSON.parse(await readBody(req));
      const cleanId = safeProjectId(id);
      if (!cleanId) return send(res, 400, { error: 'missing or invalid id' });
      const overlayPath = path.join(ROOT, `${cleanId}-overlay-state.json`);
      if (overlayState && typeof overlayState === 'object' && Object.keys(overlayState).length) {
        writeJson(overlayPath, materializeOverlayImages(cleanId, overlayState));
      } else if (fs.existsSync(overlayPath)) {
        fs.unlinkSync(overlayPath);
      }
      return send(res, 200, { ok: true });
    }

    // ── API: full studio state ───────────────────────────
    if (pathname === '/api/studio-state' && req.method === 'GET') {
      const id = safeProjectId(url.searchParams.get('id'));
      if (!id) return send(res, 400, { error: 'missing or invalid id' });
      const statePath = path.join(ROOT, `${id}-studio-state.json`);
      if (!fs.existsSync(statePath)) return send(res, 200, {});
      return send(res, 200, readJson(statePath));
    }

    if (pathname === '/api/studio-state' && req.method === 'POST') {
      const { id, state } = JSON.parse(await readBody(req));
      const cleanId = safeProjectId(id);
      if (!cleanId) return send(res, 400, { error: 'missing or invalid id' });
      const statePath = path.join(ROOT, `${cleanId}-studio-state.json`);
      if (state && typeof state === 'object' && Object.keys(state).length) {
        writeJson(statePath, { ...state, savedAt: new Date().toISOString() });
      } else if (fs.existsSync(statePath)) {
        fs.unlinkSync(statePath);
      }
      return send(res, 200, { ok: true });
    }

    if (pathname === '/api/background-image' && req.method === 'POST') {
      const { id, sceneId, fileName, dataUrl } = JSON.parse(await readBody(req));
      const cleanId = safeProjectId(id);
      const cleanScene = String(sceneId || '').replace(/[^a-z0-9_-]/gi, '') || '1';
      if (!cleanId) return send(res, 400, { error: 'missing or invalid id' });
      const parsed = dataUrlToBuffer(String(dataUrl || ''));
      if (!parsed || !parsed.mime.startsWith('image/')) return send(res, 400, { error: 'missing image data' });
      const generatedDir = path.join(ROOT, 'public', 'generated', cleanId);
      ensureDir(generatedDir);
      const ext = extForMime(parsed.mime);
      const base = String(fileName || `background-scene-${cleanScene}`)
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[^a-z0-9_-]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || `background-scene-${cleanScene}`;
      const outName = `${base}-scene-${cleanScene}-${Date.now()}${ext}`;
      fs.writeFileSync(path.join(generatedDir, outName), parsed.buf);
      return send(res, 200, { ok: true, src: `public/generated/${cleanId}/${outName}` });
    }

    // ── API: render ──────────────────────────────────────
    if (pathname === '/api/render' && req.method === 'POST') {
      const { id, tlState, overlayState, sceneId } = JSON.parse(await readBody(req));
      const cleanId = safeProjectId(id);
      if (!cleanId) return send(res, 400, { error: 'missing or invalid id' });
      const prepared = prepareRemotionState({ id: cleanId, tlState, overlayState, sceneId });
      const outputPath = prepared?.cleanSceneId ? `out/${cleanId}-scene-${prepared.cleanSceneId}.mp4` : undefined;
      const direct = prepared
        ? runRemotionRender({ id: cleanId, outputPath, propsPath: prepared.renderPropsPath })
        : null;
      if (direct) {
        direct.child.once('close', () => {
          try {
            prepared.cleanup();
          } catch (e) {
            console.warn(`[hub] render cleanup failed:`, e.message);
          }
        });
        return send(res, 202, { ok: true, script: `remotion render ${cleanId}`, ...direct, child: undefined });
      }
      const scriptName = `render:${cleanId}`;
      const result = runNpmScript(scriptName);
      return send(res, 202, { ok: true, script: scriptName, outputPath: `out/${cleanId}-v1.mp4`, ...result });
    }

    // ── API: export a still PNG using the same Remotion path as video ──
    if (pathname === '/api/export-png' && req.method === 'POST') {
      const { id, tlState, overlayState, sceneId } = JSON.parse(await readBody(req));
      const cleanId = safeProjectId(id);
      const cleanSceneId = String(sceneId || '').replace(/[^a-z0-9_-]/gi, '');
      if (!cleanId) return send(res, 400, { error: 'missing or invalid id' });
      if (!cleanSceneId) return send(res, 400, { error: 'missing sceneId' });
      const prepared = prepareRemotionState({ id: cleanId, tlState, overlayState, sceneId: cleanSceneId });
      if (!prepared) return send(res, 400, { error: `project ${cleanId} cannot render PNG` });
      const outputPath = `out/${cleanId}-scene-${cleanSceneId}.png`;
      try {
        const stillPropsPath = path.join(ROOT, prepared.renderPropsPath);
        const stillProps = readJson(stillPropsPath);
        writeJson(stillPropsPath, {
          ...stillProps,
          posterOverlays: settlePosterOverlaysForStill(stillProps.posterOverlays),
        });
        const result = await runRemotionStill({
          id: cleanId,
          outputPath,
          propsPath: prepared.renderPropsPath,
          frame: settledFrameForScene(overlayState, cleanSceneId, tlState),
        });
        prepared.cleanup();
        return send(res, 200, { ok: true, ...result });
      } catch (error) {
        try { prepared.cleanup(); } catch (_) {}
        throw error;
      }
    }

    // ── API: bake ────────────────────────────────────────
    if (pathname === '/api/bake' && req.method === 'POST') {
      const { id, preset } = JSON.parse(await readBody(req));
      const scriptName = `bake:${id}`;
      const result = runNpmScript(scriptName, preset ? { npm_config_preset: preset } : {});
      return send(res, 202, { ok: true, script: scriptName, ...result });
    }

    // ── API: tail a log ──────────────────────────────────
    if (pathname.startsWith('/api/log') && req.method === 'GET') {
      const file = url.searchParams.get('file');
      if (!file) return send(res, 400, { error: 'missing file' });
      const full = path.join(ROOT, file);
      if (!full.startsWith(path.join(ROOT, '.hub-logs')) || !fs.existsSync(full)) {
        return send(res, 404, { error: 'log not found' });
      }
      const tail = fs.readFileSync(full, 'utf8');
      return send(res, 200, tail, 'text/plain; charset=utf-8');
    }

    // ── Static files ─────────────────────────────────────
    if (req.method === 'GET' || req.method === 'HEAD') {
      return serveStatic(req, res, pathname);
    }

    send(res, 405, { error: 'method not allowed' });
  } catch (err) {
    console.error('[hub]', err);
    send(res, 500, { error: err.message || String(err) });
  }
});

// One HTTP handler, one app, listen on each requested port. We need
// separate `http.createServer` instances because Node sockets are bound
// per-port; the handler can be shared. This lets the hub serve the
// same project pages at multiple origins, so users keep access to the
// localStorage they saved under any port we've used historically.
const handler = server.listeners('request')[0];
PORTS.slice(1).forEach(extraPort => {
  const s = http.createServer(handler);
  s.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`  ⚠  port ${extraPort} already in use — skipping`);
    } else {
      console.error(`  ⚠  port ${extraPort} error:`, err.message);
    }
  });
  s.listen(extraPort, () => {
    console.log(`  also: http://localhost:${extraPort}/  (compat — same localStorage as before)`);
  });
});

server.listen(PORT, () => {
  console.log(`\n  🎬  Reel Studio hub`);
  console.log(`  ────────────────────`);
  console.log(`  http://localhost:${PORT}/  (primary)`);
  console.log(`  api      → /api/projects (GET, POST)`);
  console.log(`           → /api/projects/:id (DELETE)`);
  console.log(`           → /api/render   (POST { id })`);
  console.log(`           → /api/bake     (POST { id, preset })`);
  console.log(`  logs     → ${path.relative(ROOT, LOG_DIR)}/`);
  console.log(`  NOTE: localStorage (presets, audio, scene overrides) is`);
  console.log(`        scoped per port. Visit the port where you saved data`);
  console.log(`        to recover it.`);
  console.log(`  PNG      → warming cached renderer in background`);
  void warmStillRenderer();
  console.log(`  Press Ctrl+C to stop.\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await closeStillRenderer();
    process.exit(0);
  });
}
