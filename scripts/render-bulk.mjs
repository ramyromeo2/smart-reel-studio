import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { generateImagesForSlug, hasFalKey } from './lib/gen-images.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
fs.mkdirSync(publicDir, { recursive: true });

const csvFile = process.argv[2] || 'content.csv';
const csvPath = path.resolve(projectRoot, csvFile);

if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

const rows = parse(fs.readFileSync(csvPath, 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

const tmpDir = path.join(projectRoot, 'tmp');
const outDir = path.join(projectRoot, 'out');
fs.mkdirSync(tmpDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

const slugify = (value) =>
  String(value || 'video')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9؀-ۿ]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const collectImageJobs = (row) => {
  const jobs = [
    { key: 'intro', prompt: row.img_intro },
    { key: 'number', prompt: row.img_number },
    { key: 'final', prompt: row.img_final },
  ];
  for (const n of [1, 2, 3, 4, 5]) {
    jobs.push({ key: `card${n}`, prompt: row[`card${n}_img`] });
  }
  for (const n of [1, 2, 3]) {
    jobs.push({ key: `step${n}`, prompt: row[`step${n}_img`] });
  }
  return jobs;
};

const buildProps = (row, images) => ({
  brand: row.brand || 'SmartLab',
  logoText: row.logoText || row.brand || 'SmartLab',
  colors: {
    main: row.mainColor || '#339EDA',
    dark: row.darkColor || '#061E3D',
    accent: row.accentColor || '#3FD6FF',
  },
  hookTag: row.hookTag || '#سمارت_لاب',
  hookTitle: row.hookTitle || 'عنوان الفيديو',
  bigNumber: row.bigNumber || '5',
  bigTitle: row.bigTitle || 'النقاط الرئيسية',
  cards: [1, 2, 3, 4, 5]
    .map((n) => ({
      icon: row[`card${n}_icon`] || '✓',
      text: row[`card${n}_text`] || '',
      image: images[`card${n}`] || '',
    }))
    .filter((card) => card.text),
  stepsTitle: row.stepsTitle || '',
  steps: [1, 2, 3]
    .map((n) => ({
      text: row[`step${n}_text`] || '',
      image: images[`step${n}`] || '',
    }))
    .filter((step) => step.text),
  ctaSmall: row.ctaSmall || 'اطمئن على صحتك',
  ctaMain: row.ctaMain || 'احجز الآن',
  finalTitle: row.finalTitle || 'احجز الآن',
  phone: row.phone || '',
  website: row.website || '',
  images: {
    intro: images.intro || '',
    number: images.number || '',
    final: images.final || '',
  },
});

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

if (!hasFalKey()) {
  console.log(
    '[i] FAL_KEY not set — AI images will be skipped. '
      + 'Scenes will render with gradient backgrounds. '
      + 'Set FAL_KEY (from fal.ai) and rerun to enable AI photos.'
  );
}

for (const row of rows) {
  const slug = slugify(row.slug || row.hookTitle || row.brand);
  console.log(`\n=== ${slug} ===`);

  const jobs = collectImageJobs(row);
  console.log('Image gen:');
  const images = await generateImagesForSlug({
    slug,
    jobs,
    publicDir,
  });

  const props = buildProps(row, images);
  const propsPath = path.join(tmpDir, `${slug}.json`);
  const outputPath = path.join(outDir, `${slug}.mp4`);

  fs.writeFileSync(propsPath, JSON.stringify(props, null, 2), 'utf8');

  console.log(`Rendering -> ${outputPath}`);

  const result = spawnSync(
    npx,
    [
      'remotion',
      'render',
      'src/index.ts',
      'SmartReel',
      outputPath,
      '--props',
      propsPath,
      '--concurrency=50%',
      '--overwrite',
    ],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: false,
    }
  );

  if (result.status !== 0) {
    console.error(`Failed rendering: ${slug}`);
    process.exit(result.status || 1);
  }
}

console.log('\nDone. Check the /out folder.');
