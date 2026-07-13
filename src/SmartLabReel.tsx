import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import {
  animations,
  animationMeta,
  getCombinedStyle,
  type AnimInput,
} from './animations';
import { PosterOverlayScene } from './posterOverlay/OverlayRenderer';
import type { ProjectPosterOverlayState } from './posterOverlay/overlaySchema';

// ─────────────────────────────────────────────────────────────────
// SmartLab reel — 4 scenes, animation choices driven by props.
// Scene durations + per-element animation names come from props,
// so the bake script can drive everything from a studio preset.
// ─────────────────────────────────────────────────────────────────

// ── Font loading ─────────────────────────────────────────────────
const ensureFontsReady = (() => {
  let handle: number | null = null;
  return () => {
    if (typeof document === 'undefined') return;
    if (handle !== null) return;
    handle = delayRender('Loading SmartLab fonts');
    const probes = [
      ...['400', '500', '700'].map((w) =>
        (document as Document & { fonts: FontFaceSet }).fonts.load(
          `${w} 64px "Tajawal"`,
          'تحاليل منزلية'
        )
      ),
      (document as Document & { fonts: FontFaceSet }).fonts.load(
        `900 48px "Font Awesome 6 Free"`,
        ''
      ),
    ];
    Promise.allSettled(probes)
      .then(() => (document as Document & { fonts: FontFaceSet }).fonts.ready)
      .then(() => continueRender(handle as number))
      .catch((err) => cancelRender(err));
  };
})();

// ── Types ─────────────────────────────────────────────────────────
type ServiceCard = { icon: string; text: string };
type ContactRow = { icon: string; text: string; isNumber?: boolean };

// Animation spec for a single element: which entry anim + optional loop + duration + delay.
type AnimSpec = {
  entry?: string;       // animation name from registry; default 'fade-up'
  loop?: string;        // animation name (kind: 'loop'); default undefined
  durFrames?: number;   // frames to animate. Default uses registry's defaultDur.
  delayFrames?: number; // frames after scene start before entry begins. Default 0.
};

// Marker — pulsing dot + callout label that activates at a specific frame
// within the scene and stays active for `durationFrames`. Multiple markers can
// be scheduled in sequence to create the Instagram-style "point of interest"
// animation where each feature lights up one after another.
export type Marker = {
  x: number;                // x position (design px, 0-1080)
  y: number;                // y position (design px, 0-1350)
  activateFrame: number;    // frame within the scene when this marker activates
  durationFrames?: number;  // how long it stays visible (default 90 frames ≈ 3s)
  label?: string;           // optional callout text
  labelOffsetX?: number;    // label offset from marker (design px)
  labelOffsetY?: number;
  color?: string;           // marker color (default accent)
  ringSize?: number;        // pulse ring max radius (px, default 80)
  dotSize?: number;         // central dot radius (default 14)
  labelBg?: string;         // callout background (default white-ish)
  labelColor?: string;      // callout text color
  labelSize?: number;       // callout font-size (px)
};

// Shape primitive — vector element rendered as SVG above the bg + below
// the text overlay. Used for circles/rings, lines, rectangles, dots, text.
export type ShapeKind = 'circle' | 'rect' | 'line' | 'dot' | 'text' | 'arrow';
export type Shape = {
  kind: ShapeKind;
  x?: number;            // center for circle/dot, top-left for rect/text, start for line/arrow
  y?: number;
  w?: number;            // diameter for circle/dot, width for rect, length is computed from x2/y2 for line
  h?: number;            // height for rect (ignored for circle)
  x2?: number;           // end X for line/arrow
  y2?: number;           // end Y for line/arrow
  stroke?: string;       // stroke color (default 'currentColor')
  fill?: string;         // fill color (default 'none' for shapes, color for dot/text)
  strokeWidth?: number;  // pixels (default 3)
  text?: string;         // for kind: 'text'
  fontSize?: number;     // for kind: 'text' (default 28)
  fontWeight?: number;
  fontFamily?: string;
  rotate?: number;       // applied around (x+w/2, y+h/2)
  opacity?: number;
  z?: number;            // z-index
  anim?: AnimSpec;       // entry animation
};

// Image layer — positioned + transformed + animated image overlay
// placed between the scene's background image and its text overlay.
export type ImageLayer = {
  src: string;            // path relative to public/ (e.g. 'generated/smartlab/logo.png')
  x?: number;             // top-left X in design px (default 0)
  y?: number;             // top-left Y (default 0)
  w?: number;             // width px (default: natural via 'auto')
  h?: number;             // height px (default: natural via 'auto')
  rotate?: number;        // degrees (default 0)
  scale?: number;         // multiplier (default 1)
  opacity?: number;       // 0..1 (default 1)
  z?: number;             // z-index (default 1)
  anim?: AnimSpec;        // entry animation; defaults to { entry: 'fade-in', durFrames: 22, delayFrames: 0 }
};

// Optional timeline state from `smartlab-timeline.json` (written by the
// hub when the user clicks Render). Composition uses it to filter /
// reorder / time scenes.
export type TimelineStateProp = {
  order: string[];
  visible: Record<string, boolean>;
  durations: Record<string, number>;
};

