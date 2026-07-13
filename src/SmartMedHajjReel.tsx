import React from 'react';
import {
  AbsoluteFill,
  Audio,
  cancelRender,
  continueRender,
  delayRender,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import './smartmed-hajj.css';
import { PosterOverlayScene } from './posterOverlay/OverlayRenderer';
import type {
  PosterOverlayDocument,
  ProjectPosterOverlayState,
} from './posterOverlay/overlaySchema';

// ── Font loading: wait for Tajawal before rendering. Without this,
// headless Chrome captures frames while fonts are still downloading
// and silently falls back to Arial. ─────────────────────────────────
const ensureFontsReady = (() => {
  let handle: number | null = null;
  return () => {
    if (typeof document === 'undefined') return;
    if (handle !== null) return;
    handle = delayRender('Loading Tajawal');
    const sizes = ['400', '500', '700'];
    const probes = sizes.map((w) =>
      (document as Document & { fonts: FontFaceSet }).fonts.load(
        `${w} 64px "Tajawal"`,
        'رعاية منزلية'
      )
    );
    Promise.allSettled(probes)
      .then(() => (document as Document & { fonts: FontFaceSet }).fonts.ready)
      .then(() => continueRender(handle as number))
      .catch((err) => cancelRender(err));
  };
})();

// ── Per-scene text content ──────────────────────────────────────────
export type SceneText = {
  badge: string;
  h1: string;
  h2: string;
  sub: string;
  // Scene-specific callouts: a flat dict of small/strong/tag strings,
  // keyed by the same names the preview HTML uses (e.g. p1-small / u2-strong / tag).
  pieces: Record<string, string>;
  image: string; // path under /public
};

// Optional timeline state injected by Root.tsx's calculateMetadata when
// a `smartmed-hajj-timeline.json` file is present at the repo root (the
// hub server writes it on render). The composition uses it to filter
// to visible scenes, reorder, and size per-scene durations. The optional
// `template` map handles dynamically-duplicated scenes (S6, S7, …) —
// each maps to its source scene template ('1'..'5').
export type TimelineStateProp = {
  order: string[];
  visible: Record<string, boolean>;
  durations: Record<string, number>;
  template?: Record<string, string>;
};

export type SmartMedHajjReelProps = {
  s1: SceneText;
  s2: SceneText;
  s3: SceneText;
  s4: SceneText;
  s5: SceneText;
  _tlState?: TimelineStateProp;
  posterOverlays?: ProjectPosterOverlayState;
};

export const defaultSmartMedHajjReelProps: SmartMedHajjReelProps = {
  s1: {
    image: 'generated/smartmed/smartmed_2/scene1.png',
    badge: 'موسم الحج',
    h1: 'قبل الحج...',
    h2: 'اطمئن على صحتك',
    sub: 'رعاية منزلية تساعدك تستعد للرحلة براحة وطمأنينة',
    pieces: {
      'p1-small': 'قبل الرحلة',
      'p1-strong': 'فحص المؤشرات',
      'p2-small': 'تجهيز صحي',
      'p2-strong': 'مراجعة الأدوية',
      'p3-small': 'من سمارت ميد',
      'p3-strong': 'زيارة منزلية',
    },
  },
  s2: {
    image: 'generated/smartmed/smartmed_2/scene2.png',
    badge: 'رعاية كبار السن',
    h1: 'نطمئن على أهلك',
    h2: 'قبل الحج',
    sub: 'متابعة منزلية هادئة تساعد كبار السن يستعدون للرحلة براحة وأمان',
    pieces: {
      'u1-small': 'رعاية منزلية',
      'u1-strong': 'تم الاطمئنان على الحالة',
      'u2-small': 'قبل السفر',
      'u2-strong': 'تمت مراجعة الأدوية',
      'u3-small': 'في بيتكم',
      'u3-strong': 'الرعاية وصلت براحة',
      tag: 'سمارت ميد معكم خطوة بخطوة',
    },
  },
  s3: {
    image: 'generated/smartmed/smartmed_2/scene3.png',
    badge: 'متابعة منزلية',
    h1: 'رعاية تطمّنك',
    h2: 'وتطمن عائلتك',
    sub: 'متابعة صحية في المنزل قبل رحلة الحج بكل راحة',
    pieces: {
      'c1-small': 'داخل المنزل',
      'c1-strong': 'فحص ومتابعة',
      'c2-small': 'للأهل',
      'c2-strong': 'طمأنينة واطلاع',
      'c3-small': 'قبل الرحلة',
      'c3-strong': 'جاهزية صحية',
      tag: 'الرعاية توصلكم أينما كنتم',
    },
  },
  s4: {
    image: 'generated/smartmed/smartmed_2/scene4.png',
    badge: 'استعداد قبل السفر',
    h1: 'استعدادك للحج',
    h2: 'يبدأ بصحتك',
    sub: 'قبل ترتيب الشنطة تأكد من أدويتك وتجهيزاتك الصحية',
    pieces: {
      i1: 'الأدوية',
      i2: 'التقارير الطبية',
      i3: 'المؤشرات الصحية',
      'prog-label': 'جاهز للرحلة',
      tag: 'صحتك ضمن التجهيزات ✓',
    },
  },
  s5: {
    image: 'generated/smartmed/smartmed_2/scene5.png',
    badge: 'زيارة منزلية',
    h1: 'الرعاية توصلكم',
    h2: 'لحد البيت',
    sub: 'فحص ومتابعة قبل الحج براحة وخصوصية مع العائلة',
    pieces: {
      'v1-small': 'الطبيب في المنزل',
      'v1-strong': 'فحص مباشر',
      'v2-small': 'سمارت ميد',
      'v2-strong': 'خدمة منزلية خاصة',
      'v3-small': 'مع العائلة',
      'v3-strong': 'طمأنينة ورعاية',
      tag: 'صحتكم تبدأ من راحة البيت',
    },
  },
};

// Each scene needs ~5s for its CSS animations to play out fully (the
// last delayed element kicks off around 3.35s + a 1s settle). 150 frames
// at 30fps = 5s per scene. With a short crossfade between scenes:
const FPS = 30;
const SCENE_FRAMES = 150;          // 5s per scene
const CROSSFADE_FRAMES = 10;       // ~0.33s overlap between scenes
export const SMARTMED_HAJJ_DURATION = SCENE_FRAMES * 5; // 750 frames = 25s
export const computeSmartMedHajjDuration = (
  _props: SmartMedHajjReelProps,
  _fps: number
) => SMARTMED_HAJJ_DURATION;

// ── Background photo ───────────────────────────────────────────────
const SceneBg: React.FC<{ src: string }> = ({ src }) => (
  <Img className="bg" src={staticFile(src)} alt="" />
);

// ── Reusable icon paths ────────────────────────────────────────────
const I = {
  heart: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M32 55S10 42 10 23c0-8 6-14 14-14 5 0 8 3 8 3s3-3 8-3c8 0 14 6 14 14 0 19-22 32-22 32Z" stroke="#fff" strokeWidth="4" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M20 11h24c3 0 5 2 5 5v37c0 3-2 5-5 5H20c-3 0-5-2-5-5V16c0-3 2-5 5-5Z" stroke="#fff" strokeWidth="4" />
      <path d="M24 28h16M24 39h16" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M12 30L32 14l20 16v24c0 3-2 5-5 5H17c-3 0-5-2-5-5V30Z" stroke="#fff" strokeWidth="4" />
      <path d="M27 39h10M32 34v10" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  cuff: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M18 10v16c0 8 6 14 14 14s14-6 14-14V10" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="54" cy="38" r="5" stroke="#fff" strokeWidth="4" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 64 64" fill="none">
      <rect x="10" y="16" width="34" height="32" rx="8" stroke="#fff" strokeWidth="4" />
      <path d="M44 27l10-7v24l-10-7" stroke="#fff" strokeWidth="4" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M20 22V15c0-4 3-7 7-7h10c4 0 7 3 7 7v7" stroke="#fff" strokeWidth="4" />
      <rect x="12" y="22" width="40" height="34" rx="8" stroke="#fff" strokeWidth="4" />
    </svg>
  ),
  bagPlus: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M20 22V15c0-4 3-7 7-7h10c4 0 7 3 7 7v7" stroke="#fff" strokeWidth="4" />
      <rect x="12" y="22" width="40" height="34" rx="8" stroke="#fff" strokeWidth="4" />
      <path d="M27 39h10M32 34v10" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  pillBox: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M18 18h28v36H18z" stroke="#fff" strokeWidth="4" />
      <path d="M25 32h14M32 25v14" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  report: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M18 8h22l10 10v38H18z" stroke="#fff" strokeWidth="4" />
      <path d="M26 32h18M26 42h14" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  pulse: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M12 34h10l5-13 8 25 5-12h12" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  family: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M32 10c8 0 14 6 14 14s-6 14-14 14-14-6-14-14 6-14 14-14Z" stroke="#fff" strokeWidth="4" />
      <path d="M11 57c3-10 11-16 21-16s18 6 21 16" stroke="#fff" strokeWidth="4" />
    </svg>
  ),
  pulseReview: (
    <svg viewBox="0 0 64 64" fill="none">
      <path d="M23 8h18M27 8v10h10V8M22 18h20c3 0 5 2 5 5v31H17V23c0-3 2-5 5-5Z" stroke="#fff" strokeWidth="4" />
      <path d="M32 29v13M25 35h14" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
};

