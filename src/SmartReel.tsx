import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Card = {
  icon: string;
  text: string;
  image?: string;
};

type Step = {
  text: string;
  image?: string;
};

export type SmartReelProps = {
  brand: string;
  logoText: string;
  colors: {
    main: string;
    dark: string;
    accent: string;
  };
  hookTag: string;
  hookTitle: string;
  bigNumber: string;
  bigTitle: string;
  cards: Card[];
  stepsTitle: string;
  steps: Step[];
  ctaSmall: string;
  ctaMain: string;
  finalTitle: string;
  phone: string;
  website: string;
  images: {
    intro?: string;
    number?: string;
    final?: string;
  };
};

export const defaultSmartReelProps: SmartReelProps = {
  brand: 'SmartLab',
  logoText: 'SmartLab',
  colors: {
    main: '#339EDA',
    dark: '#061E3D',
    accent: '#3FD6FF',
  },
  hookTag: '#مختبرك_في_بيتك',
  hookTitle: '5 أسباب تخليك تطلب التحليل المنزلي',
  bigNumber: '5',
  bigTitle: 'أسباب لاختيار الفحص المنزلي',
  cards: [
    { icon: '⏱️', text: 'توفير الوقت' },
    { icon: '🏠', text: 'راحة في المنزل' },
    { icon: '👴', text: 'مناسب لكبار السن' },
    { icon: '🧪', text: 'عينات بدقة' },
    { icon: '📲', text: 'حجز سريع' },
  ],
  stepsTitle: 'بكل بساطة',
  steps: [
    { text: 'اطلب التحليل من التطبيق' },
    { text: 'نوصل لك في وقتك' },
    { text: 'نوصل النتيجة الكترونيا' },
  ],
  ctaSmall: 'لا تنتظر الزحمة',
  ctaMain: 'احجز فحصك المنزلي الآن',
  finalTitle: 'احجز تحاليلك الآن',
  phone: '9200 22520',
  website: 'smartlab.sa',
  images: {},
};

// ── Scene timing (30fps) ──────────────────────────────────────────────
const HOOK_START = 0;
const HOOK_END = 150;
const NUMBER_START = 140;
const NUMBER_END = 300;
const CARDS_START = 290;
const CARDS_END = 670;
const STEPS_START = 660;
const STEPS_END = 880;
const FINAL_START = 870;
const FINAL_END = 1050;

// ── Easing helpers ────────────────────────────────────────────────────
const ease = Easing.out(Easing.cubic);

const fadeIn = (frame: number, start: number, duration = 18) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

