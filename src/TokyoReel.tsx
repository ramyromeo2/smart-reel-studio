import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Spot = {
  num: string;
  name: string;
  vibe: string;
  image?: string;
};

export type TokyoReelProps = {
  location: string;
  hours: string;
  hookLine: string;
  manifesto: string[];
  spots: Spot[];
  quote: string;
  quoteAttribution: string;
  cta: string;
  handle: string;
  images: {
    hero?: string;
    quote?: string;
    end?: string;
  };
};

export const defaultTokyoReelProps: TokyoReelProps = {
  location: 'TOKYO · JAPAN',
  hours: '48',
  hookLine: 'WHAT I DID IN',
  manifesto: ['we got lost.', 'we got found.', 'we never slept.'],
  spots: [
    { num: '01', name: 'SHIBUYA CROSSING', vibe: 'where the neon never dies' },
    { num: '02', name: 'GOLDEN GAI', vibe: 'six-seat bars, infinite stories' },
    { num: '03', name: 'AKIHABARA', vibe: 'a city built from arcade light' },
    { num: '04', name: 'TSUKIJI MARKET', vibe: 'breakfast at 5am, no regrets' },
    { num: '05', name: 'SHIBUYA SKY', vibe: 'the moment the city exhales' },
  ],
  quote: '"there is no city like it after dark."',
  quoteAttribution: '— traveler\'s note',
  cta: 'FOLLOW FOR MORE',
  handle: '@yourhandle',
  images: {},
};

// ── Timing (30fps) — ~40 seconds total ────────────────────────────────
const T = {
  open: { start: 0, end: 100 },
  hours: { start: 95, end: 220 },
  manifesto: { start: 215, end: 360 },
  spots: { start: 355, end: 840 },
  quote: { start: 835, end: 960 },
  pin: { start: 955, end: 1060 },
  end: { start: 1055, end: 1200 },
};
export const TOKYO_DURATION = 1200;

// ── Easing helpers ────────────────────────────────────────────────────
const eOut = Easing.out(Easing.cubic);
const eIO = Easing.bezier(0.22, 1, 0.36, 1);

const ramp = (frame: number, start: number, dur: number, easing = eOut) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

const sceneOpacity = (
  frame: number,
  start: number,
  end: number,
  inDur = 14,
  outDur = 14
) =>
  ramp(frame, start, inDur)
  * (1 - ramp(frame, end - outDur, outDur));

const useSpring = (start: number, cfg = { damping: 12, stiffness: 90 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: cfg });
};

// ── Background layers ─────────────────────────────────────────────────
const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <div
    className="tk-vignette"
    style={{
      background:
        `radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);

const Grain: React.FC = () => <div className="tk-grain" />;

const Particles: React.FC<{ count?: number; color?: string }> = ({
  count = 28,
  color = '#FF2D87',
}) => {
  const frame = useCurrentFrame();
  const dots = [];
  for (let i = 0; i < count; i++) {
    const seedX = random(`px-${i}`);
    const seedY = random(`py-${i}`);
    const seedS = random(`ps-${i}`);
    const phase = random(`pp-${i}`) * Math.PI * 2;
    const speed = 0.4 + random(`pv-${i}`) * 0.6;
    const driftX = Math.sin(frame / 40 + phase) * 24;
    const driftY = Math.cos(frame / 50 + phase) * 30;
    const baseY = (seedY * 1920 - (frame * speed) % 2000 + 2000) % 1920;
    const size = 3 + seedS * 5;
    dots.push(
      <span
        key={i}
        className="tk-dot"
        style={{
          left: seedX * 1080 + driftX,
          top: baseY + driftY,
          width: size,
          height: size,
          background: color,
          opacity: 0.5 + seedS * 0.4,
        }}
      />
    );
  }
  return <div className="tk-particles">{dots}</div>;
};

const PhotoBg: React.FC<{
  src?: string;
  scale?: number;
  panX?: number;
  panY?: number;
  blur?: number;
  overlay?: string;
}> = ({ src, scale = 1.1, panX = 0, panY = 0, blur = 0, overlay }) => (
  <div className="tk-photo-bg">
    {src ? (
      <Img
        src={staticFile(src)}
        style={{
          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`,
          filter: blur ? `blur(${blur}px)` : undefined,
        }}
      />
    ) : (
      <div className="tk-photo-fallback" />
    )}
    {overlay && <div className="tk-photo-overlay" style={{ background: overlay }} />}
  </div>
);

