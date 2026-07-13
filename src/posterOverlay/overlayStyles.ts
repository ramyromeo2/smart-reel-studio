import type { CSSProperties } from 'react';
import type {
  OverlayBrandStyle,
  OverlayDirection,
  OverlayElementBase,
  OverlayTextAlign,
} from './overlaySchema';

const ARABIC_TEXT_RE = /[\u0600-\u06FF]/;

export const looksRtl = (text: string | undefined): boolean =>
  typeof text === 'string' && ARABIC_TEXT_RE.test(text);

export const resolveDirection = (
  explicit: OverlayDirection | undefined,
  text: string | undefined
): 'rtl' | 'ltr' => {
  if (looksRtl(text)) return 'rtl';
  if (explicit === 'rtl' || explicit === 'ltr') return explicit;
  return looksRtl(text) ? 'rtl' : 'ltr';
};

export const resolveAlign = (
  align: OverlayTextAlign | undefined,
  direction: 'rtl' | 'ltr'
): OverlayTextAlign => {
  if (align) return align;
  return direction === 'rtl' ? 'right' : 'left';
};

export const resolveFontFamily = (
  elementFont: string | undefined,
  brandStyle: OverlayBrandStyle | undefined
): string => {
  return (
    elementFont ||
    brandStyle?.fontFamily ||
    'Tajawal, Cairo, Arial, sans-serif'
  );
};

export const baseBoxStyle = (
  element: OverlayElementBase,
  direction: 'rtl' | 'ltr',
  align: OverlayTextAlign
): CSSProperties => ({
  position: 'absolute',
  left: element.frame.x,
  top: element.frame.y,
  width: element.frame.width,
  height: element.frame.height,
  opacity: element.style?.opacity ?? 1,
  zIndex: element.zIndex ?? 10,
  direction,
  textAlign: align,
  unicodeBidi: 'plaintext',
  transformOrigin: align === 'right' ? 'top right' : align === 'center' ? 'top center' : 'top left',
  boxSizing: 'border-box',
  overflow: 'hidden',
});

export const withBoxDecoration = (
  style: CSSProperties,
  element: OverlayElementBase
): CSSProperties => ({
  ...style,
  color: element.style?.color,
  backgroundColor: element.style?.backgroundColor,
  borderColor: element.style?.borderColor,
  borderWidth: element.style?.borderWidth,
  borderStyle:
    typeof element.style?.borderWidth === 'number' && element.style.borderWidth > 0
      ? 'solid'
      : undefined,
  borderRadius: element.style?.borderRadius,
});

export const textStyle = (
  element: OverlayElementBase,
  brandStyle: OverlayBrandStyle | undefined
): CSSProperties => ({
  fontFamily: resolveFontFamily(element.style?.fontFamily, brandStyle),
  fontSize: element.style?.fontSize,
  fontWeight: element.style?.fontWeight ?? brandStyle?.fontWeight ?? 400,
  lineHeight: element.style?.lineHeight,
  letterSpacing: element.style?.letterSpacing,
  whiteSpace: 'pre-wrap',
});

export const normalizeAssetPath = (src: string): string => {
  if (!src) return src;
  if (/^(https?:)?\/\//.test(src)) return src;
  if (src.startsWith('data:')) return src;
  return src.replace(/^\/+/, '');
};