// ── Scene shells ───────────────────────────────────────────────────
// All animations are driven by CSS keyframes which Remotion seeks per
// frame. We just render the static DOM; the scene's local clock is
// reset by wrapping each in <Sequence>.

const SceneHeader: React.FC<{ s: SceneText }> = ({ s }) => (
  <div className="content">
    <div className="badge">{s.badge}</div>
    <h1>
      {s.h1}
      <span>{s.h2}</span>
    </h1>
    <p className="sub">{s.sub}</p>
  </div>
);

type OverlaySceneProps = {
  s: SceneText;
  overlayDoc?: PosterOverlayDocument;
  sceneDurationFrames?: number;
};

const OverlayOr = (
  overlayDoc: PosterOverlayDocument | undefined,
  sceneDurationFrames: number | undefined,
  fallback: React.ReactElement
) => {
  if (!overlayDoc) return fallback;
  return (
    <section className="scene">
      <PosterOverlayScene
        document={overlayDoc}
        sceneStart={0}
        sceneDurationFrames={sceneDurationFrames}
      />
    </section>
  );
};

const Scene1: React.FC<OverlaySceneProps> = ({ s, overlayDoc, sceneDurationFrames }) =>
  OverlayOr(
    overlayDoc,
    sceneDurationFrames,
    <section className="scene scene-1">
      <SceneBg src={s.image} />
      <div className="soft-layer" />
      <SceneHeader s={s} />
      <div className="content"><div className="line" style={{ marginTop: 40 }} /></div>
      <div className="white-pill s1-p1">
        <div className="pill-icon">{I.heart}</div>
        <div><small>{s.pieces['p1-small']}</small><strong>{s.pieces['p1-strong']}</strong></div>
      </div>
      <div className="white-pill s1-p2">
        <div className="pill-icon">{I.clipboard}</div>
        <div><small>{s.pieces['p2-small']}</small><strong>{s.pieces['p2-strong']}</strong></div>
      </div>
      <div className="white-pill s1-p3">
        <div className="pill-icon">{I.home}</div>
        <div><small>{s.pieces['p3-small']}</small><strong>{s.pieces['p3-strong']}</strong></div>
      </div>
    </section>
  );

