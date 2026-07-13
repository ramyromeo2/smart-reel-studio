// ═══════════════════════════════════════════════════════════════════
// ANIMATION REGISTRY — single source of truth for SmartLab reel.
//
// Each animation is a pure function: (input) → CSS style. Composable.
// Two kinds:
//   • Entry animations: from frame=start to frame=start+dur, animate in.
//     Hold at final state after dur.
//   • Loop animations: ignored before frame=start, then loop forever
//     (e.g., heartbeat sine pulse, pulse opacity).
//
// To add a new animation:
//   1. Add a key/function to `animations` below.
//   2. Add its metadata to `animationMeta` (kind, defaults, blurb).
//   3. Reload the studio — dropdown auto-populates from this file via
//      the studio-animations.json that the bake script writes.
//
// API:
//   getAnimationStyle('fade-up', { frame, start, dur, fps }) → CSSProperties
//   animationNames                → string[] of all keys (for dropdowns)
//   animationMeta[name]           → metadata
// ═══════════════════════════════════════════════════════════════════

import type React from 'react';
import { interpolate, spring, Easing } from 'remotion';

// ── Shared easings ────────────────────────────────────────────────
const eOut = Easing.out(Easing.cubic);
const eIO = Easing.bezier(0.22, 1, 0.36, 1);

// 0→1 ramp helper, same one used inline throughout the reel
const ramp = (
  frame: number,
  start: number,
  dur: number,
  easing: (t: number) => number = eOut
) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

// ── Public types ──────────────────────────────────────────────────
export type AnimInput = {
  frame: number;
  start: number;
  dur: number;
  fps: number;
};
export type AnimStyle = React.CSSProperties;
export type AnimFn = (input: AnimInput) => AnimStyle;

// ── The registry ──────────────────────────────────────────────────
export const animations: Record<string, AnimFn> = {
  // No animation — element appears immediately at full opacity.
  none: () => ({ opacity: 1 }),

  // Pure fade in. No movement.
  'fade-in': ({ frame, start, dur }) => ({
    opacity: ramp(frame, start, dur),
  }),

  // Fade + slide up from below (the workhorse).
  'fade-up': ({ frame, start, dur }) => {
    const t = ramp(frame, start, dur, eIO);
    return {
      opacity: ramp(frame, start, dur),
      transform: `translateY(${interpolate(t, [0, 1], [22, 0])}px)`,
    };
  },

  // Fade + slide down from above.
  'fade-down': ({ frame, start, dur }) => {
    const t = ramp(frame, start, dur, eIO);
    return {
      opacity: ramp(frame, start, dur),
      transform: `translateY(${interpolate(t, [0, 1], [-22, 0])}px)`,
    };
  },

  // Slide in from the right (good for RTL/Arabic).
  'slide-from-right': ({ frame, start, dur }) => {
    const t = ramp(frame, start, dur, eIO);
    return {
      opacity: ramp(frame, start, dur),
      transform: `translateX(${interpolate(t, [0, 1], [60, 0])}px)`,
    };
  },

  // Slide in from the left.
  'slide-from-left': ({ frame, start, dur }) => {
    const t = ramp(frame, start, dur, eIO);
    return {
      opacity: ramp(frame, start, dur),
      transform: `translateX(${interpolate(t, [0, 1], [-60, 0])}px)`,
    };
  },

  // Big upward slide (for hero text).
  'slide-up-large': ({ frame, start, dur }) => {
    const t = ramp(frame, start, dur, eIO);
    return {
      opacity: ramp(frame, start, dur),
      transform: `translateY(${interpolate(t, [0, 1], [80, 0])}px)`,
    };
  },

  // Spring scale-pop (rubber-band).
  'scale-pop': ({ frame, start, dur, fps }) => {
    const sp = spring({
      frame: frame - start,
      fps,
      config: { damping: 13, stiffness: 110 },
    });
    return {
      opacity: ramp(frame, start, dur),
      transform: `scale(${0.7 + sp * 0.3})`,
    };
  },

  // Gentler spring scale + fade (logos, large elements).
  'spring-zoom-fade': ({ frame, start, dur, fps }) => {
    const sp = spring({
      frame: frame - start,
      fps,
      config: { damping: 14, stiffness: 100 },
    });
    return {
      opacity: ramp(frame, start, dur),
      transform: `scale(${0.85 + sp * 0.15})`,
    };
  },

  // Linear scale-in (no spring overshoot).
  'scale-in': ({ frame, start, dur }) => {
    const t = ramp(frame, start, dur, eIO);
    return {
      opacity: ramp(frame, start, dur),
      transform: `scale(${interpolate(t, [0, 1], [0.85, 1])})`,
    };
  },

  // Zoom from larger to natural (camera pulls in).
  'zoom-in': ({ frame, start, dur }) => {
    const t = ramp(frame, start, dur, eIO);
    return {
      opacity: ramp(frame, start, dur),
      transform: `scale(${interpolate(t, [0, 1], [1.3, 1])})`,
    };
  },

  // Blur dissolve (cinematic).
  'blur-in': ({ frame, start, dur }) => {
    const t = ramp(frame, start, dur);
    return {
      opacity: t,
      filter: `blur(${interpolate(t, [0, 1], [12, 0])}px)`,
    };
  },

  // Subtle rotate + fade.
  'rotate-in': ({ frame, start, dur }) => {
    const t = ramp(frame, start, dur, eIO);
    return {
      opacity: ramp(frame, start, dur),
      transform: `rotate(${interpolate(t, [0, 1], [-15, 0])}deg)`,
    };
  },

  // word-stagger is a SPECIAL animation: the SmartLabReel <Animated>
  // helper intercepts it for headlines (because it returns multiple
  // <span> elements). For non-headline elements that pick this animation,
  // we render fade-up as the visual fallback so the registry stays complete.
  'word-stagger': ({ frame, start, dur }) => {
    const t = ramp(frame, start, dur, eIO);
    return {
      opacity: ramp(frame, start, dur),
      transform: `translateY(${interpolate(t, [0, 1], [22, 0])}px)`,
    };
  },

  // ── Loop animations (apply AFTER entry, run forever) ───────────
  // Heartbeat: subtle scale pulse 1.00 → 1.045 → 1.00, 2s cycle.
  heartbeat: ({ frame, start, fps }) => {
    if (frame < start) return {};
    const cycle = fps * 2;
    const phase = ((frame - start) % cycle) / cycle;
    return {
      transform: `scale(${1 + 0.045 * Math.sin(phase * Math.PI * 2)})`,
    };
  },

  // Pulse opacity (attention-grabber).
  pulse: ({ frame, start, fps }) => {
    if (frame < start) return {};
    const cycle = fps * 1.5;
    const phase = ((frame - start) % cycle) / cycle;
    return {
      opacity: 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2)),
    };
  },

  // Breathe (gentle scale loop).
  breathe: ({ frame, start, fps }) => {
    if (frame < start) return {};
    const cycle = fps * 3;
    const phase = ((frame - start) % cycle) / cycle;
    return {
      transform: `scale(${1 + 0.025 * Math.sin(phase * Math.PI * 2)})`,
    };
  },
};