export type SmartLabReelProps = {
  // Background images per scene
  scene1Image: string;
  scene2Image: string;
  scene3Image: string;
  scene4Image: string;

  // Optional timeline override (hub render only)
  _tlState?: TimelineStateProp;
  _renderMuted?: boolean;

  // Scene 1
  scene1Headline: string;
  scene1Subtitle: string;
  s1HeadlineAnim?: AnimSpec;
  s1SubtitleAnim?: AnimSpec;

  // Scene 2
  scene2Headline: string;
  scene2Subtitle: string;
  scene2Benefits: string[];
  s2HeadlineAnim?: AnimSpec;
  s2SubtitleAnim?: AnimSpec;
  s2BenefitsAnim?: AnimSpec;
  s2BenefitsStaggerFrames?: number;

  // Scene 3
  scene3Headline: string;
  scene3Subtitle: string;
  scene3Cards: ServiceCard[];
  s3HeadlineAnim?: AnimSpec;
  s3SubtitleAnim?: AnimSpec;
  s3CardsAnim?: AnimSpec;
  s3CardsStaggerFrames?: number;

  // Scene 4
  scene4Logo: string;
  scene4Headline: string;
  scene4Subtitle: string;
  scene4Contacts: ContactRow[];
  s4LogoAnim?: AnimSpec;
  s4HeadlineAnim?: AnimSpec;
  s4SubtitleAnim?: AnimSpec;
  s4ContactsAnim?: AnimSpec;
  s4ContactsStaggerFrames?: number;

  // Scene durations (seconds — converted to frames at render time)
  scene1DurationSec?: number;
  scene2DurationSec?: number;
  scene3DurationSec?: number;
  scene4DurationSec?: number;

  // Crossfade between adjacent scenes (frames)
  crossfadeFrames?: number;

  // Image layers per scene (rendered between background and text overlay).
  // Each scene supports up to N layers (driven by props, no hard cap in code).
  scene1Layers?: ImageLayer[];
  scene2Layers?: ImageLayer[];
  scene3Layers?: ImageLayer[];
  scene4Layers?: ImageLayer[];

  // Shape primitives per scene (Phase 3)
  scene1Shapes?: Shape[];
  scene2Shapes?: Shape[];
  scene3Shapes?: Shape[];
  scene4Shapes?: Shape[];

  // Animated markers per scene (Phase 4)
  scene1Markers?: Marker[];
  scene2Markers?: Marker[];
  scene3Markers?: Marker[];
  scene4Markers?: Marker[];
  posterOverlays?: ProjectPosterOverlayState;
};

export const defaultSmartLabReelProps: SmartLabReelProps = {
  scene1Image: 'generated/smartlab/scene1.jpg',
  scene2Image: 'generated/smartlab/scene2.jpg',
  scene3Image: 'generated/smartlab/scene3.jpg',
  scene4Image: 'generated/smartlab/scene4.jpg',

  scene1Headline: 'تحاليل منزلية براحة وأمان',
  scene1Subtitle: 'نسحب العينة من منزلك بدقة وخصوصية',
  s1HeadlineAnim: { entry: 'word-stagger', durFrames: 20, delayFrames: 8 },
  s1SubtitleAnim: { entry: 'fade-up', durFrames: 22, delayFrames: 38 },

  scene2Headline: 'لماذا سمارت لاب؟',
  scene2Subtitle: 'خدمة منزلية موثوقة تناسب يومك',
  scene2Benefits: [
    'خصوصية وراحة في المنزل',
    'سرعة في الحجز والوصول',
    'نتائج دقيقة باحترافية',
  ],
  s2HeadlineAnim: { entry: 'word-stagger', durFrames: 20, delayFrames: 8 },
  s2SubtitleAnim: { entry: 'fade-up', durFrames: 22, delayFrames: 32 },
  s2BenefitsAnim: { entry: 'slide-from-right', durFrames: 22, delayFrames: 56 },
  s2BenefitsStaggerFrames: 16,

  scene3Headline: 'خدماتنا',
  scene3Subtitle: 'مختبرك... في منزلك',
  scene3Cards: [
    { icon: 'fa-solid fa-house-medical', text: 'سحب عينات منزلي' },
    { icon: 'fa-regular fa-clock', text: 'نتائج دقيقة وسريعة' },
    { icon: 'fa-solid fa-door-open', text: 'راحة وخدمة\nإلى باب منزلك' },
    { icon: 'fa-solid fa-user-doctor', text: 'فريق مختبر مؤهل' },
  ],
  s3HeadlineAnim: { entry: 'word-stagger', durFrames: 20, delayFrames: 8 },
  s3SubtitleAnim: { entry: 'fade-up', durFrames: 22, delayFrames: 32 },
  s3CardsAnim: { entry: 'scale-pop', durFrames: 24, delayFrames: 56 },
  s3CardsStaggerFrames: 10,

  scene4Logo: '',
  scene4Headline: 'احجز الآن',
  scene4Subtitle: 'تحاليل منزلية دقيقة ومريحة',
  scene4Contacts: [
    { icon: 'fa-solid fa-globe', text: 'smartlab.sa' },
    { icon: 'fa-solid fa-phone', text: '9200 22520', isNumber: true },
  ],
  s4LogoAnim: { entry: 'spring-zoom-fade', durFrames: 22, delayFrames: 4 },
  s4HeadlineAnim: { entry: 'word-stagger', loop: 'heartbeat', durFrames: 22, delayFrames: 26 },
  s4SubtitleAnim: { entry: 'fade-up', durFrames: 22, delayFrames: 56 },
  s4ContactsAnim: { entry: 'slide-from-left', durFrames: 24, delayFrames: 78 },
  s4ContactsStaggerFrames: 18,

  scene1DurationSec: 5.0,
  scene2DurationSec: 5.0,
  scene3DurationSec: 5.0,
  scene4DurationSec: 5.0,
  crossfadeFrames: 18,
};