const Scene2: React.FC<OverlaySceneProps> = ({ s, overlayDoc, sceneDurationFrames }) =>
  OverlayOr(
    overlayDoc,
    sceneDurationFrames,
    <section className="scene scene-2">
      <SceneBg src={s.image} />
      <div className="soft-layer" />
      <SceneHeader s={s} />
      <div className="glow-focus care-focus" />
      <div className="updates">
        <div className="update">
          <div className="update-icon">{I.heart}</div>
          <div className="update-text"><small>{s.pieces['u1-small']}</small><strong>{s.pieces['u1-strong']}</strong></div>
        </div>
        <div className="update">
          <div className="update-icon">{I.pulseReview}</div>
          <div className="update-text"><small>{s.pieces['u2-small']}</small><strong>{s.pieces['u2-strong']}</strong></div>
        </div>
        <div className="update">
          <div className="update-icon">{I.home}</div>
          <div className="update-text"><small>{s.pieces['u3-small']}</small><strong>{s.pieces['u3-strong']}</strong></div>
        </div>
      </div>
      <div className="blue-pill status-pill"><span>✓</span><span>{s.pieces.tag}</span></div>
    </section>
  );

const Scene3: React.FC<OverlaySceneProps> = ({ s, overlayDoc, sceneDurationFrames }) =>
  OverlayOr(
    overlayDoc,
    sceneDurationFrames,
    <section className="scene scene-3">
      <SceneBg src={s.image} />
      <div className="soft-layer" />
      <SceneHeader s={s} />
      <div className="glow-focus care-glow" />
      <div className="path-svg care-path">
        <svg viewBox="0 0 780 410" fill="none">
          <path d="M700 275 C590 170 465 155 355 220 C260 278 175 250 80 170" stroke="#194EA4" strokeWidth="24" strokeLinecap="round" opacity=".16" />
          <path className="path-main" d="M700 275 C590 170 465 155 355 220 C260 278 175 250 80 170" stroke="#1A9DD7" strokeWidth="7" strokeLinecap="round" />
        </svg>
        <div className="travel-dot" />
      </div>
      <div className="white-pill cuff-callout">
        <div className="pill-icon">{I.cuff}</div>
        <div><small>{s.pieces['c1-small']}</small><strong>{s.pieces['c1-strong']}</strong></div>
      </div>
      <div className="white-pill phone-callout">
        <div className="pill-icon">{I.phone}</div>
        <div><small>{s.pieces['c2-small']}</small><strong>{s.pieces['c2-strong']}</strong></div>
      </div>
      <div className="white-pill bag-callout">
        <div className="pill-icon">{I.bag}</div>
        <div><small>{s.pieces['c3-small']}</small><strong>{s.pieces['c3-strong']}</strong></div>
      </div>
      <div className="blue-pill final-note"><span>✓</span><span>{s.pieces.tag}</span></div>
    </section>
  );

