// Helper to read a project's timeline JSON (written by the hub server
// when the user clicks "🎬 Render video" in the studio).
//
// IMPORTANT: this file is imported from Root.tsx, which the Remotion
// Studio bundles for the browser. We avoid static `node:fs` imports
// (which break the studio bundle) by using `eval('require')` so the
// bundler can't see the dependency. At browser-runtime we return null;
// in Node-runtime (render setup), we actually read the file.

export type TimelineState = {
  order: string[];                  // scene IDs in render order, e.g. ['1','3','2','5']
  visible: Record<string, boolean>; // hidden scenes excluded from render
  durations: Record<string, number>;// seconds per scene
};

export function loadTimeline(projectId: string): TimelineState | null {
  if (typeof process === 'undefined' || !process.cwd) return null;
  try {
    // eslint-disable-next-line no-eval
    const req = eval('require');
    const fs = req('node:fs');
    const path = req('node:path');
    const filePath = path.join(process.cwd(), `${projectId}-timeline.json`);
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (
      data && Array.isArray(data.order) &&
      data.visible && typeof data.visible === 'object' &&
      data.durations && typeof data.durations === 'object'
    ) {
      return data as TimelineState;
    }
  } catch (_err) {
    // Fall through to null — composition uses its defaults
  }
  return null;
}

/** Total render-side frames for a timeline state (visible scenes only). */
export function timelineDuration(
  tl: TimelineState,
  fps: number,
  defaultPerScene = 5,
  crossfadeFrames = 0
): number {
  const visible = tl.order.filter((n) => tl.visible[n]);
  if (visible.length === 0) return Math.max(1, defaultPerScene * fps);
  const sceneFrames = visible.map(
    (n) => Math.max(1, Math.round((tl.durations[n] || defaultPerScene) * fps))
  );
  const total = sceneFrames.reduce((a, b) => a + b, 0);
  return Math.max(1, total - Math.max(0, visible.length - 1) * crossfadeFrames);
}

export type ScenePlan = {
  id: string;
  fromFrame: number;
  durationFrames: number;
};

/** Resolve which scenes render, in what order, and where each starts. */
export function planScenes(
  tl: TimelineState,
  fps: number,
  defaultPerScene = 5,
  crossfadeFrames = 0
): ScenePlan[] {
  const visible = tl.order.filter((n) => tl.visible[n]);
  const plans: ScenePlan[] = [];
  let cursor = 0;
  visible.forEach((n) => {
    const durFrames = Math.max(1, Math.round((tl.durations[n] || defaultPerScene) * fps));
    plans.push({ id: n, fromFrame: cursor, durationFrames: durFrames });
    cursor += Math.max(1, durFrames - crossfadeFrames);
  });
  return plans;
}