// ── Animation primitives ──────────────────────────────────────────────
const Typewriter: React.FC<{
  text: string;
  start: number;
  cps?: number;
  className?: string;
}> = ({ text, start, cps = 22, className }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - start);
  const count = Math.min(text.length, Math.floor((elapsed / 30) * cps));
  const shown = text.slice(0, count);
  const showCaret = (Math.floor(frame / 8) % 2 === 0) && count < text.length + 6;
  return (
    <span className={className}>
      {shown}
      {showCaret && <span className="tk-caret">▍</span>}
    </span>
  );
};

const LetterSpread: React.FC<{
  text: string;
  start: number;
  className?: string;
}> = ({ text, start, className }) => {
  const frame = useCurrentFrame();
  const p = ramp(frame, start, 36, eIO);
  const o = ramp(frame, start, 22);
  return (
    <span
      className={className}
      style={{
        opacity: o,
        letterSpacing: `${interpolate(p, [0, 1], [-2, 18])}px`,
        display: 'inline-block',
      }}
    >
      {text}
    </span>
  );
};

const GlitchText: React.FC<{
  text: string;
  start: number;
  className?: string;
  color1?: string;
  color2?: string;
}> = ({ text, start, className, color1 = '#FF2D87', color2 = '#00F0FF' }) => {
  const frame = useCurrentFrame();
  const intro = ramp(frame, start, 20);
  // glitch jitter only during the first 30 frames after start
  const t = frame - start;
  const jitter = t < 26 ? (random(`g-${Math.floor(t / 2)}`) - 0.5) * 22 : 0;
  const offset = t < 30 ? interpolate(t, [0, 30], [12, 0], { extrapolateRight: 'clamp' }) : 0;
  return (
    <span className={className} style={{ position: 'relative', display: 'inline-block', opacity: intro }}>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          color: color1,
          transform: `translate(${-offset + jitter}px, 0)`,
          mixBlendMode: 'screen',
          opacity: 0.85,
        }}
      >
        {text}
      </span>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          color: color2,
          transform: `translate(${offset - jitter}px, 0)`,
          mixBlendMode: 'screen',
          opacity: 0.85,
        }}
      >
        {text}
      </span>
      <span style={{ position: 'relative', color: 'white' }}>{text}</span>
    </span>
  );
};

const Counter: React.FC<{
  target: number;
  start: number;
  duration?: number;
  className?: string;
}> = ({ target, start, duration = 30, className }) => {
  const frame = useCurrentFrame();
  const p = ramp(frame, start, duration, eIO);
  const value = Math.round(p * target);
  return <span className={className}>{value}</span>;
};

// ── 1. Cold Open ──────────────────────────────────────────────────────
const ColdOpen: React.FC<TokyoReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, T.open.start, T.open.end);
  const local = frame - T.open.start;
  const zoom = interpolate(local, [0, T.open.end - T.open.start], [1.05, 1.2], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <PhotoBg
        src={props.images.hero}
        scale={zoom}
        panX={-12}
        overlay="linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)"
      />
      <Grain />
      <Particles count={20} color="#00F0FF" />

      <div className="tk-stamp" style={{ opacity: ramp(frame, 8, 18) }}>
        <span className="tk-stamp-dot" />
        <Typewriter text={props.location} start={12} cps={26} />
      </div>

      <div className="tk-hook">
        <LetterSpread text={props.hookLine} start={36} />
      </div>

      <div
        className="tk-scroll-hint"
        style={{
          opacity: ramp(frame, 70, 18),
          transform: `translateY(${Math.sin(frame / 8) * 6}px)`,
        }}
      >
        ↓
      </div>
    </AbsoluteFill>
  );
};

