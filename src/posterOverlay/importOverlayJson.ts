import {
  OVERLAY_ANIMATION_PRESETS,
  OVERLAY_BACKGROUND_PRESETS,
  OVERLAY_ELEMENT_TYPES,
  type OverlayAnimation,
  type OverlayBackgroundAnimation,
  type OverlayBrandStyle,
  type OverlayCanvas,
  type OverlayDirection,
  type OverlayElementStyle,
  type OverlayFrame,
  type OverlayTextAlign,
  type PosterOverlayDocument,
  type PosterOverlayElement,
} from './overlaySchema';

export type OverlayValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isString = (value: unknown): value is string =>
  typeof value === 'string';

const isOptionalString = (value: unknown): value is string | undefined =>
  typeof value === 'undefined' || typeof value === 'string';

const isOptionalNumber = (value: unknown): value is number | undefined =>
  typeof value === 'undefined' || isNumber(value);

const isOptionalBoolean = (value: unknown): value is boolean | undefined =>
  typeof value === 'undefined' || typeof value === 'boolean';

const isEnumValue = <T extends readonly string[]>(
  value: unknown,
  values: T
): value is T[number] => isString(value) && values.includes(value);

const normalizeAnimationPreset = (value: unknown): unknown => {
  if (value === 'wipeInRight') return 'wipeRight';
  if (value === 'wipeInLeft') return 'wipeRight';
  if (value === 'wipeLeft') return 'wipeRight';
  if (value === 'lineReveal') return 'wipeRight';
  if (value === 'revealLine') return 'wipeRight';
  if (value === 'scaleX') return 'wipeRight';
  if (value === 'slideLeft' || value === 'slideRight') return 'fadeUp';
  if (value === 'softScale') return 'popIn';
  return value;
};

const validateAnimation = (
  value: unknown,
  path: string,
  errors: string[]
): OverlayAnimation | undefined => {
  if (typeof value === 'undefined') return undefined;
  if (!isObject(value)) {
    errors.push(`${path} must be an object.`);
    return undefined;
  }
  const preset = normalizeAnimationPreset(value.preset ?? value.in);
  if (!isEnumValue(preset, OVERLAY_ANIMATION_PRESETS)) {
    errors.push(`${path}.preset must be one of: ${OVERLAY_ANIMATION_PRESETS.join(', ')}.`);
  }
  const startFrame = isNumber(value.startFrame) ? value.startFrame : 0;
  const durationFrames = isNumber(value.durationFrames)
    ? value.durationFrames
    : isNumber(value.inDuration)
      ? value.inDuration
      : undefined;
  if (!isNumber(durationFrames) || durationFrames <= 0) {
    errors.push(`${path}.durationFrames must be a positive number.`);
  }
  if (errors.length > 0 || !isEnumValue(preset, OVERLAY_ANIMATION_PRESETS) || !isNumber(durationFrames)) {
    return undefined;
  }
  return { preset, startFrame, durationFrames };
};

const validateBackgroundAnimation = (
  value: unknown,
  path: string,
  errors: string[]
): OverlayBackgroundAnimation | undefined => {
  if (typeof value === 'undefined') return undefined;
  if (!isObject(value)) {
    errors.push(`${path} must be an object.`);
    return undefined;
  }
  if (!isEnumValue(value.preset, OVERLAY_BACKGROUND_PRESETS)) {
    errors.push(`${path}.preset must be one of: ${OVERLAY_BACKGROUND_PRESETS.join(', ')}.`);
    return undefined;
  }
  return { preset: value.preset };
};

const validateCanvas = (
  value: unknown,
  path: string,
  errors: string[]
): OverlayCanvas | undefined => {
  if (!isObject(value)) {
    errors.push(`${path} must be an object.`);
    return undefined;
  }
  if (!isNumber(value.width) || value.width <= 0) errors.push(`${path}.width must be a positive number.`);
  if (!isNumber(value.height) || value.height <= 0) errors.push(`${path}.height must be a positive number.`);
  if (errors.length > 0) return undefined;
  return { width: Number(value.width), height: Number(value.height) };
};

const validateBrandStyle = (
  value: unknown,
  path: string,
  errors: string[]
): OverlayBrandStyle | undefined => {
  if (typeof value === 'undefined') return undefined;
  if (!isObject(value)) {
    errors.push(`${path} must be an object.`);
    return undefined;
  }
  if (!isOptionalString(value.primaryColor)) errors.push(`${path}.primaryColor must be a string.`);
  if (!isOptionalString(value.fontFamily)) errors.push(`${path}.fontFamily must be a string.`);
  if (!isOptionalNumber(value.fontWeight)) errors.push(`${path}.fontWeight must be a number.`);
  if (typeof value.direction !== 'undefined' && !(['rtl', 'ltr', 'auto'] as OverlayDirection[]).includes(value.direction as OverlayDirection)) {
    errors.push(`${path}.direction must be rtl, ltr, or auto.`);
  }
  if (errors.length > 0) return undefined;
  return value as OverlayBrandStyle;
};

