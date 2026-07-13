import type { CSSProperties } from 'react';

export const OVERLAY_ANIMATION_PRESETS = [
  'fadeIn',
  'fadeUp',
  'fadeDown',
  'popIn',
  'wipeRight',
  'none',
] as const;

export const OVERLAY_BACKGROUND_PRESETS = [
  'slowZoom',
  'slowPan',
  'none',
] as const;

export const OVERLAY_ELEMENT_TYPES = [
  'text',
  'button',
  'tag',
  'shape',
  'icon',
  'image',
] as const;

export type OverlayAnimationPreset = (typeof OVERLAY_ANIMATION_PRESETS)[number];
export type OverlayBackgroundPreset = (typeof OVERLAY_BACKGROUND_PRESETS)[number];
export type OverlayElementType = (typeof OVERLAY_ELEMENT_TYPES)[number];
export type OverlayTextAlign = 'left' | 'center' | 'right';
export type OverlayDirection = 'rtl' | 'ltr' | 'auto';

export type OverlayAnimation = {
  preset: OverlayAnimationPreset;
  startFrame: number;
  durationFrames: number;
};

export type OverlayBackgroundAnimation = {
  preset: OverlayBackgroundPreset;
};

export type OverlayCanvas = {
  width: number;
  height: number;
};

export type OverlayBrandStyle = {
  primaryColor?: string;
  fontFamily?: string;
  fontWeight?: number;
  direction?: OverlayDirection;
};

export type OverlayFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OverlayElementStyle = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  textAlign?: OverlayTextAlign;
  direction?: OverlayDirection;
  opacity?: number;
};

export type OverlayElementBase = {
  id: string;
  type: OverlayElementType;
  frame: OverlayFrame;
  style?: OverlayElementStyle;
  zIndex?: number;
  visible?: boolean;
  rotation?: number;
  textOffsetY?: number;
  animation?: OverlayAnimation;
};

export type OverlayTextElement = OverlayElementBase & {
  type: 'text';
  text: string;
};

export type OverlayButtonElement = OverlayElementBase & {
  type: 'button';
  text: string;
};

export type OverlayTagElement = OverlayElementBase & {
  type: 'tag';
  text: string;
};

export type OverlayShapeElement = OverlayElementBase & {
  type: 'shape';
  shape?: 'line' | 'rect' | 'circle';
};

export type OverlayIconElement = OverlayElementBase & {
  type: 'icon';
  iconClass?: string;
  src?: string;
  alt?: string;
  text?: string;
};

export type OverlayImageElement = OverlayElementBase & {
  type: 'image';
  src: string;
  alt?: string;
};

export type PosterOverlayElement =
  | OverlayTextElement
  | OverlayButtonElement
  | OverlayTagElement
  | OverlayShapeElement
  | OverlayIconElement
  | OverlayImageElement;

export type PosterOverlayDocument = {
  id: string;
  brand: string;
  aspectRatio: string;
  backgroundImage: string;
  canvas: OverlayCanvas;
  brandStyle?: OverlayBrandStyle;
  backgroundAnimation?: OverlayBackgroundAnimation;
  elements: PosterOverlayElement[];
};

export type ProjectPosterOverlayState = Record<string, PosterOverlayDocument>;

export type OverlayAnimationStyle = Pick<
  CSSProperties,
  'opacity' | 'transform' | 'filter'
>;