// ── 2. Hours / Glitch Number ──────────────────────────────────────────
const HoursScene: React.FC<TokyoReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, T.hours.start, T.hours.end);
  const pop = useSpring(T.hours.start + 6, { damping: 10, stiffness: 100 });

  return (
    <AbsoluteFill style={{ opacity, background: '#070912' }}>
      <Particles count={30} color="#FF2D87" />
      <Particles count={18} color="#00F0FF" />

      <div className="tk-hours-wrap">
        <div
          className="tk-hours-big"
          style={{
            transform: `scale(${0.7 + pop * 0.3})`,
          }}
        >
          <Counter
            target={parseInt(props.hours, 10) || 48}
            start={T.hours.start + 4}
            duration={30}
          />
        </div>
        <div
          className="tk-hours-label"
          style={{
            opacity: ramp(frame, T.hours.start + 32, 14),
            transform: `translateY(${interpolate(
              ramp(frame, T.hours.start + 32, 22),
              [0, 1],
              [40, 0]
            )}px)`,
          }}
        >
          <GlitchText text="HOURS" start={T.hours.start + 32} />
        </div>
        <div
          className="tk-hours-sub"
          style={{
            opacity: ramp(frame, T.hours.start + 58, 16),
          }}
        >
          <LetterSpread text={props.location} start={T.hours.start + 58} />
        </div>
      </div>

      <Vignette strength={0.7} />
    </AbsoluteFill>
  );
};

