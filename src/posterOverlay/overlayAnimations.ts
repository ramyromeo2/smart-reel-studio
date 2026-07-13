import { Easing, interpolate, spring, type SpringConfig } from 'remotion';
import type {
  OverlayAnimation,
  OverlayAnimationStyle,
  OverlayBackgroundAnimation,
} from './overlaySchema';

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const normalizedProgress = (
  frame: number,
  animation: OverlayAnimation | undefined
): number => {
  if (!animation || animation.preset === 'none') return 1;
  const local = frame - animation.startFrame;
  return clamp01(local / Math.max(1, animation.durationFrames));
};

const easedProgress = (frame: number, animation: OverlayAnimation | undefined): number => {
  const progress = normalizedProgress(frame, animation);
  return Easing.bezier(0.22, 1, 0.36, 1)(progress);
};

const springScale = (
  frame: number,
  animation: OverlayAnimation | undefined,
  fromScale: number,
  config?: Partial<SpringConfig>
): number => {
  if (!animation || animation.preset === 'none') return 1;
  const progress = spring({
    fps: 30,
    frame: frame - animation.startFrame,
    config: {
      damping: 12,
      stiffness: 140,
      ...(config || {}),
    },
  });
  return fromScale + clamp01(progress) * (1 - fromScale);
};

export const getOverlayAnimationStyle = (
  frame: number,
  animation: OverlayAnimation | undefined
): OverlayAnimationStyle => {
  if (!animation || animation.preset === 'none') {
    return { opacity: 1 };
  }
  const progress = easedProgress(frame, animation);
  switch (animation.preset) {
    case 'fadeIn':
      return {
        opacity: progress,
      };
    case 'fadeUp':
      return {
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [26, 0])}px)`,
      };
    case 'fadeDown':
      return {
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [-26, 0])}px)`,
      };
    case 'popIn': {
      const scale = springScale(frame, animation, 0.82);
      return {
        opacity: progress,
        transform: `scale(${scale})`,
      };
    }
    case 'wipeRight':
      return {
        opacity: progress,
        transform: `scaleX(${progress})`,
      };
    default:
      return { opacity: 1 };
  }
};

export const getBackgroundAnimationStyle = (
  frame: number,
  totalFrames: number,
  animation: OverlayBackgroundAnimation | undefined
): OverlayAnimationStyle => {
  const progress = clamp01(frame / Math.max(1, totalFrames));
  if (!animation || animation.preset === 'none') {
    return { opacity: 1 };
  }
  if (animation.preset === 'slowZoom') {
    return {
      opacity: 1,
      transform: `scale(${interpolate(progress, [0, 1], [1, 1.08])})`,
    };
  }
  if (animation.preset === 'slowPan') {
    return {
      opacity: 1,
      transform: `scale(1.03) translateX(${interpolate(progress, [0, 1], [-24, 24])}px)`,
    };
  }
  return { opacity: 1 };
};
