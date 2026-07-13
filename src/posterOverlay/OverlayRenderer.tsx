import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { getBackgroundAnimationStyle, getOverlayAnimationStyle } from './overlayAnimations';
import {
  baseBoxStyle,
  normalizeAssetPath,
  resolveAlign,
  resolveDirection,
  textStyle,
  withBoxDecoration,
} from './overlayStyles';
import type {
  OverlayBrandStyle,
  OverlayButtonElement,
  OverlayIconElement,
  OverlayImageElement,
  OverlayShapeElement,
  OverlayTagElement,
  OverlayTextElement,
  PosterOverlayDocument,
  PosterOverlayElement,
} from './overlaySchema';

const SAUDI_RIYAL_SIGN = '\u20C1';
const SAUDI_RIYAL_PATH =
  'M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z';

const resolveSource = (src: string): string => {
  const normalized = normalizeAssetPath(src);
  if (/^(https?:)?\/\//.test(normalized) || normalized.startsWith('data:')) {
    return normalized;
  }
  return staticFile(normalized.replace(/^public\//, ''));
};

const SaudiRiyalSymbol: React.FC = () => (
  <span
    aria-label="Saudi Riyal"
    style={{
      display: 'inline-flex',
      width: '0.82em',
      height: '0.92em',
      verticalAlign: '-0.1em',
      color: 'currentColor',
      flex: '0 0 auto',
    }}
  >
    <svg viewBox="0 0 1124.14 1256.39" aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%', display: 'block' }}>
      <path d={SAUDI_RIYAL_PATH} fill="currentColor" />
    </svg>
  </span>
);

const renderTextWithRiyalSymbols = (text: string) => {
  if (!text.includes(SAUDI_RIYAL_SIGN)) return text;
  return text.split(SAUDI_RIYAL_SIGN).flatMap((part, index) => (
    index === 0
      ? [part]
      : [<SaudiRiyalSymbol key={`riyal-${index}`} />, part]
  ));
};

const getCanvasScale = (
  doc: PosterOverlayDocument,
  width: number,
  height: number
): { scaleX: number; scaleY: number } => ({
  scaleX: width / Math.max(1, doc.canvas.width),
  scaleY: height / Math.max(1, doc.canvas.height),
});

const scaledElement = <T extends PosterOverlayElement>(
  element: T,
  scaleX: number,
  scaleY: number
): T => ({
  ...element,
  frame: {
    x: element.frame.x * scaleX,
    y: element.frame.y * scaleY,
    width: element.frame.width * scaleX,
    height: element.frame.height * scaleY,
  },
  style: {
    ...(element.style || {}),
    fontSize:
      typeof element.style?.fontSize === 'number'
        ? element.style.fontSize * scaleY
        : element.style?.fontSize,
    borderRadius:
      typeof element.style?.borderRadius === 'number'
        ? element.style.borderRadius * scaleY
        : element.style?.borderRadius,
    borderWidth:
      typeof element.style?.borderWidth === 'number'
        ? Math.max(1, element.style.borderWidth * scaleY)
        : element.style?.borderWidth,
  },
});

const renderTextBox = (
  element: OverlayTextElement | OverlayButtonElement | OverlayTagElement,
  brandStyle: OverlayBrandStyle | undefined,
  frame: number,
  scaleX: number,
  scaleY: number
) => {
  const scaled = scaledElement(element, scaleX, scaleY);
  const direction = resolveDirection(scaled.style?.direction || brandStyle?.direction, scaled.text);
  const align = resolveAlign(scaled.style?.textAlign, direction);
  const centered = scaled.type === 'button' || scaled.type === 'tag';
  const anim = getOverlayAnimationStyle(frame, scaled.animation);
  const animOpacity = typeof anim.opacity === 'number' ? anim.opacity : 1;
  const style = withBoxDecoration(
    {
      ...baseBoxStyle(scaled, direction, centered ? 'center' : align),
      ...textStyle(scaled, brandStyle),
      display: centered ? 'flex' : 'block',
      alignItems: centered ? 'center' : undefined,
      justifyContent: centered ? 'center' : undefined,
      textAlign: centered ? 'center' : align,
      lineHeight: centered ? 1 : scaled.style?.lineHeight,
      padding: 0,
      transform:
        `${anim.transform || ''} ${scaled.rotation ? `rotate(${scaled.rotation}deg)` : ''}`.trim() ||
        undefined,
      filter: anim.filter,
      opacity: animOpacity * (scaled.style?.opacity ?? 1),
    },
    scaled
  );
  const textOffsetY = typeof scaled.textOffsetY === 'number' ? scaled.textOffsetY * scaleY : 0;
  return (
    <div key={scaled.id} style={style}>
      <span
        dir={direction}
        style={{
          unicodeBidi: 'plaintext',
          ...(textOffsetY ? { transform: `translateY(${textOffsetY}px)` } : {}),
        }}
      >
        {renderTextWithRiyalSymbols(scaled.text)}
      </span>
    </div>
  );
};

const renderShape = (
  element: OverlayShapeElement,
  frame: number,
  scaleX: number,
  scaleY: number
) => {
  const scaled = scaledElement(element, scaleX, scaleY);
  const anim = getOverlayAnimationStyle(frame, scaled.animation);
  const animOpacity = typeof anim.opacity === 'number' ? anim.opacity : 1;
  const shape = scaled.shape || 'rect';
  const style = withBoxDecoration(
    {
      ...baseBoxStyle(scaled, scaled.style?.direction === 'ltr' ? 'ltr' : 'rtl', 'center'),
      opacity: animOpacity * (scaled.style?.opacity ?? 1),
      transform:
        `${anim.transform || ''} ${scaled.rotation ? `rotate(${scaled.rotation}deg)` : ''}`.trim() ||
        undefined,
      transformOrigin: 'center center',
      filter: anim.filter,
    },
    {
      ...scaled,
      style: {
        ...(scaled.style || {}),
        backgroundColor:
          scaled.style?.backgroundColor ||
          scaled.style?.color ||
          scaled.style?.borderColor ||
          '#0F48C6',
        borderRadius: shape === 'circle' ? 999 : scaled.style?.borderRadius,
      },
    }
  );
  return <div key={scaled.id} style={style} />;
};

const renderIcon = (
  element: OverlayIconElement,
  brandStyle: OverlayBrandStyle | undefined,
  frame: number,
  scaleX: number,
  scaleY: number
) => {
  const scaled = scaledElement(element, scaleX, scaleY);
  const anim = getOverlayAnimationStyle(frame, scaled.animation);
  const animOpacity = typeof anim.opacity === 'number' ? anim.opacity : 1;
  const style = withBoxDecoration(
    {
      ...baseBoxStyle(scaled, scaled.style?.direction === 'ltr' ? 'ltr' : 'rtl', 'center'),
      ...textStyle(scaled, brandStyle),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      lineHeight: 1,
      transform:
        `${anim.transform || ''} ${scaled.rotation ? `rotate(${scaled.rotation}deg)` : ''}`.trim() ||
        undefined,
      transformOrigin: 'center center',
      filter: anim.filter,
      opacity: animOpacity * (scaled.style?.opacity ?? 1),
    },
    scaled
  );
  const iconClass = scaled.iconClass || scaled.text || '';
  const iconSrc = scaled.src || '';
  return (
    <div key={scaled.id} style={style}>
      {iconSrc ? (
        <Img
          src={resolveSource(iconSrc)}
          alt={scaled.alt || ''}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : iconClass ? (
        <i className={iconClass} aria-hidden="true" />
      ) : (
        <span>{scaled.alt || '?'}</span>
      )}
    </div>
  );
};

const renderImage = (
  element: OverlayImageElement,
  frame: number,
  scaleX: number,
  scaleY: number
) => {
  const scaled = scaledElement(element, scaleX, scaleY);
  const anim = getOverlayAnimationStyle(frame, scaled.animation);
  const animOpacity = typeof anim.opacity === 'number' ? anim.opacity : 1;
  const style = withBoxDecoration(
    {
      ...baseBoxStyle(scaled, scaled.style?.direction === 'ltr' ? 'ltr' : 'rtl', 'center'),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform:
        `${anim.transform || ''} ${scaled.rotation ? `rotate(${scaled.rotation}deg)` : ''}`.trim() ||
        undefined,
      transformOrigin: 'center center',
      filter: anim.filter,
      opacity: animOpacity * (scaled.style?.opacity ?? 1),
    },
    scaled
  );
  return (
    <div key={scaled.id} style={style}>
      <Img
        src={resolveSource(scaled.src)}
        alt={scaled.alt || ''}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
};

const renderElement = (
  element: PosterOverlayElement,
  brandStyle: OverlayBrandStyle | undefined,
  frame: number,
  scaleX: number,
  scaleY: number
) => {
  if (element.visible === false) return null;
  switch (element.type) {
    case 'text':
    case 'button':
    case 'tag':
      return renderTextBox(element, brandStyle, frame, scaleX, scaleY);
    case 'shape':
      return renderShape(element, frame, scaleX, scaleY);
    case 'icon':
      return renderIcon(element, brandStyle, frame, scaleX, scaleY);
    case 'image':
      return renderImage(element, frame, scaleX, scaleY);
    default:
      return null;
  }
};

type PosterOverlaySceneProps = {
  document: PosterOverlayDocument;
  sceneStart?: number;
  sceneDurationFrames?: number;
};

export const PosterOverlayScene: React.FC<PosterOverlaySceneProps> = ({
  document,
  sceneStart = 0,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const localFrame = Math.max(0, frame - sceneStart);
  const bgFrames =
    sceneDurationFrames ||
    Math.max(
      120,
      ...document.elements.map((element) => {
        const anim = element.animation;
        return anim ? anim.startFrame + anim.durationFrames : 60;
      })
    );
  const bgStyle = getBackgroundAnimationStyle(
    localFrame,
    bgFrames,
    document.backgroundAnimation
  );
  const { scaleX, scaleY } = getCanvasScale(document, width, height);
  const elements = [...document.elements].sort(
    (left, right) => (left.zIndex ?? 10) - (right.zIndex ?? 10)
  );

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform: bgStyle.transform,
          filter: bgStyle.filter,
          opacity: bgStyle.opacity ?? 1,
        }}
      >
        <Img
          src={resolveSource(document.backgroundImage)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
      {elements.map((element) =>
        renderElement(
          element,
          document.brandStyle,
          localFrame,
          scaleX,
          scaleY
        )
      )}
    </AbsoluteFill>
  );
};