// ── Duration calc ────────────────────────────────────────────────
// A timeline is only usable if it carries its full shape (order list plus
// visible/durations maps). The hub's single-scene PNG export can produce a
// partial object (e.g. `{ visible: {} }` with no `order`), which would crash
// `tl.order.filter(...)`. Treat anything malformed as "no timeline" so callers
// cleanly fall back to the default scene timing instead of throwing.
function validTl(tl?: TimelineStateProp): TimelineStateProp | undefined {
  return tl && Array.isArray(tl.order) && !!tl.visible && !!tl.durations ? tl : undefined;
}

// Pure helper — bake script + Root.tsx both call this to derive
// total duration so the Composition durationInFrames matches.
export function computeSmartLabDuration(props: SmartLabReelProps, fps = 30): number {
  const tl = validTl(props._tlState);
  if (tl) {
    const visible = tl.order.filter((n) => tl.visible[n]);
    if (visible.length) {
      const total = visible.reduce((sum, n) => (
        sum + Math.max(1, Math.round((tl.durations[n] || 5) * fps))
      ), 0);
      return Math.max(1, total - Math.max(0, visible.length - 1) * (props.crossfadeFrames ?? 18));
    }
  }
  const s1 = (props.scene1DurationSec ?? 5.0) * fps;
  const s2 = (props.scene2DurationSec ?? 5.0) * fps;
  const s3 = (props.scene3DurationSec ?? 5.0) * fps;
  const s4 = (props.scene4DurationSec ?? 5.0) * fps;
  const xf = props.crossfadeFrames ?? 18;
  // Adjacent scenes overlap by xf frames. Total = sum - (3 overlaps × xf).
  return Math.round(s1 + s2 + s3 + s4 - 3 * xf);
}

// Default duration for the Composition registration in Root.tsx.
// Bake script regex-patches this constant when scene durations change.
export const SMARTLAB_DURATION = computeSmartLabDuration(defaultSmartLabReelProps, 30);

// ── Helpers ──────────────────────────────────────────────────────
const eOut = Easing.out(Easing.cubic);
const eIO = Easing.bezier(0.22, 1, 0.36, 1);

const ramp = (frame: number, start: number, dur: number, easing = eOut) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

// Compute the scene start frames from per-scene durations + crossfade.
type SceneTiming = {
  s1Start: number; s1Len: number;
  s2Start: number; s2Len: number;
  s3Start: number; s3Len: number;
  s4Start: number; s4Len: number;
  xfade: number;
};
function computeSceneTimings(props: SmartLabReelProps, fps: number): SceneTiming {
  const tl = validTl(props._tlState);
  const visible = tl?.order.filter((n) => tl.visible[n]) || [];
  if (visible.length === 1) {
    const only = visible[0];
    const len = Math.max(1, Math.round((tl?.durations[only] || 5) * fps));
    return {
      xfade: 0,
      s1Start: only === '1' ? 0 : len + 1, s1Len: only === '1' ? len : 1,
      s2Start: only === '2' ? 0 : len + 1, s2Len: only === '2' ? len : 1,
      s3Start: only === '3' ? 0 : len + 1, s3Len: only === '3' ? len : 1,
      s4Start: only === '4' ? 0 : len + 1, s4Len: only === '4' ? len : 1,
    };
  }
  const s1Len = Math.round((props.scene1DurationSec ?? 5.0) * fps);
  const s2Len = Math.round((props.scene2DurationSec ?? 5.0) * fps);
  const s3Len = Math.round((props.scene3DurationSec ?? 5.0) * fps);
  const s4Len = Math.round((props.scene4DurationSec ?? 5.0) * fps);
  const xfade = props.crossfadeFrames ?? 18;
  return {
    xfade,
    s1Start: 0, s1Len,
    s2Start: s1Len - xfade, s2Len,
    s3Start: s1Len - xfade + s2Len - xfade, s3Len,
    s4Start: s1Len - xfade + s2Len - xfade + s3Len - xfade, s4Len,
  };
}

// Resolve an AnimSpec → concrete frames using metadata defaults.
function resolveSpec(spec: AnimSpec | undefined, fallbackEntry: string): {
  entry: string; loop?: string; durFrames: number; delayFrames: number;
} {
  const entry = spec?.entry ?? fallbackEntry;
  const loop = spec?.loop && animationMeta[spec.loop]?.kind === 'loop' ? spec.loop : undefined;
  const durFrames = spec?.durFrames ?? animationMeta[entry]?.defaultDur ?? 20;
  const delayFrames = spec?.delayFrames ?? 0;
  return { entry, loop, durFrames, delayFrames };
}