// ── 3. Manifesto ──────────────────────────────────────────────────────
const ManifestoScene: React.FC<TokyoReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, T.manifesto.start, T.manifesto.end);
  const lines = props.manifesto;

  return (
    <AbsoluteFill style={{ opacity, background: '#04060d' }}>
      <Particles count={14} color="#FF2D87" />
      <div className="tk-manifesto-wrap">
        {lines.map((line, i) => {
          const lineStart = T.manifesto.start + 16 + i * 32;
          const o = ramp(frame, lineStart, 18);
          const y = interpolate(
            ramp(frame, lineStart, 26, eIO),
            [0, 1],
            [50, 0]
          );
          const accent = i === lines.length - 1;
          return (
            <div
              key={i}
              className="tk-manifesto-line"
              style={{
                opacity: o,
                transform: `translateY(${y}px)`,
                color: accent ? '#FF2D87' : '#ffffff',
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
      <Vignette strength={0.6} />
    </AbsoluteFill>
  );
};

// ── 4. Spots ──────────────────────────────────────────────────────────
const SpotsScene: React.FC<TokyoReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, T.spots.start, T.spots.end);
  const spots = props.spots.slice(0, 5);
  const each = Math.floor((T.spots.end - T.spots.start) / spots.length);

  return (
    <AbsoluteFill style={{ opacity, background: '#000' }}>
      {spots.map((spot, i) => {
        const s = T.spots.start + i * each;
        const e = s + each;
        if (frame < s - 4 || frame > e + 4) return null;
        const localOpacity = sceneOpacity(frame, s, e, 12, 12);
        const local = frame - s;
        const zoom = interpolate(local, [0, each], [1.08, 1.22], {
          extrapolateRight: 'clamp',
        });
        const panX = interpolate(local, [0, each], [-25, 25], {
          extrapolateRight: 'clamp',
        });
        // wipe reveal mask: a clip-path that opens from the bottom
        const wipe = ramp(frame, s, 18, eIO);
        const clip = `inset(${(1 - wipe) * 100}% 0% 0% 0%)`;

        return (
          <div key={i} style={{ position: 'absolute', inset: 0, opacity: localOpacity }}>
            <div style={{ position: 'absolute', inset: 0, clipPath: clip }}>
              <PhotoBg
                src={spot.image}
                scale={zoom}
                panX={panX}
                overlay="linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.85) 100%)"
              />
            </div>
            <Grain />

            <div className="tk-spot-num" style={{ opacity: ramp(frame, s + 6, 14) }}>
              <GlitchText text={spot.num} start={s + 6} />
            </div>

            <div className="tk-spot-info">
              <div
                className="tk-spot-name"
                style={{
                  opacity: ramp(frame, s + 16, 16),
                  transform: `translateY(${interpolate(
                    ramp(frame, s + 16, 22, eIO),
                    [0, 1],
                    [40, 0]
                  )}px)`,
                }}
              >
                {spot.name}
              </div>
              <div
                className="tk-spot-vibe"
                style={{
                  opacity: ramp(frame, s + 30, 18),
                  transform: `translateY(${interpolate(
                    ramp(frame, s + 30, 24, eIO),
                    [0, 1],
                    [28, 0]
                  )}px)`,
                }}
              >
                {spot.vibe}
              </div>
              <div
                className="tk-spot-bar"
                style={{
                  transform: `scaleX(${ramp(frame, s + 22, each - 28, Easing.linear)})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ── 5. Quote ──────────────────────────────────────────────────────────
const QuoteScene: React.FC<TokyoReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, T.quote.start, T.quote.end);
  const local = frame - T.quote.start;
  const zoom = interpolate(local, [0, T.quote.end - T.quote.start], [1.1, 1.18], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <PhotoBg
        src={props.images.quote}
        scale={zoom}
        blur={3}
        overlay="linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.75) 100%)"
      />
      <Vignette strength={0.75} />
      <div className="tk-quote-wrap">
        <div
          className="tk-quote"
          style={{
            opacity: ramp(frame, T.quote.start + 8, 24),
            transform: `translateY(${interpolate(
              ramp(frame, T.quote.start + 8, 28, eIO),
              [0, 1],
              [30, 0]
            )}px)`,
          }}
        >
          {props.quote}
        </div>
        <div
          className="tk-quote-attr"
          style={{ opacity: ramp(frame, T.quote.start + 40, 22) }}
        >
          {props.quoteAttribution}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── 6. Pin / Map ──────────────────────────────────────────────────────
const PinScene: React.FC<TokyoReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, T.pin.start, T.pin.end);
  const local = frame - T.pin.start;
  const drop = spring({
    frame: local - 6,
    fps: 30,
    config: { damping: 9, stiffness: 110 },
  });
  const dropY = interpolate(drop, [0, 1], [-380, 0]);

  // pulsing rings: 3 staggered rings
  const ringT = local - 36;
  const rings = [0, 1, 2].map((i) => {
    const phase = ringT - i * 14;
    const scale = interpolate(phase, [0, 40], [0.6, 2.6], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const o = interpolate(phase, [0, 8, 40], [0, 0.7, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { scale, o, i };
  });

  return (
    <AbsoluteFill style={{ opacity, background: '#04060d' }}>
      <Particles count={16} color="#00F0FF" />

      <div className="tk-pin-stage">
        {rings.map(({ scale, o, i }) => (
          <div
            key={i}
            className="tk-pulse-ring"
            style={{ transform: `translate(-50%, -50%) scale(${scale})`, opacity: o }}
          />
        ))}

        <div
          className="tk-pin"
          style={{
            transform: `translate(-50%, calc(-100% + ${dropY}px))`,
          }}
        >
          <div className="tk-pin-body" />
          <div className="tk-pin-stem" />
        </div>
      </div>

      <div
        className="tk-pin-label"
        style={{ opacity: ramp(frame, T.pin.start + 44, 18) }}
      >
        <LetterSpread text="FIND IT" start={T.pin.start + 44} />
      </div>
      <Vignette strength={0.55} />
    </AbsoluteFill>
  );
};

// ── 7. End Card ───────────────────────────────────────────────────────
const EndCard: React.FC<TokyoReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = ramp(frame, T.end.start, 18);
  const local = frame - T.end.start;
  const zoom = interpolate(local, [0, T.end.end - T.end.start], [1.04, 1.12], {
    extrapolateRight: 'clamp',
  });
  const cardPop = useSpring(T.end.start + 14, { damping: 13, stiffness: 95 });

  return (
    <AbsoluteFill style={{ opacity }}>
      <PhotoBg
        src={props.images.end}
        scale={zoom}
        overlay="linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.75) 100%)"
      />
      <Vignette strength={0.6} />
      <div
        className="tk-end-card"
        style={{
          transform: `translate(-50%, -50%) scale(${0.9 + cardPop * 0.1})`,
        }}
      >
        <div className="tk-end-bar tk-end-bar-pink" />
        <div className="tk-end-bar tk-end-bar-cyan" />
        <div className="tk-end-cta">{props.cta}</div>
        <div className="tk-end-handle">{props.handle}</div>
      </div>
      <Particles count={24} color="#FF2D87" />
    </AbsoluteFill>
  );
};

// ── Root composition ──────────────────────────────────────────────────
export const TokyoReel: React.FC<TokyoReelProps> = (props) => (
  <AbsoluteFill className="tk-video">
    <Sequence from={0}>
      <ColdOpen {...props} />
    </Sequence>
    <Sequence from={0}>
      <HoursScene {...props} />
    </Sequence>
    <Sequence from={0}>
      <ManifestoScene {...props} />
    </Sequence>
    <Sequence from={0}>
      <SpotsScene {...props} />
    </Sequence>
    <Sequence from={0}>
      <QuoteScene {...props} />
    </Sequence>
    <Sequence from={0}>
      <PinScene {...props} />
    </Sequence>
    <Sequence from={0}>
      <EndCard {...props} />
    </Sequence>
  </AbsoluteFill>
);
