import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type RightCareReelProps = {
  brand: string;
  brandArabic: string;
  cert: string;
  headline: string;
  subtitle: string;
  family: string;
};

export const defaultRightCareReelProps: RightCareReelProps = {
  brand: 'RIGHT CARE',
  brandArabic: 'رايت كير',
  cert: 'CBAHI',
  headline: 'دعم الأسرة ..',
  subtitle: 'جزء أساسي من رحلة التعافي',
  family: 'generated/rightcare/family.jpg',
};

// 5 seconds @ 30fps for v1 (first two scenes only)
export const RIGHTCARE_DURATION = 150;

// ── Timing (frame numbers within the 150-frame v1) ───────────────────
const T = {
  circleStart: 50,
  headlineStart: 60,
  pillStart: 92,
  subtitleStart: 108,
};

// ── Helpers ──────────────────────────────────────────────────────────
const eOut = Easing.out(Easing.cubic);
const eIO = Easing.bezier(0.22, 1, 0.36, 1);

const ramp = (frame: number, start: number, dur: number, easing = eOut) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

const useSpring = (start: number, cfg = { damping: 14, stiffness: 70 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: cfg });
};

// ── Photo backdrop with Ken Burns zoom + brand-blue tint ─────────────
const FamilyBackdrop: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  // Subtle Ken Burns: 1.04 -> 1.12 across the 5-sec scene
  const zoom = interpolate(frame, [0, RIGHTCARE_DURATION], [1.04, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div className="rc-photo-bg">
      <Img
        src={staticFile(src)}
        style={{ transform: `scale(${zoom})` }}
      />
      <div className="rc-photo-tint" />
    </div>
  );
};

// ── Persistent header (corner logo + cert pill) ──────────────────────
const Header: React.FC<{
  brand: string;
  brandArabic: string;
  cert: string;
}> = ({ brand, brandArabic, cert }) => {
  // Subtle fade-in over the first ~12 frames
  const frame = useCurrentFrame();
  const opacity = ramp(frame, 0, 14);
  return (
    <>
      <div className="rc-header-left" style={{ opacity }}>
        <div className="rc-logo-ar">{brandArabic}</div>
        <div className="rc-logo-en">
          {brand.split(' ').map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      </div>
      <div className="rc-header-right" style={{ opacity }}>
        <div className="rc-cert-pill">{cert}</div>
      </div>
    </>
  );
};

// ── Soft glowing circle behind the headline ──────────────────────────
const CircleReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const pop = useSpring(T.circleStart, { damping: 16, stiffness: 50 });
  const scale = interpolate(pop, [0, 1], [0.25, 1]);
  const opacity = ramp(frame, T.circleStart, 24);
  return (
    <div
      className="rc-circle"
      style={{
        opacity,
        transform: `scale(${scale})`,
      }}
    />
  );
};

// ── Headline (Arabic, drops in from below with word-by-word feel) ────
const Headline: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div className="rc-headline">
      {words.map((w, i) => {
        const start = T.headlineStart + i * 6;
        const o = ramp(frame, start, 18);
        const y = interpolate(ramp(frame, start, 26, eIO), [0, 1], [50, 0]);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: o,
              transform: `translateY(${y}px)`,
              marginLeft: i < words.length - 1 ? '0.25em' : 0,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ── Cyan subtitle pill (wipes in left→right, then text fades in) ─────
const SubtitlePill: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  // Pill wipe — clip-path inset from the right side (looks like the pill
  // "grows" outward as the reveal sweeps across)
  const wipe = ramp(frame, T.pillStart, 26, eIO);
  const clip = `inset(0 ${(1 - wipe) * 100}% 0 0)`;

  // Subtitle text fades in slightly after the pill is mostly revealed
  const textOpacity = ramp(frame, T.subtitleStart, 16);
  const textY = interpolate(
    ramp(frame, T.subtitleStart, 22, eIO),
    [0, 1],
    [14, 0]
  );

  return (
    <div className="rc-pill-wrap" style={{ clipPath: clip }}>
      <div className="rc-pill">
        <span
          className="rc-pill-text"
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

// ── Root composition ─────────────────────────────────────────────────
export const RightCareReel: React.FC<RightCareReelProps> = (props) => {
  return (
    <AbsoluteFill className="rc-video">
      <FamilyBackdrop src={props.family} />
      <CircleReveal />
      <Headline text={props.headline} />
      <SubtitlePill text={props.subtitle} />
      <Header
        brand={props.brand}
        brandArabic={props.brandArabic}
        cert={props.cert}
      />
    </AbsoluteFill>
  );
};