// Crossfade wrapper for each scene.
const SceneFade: React.FC<{
  start: number;
  length: number;
  xfade: number;
  children: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
}> = ({ start, length, xfade, children, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const local = frame - start;
  const hasCrossfade = xfade > 0;
  const enterOp = isFirst || !hasCrossfade ? 1 : ramp(local, 0, xfade);
  const exitOp = isLast
    ? 1
    : !hasCrossfade
      ? 1
    : interpolate(local, [length - xfade, length], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
  return (
    <AbsoluteFill style={{ opacity: enterOp * exitOp }}>{children}</AbsoluteFill>
  );
};

// Background image with slow Ken Burns zoom.
const SceneBg: React.FC<{ src: string; start: number; length: number }> = ({ src, start, length }) => {
  const frame = useCurrentFrame();
  const t = (frame - start) / Math.max(1, length);
  const scale = interpolate(t, [0, 1], [1, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div className="sl-bg" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
      <Img src={staticFile(src)} />
    </div>
  );
};

// Renders an array of image layers. Each layer is positioned absolutely in
// design pixels, has its own scale/rotate/opacity, and is animated using the
// registry. Empty/missing `src` layers are skipped so studio "empty slot"
// inputs don't break the render.
const Layers: React.FC<{ layers: ImageLayer[] | undefined; sceneStart: number }> = ({ layers, sceneStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!layers || layers.length === 0) return null;
  return (
    <>
      {layers.map((layer, i) => {
        if (!layer.src) return null;
        const r = resolveSpec(layer.anim, 'fade-in');
        const startFrame = sceneStart + r.delayFrames;
        const animStyle = animations[r.entry]
          ? animations[r.entry]({ frame, start: startFrame, dur: r.durFrames, fps })
          : { opacity: 1 };
        const animOpacity = typeof animStyle.opacity === 'number' ? animStyle.opacity : 1;
        // Compose static transforms (rotate, scale) with the anim's transform.
        const staticTransform: string[] = [];
        if (layer.rotate) staticTransform.push(`rotate(${layer.rotate}deg)`);
        if (layer.scale && layer.scale !== 1) staticTransform.push(`scale(${layer.scale})`);
        const transformParts = [animStyle.transform, ...staticTransform].filter(Boolean);
        const finalStyle: React.CSSProperties = {
          position: 'absolute',
          left: layer.x ?? 0,
          top: layer.y ?? 0,
          width: layer.w && layer.w > 0 ? layer.w : 'auto',
          height: layer.h && layer.h > 0 ? layer.h : 'auto',
          zIndex: layer.z ?? 1,
          opacity: animOpacity * (layer.opacity ?? 1),
          transform: transformParts.length > 0 ? transformParts.join(' ') : undefined,
          transformOrigin: 'center center',
          willChange: 'transform, opacity',
          ...(animStyle.filter ? { filter: animStyle.filter } : {}),
        };
        return <Img key={i} src={staticFile(layer.src)} style={finalStyle} />;
      })}
    </>
  );
};

// Renders an array of SVG shape primitives positioned in the 1080×design
// pixel space. Each shape gets its own animation. The `draw-line` entry is
// a special-cased CSS variable (stroke-dashoffset goes from len → 0) which
// gives the "drawing in" effect for kind: 'line' or 'arrow'.
const Shapes: React.FC<{ shapes: Shape[] | undefined; sceneStart: number; sceneLen: number }> = ({ shapes, sceneStart, sceneLen }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!shapes || shapes.length === 0) return null;
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
      viewBox="0 0 1080 1350"
      preserveAspectRatio="none"
    >
      {shapes.map((shape, i) => {
        if (!shape.kind) return null;
        const r = resolveSpec(shape.anim, 'fade-in');
        const startFrame = sceneStart + r.delayFrames;
        const animStyle = animations[r.entry]
          ? animations[r.entry]({ frame, start: startFrame, dur: r.durFrames, fps })
          : { opacity: 1 };
        const animOpacity = typeof animStyle.opacity === 'number' ? animStyle.opacity : 1;
        const x = shape.x ?? 0;
        const y = shape.y ?? 0;
        const w = shape.w ?? 100;
        const h = shape.h ?? 100;
        const stroke = shape.stroke ?? 'currentColor';
        const fill = shape.fill ?? 'none';
        const strokeWidth = shape.strokeWidth ?? 3;
        const opacity = animOpacity * (shape.opacity ?? 1);
        const rotate = shape.rotate ?? 0;
        // Centre of bounding box for rotation
        const cx = shape.kind === 'circle' || shape.kind === 'dot' ? x : x + w / 2;
        const cy = shape.kind === 'circle' || shape.kind === 'dot' ? y : y + h / 2;
        const transform = `${animStyle.transform ?? ''} ${rotate ? `rotate(${rotate} ${cx} ${cy})` : ''}`.trim();
        const z = shape.z ?? 5;
        const commonProps: any = {
          opacity,
          transform: transform || undefined,
          style: { zIndex: z },
        };

        switch (shape.kind) {
          case 'circle':
            // (x, y) = center, w = diameter
            return (
              <circle key={i} cx={x} cy={y} r={w / 2} stroke={stroke} fill={fill} strokeWidth={strokeWidth} {...commonProps} />
            );
          case 'dot':
            return (
              <circle key={i} cx={x} cy={y} r={(shape.w ?? 16) / 2} fill={shape.fill ?? stroke} {...commonProps} />
            );
          case 'rect':
            return (
              <rect key={i} x={x} y={y} width={w} height={h} stroke={stroke} fill={fill} strokeWidth={strokeWidth} rx={shape.h && shape.h < 0 ? 0 : 8} {...commonProps} />
            );
          case 'line':
          case 'arrow': {
            const x1 = x, y1 = y;
            const x2 = shape.x2 ?? x + w;
            const y2 = shape.y2 ?? y;
            const len = Math.hypot(x2 - x1, y2 - y1);
            // draw-line: stroke-dashoffset goes len → 0 over the animation duration
            const drawT = Math.max(0, Math.min(1, (frame - startFrame) / Math.max(1, r.durFrames)));
            const dashOffset = (1 - drawT) * len;
            const arrowHead = shape.kind === 'arrow' ? (
              <polygon
                points={`${x2},${y2} ${x2 - strokeWidth * 4 * Math.cos(Math.atan2(y2 - y1, x2 - x1) - 0.4)},${y2 - strokeWidth * 4 * Math.sin(Math.atan2(y2 - y1, x2 - x1) - 0.4)} ${x2 - strokeWidth * 4 * Math.cos(Math.atan2(y2 - y1, x2 - x1) + 0.4)},${y2 - strokeWidth * 4 * Math.sin(Math.atan2(y2 - y1, x2 - x1) + 0.4)}`}
                fill={stroke}
                opacity={drawT >= 1 ? 1 : 0}
              />
            ) : null;
            return (
              <g key={i} opacity={opacity}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={dashOffset} />
                {arrowHead}
              </g>
            );
          }
          case 'text':
            return (
              <text
                key={i}
                x={x}
                y={y}
                fill={fill === 'none' ? (shape.stroke ?? 'currentColor') : fill}
                fontSize={shape.fontSize ?? 28}
                fontWeight={shape.fontWeight ?? 500}
                fontFamily={shape.fontFamily ?? 'Tajawal, Arial, sans-serif'}
                {...commonProps}
              >
                {shape.text ?? ''}
              </text>
            );
          default:
            return null;
        }
      })}
    </svg>
  );
};

// Renders animated markers within a scene. Each marker:
//   • Fades in at activateFrame (over 8 frames)
//   • Pulse-ring expands+fades repeatedly (1s cycle while active)
//   • Central dot scale-pops in
//   • Callout label fades in slightly after the dot
//   • Fades out 8 frames before deactivation
const Markers: React.FC<{ markers: Marker[] | undefined; sceneStart: number }> = ({ markers, sceneStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!markers || markers.length === 0) return null;
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 6 }}
      viewBox="0 0 1080 1350"
      preserveAspectRatio="none"
    >
      {markers.map((m, i) => {
        const activate = sceneStart + (m.activateFrame ?? 0);
        const dur = m.durationFrames ?? 90;
        const local = frame - activate;
        if (local < -8 || local > dur + 8) return null; // off-screen window

        // Marker overall fade
        const fadeIn = interpolate(local, [0, 12], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const fadeOut = interpolate(local, [dur - 12, dur], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const op = fadeIn * fadeOut;

        // Dot scale-pop
        const dotSpring = spring({
          frame: local,
          fps,
          config: { damping: 11, stiffness: 160 },
        });
        const dotScale = 0.3 + dotSpring * 0.7;

        // Ring pulse — 1s cycle, expands 0→1 then fades
        const ringCycle = fps;
        const ringPhase = local >= 0 ? (local % ringCycle) / ringCycle : 0;
        const ringR = ringPhase * (m.ringSize ?? 80);
        const ringOp = (1 - ringPhase) * 0.7;

        // Label fade — slightly after the dot
        const labelOp = interpolate(local, [8, 22], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }) * fadeOut;

        const color = m.color ?? '#1A9DD7';
        const dotSize = m.dotSize ?? 14;
        const labelX = m.x + (m.labelOffsetX ?? 60);
        const labelY = m.y + (m.labelOffsetY ?? -10);
        const labelSize = m.labelSize ?? 32;
        const labelBg = m.labelBg ?? 'rgba(255,255,255,0.95)';
        const labelColor = m.labelColor ?? '#071B3A';
        const labelPad = 12;
        const labelW = (m.label?.length ?? 0) * labelSize * 0.55 + labelPad * 2;
        const labelH = labelSize + labelPad * 1.4;

        return (
          <g key={i} opacity={op}>
            {/* Pulse ring (expanding) */}
            {ringPhase > 0 && (
              <circle cx={m.x} cy={m.y} r={ringR} fill="none" stroke={color} strokeWidth={3} opacity={ringOp} />
            )}
            {/* Central dot */}
            <circle cx={m.x} cy={m.y} r={dotSize} fill={color} transform={`scale(${dotScale})`} style={{ transformOrigin: `${m.x}px ${m.y}px`, transformBox: 'fill-box' }} />
            {/* Inner highlight on the dot */}
            <circle cx={m.x} cy={m.y} r={dotSize * 0.45} fill="rgba(255,255,255,0.8)" opacity={dotScale} />
            {/* Connector line from marker to label */}
            {m.label && (
              <line
                x1={m.x + (m.labelOffsetX && m.labelOffsetX > 0 ? dotSize : -dotSize)}
                y1={m.y}
                x2={labelX - (m.labelOffsetX && m.labelOffsetX > 0 ? labelPad : -labelPad)}
                y2={labelY + labelH / 2}
                stroke={color}
                strokeWidth={2}
                opacity={labelOp}
              />
            )}
            {/* Callout box */}
            {m.label && (
              <g opacity={labelOp}>
                <rect
                  x={labelX}
                  y={labelY}
                  width={labelW}
                  height={labelH}
                  rx={labelH / 2}
                  fill={labelBg}
                  stroke={color}
                  strokeWidth={2}
                />
                <text
                  x={labelX + labelW / 2}
                  y={labelY + labelH / 2 + labelSize * 0.35}
                  fill={labelColor}
                  fontSize={labelSize}
                  fontWeight={700}
                  fontFamily="Tajawal, Arial, sans-serif"
                  textAnchor="middle"
                >
                  {m.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// Word-stagger headline — kept as a built-in (registry can't easily return
// multi-element output). Used when an element's anim is 'word-stagger'.
const WordStagger: React.FC<{
  text: string;
  start: number;
  staggerFrames?: number;
  durFrames?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ text, start, staggerFrames = 5, durFrames = 20, className, style }) => {
  const frame = useCurrentFrame();
  const words = text.split(' ');
  return (
    <h1 className={className} style={style}>
      {words.map((w, i) => {
        const wStart = start + i * staggerFrames;
        const op = ramp(frame, wStart, durFrames);
        const y = interpolate(ramp(frame, wStart, durFrames + 4, eIO), [0, 1], [22, 0]);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: op,
              transform: `translateY(${y}px)`,
              marginInlineEnd: i < words.length - 1 ? '0.25em' : 0,
              willChange: 'transform, opacity',
            }}
          >
            {w}
          </span>
        );
      })}
    </h1>
  );
};

// Helper: render text or other content with the resolved animation applied.
type AnimatedProps = {
  spec: AnimSpec | undefined;
  fallbackEntry: string;
  sceneStart: number;
  frame: number;
  fps: number;
  children: (style: React.CSSProperties) => React.ReactNode;
  // For word-stagger special-casing:
  asWordStagger?: { text: string; className?: string; staggerFrames?: number };
};
const Animated: React.FC<AnimatedProps> = ({ spec, fallbackEntry, sceneStart, frame, fps, children, asWordStagger }) => {
  const r = resolveSpec(spec, fallbackEntry);
  const startFrame = sceneStart + r.delayFrames;

  // Special case: word-stagger needs to render the multi-word output itself.
  if (r.entry === 'word-stagger' && asWordStagger) {
    const wrapperStyle: React.CSSProperties = {};
    // If a loop is requested, apply it to a wrapper around the WordStagger.
    if (r.loop) {
      const loopStart = startFrame + r.durFrames;
      const loopStyle = animations[r.loop]({
        frame,
        start: loopStart,
        dur: 1,
        fps,
      });
      Object.assign(wrapperStyle, loopStyle);
      wrapperStyle.transformOrigin = 'center center';
      wrapperStyle.display = 'inline-block';
    }
    return (
      <div style={wrapperStyle}>
        <WordStagger
          text={asWordStagger.text}
          start={startFrame}
          staggerFrames={asWordStagger.staggerFrames ?? 5}
          durFrames={r.durFrames}
          className={asWordStagger.className}
        />
      </div>
    );
  }

  const input: AnimInput = { frame, start: startFrame, dur: r.durFrames, fps };
  const style = getCombinedStyle(r.entry, r.loop, input);
  return <>{children(style)}</>;
};

// ── Scene 1: Headline + Subtitle ────────────────────────────────
const Scene1: React.FC<{ props: SmartLabReelProps; timing: SceneTiming }> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const overlayDoc = props.posterOverlays?.['1'];
  return (
    <SceneFade start={timing.s1Start} length={timing.s1Len} xfade={timing.xfade} isFirst>
      {overlayDoc ? (
        <PosterOverlayScene
          document={overlayDoc}
          sceneStart={timing.s1Start}
          sceneDurationFrames={timing.s1Len}
        />
      ) : (
        <>
          <SceneBg src={props.scene1Image} start={timing.s1Start} length={timing.s1Len} />
          <Layers layers={props.scene1Layers} sceneStart={timing.s1Start} />
          <Shapes shapes={props.scene1Shapes} sceneStart={timing.s1Start} sceneLen={timing.s1Len} />
          <Markers markers={props.scene1Markers} sceneStart={timing.s1Start} />
          <div className="sl-s1-text">
            <Animated
              spec={props.s1HeadlineAnim}
              fallbackEntry="word-stagger"
              sceneStart={timing.s1Start}
              frame={frame}
              fps={fps}
              asWordStagger={{ text: props.scene1Headline }}
            >{() => null}</Animated>
            <Animated
              spec={props.s1SubtitleAnim}
              fallbackEntry="fade-up"
              sceneStart={timing.s1Start}
              frame={frame}
              fps={fps}
            >
              {(style) => <p style={style}>{props.scene1Subtitle}</p>}
            </Animated>
          </div>
        </>
      )}
    </SceneFade>
  );
};

// ── Scene 2: Why + Benefits ──────────────────────────────────────
const Scene2: React.FC<{ props: SmartLabReelProps; timing: SceneTiming }> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const overlayDoc = props.posterOverlays?.['2'];
  const benefitsSpec = resolveSpec(props.s2BenefitsAnim, 'slide-from-right');
  const stagger = props.s2BenefitsStaggerFrames ?? 16;
  return (
    <SceneFade start={timing.s2Start} length={timing.s2Len} xfade={timing.xfade}>
      {overlayDoc ? (
        <PosterOverlayScene
          document={overlayDoc}
          sceneStart={timing.s2Start}
          sceneDurationFrames={timing.s2Len}
        />
      ) : (
        <>
          <SceneBg src={props.scene2Image} start={timing.s2Start} length={timing.s2Len} />
          <Layers layers={props.scene2Layers} sceneStart={timing.s2Start} />
          <Shapes shapes={props.scene2Shapes} sceneStart={timing.s2Start} sceneLen={timing.s2Len} />
          <Markers markers={props.scene2Markers} sceneStart={timing.s2Start} />
          <div className="sl-s2-text">
            <Animated
              spec={props.s2HeadlineAnim}
              fallbackEntry="word-stagger"
              sceneStart={timing.s2Start}
              frame={frame}
              fps={fps}
              asWordStagger={{ text: props.scene2Headline }}
            >{() => null}</Animated>
            <Animated
              spec={props.s2SubtitleAnim}
              fallbackEntry="fade-up"
              sceneStart={timing.s2Start}
              frame={frame}
              fps={fps}
            >
              {(style) => <div className="sl-s2-subtitle" style={style}>{props.scene2Subtitle}</div>}
            </Animated>
            <div className="sl-benefits">
              {props.scene2Benefits.map((b, i) => {
                const startFrame = timing.s2Start + benefitsSpec.delayFrames + i * stagger;
                const itemStyle = animations[benefitsSpec.entry]({
                  frame, start: startFrame, dur: benefitsSpec.durFrames, fps,
                });
                const checkPop = spring({
                  frame: frame - (startFrame + 4),
                  fps,
                  config: { damping: 9, stiffness: 180 },
                });
                return (
                  <div key={i} className="sl-benefit" style={itemStyle}>
                    <span className="sl-check" style={{ transform: `scale(${0.3 + checkPop * 0.7})` }}>✓</span>
                    <span>{b}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </SceneFade>
  );
};

// ── Scene 3: Services 2×2 ────────────────────────────────────────
const Scene3: React.FC<{ props: SmartLabReelProps; timing: SceneTiming }> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const overlayDoc = props.posterOverlays?.['3'];
  const cardsSpec = resolveSpec(props.s3CardsAnim, 'scale-pop');
  const stagger = props.s3CardsStaggerFrames ?? 10;
  return (
    <SceneFade start={timing.s3Start} length={timing.s3Len} xfade={timing.xfade}>
      {overlayDoc ? (
        <PosterOverlayScene
          document={overlayDoc}
          sceneStart={timing.s3Start}
          sceneDurationFrames={timing.s3Len}
        />
      ) : (
        <>
          <SceneBg src={props.scene3Image} start={timing.s3Start} length={timing.s3Len} />
          <Layers layers={props.scene3Layers} sceneStart={timing.s3Start} />
          <Shapes shapes={props.scene3Shapes} sceneStart={timing.s3Start} sceneLen={timing.s3Len} />
          <Markers markers={props.scene3Markers} sceneStart={timing.s3Start} />
          <section className="sl-services">
            <Animated
              spec={props.s3HeadlineAnim}
              fallbackEntry="word-stagger"
              sceneStart={timing.s3Start}
              frame={frame}
              fps={fps}
              asWordStagger={{ text: props.scene3Headline }}
            >{() => null}</Animated>
            <Animated
              spec={props.s3SubtitleAnim}
              fallbackEntry="fade-up"
              sceneStart={timing.s3Start}
              frame={frame}
              fps={fps}
            >
              {(style) => <div className="sl-services-subtitle" style={style}>{props.scene3Subtitle}</div>}
            </Animated>
            <div className="sl-cards">
              {props.scene3Cards.map((card, i) => {
                const startFrame = timing.s3Start + cardsSpec.delayFrames + i * stagger;
                const cardStyle = animations[cardsSpec.entry]({
                  frame, start: startFrame, dur: cardsSpec.durFrames, fps,
                });
                const iconPop = spring({
                  frame: frame - (startFrame + 8),
                  fps,
                  config: { damping: 10, stiffness: 160 },
                });
                return (
                  <div key={i} className="sl-card" style={cardStyle}>
                    <i className={card.icon} style={{ transform: `scale(${0.3 + iconPop * 0.7})`, display: 'inline-block' }} />
                    <p>
                      {card.text.split('\n').map((line, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <br />}
                          {line}
                        </React.Fragment>
                      ))}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </SceneFade>
  );
};

// ── Scene 4: Outro CTA + contacts ────────────────────────────────
const Scene4: React.FC<{ props: SmartLabReelProps; timing: SceneTiming }> = ({ props, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const overlayDoc = props.posterOverlays?.['4'];
  const contactsSpec = resolveSpec(props.s4ContactsAnim, 'slide-from-left');
  const stagger = props.s4ContactsStaggerFrames ?? 18;
  return (
    <SceneFade start={timing.s4Start} length={timing.s4Len} xfade={timing.xfade} isLast>
      {overlayDoc ? (
        <PosterOverlayScene
          document={overlayDoc}
          sceneStart={timing.s4Start}
          sceneDurationFrames={timing.s4Len}
        />
      ) : (
        <>
          <SceneBg src={props.scene4Image} start={timing.s4Start} length={timing.s4Len} />
          <Layers layers={props.scene4Layers} sceneStart={timing.s4Start} />
          <Shapes shapes={props.scene4Shapes} sceneStart={timing.s4Start} sceneLen={timing.s4Len} />
          <Markers markers={props.scene4Markers} sceneStart={timing.s4Start} />
          <section className="sl-outro">
            {props.scene4Logo && (
              <Animated
                spec={props.s4LogoAnim}
                fallbackEntry="spring-zoom-fade"
                sceneStart={timing.s4Start}
                frame={frame}
                fps={fps}
              >
                {(style) => (
                  <Img className="sl-brand-logo" src={staticFile(props.scene4Logo)} style={style} />
                )}
              </Animated>
            )}
            <Animated
              spec={props.s4HeadlineAnim}
              fallbackEntry="word-stagger"
              sceneStart={timing.s4Start}
              frame={frame}
              fps={fps}
              asWordStagger={{ text: props.scene4Headline, staggerFrames: 6 }}
            >{() => null}</Animated>
            <Animated
              spec={props.s4SubtitleAnim}
              fallbackEntry="fade-up"
              sceneStart={timing.s4Start}
              frame={frame}
              fps={fps}
            >
              {(style) => <div className="sl-outro-subtitle" style={style}>{props.scene4Subtitle}</div>}
            </Animated>
            <div className="sl-contact-list">
              {props.scene4Contacts.map((c, i) => {
                const startFrame = timing.s4Start + contactsSpec.delayFrames + i * stagger;
                const rowStyle = animations[contactsSpec.entry]({
                  frame, start: startFrame, dur: contactsSpec.durFrames, fps,
                });
                const iconPop = spring({
                  frame: frame - (startFrame + 6),
                  fps,
                  config: { damping: 10, stiffness: 150 },
                });
                return (
                  <div key={i} className="sl-contact-row" style={rowStyle}>
                    <div className="sl-icon-circle" style={{ transform: `scale(${0.4 + iconPop * 0.6})` }}>
                      <i className={c.icon} />
                    </div>
                    <div className="sl-divider" />
                    <div className={`sl-contact-text${c.isNumber ? ' number' : ''}`}>{c.text}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </SceneFade>
  );
};

const ExtraOverlayScenes: React.FC<{ props: SmartLabReelProps }> = ({ props }) => {
  const { fps } = useVideoConfig();
  const tl = validTl(props._tlState);
  if (!tl || !props.posterOverlays) return null;
  const visible = tl.order.filter((n) => tl.visible[n]);
  let cursor = 0;
  const xfade = props.crossfadeFrames ?? 18;
  return (
    <>
      {visible.map((sceneId, index) => {
        const durationFrames = Math.max(1, Math.round((tl.durations[sceneId] || 5) * fps));
        const start = cursor;
        cursor += Math.max(1, durationFrames - xfade);
        if (['1', '2', '3', '4'].includes(sceneId)) return null;
        const overlayDoc = props.posterOverlays?.[sceneId];
        if (!overlayDoc) return null;
        return (
          <SceneFade
            key={sceneId}
            start={start}
            length={durationFrames}
            xfade={xfade}
            isFirst={index === 0}
            isLast={index === visible.length - 1}
          >
            <PosterOverlayScene
              document={overlayDoc}
              sceneStart={start}
              sceneDurationFrames={durationFrames}
            />
          </SceneFade>
        );
      })}
    </>
  );
};

// ── Root ─────────────────────────────────────────────────────────
export const SmartLabReel: React.FC<SmartLabReelProps> = (props) => {
  ensureFontsReady();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timing = computeSceneTimings(props, fps);
  const totalFrames = computeSmartLabDuration(props, fps);

  // Background music fade in/out. Short scene-only renders can be under
  // one second, so keep the interpolation range strictly increasing.
  const fadeFrames = Math.max(1, Math.min(Math.round(fps * 0.5), Math.floor((totalFrames - 1) / 3)));
  const holdFrame = Math.max(fadeFrames + 1, totalFrames - fadeFrames);
  const bgVolume = props._renderMuted || totalFrames <= 2
    ? 0
    : interpolate(
        frame,
        [0, fadeFrames, holdFrame, totalFrames],
        [0, 0.55, 0.55, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );

  // When hub passes _tlState, honor `visible`. (Reorder + duration
  // changes would need refactoring `computeSceneTimings` to be
  // timeline-aware; for now we only respect hidden flags.)
  const tl = validTl(props._tlState);
  const isVisible = (n: string) => !tl || (tl.order.includes(n) && tl.visible[n] !== false);

  return (
    <AbsoluteFill className="sl-video">
      {!props._renderMuted && <Audio src={staticFile('audio/smartlab-bg.mp3')} volume={bgVolume} />}
      {isVisible('1') && <Scene1 props={props} timing={timing} />}
      {isVisible('2') && <Scene2 props={props} timing={timing} />}
      {isVisible('3') && <Scene3 props={props} timing={timing} />}
      {isVisible('4') && <Scene4 props={props} timing={timing} />}
      <ExtraOverlayScenes props={props} />
    </AbsoluteFill>
  );
};