const validateFrame = (value: unknown, path: string, errors: string[]): OverlayFrame | undefined => {
  if (!isObject(value)) {
    errors.push(`${path} must be an object with x, y, width, height.`);
    return undefined;
  }
  ['x', 'y', 'width', 'height'].forEach((key) => {
    if (!isNumber(value[key])) errors.push(`${path}.${key} must be a number.`);
  });
  if (errors.length > 0) return undefined;
  return value as OverlayFrame;
};

const validateStyle = (value: unknown, path: string, errors: string[]): OverlayElementStyle | undefined => {
  if (typeof value === 'undefined') return undefined;
  if (!isObject(value)) {
    errors.push(`${path} must be an object.`);
    return undefined;
  }
  ['fontFamily', 'color', 'backgroundColor', 'borderColor'].forEach((key) => {
    if (!isOptionalString(value[key])) errors.push(`${path}.${key} must be a string.`);
  });
  ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'borderWidth', 'borderRadius', 'opacity'].forEach((key) => {
    if (!isOptionalNumber(value[key])) errors.push(`${path}.${key} must be a number.`);
  });
  if (typeof value.textAlign !== 'undefined' && !(['left', 'center', 'right'] as OverlayTextAlign[]).includes(value.textAlign as OverlayTextAlign)) {
    errors.push(`${path}.textAlign must be left, center, or right.`);
  }
  if (typeof value.direction !== 'undefined' && !(['rtl', 'ltr', 'auto'] as OverlayDirection[]).includes(value.direction as OverlayDirection)) {
    errors.push(`${path}.direction must be rtl, ltr, or auto.`);
  }
  if (errors.length > 0) return undefined;
  return value as OverlayElementStyle;
};

const validateElement = (
  value: unknown,
  path: string,
  errors: string[]
): PosterOverlayElement | undefined => {
  if (!isObject(value)) {
    errors.push(`${path} must be an object.`);
    return undefined;
  }
  if (!isString(value.id) || !value.id.trim()) errors.push(`${path}.id must be a non-empty string.`);
  if (!isEnumValue(value.type, OVERLAY_ELEMENT_TYPES)) {
    errors.push(`${path}.type must be one of: ${OVERLAY_ELEMENT_TYPES.join(', ')}.`);
  }
  validateFrame(value.frame, `${path}.frame`, errors);
  validateStyle(value.style, `${path}.style`, errors);
  if (!isOptionalNumber(value.zIndex)) errors.push(`${path}.zIndex must be a number.`);
  if (!isOptionalBoolean(value.visible)) errors.push(`${path}.visible must be a boolean.`);
  if (!isOptionalNumber(value.rotation)) errors.push(`${path}.rotation must be a number.`);
  if (!isOptionalNumber(value.textOffsetY)) errors.push(`${path}.textOffsetY must be a number.`);
  validateAnimation(value.animation, `${path}.animation`, errors);

  if ((value.type === 'text' || value.type === 'button' || value.type === 'tag') && !isString(value.text)) {
    errors.push(`${path}.text must be a string.`);
  }
  if (value.type === 'icon') {
    if (!isOptionalString(value.iconClass)) errors.push(`${path}.iconClass must be a string.`);
    if (!isOptionalString(value.src)) errors.push(`${path}.src must be a string.`);
    if (!isOptionalString(value.alt)) errors.push(`${path}.alt must be a string.`);
    if (!isOptionalString(value.text)) errors.push(`${path}.text must be a string.`);
  }
  if (value.type === 'image') {
    if (!isString(value.src) || !value.src.trim()) errors.push(`${path}.src must be a non-empty string.`);
    if (!isOptionalString(value.alt)) errors.push(`${path}.alt must be a string.`);
  }
  if (value.type === 'shape' && typeof value.shape !== 'undefined' && !(['line', 'rect', 'circle'] as string[]).includes(String(value.shape))) {
    errors.push(`${path}.shape must be line, rect, or circle.`);
  }
  if (errors.length > 0) return undefined;
  return value as PosterOverlayElement;
};

export const validatePosterOverlayDocument = (
  input: unknown
): OverlayValidationResult<PosterOverlayDocument> => {
  const errors: string[] = [];
  if (!isObject(input)) return { ok: false, errors: ['Overlay payload must be a JSON object.'] };
  if (!isString(input.id) || !input.id.trim()) errors.push('id must be a non-empty string.');
  if (!isString(input.brand) || !input.brand.trim()) errors.push('brand must be a non-empty string.');
  if (!isString(input.aspectRatio) || !input.aspectRatio.trim()) errors.push('aspectRatio must be a non-empty string.');
  if (!isString(input.backgroundImage) || !input.backgroundImage.trim()) errors.push('backgroundImage must be a non-empty string.');
  validateCanvas(input.canvas, 'canvas', errors);
  validateBrandStyle(input.brandStyle, 'brandStyle', errors);
  validateBackgroundAnimation(input.backgroundAnimation, 'backgroundAnimation', errors);
  if (!Array.isArray(input.elements)) {
    errors.push('elements must be an array.');
  } else {
    input.elements.forEach((element, index) => validateElement(element, `elements[${index}]`, errors));
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: input as PosterOverlayDocument };
};

export const parsePosterOverlayJson = (
  raw: string
): OverlayValidationResult<PosterOverlayDocument> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON error';
    return { ok: false, errors: [`Invalid JSON: ${message}`] };
  }
  return validatePosterOverlayDocument(parsed);
};