const Scene4: React.FC<OverlaySceneProps> = ({ s, overlayDoc, sceneDurationFrames }) =>
  OverlayOr(
    overlayDoc,
    sceneDurationFrames,
    <section className="scene scene-4">
      <SceneBg src={s.image} />
      <div className="soft-layer" />
      <SceneHeader s={s} />
      <div className="glow-focus suitcase-glow" />
      <div className="prep-board">
        <div className="prep-item">
          <div className="label"><div className="mini-icon">{I.pillBox}</div><span>{s.pieces.i1}</span></div>
          <div className="check">✓</div>
        </div>
        <div className="prep-item">
          <div className="label"><div className="mini-icon">{I.report}</div><span>{s.pieces.i2}</span></div>
          <div className="check">✓</div>
        </div>
        <div className="prep-item">
          <div className="label"><div className="mini-icon">{I.pulse}</div><span>{s.pieces.i3}</span></div>
          <div className="check">✓</div>
        </div>
      </div>
      <div className="progress-card">
        <div className="progress-top"><span>{s.pieces['prog-label']}</span><span>100%</span></div>
        <div className="bar"><span /></div>
      </div>
      <div className="blue-pill travel-tag"><span>{s.pieces.tag}</span></div>
    </section>
  );

const Scene5: React.FC<OverlaySceneProps> = ({ s, overlayDoc, sceneDurationFrames }) =>
  OverlayOr(
    overlayDoc,
    sceneDurationFrames,
    <section className="scene scene-5">
      <SceneBg src={s.image} />
      <div className="soft-layer" />
      <SceneHeader s={s} />
      <div className="glow-focus bag-glow" />
      <svg className="steth-line" viewBox="0 0 690 360" fill="none">
        <path d="M630 260 C520 160 410 170 315 215 C220 260 155 235 70 155" stroke="#1A9DD7" strokeWidth="7" strokeLinecap="round" />
      </svg>
      <div className="white-pill visit-confirm">
        <div className="pill-icon">{I.cuff}</div>
        <div><small>{s.pieces['v1-small']}</small><strong>{s.pieces['v1-strong']}</strong></div>
      </div>
      <div className="white-pill bag-confirm">
        <div className="pill-icon">{I.bagPlus}</div>
        <div><small>{s.pieces['v2-small']}</small><strong>{s.pieces['v2-strong']}</strong></div>
      </div>
      <div className="white-pill family-confirm">
        <div className="pill-icon">{I.family}</div>
        <div><small>{s.pieces['v3-small']}</small><strong>{s.pieces['v3-strong']}</strong></div>
      </div>
      <div className="blue-pill closing"><span>✓</span><span>{s.pieces.tag}</span></div>
    </section>
  );

