import React from 'react';
import {
  AbsoluteFill,
  Audio,
  cancelRender,
  continueRender,
  delayRender,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import './smartmed.css';
import { PosterOverlayScene } from './posterOverlay/OverlayRenderer';
import type { ProjectPosterOverlayState } from './posterOverlay/overlaySchema';

// ── Font loading gate ──────────────────────────────────────────────
const ensureFontsReady = (() => {
  let handle: number | null = null;
  return () => {
    if (typeof document === 'undefined') return;
    if (handle !== null) return;
    handle = delayRender('Loading Arabic fonts');
    const sizes = ['400', '500', '700', '800'];
    const probes = sizes.flatMap((w) => [
      (document as Document & { fonts: FontFaceSet }).fonts.load(
        `${w} 64px "Tajawal"`,
        'رعاية منزلية'
      ),
      (document as Document & { fonts: FontFaceSet }).fonts.load(
        `${w} 64px "Cairo"`,
        'رعاية منزلية'
      ),
    ]);
    Promise.allSettled(probes)
      .then(() => (document as Document & { fonts: FontFaceSet }).fonts.ready)
      .then(() => continueRender(handle as number))
      .catch((err) => cancelRender(err));
  };
})();

type PillIcon = 'home-med' | 'refresh' | 'person-check' | 'home-heart';
type ContactIcon = 'whatsapp' | 'phone' | 'globe';

type Pill = { text: string; icon: PillIcon };
type Contact = { icon: ContactIcon; label: string; value: string };

// Optional timeline state injected by Root.tsx calculateMetadata when
// `smartmed-timeline.json` exists at repo root (written by the hub on
// render). Lets the composition filter / reorder / time scenes.
export type TimelineStateProp = {
  order: string[];
  visible: Record<string, boolean>;
  durations: Record<string, number>;
};

export type SmartMedReelProps = {
  scene1Image: string;
  scene2Image: string;
  scene3Image: string;
  scene1HeadlineLine1: string;
  scene1HeadlineLine2: string;
  scene1Subtitle: string;
  scene2Pills: Pill[];
  scene3Headline: string;
  scene3Subtitle: string;
  scene3Contacts: Contact[];
  _tlState?: TimelineStateProp;
  posterOverlays?: ProjectPosterOverlayState;
};

export const defaultSmartMedReelProps: SmartMedReelProps = {
  scene1Image: 'generated/smartmed/scene1.jpg',
  scene2Image: 'generated/smartmed/scene2.jpg',
  scene3Image: 'generated/smartmed/scene3.jpg',
  scene1HeadlineLine1: 'رعاية منزلية',
  scene1HeadlineLine2: 'تطمئن عائلتك',
  scene1Subtitle: 'خدمات طبية وتمريضية في راحة منزلك',
  scene2Pills: [
    { text: 'زيارة منزلية', icon: 'home-med' },
    { text: 'متابعة مستمرة', icon: 'refresh' },
    { text: 'فريق طبي مؤهل', icon: 'person-check' },
    { text: 'راحة وأمان في المنزل', icon: 'home-heart' },
  ],
  scene3Headline: 'احجز الآن',
  scene3Subtitle: 'رعاية منزلية خاصة لراحة أحبائك',
  scene3Contacts: [
    { icon: 'whatsapp', label: 'واتساب', value: '920001974' },
    { icon: 'phone', label: 'خدمة العملاء', value: '0530055499' },
    { icon: 'globe', label: 'الموقع الإلكتروني', value: 'www.smartmed.sa' },
  ],
};

const FPS = 30;
export const SMARTMED_DURATION = 17 * FPS; // 510 frames @ 30fps

// Scene timing
const T = {
  scene1FadeIn: 0,
  scene1FadeOut: 150,
  scene2FadeIn: 150,
  scene2FadeOut: 330,
  scene3FadeIn: 330,
  scene3FadeOut: 510,
  headlineLine1Start: 6,
  headlineLine2Start: 18,
  subtitleStart: 32,
  pillsBaseStart: 168,
  pillStagger: 14,
  scene3HeadlineStart: 348,
  scene3SubtitleStart: 360,
  scene3ContactsBaseStart: 380,
  scene3ContactStagger: 16,
};

const ramp = (frame: number, start: number, length: number) =>
  interpolate(frame, [start, start + length], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const SceneImage: React.FC<{ src: string; opacity: number; zoom: number }> = ({
  src,
  opacity,
  zoom,
}) => (
  <div className="sm-photo" style={{ opacity }}>
    <Img src={staticFile(src)} alt="" style={{ transform: `scale(${zoom})` }} />
  </div>
);

// ── Inline icons (pill + contact) ──────────────────────────────────
const PillIcon: React.FC<{ kind: PillIcon }> = ({ kind }) => {
  switch (kind) {
    case 'home-med':
      return (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 30 L32 12 L54 30 V52 H10 Z" />
          <path d="M32 32 V44 M26 38 H38" />
        </svg>
      );
    case 'refresh':
      return (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 18 A20 20 0 1 0 52 36" />
          <path d="M50 12 V22 H40" />
        </svg>
      );
    case 'person-check':
      return (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="26" cy="22" r="8" />
          <path d="M12 52 c0-9 6-14 14-14 s14 5 14 14" />
          <path d="M43 46 L47 50 L54 42" />
        </svg>
      );
    case 'home-heart':
      return (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 30 L32 12 L54 30 V52 H10 Z" />
          <path d="M32 46 C28 42 22 38 26 33 C28 30 31 31 32 33 C33 31 36 30 38 33 C42 38 36 42 32 46 Z" />
        </svg>
      );
  }
};

const ContactSvg: React.FC<{ kind: ContactIcon }> = ({ kind }) => {
  switch (kind) {
    case 'whatsapp':
      return (
        <svg viewBox="0 0 448 512">
          <path fill="currentColor" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
        </svg>
      );
    case 'phone':
      return (
        <svg viewBox="0 0 512 512">
          <path fill="currentColor" d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z" />
        </svg>
      );
    case 'globe':
      return (
        <svg viewBox="0 0 496 512">
          <path fill="currentColor" d="M336.5 160C322 70.7 287.8 8 248 8s-74 62.7-88.5 152h177zM152 256c0 22.2 1.2 43.5 3.3 64h185.3c2.1-20.5 3.3-41.8 3.3-64s-1.2-43.5-3.3-64H155.3c-2.1 20.5-3.3 41.8-3.3 64zm324.7-96c-28.6-67.9-86.5-120.4-158-141.6 24.4 33.8 41.2 84.7 50 141.6h108zM177.2 18.4C105.8 39.6 47.8 92.1 19.3 160h108c8.7-56.9 25.5-107.8 49.9-141.6zM487.4 192H372.7c2.1 21 3.3 42.5 3.3 64s-1.2 43-3.3 64h114.6c5.5-20.5 8.6-41.8 8.6-64s-3.1-43.5-8.5-64zM120 256c0-21.5 1.2-43 3.3-64H8.6C3.2 212.5 0 233.8 0 256s3.2 43.5 8.6 64h114.6c-2-21-3.2-42.5-3.2-64zm39.5 96c14.5 89.3 48.7 152 88.5 152s74-62.7 88.5-152h-177zm159.3 141.6c71.4-21.2 129.4-73.7 158-141.6h-108c-8.8 56.9-25.6 107.8-50 141.6zM19.3 352c28.6 67.9 86.5 120.4 158 141.6-24.4-33.8-41.2-84.7-50-141.6h-108z" />
        </svg>
      );
  }
};

// ── Scenes ─────────────────────────────────────────────────────────
const Scene1: React.FC<SmartMedReelProps> = (props) => {
  const frame = useCurrentFrame();
  const overlayDoc = props.posterOverlays?.['1'];
  const sceneOpacity = interpolate(
    frame,
    [T.scene1FadeIn, T.scene1FadeIn + 10, T.scene1FadeOut - 12, T.scene1FadeOut],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const l1Op = ramp(frame, T.headlineLine1Start, 18);
  const l1Y  = interpolate(ramp(frame, T.headlineLine1Start, 26), [0, 1], [44, 0]);
  const l2Op = ramp(frame, T.headlineLine2Start, 18);
  const l2Y  = interpolate(ramp(frame, T.headlineLine2Start, 26), [0, 1], [44, 0]);
  const sOp  = ramp(frame, T.subtitleStart, 22);
  const sY   = interpolate(ramp(frame, T.subtitleStart, 28), [0, 1], [30, 0]);
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {overlayDoc ? (
        <PosterOverlayScene
          document={overlayDoc}
          sceneStart={T.scene1FadeIn}
          sceneDurationFrames={T.scene1FadeOut - T.scene1FadeIn}
        />
      ) : (
        <>
          <SceneImage src={props.scene1Image} opacity={1} zoom={1} />
          <div className="sm-headline">
            <div className="sm-headline-line" style={{ opacity: l1Op, transform: `translateY(${l1Y}px)` }}>{props.scene1HeadlineLine1}</div>
            <div className="sm-headline-line" style={{ opacity: l2Op, transform: `translateY(${l2Y}px)` }}>{props.scene1HeadlineLine2}</div>
          </div>
          <div className="sm-subtitle" style={{ opacity: sOp, transform: `translateY(${sY}px)` }}>
            {props.scene1Subtitle}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

const Scene2: React.FC<SmartMedReelProps> = (props) => {
  const frame = useCurrentFrame();
  const overlayDoc = props.posterOverlays?.['2'];
  const sceneOpacity = interpolate(
    frame,
    [T.scene2FadeIn, T.scene2FadeIn + 10, T.scene2FadeOut - 12, T.scene2FadeOut],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {overlayDoc ? (
        <PosterOverlayScene
          document={overlayDoc}
          sceneStart={T.scene2FadeIn}
          sceneDurationFrames={T.scene2FadeOut - T.scene2FadeIn}
        />
      ) : (
        <>
          <SceneImage src={props.scene2Image} opacity={1} zoom={1} />
          <div className="sm-pills">
            {props.scene2Pills.map((pill, i) => {
              const start = T.pillsBaseStart + i * T.pillStagger;
              const op = ramp(frame, start, 16);
              const x  = interpolate(ramp(frame, start, 24), [0, 1], [110, 0]);
              const popLocal = frame - (start + 6);
              const pop = spring({ frame: popLocal, fps: FPS, config: { damping: 11, stiffness: 130 } });
              const scale = 0.4 + pop * 0.6;
              return (
                <div key={i} className="sm-pill" style={{ opacity: op, transform: `translateX(${x}px)` }}>
                  <span className="sm-pill-text">{pill.text}</span>
                  <span className="sm-pill-icon" style={{ transform: `scale(${scale})` }}>
                    <PillIcon kind={pill.icon} />
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

const Scene3: React.FC<SmartMedReelProps> = (props) => {
  const frame = useCurrentFrame();
  const overlayDoc = props.posterOverlays?.['3'];
  const sceneOpacity = interpolate(
    frame,
    [T.scene3FadeIn, T.scene3FadeIn + 10, T.scene3FadeOut - 8, T.scene3FadeOut],
    [0, 1, 1, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const hOp = ramp(frame, T.scene3HeadlineStart, 18);
  const hY  = interpolate(ramp(frame, T.scene3HeadlineStart, 26), [0, 1], [42, 0]);
  const sOp = ramp(frame, T.scene3SubtitleStart, 22);
  const sY  = interpolate(ramp(frame, T.scene3SubtitleStart, 28), [0, 1], [28, 0]);
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity }}>
      {overlayDoc ? (
        <PosterOverlayScene
          document={overlayDoc}
          sceneStart={T.scene3FadeIn}
          sceneDurationFrames={T.scene3FadeOut - T.scene3FadeIn}
        />
      ) : (
        <>
          <SceneImage src={props.scene3Image} opacity={1} zoom={1} />
          <div className="sm-cta-headline" style={{ opacity: hOp, transform: `translateY(${hY}px)` }}>
            {props.scene3Headline}
          </div>
          <div className="sm-cta-subtitle" style={{ opacity: sOp, transform: `translateY(${sY}px)` }}>
            {props.scene3Subtitle}
          </div>
          <div className="sm-contact-list">
            {props.scene3Contacts.map((c, i) => {
              const start = T.scene3ContactsBaseStart + i * T.scene3ContactStagger;
              const op = ramp(frame, start, 18);
              const x  = interpolate(ramp(frame, start, 24), [0, 1], [80, 0]);
              const popLocal = frame - (start + 6);
              const pop = spring({ frame: popLocal, fps: FPS, config: { damping: 11, stiffness: 130 } });
              const scale = 0.4 + pop * 0.6;
              const variant = c.icon === 'globe' ? ' web' : '';
              return (
                <div key={i} className="sm-contact-row" style={{ opacity: op, transform: `translateX(${x}px)` }}>
                  <div className="sm-contact-icon-wrap">
                    <div className="sm-contact-icon" style={{ transform: `scale(${scale})` }}>
                      <ContactSvg kind={c.icon} />
                    </div>
                  </div>
                  <div className="sm-contact-divider" />
                  <div className={`sm-contact-label${variant}`}>{c.label}</div>
                  <div className={`sm-contact-value${variant}`}>{c.value}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

// ── Root composition ───────────────────────────────────────────────
export const SmartMedReel: React.FC<SmartMedReelProps> = (props) => {
  ensureFontsReady();
  const bgVolume = (frame: number) =>
    interpolate(
      frame,
      [0, 30, SMARTMED_DURATION - 45, SMARTMED_DURATION],
      [0, 0.55, 0.55, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  // When hub passes _tlState, honor `visible`. Reorder + durations need
  // a Sequence-based refactor (scenes share a global timeline with
  // hardcoded fade-in/out marks), so we only respect hidden flags here.
  const tl = props._tlState;
  const isVisible = (n: string) => !tl || tl.visible[n] !== false;
  return (
    <AbsoluteFill className="sm-video">
      <Audio src={staticFile('audio/smartmed-bg.mp3')} volume={bgVolume} />
      {isVisible('1') && <Scene1 {...props} />}
      {isVisible('2') && <Scene2 {...props} />}
      {isVisible('3') && <Scene3 {...props} />}
    </AbsoluteFill>
  );
};
