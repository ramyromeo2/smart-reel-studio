import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { generateImagesForSlug, hasFalKey } from './lib/gen-images.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
fs.mkdirSync(publicDir, { recursive: true });

const slug = 'tokyo';

const TOKYO_STYLE =
  'cinematic photo, tokyo at night, neon signs, rain-slick streets, moody atmosphere, '
  + 'shallow depth of field, photorealistic, magenta and cyan color grade, vertical 9:16 framing, '
  + 'shot on 35mm, blade-runner inspired, high detail, no text overlays, no watermark';

const jobs = [
  { key: 'hero',  prompt: 'a wide cinematic shot of tokyo skyline at night, neon lights reflecting on wet streets, dense city, glowing skyscrapers' },
  { key: 'spot1', prompt: 'shibuya crossing intersection at night, hundreds of pedestrians, massive neon billboards, light trails, cinematic wide angle' },
  { key: 'spot2', prompt: 'golden gai narrow alley in shinjuku tokyo at night, tiny lit bars, red lanterns, atmospheric fog, neon reflections' },
  { key: 'spot3', prompt: 'akihabara electric town tokyo at night, anime billboards, arcade signs, vivid pink and cyan neon, crowded street level' },
  { key: 'spot4', prompt: 'tsukiji fish market early morning, vendors handling fresh seafood, steam, golden warm light, busy authentic scene' },
  { key: 'spot5', prompt: 'view from shibuya sky observation deck at twilight, endless tokyo city lights extending to horizon, person silhouette overlooking' },
  { key: 'quote', prompt: 'moody close-up of a glowing tokyo neon sign in rain, soft bokeh, magenta and cyan, atmospheric' },
  { key: 'end',   prompt: 'an aesthetic tokyo street at night, single person walking away under neon lights, cinematic anonymous wide shot' },
];

console.log('=== Tokyo reel ===');
console.log(`provider: ${hasFalKey() ? 'fal.ai (key found)' : 'pollinations.ai (free fallback)'}`);

const images = await generateImagesForSlug({
  slug,
  jobs,
  publicDir,
  styleSuffix: TOKYO_STYLE,
});

// Patch tokyo-props.json with whatever images were actually produced
const propsPath = path.join(projectRoot, 'tokyo-props.json');
const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));

props.images = {
  hero: images.hero || '',
  quote: images.quote || '',
  end: images.end || '',
};
props.spots = props.spots.map((spot, i) => ({
  ...spot,
  image: images[`spot${i + 1}`] || '',
}));

const tmpPropsPath = path.join(projectRoot, 'tmp', 'tokyo.json');
fs.mkdirSync(path.dirname(tmpPropsPath), { recursive: true });
fs.writeFileSync(tmpPropsPath, JSON.stringify(props, null, 2));

const outDir = path.join(projectRoot, 'out');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'tokyo-48h.mp4');

console.log(`\nRendering -> ${outPath}`);

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  npx,
  [
    'remotion',
    'render',
    'src/index.ts',
    'TokyoReel',
    outPath,
    '--props',
    tmpPropsPath,
    '--concurrency=50%',
    '--overwrite',
  ],
  { cwd: projectRoot, stdio: 'inherit', shell: false }
);

if (result.status !== 0) {
  console.error('Render failed.');
  process.exit(result.status || 1);
}
console.log(`\nDone -> ${outPath}`);