const fadeOut = (frame: number, start: number, duration = 16) =>
  interpolate(frame, [start, start + duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

const sceneOpacity = (
  frame: number,
  start: number,
  end: number,
  inDur = 18,
  outDur = 16
) => fadeIn(frame, start, inDur) * fadeOut(frame, end - outDur, outDur);

const rise = (frame: number, start: number, amount = 60, dur = 24) =>
  interpolate(frame, [start, start + dur], [amount, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

const useSpring = (start: number, config = { damping: 12, stiffness: 90 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config });
};

// ── Shared visual layers ──────────────────────────────────────────────
type Colors = SmartReelProps['colors'];

const BgLayers: React.FC = () => (
  <>
    <div className="bg-orb orb-1" />
    <div className="bg-orb orb-2" />
    <div className="noise" />
  </>
);

const Header: React.FC<{ logoText: string; colors: Colors }> = ({
  logoText,
  colors,
}) => (
  <div className="header">
    <div className="logo-pill">
      <div className="logo-mark" style={{ background: colors.main }} />
      <div className="logo-text">{logoText}</div>
    </div>
    <div className="trust-pill">رعاية منزلية</div>
  </div>
);

const PhotoBackdrop: React.FC<{
  src?: string;
  zoom?: number;
  pan?: number;
  opacity?: number;
  blur?: number;
  overlay?: 'dark' | 'brand' | 'none';
  colors: Colors;
}> = ({ src, zoom = 0, pan = 0, opacity = 1, blur = 0, overlay = 'dark', colors }) => {
  if (!src) return null;
  const scale = 1.05 + zoom;
  return (
    <div className="photo-backdrop" style={{ opacity }}>
      <Img
        src={staticFile(src)}
        style={{
          transform: `translate3d(${pan}px, 0, 0) scale(${scale})`,
          filter: blur ? `blur(${blur}px)` : undefined,
        }}
      />
      {overlay === 'dark' && (
        <div
          className="photo-overlay"
          style={{
            background: `linear-gradient(180deg, rgba(3,12,28,0.35) 0%, rgba(3,12,28,0.55) 45%, ${colors.dark} 100%)`,
          }}
        />
      )}
      {overlay === 'brand' && (
        <div
          className="photo-overlay"
          style={{
            background:
              `linear-gradient(180deg, ${colors.dark}cc 0%, ${colors.main}66 50%, ${colors.dark} 100%)`,
          }}
        />
      )}
    </div>
  );
};

const WordReveal: React.FC<{
  text: string;
  start: number;
  perWord?: number;
  className?: string;
}> = ({ text, start, perWord = 4, className }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={className}>
      {words.map((w, i) => {
        const wStart = start + i * perWord;
        const o = fadeIn(frame, wStart, 12);
        const y = rise(frame, wStart, 22, 18);
        return (
          <span
            key={i}
            className="word"
            style={{
              opacity: o,
              transform: `translateY(${y}px)`,
            }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </span>
  );
};

// ── HookScene ─────────────────────────────────────────────────────────
const HookScene: React.FC<SmartReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, HOOK_START, HOOK_END);
  const local = frame - HOOK_START;

  // Ken Burns: zoom from 1.0 -> 1.18 over the scene
  const zoom = interpolate(local, [0, HOOK_END - HOOK_START], [0, 0.13], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pan = interpolate(local, [0, HOOK_END - HOOK_START], [-20, 20], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <PhotoBackdrop
        src={props.images.intro}
        zoom={zoom}
        pan={pan}
        overlay="dark"
        colors={props.colors}
      />
      <Header logoText={props.logoText} colors={props.colors} />

      <div
        className="hook-tag"
        style={{
          opacity: fadeIn(frame, 12),
          transform: `translateY(${rise(frame, 12, 32)}px)`,
        }}
      >
        {props.hookTag}
      </div>

      <div
        className="hook-title-box"
        style={{
          opacity: fadeIn(frame, 24),
          transform: `translateY(${rise(frame, 24, 48)}px)`,
          borderColor: props.colors.accent,
        }}
      >
        <h1>
          <WordReveal text={props.hookTitle} start={36} perWord={5} />
        </h1>
      </div>

      <div
        className="hook-arrow"
        style={{
          opacity: fadeIn(frame, 90),
          transform: `translateY(${rise(frame, 90, 18, 18) + Math.sin(local / 9) * 8}px)`,
          color: props.colors.accent,
        }}
      >
        ▾
      </div>
    </AbsoluteFill>
  );
};

// ── NumberScene ───────────────────────────────────────────────────────
const NumberScene: React.FC<SmartReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, NUMBER_START, NUMBER_END);
  const popScale = useSpring(NUMBER_START + 10, { damping: 9, stiffness: 100 });
  const local = frame - NUMBER_START;
  const zoom = interpolate(local, [0, NUMBER_END - NUMBER_START], [0.04, 0.18], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <PhotoBackdrop
        src={props.images.number}
        zoom={zoom}
        blur={6}
        overlay="brand"
        colors={props.colors}
      />
      <Header logoText={props.logoText} colors={props.colors} />

      <div className="number-wrap">
        <div
          className="big-number"
          style={{
            transform: `scale(${0.55 + popScale * 0.45})`,
            color: '#ffffff',
            textShadow: `0 0 60px ${props.colors.accent}, 0 18px 80px rgba(0,0,0,0.55)`,
          }}
        >
          {props.bigNumber}
        </div>
        <div
          className="big-title"
          style={{
            opacity: fadeIn(frame, NUMBER_START + 40),
            transform: `translateY(${rise(frame, NUMBER_START + 40, 44)}px)`,
          }}
        >
          <WordReveal text={props.bigTitle} start={NUMBER_START + 46} perWord={5} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── CardsScene ────────────────────────────────────────────────────────
const CardsScene: React.FC<SmartReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, CARDS_START, CARDS_END);
  const cards = props.cards.slice(0, 5);

  return (
    <AbsoluteFill style={{ opacity }}>
      <BgLayers />
      <Header logoText={props.logoText} colors={props.colors} />
      <div
        className="cards-title"
        style={{
          opacity: fadeIn(frame, CARDS_START + 8),
          transform: `translateY(${rise(frame, CARDS_START + 8, 36)}px)`,
        }}
      >
        الأسباب الرئيسية
      </div>
      <div className="cards-grid">
        {cards.map((card, i) => {
          const start = CARDS_START + 30 + i * 28;
          const o = fadeIn(frame, start, 14);
          const y = rise(frame, start, 50, 22);
          const local = frame - start;
          const pop = spring({
            frame: local,
            fps: 30,
            config: { damping: 11, stiffness: 110 },
          });
          const scale = 0.86 + pop * 0.14;
          return (
            <div
              className={`card card-${i}`}
              key={`${card.text}-${i}`}
              style={{
                opacity: o,
                transform: `translateY(${y}px) scale(${scale})`,
                borderColor: props.colors.main,
              }}
            >
              {card.image ? (
                <div className="card-photo">
                  <Img src={staticFile(card.image)} />
                  <div
                    className="card-photo-ring"
                    style={{ borderColor: props.colors.accent }}
                  />
                </div>
              ) : (
                <div className="card-icon">{card.icon}</div>
              )}
              <div className="card-text">{card.text}</div>
            </div>
          );
        })}
      </div>

      <div
        className="cta-block"
        style={{
          opacity: fadeIn(frame, CARDS_START + 240, 20),
          transform: `translateY(${rise(frame, CARDS_START + 240, 38)}px)`,
        }}
      >
        <div className="cta-small">{props.ctaSmall}</div>
        <div className="cta-main" style={{ background: props.colors.main }}>
          {props.ctaMain}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── StepsScene (new) ──────────────────────────────────────────────────
const StepsScene: React.FC<SmartReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, STEPS_START, STEPS_END);
  const steps = props.steps.slice(0, 3);

  return (
    <AbsoluteFill style={{ opacity }}>
      <BgLayers />
      <Header logoText={props.logoText} colors={props.colors} />

      <div
        className="steps-title"
        style={{
          opacity: fadeIn(frame, STEPS_START + 6),
          transform: `translateY(${rise(frame, STEPS_START + 6, 32)}px)`,
          color: props.colors.accent,
        }}
      >
        {props.stepsTitle || 'خطوات بسيطة'}
      </div>

      <div className="steps-list">
        {steps.map((step, i) => {
          const start = STEPS_START + 36 + i * 44;
          const o = fadeIn(frame, start, 16);
          const x = interpolate(frame, [start, start + 22], [80, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: ease,
          });
          const local = frame - start;
          const pop = spring({
            frame: local,
            fps: 30,
            config: { damping: 12, stiffness: 100 },
          });
          return (
            <div
              key={i}
              className="step-row"
              style={{
                opacity: o,
                transform: `translateX(${x}px)`,
              }}
            >
              <div
                className="step-photo"
                style={{
                  transform: `scale(${0.85 + pop * 0.15})`,
                  borderColor: props.colors.main,
                }}
              >
                {step.image ? (
                  <Img src={staticFile(step.image)} />
                ) : (
                  <div
                    className="step-photo-fallback"
                    style={{ background: props.colors.main }}
                  />
                )}
                <div
                  className="step-num"
                  style={{ background: props.colors.accent, color: props.colors.dark }}
                >
                  {i + 1}
                </div>
              </div>
              <div className="step-text">{step.text}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── FinalScene ────────────────────────────────────────────────────────
const FinalScene: React.FC<SmartReelProps> = (props) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, FINAL_START, 22);
  const local = frame - FINAL_START;
  const zoom = interpolate(local, [0, FINAL_END - FINAL_START], [0, 0.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cardPop = useSpring(FINAL_START + 12, { damping: 12, stiffness: 95 });

  return (
    <AbsoluteFill style={{ opacity }}>
      <PhotoBackdrop
        src={props.images.final}
        zoom={zoom}
        overlay="dark"
        colors={props.colors}
      />
      <div
        className="final-card final-card-photo"
        style={{
          transform:
            `translateY(${rise(frame, FINAL_START + 12, 80)}px) scale(${0.92 + cardPop * 0.08})`,
          borderColor: props.colors.main,
        }}
      >
        <div className="final-logo" style={{ color: props.colors.main }}>
          {props.logoText}
        </div>
        <div className="final-title">{props.finalTitle}</div>
        <div className="final-phone">{props.phone}</div>
        <div className="final-website">{props.website}</div>
        <div
          className="final-cta"
          style={{
            background: props.colors.main,
            opacity: fadeIn(frame, FINAL_START + 42),
            transform: `translateY(${rise(frame, FINAL_START + 42, 24)}px)`,
          }}
        >
          {props.ctaMain}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Root composition ──────────────────────────────────────────────────
export const SmartReel: React.FC<SmartReelProps> = (props) => {
  return (
    <AbsoluteFill
      className="video"
      style={
        {
          '--main': props.colors.main,
          '--dark': props.colors.dark,
          '--accent': props.colors.accent,
        } as React.CSSProperties
      }
    >
      <Sequence from={0}>
        <HookScene {...props} />
      </Sequence>
      <Sequence from={0}>
        <NumberScene {...props} />
      </Sequence>
      <Sequence from={0}>
        <CardsScene {...props} />
      </Sequence>
      <Sequence from={0}>
        <StepsScene {...props} />
      </Sequence>
      <Sequence from={0}>
        <FinalScene {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};