// ── Crossfade wrapper ──────────────────────────────────────────────
// Each scene mounts at frame N, runs its CSS animations for `lengthFrames`,
// and fades into the next over CROSSFADE_FRAMES.
const SceneSlot: React.FC<{
  from: number;
  lengthFrames: number;
  children: React.ReactNode;
  isFirst?: boolean;
  isLast?: boolean;
}> = ({ from, lengthFrames, children, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  const fadeIn = isFirst
    ? 1
    : interpolate(local, [0, CROSSFADE_FRAMES], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
  const fadeOut = isLast
    ? 1
    : interpolate(
        local,
        [lengthFrames - CROSSFADE_FRAMES, lengthFrames],
        [1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
  const opacity = fadeIn * fadeOut;
  return (
    <Sequence from={from} durationInFrames={lengthFrames + CROSSFADE_FRAMES}>
      <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
    </Sequence>
  );
};

// Map scene-id strings ('1'..'5') to their content + component renderers.
const ALL_HAJJ_SCENES = ['1', '2', '3', '4', '5'] as const;
type HajjSceneId = (typeof ALL_HAJJ_SCENES)[number];
const HAJJ_SCENE_COMPONENTS: Record<HajjSceneId, React.FC<OverlaySceneProps>> = {
  '1': Scene1, '2': Scene2, '3': Scene3, '4': Scene4, '5': Scene5,
};

// ── Root composition ───────────────────────────────────────────────
export const SmartMedHajjReel: React.FC<SmartMedHajjReelProps> = (props) => {
  ensureFontsReady();

  // Decide which scenes render (and in what order/length). When the hub
  // wrote a smartmed-hajj-timeline.json before kicking off the render,
  // `_tlState` is populated via Root.tsx's calculateMetadata. Otherwise
  // we default to all 5 scenes at SCENE_FRAMES each.
  const tl = props._tlState;
  const sceneTexts: Record<HajjSceneId, SceneText> = {
    '1': props.s1, '2': props.s2, '3': props.s3, '4': props.s4, '5': props.s5,
  };
  // Resolve each scene-id in the order list to its template (1..5).
  // Built-in scenes resolve to themselves; duplicates resolve via tl.template.
  const resolveTemplate = (sceneKey: string): HajjSceneId | null => {
    if ((ALL_HAJJ_SCENES as readonly string[]).includes(sceneKey)) return sceneKey as HajjSceneId;
    const tmpl = tl?.template?.[sceneKey];
    if (tmpl && (ALL_HAJJ_SCENES as readonly string[]).includes(tmpl)) return tmpl as HajjSceneId;
    return null;
  };
  // Build the render plan: any scene-id visible (built-in or duplicate)
  type PlanEntry = { sceneKey: string; template: HajjSceneId };
  const planEntries: PlanEntry[] = tl
    ? tl.order
        .filter((n) => tl.visible[n])
        .map((n) => ({ sceneKey: n, template: resolveTemplate(n)! }))
        .filter((p) => p.template !== null)
    : (ALL_HAJJ_SCENES as readonly HajjSceneId[]).map((n) => ({ sceneKey: n, template: n }));
  const lenFor = (sceneKey: string): number => {
    const seconds = tl?.durations?.[sceneKey];
    if (typeof seconds === 'number' && seconds > 0) {
      return Math.max(1, Math.round(seconds * FPS));
    }
    return SCENE_FRAMES;
  };

  // Build start frame per scene from the planEntries (which includes
  // duplicate scene IDs mapped to their template scenes).
  let cursor = 0;
  const plan = planEntries.map((entry, i) => {
    const lengthFrames = lenFor(entry.sceneKey);
    const slot = {
      sceneKey: entry.sceneKey,
      template: entry.template,
      from: cursor,
      lengthFrames,
      isFirst: i === 0,
      isLast: i === planEntries.length - 1,
    };
    cursor += Math.max(1, lengthFrames - CROSSFADE_FRAMES);
    return slot;
  });
  const totalFrames = Math.max(
    SCENE_FRAMES,
    plan.reduce((sum, p) => sum + p.lengthFrames, 0) - Math.max(0, plan.length - 1) * CROSSFADE_FRAMES
  );

  const bgVolume = (frame: number) =>
    interpolate(
      frame,
      [0, 30, totalFrames - 45, totalFrames],
      [0, 0.55, 0.55, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

  return (
    <AbsoluteFill className="smartmed-root">
      <Audio src={staticFile('audio/smartmed-bg.mp3')} volume={bgVolume} />
      {plan.map((slot) => {
        const overlayDoc =
          props.posterOverlays?.[slot.sceneKey] ??
          props.posterOverlays?.[slot.template];
        const Cmp = HAJJ_SCENE_COMPONENTS[slot.template];
        return (
          <SceneSlot
            key={slot.sceneKey}
            from={slot.from}
            lengthFrames={slot.lengthFrames}
            isFirst={slot.isFirst}
            isLast={slot.isLast}
          >
            <Cmp
              s={sceneTexts[slot.template]}
              overlayDoc={overlayDoc}
              sceneDurationFrames={slot.lengthFrames}
            />
          </SceneSlot>
        );
      })}
    </AbsoluteFill>
  );
};