// ── Metadata: kind + defaults + display label ─────────────────────
export type AnimKind = 'entry' | 'loop';
export type AnimMeta = {
  kind: AnimKind;
  label: string;
  defaultDur: number; // frames
  blurb: string;
};

export const animationMeta: Record<string, AnimMeta> = {
  none: { kind: 'entry', label: 'None', defaultDur: 1, blurb: 'No animation' },
  'fade-in': { kind: 'entry', label: 'Fade in', defaultDur: 18, blurb: 'Pure fade, no movement' },
  'fade-up': { kind: 'entry', label: 'Fade + slide up', defaultDur: 22, blurb: 'Workhorse — fades while sliding up 22px' },
  'fade-down': { kind: 'entry', label: 'Fade + slide down', defaultDur: 22, blurb: 'Fades while sliding down from above' },
  'slide-from-right': { kind: 'entry', label: 'Slide from right', defaultDur: 22, blurb: 'Slides in from right (good for RTL/Arabic)' },
  'slide-from-left': { kind: 'entry', label: 'Slide from left', defaultDur: 22, blurb: 'Slides in from left' },
  'slide-up-large': { kind: 'entry', label: 'Big slide up', defaultDur: 26, blurb: 'Dramatic 80px upward slide' },
  'scale-pop': { kind: 'entry', label: 'Spring pop', defaultDur: 24, blurb: 'Rubber-band scale (overshoots and settles)' },
  'spring-zoom-fade': { kind: 'entry', label: 'Spring zoom', defaultDur: 24, blurb: 'Gentler spring scale + fade (good for logos)' },
  'scale-in': { kind: 'entry', label: 'Scale in', defaultDur: 20, blurb: 'Linear scale-up + fade (no overshoot)' },
  'zoom-in': { kind: 'entry', label: 'Zoom in (camera)', defaultDur: 24, blurb: 'Starts larger, camera pulls in to natural size' },
  'blur-in': { kind: 'entry', label: 'Blur in', defaultDur: 22, blurb: 'Cinematic blur dissolve' },
  'rotate-in': { kind: 'entry', label: 'Rotate in', defaultDur: 22, blurb: 'Subtle -15° rotation + fade' },
  heartbeat: { kind: 'loop', label: 'Heartbeat pulse', defaultDur: 1, blurb: 'Subtle 2s scale pulse loop (great for CTAs)' },
  pulse: { kind: 'loop', label: 'Opacity pulse', defaultDur: 1, blurb: 'Opacity dips 1.0↔0.65 every 1.5s' },
  breathe: { kind: 'loop', label: 'Breathe', defaultDur: 1, blurb: 'Very subtle 3s scale breathe' },
};

export const animationNames: string[] = Object.keys(animations);

// ── Public API ────────────────────────────────────────────────────
export function getAnimationStyle(
  name: string,
  input: AnimInput
): AnimStyle {
  const fn = animations[name] ?? animations['fade-up'];
  return fn(input);
}

// Apply an ENTRY animation followed (after entry settles) by a LOOP.
// Combines two animations cleanly — entry transform is replaced by
// loop transform once the entry has run its course.
export function getCombinedStyle(
  entryName: string,
  loopName: string | undefined,
  input: AnimInput
): AnimStyle {
  const entryStyle = getAnimationStyle(entryName, input);
  if (!loopName || loopName === 'none' || animationMeta[loopName]?.kind !== 'loop') {
    return entryStyle;
  }
  const loopStart = input.start + input.dur;
  const loopStyle = animations[loopName]({ ...input, start: loopStart });
  // Once we're past the entry window, prefer the loop's transform.
  // Otherwise the entry's transform wins.
  if (input.frame < loopStart) return entryStyle;
  return {
    ...entryStyle,
    transform: loopStyle.transform ?? entryStyle.transform,
    opacity: loopStyle.opacity ?? entryStyle.opacity,
  };
}
