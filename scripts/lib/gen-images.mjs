import fs from 'fs';
import path from 'path';

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY;
const FAL_ENDPOINT = 'https://fal.run/fal-ai/flux/schnell';
const POLLINATIONS_ENDPOINT = 'https://image.pollinations.ai/prompt';

const DEFAULT_STYLE_SUFFIX =
  'cinematic photo, soft natural lighting, professional medical / healthcare setting, '
  + 'shallow depth of field, photorealistic, calm blue and white palette, vertical 9:16 framing, high detail, no text, no logo';

const negative = 'text, watermark, logo, lowres, distorted hands, ugly, deformed, blurry, low quality';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const buildPrompt = (seed, styleSuffix = DEFAULT_STYLE_SUFFIX) => {
  if (!seed || !seed.trim()) return null;
  return `${seed.trim()}. ${styleSuffix}`;
};

const callFal = async (prompt) => {
  const res = await fetch(FAL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: { width: 1080, height: 1920 },
      num_inference_steps: 4,
      num_images: 1,
      enable_safety_checker: true,
      negative_prompt: negative,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`fal.ai ${res.status}: ${txt.slice(0, 240)}`);
  }
  const json = await res.json();
  const url = json?.images?.[0]?.url;
  if (!url) throw new Error('fal.ai returned no image url');
  return url;
};

const downloadTo = async (url, dest) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
};

// Pollinations.ai — free, no auth. Slower + less consistent than fal, but no
// setup needed. Used as automatic fallback when FAL_KEY is absent.
const callPollinations = async (prompt, dest, { seed }) => {
  const params = new URLSearchParams({
    width: '1080',
    height: '1920',
    nologo: 'true',
    model: 'flux',
    seed: String(seed),
  });
  const url = `${POLLINATIONS_ENDPOINT}/${encodeURIComponent(prompt)}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`pollinations ${res.status}: ${txt.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
};

const hashSeed = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

/**
 * jobs: [{ key: 'intro', prompt: '...' }, ...]
 * Returns: { intro: 'generated/<slug>/intro.jpg', ... } — paths relative to public/.
 * Missing/failed generations are simply absent from the returned map; scenes
 * fall back to gradient-only backgrounds when an image is missing.
 */
export async function generateImagesForSlug({
  slug,
  jobs,
  publicDir,
  styleSuffix,
  provider, // 'fal' | 'pollinations' | undefined (auto)
  log = console.log,
}) {
  const slugDir = path.join(publicDir, 'generated', slug);
  fs.mkdirSync(slugDir, { recursive: true });

  const chosen = provider || (FAL_KEY ? 'fal' : 'pollinations');

  const out = {};
  for (const { key, prompt } of jobs) {
    const finalPrompt = buildPrompt(prompt, styleSuffix);
    if (!finalPrompt) continue;

    const filename = `${key}.jpg`;
    const absPath = path.join(slugDir, filename);
    const rel = `generated/${slug}/${filename}`;

    if (fs.existsSync(absPath)) {
      log(`  cache hit  ${key}`);
      out[key] = rel;
      continue;
    }

    try {
      log(`  [${chosen}] ${key} ...`);
      if (chosen === 'fal') {
        if (!FAL_KEY) throw new Error('FAL_KEY required for fal provider');
        const url = await callFal(finalPrompt);
        await downloadTo(url, absPath);
      } else {
        const seed = hashSeed(`${slug}-${key}`);
        await callPollinations(finalPrompt, absPath, { seed });
      }
      out[key] = rel;
      await wait(150);
    } catch (err) {
      log(`  FAILED     ${key}: ${err.message}`);
    }
  }
  return out;
}

export const hasFalKey = () => Boolean(FAL_KEY);
