import type { ProjectPosterOverlayState } from './overlaySchema';
import { validatePosterOverlayDocument } from './importOverlayJson';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const loadPosterOverlayState = (
  projectId: string
): ProjectPosterOverlayState | undefined => {
  if (typeof process === 'undefined' || !process.cwd) return undefined;
  try {
    // eslint-disable-next-line no-eval
    const req = eval('require');
    const fs = req('node:fs');
    const path = req('node:path');
    const filePath = path.join(process.cwd(), `${projectId}-overlay-state.json`);
    if (!fs.existsSync(filePath)) return undefined;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!isObject(raw)) return undefined;

    const output: ProjectPosterOverlayState = {};
    Object.entries(raw).forEach(([sceneId, value]) => {
      const result = validatePosterOverlayDocument(value);
      if (result.ok) {
        output[sceneId] = result.value;
      }
    });
    return Object.keys(output).length > 0 ? output : undefined;
  } catch (_error) {
    return undefined;
  }
};
