(function () {
  const ELEMENT_TYPES = ['text', 'button', 'tag', 'shape', 'icon', 'image'];
  const ANIMATION_PRESETS = ['fadeIn', 'fadeUp', 'fadeDown', 'popIn', 'wipeRight', 'none'];
  const BG_PRESETS = ['slowZoom', 'slowPan', 'none'];
  const ALIGN_OPTIONS = ['right', 'center', 'left'];
  const SAUDI_RIYAL_SIGN = '\u20C1';
  const SAUDI_RIYAL_PATH = 'M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z';

  function injectStyles() {
    if (document.getElementById('poster-overlay-studio-styles')) return;
    const style = document.createElement('style');
    style.id = 'poster-overlay-studio-styles';
    style.textContent = `
      .poster-overlay-group .group-content { display:flex; flex-direction:column; gap:12px; }
      .poster-overlay-stack { display:flex; flex-direction:column; gap:6px; min-width:0; }
      .poster-overlay-stack > label { color:#aeb9cb; font-size:10px; font-weight:700; line-height:1.3; }
      .poster-overlay-inline { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:9px; }
      .poster-overlay-group textarea,
      .poster-overlay-group input,
      .poster-overlay-group select {
        width:100%;
        min-height:36px;
        border-radius:7px;
        border:1px solid rgba(148,163,184,.18);
        background:#0c111d;
        color:#e8eef9;
        padding:8px 10px;
        font:inherit;
        box-sizing:border-box;
        outline:none;
      }
      .poster-overlay-group textarea:focus,
      .poster-overlay-group input:focus,
      .poster-overlay-group select:focus {
        border-color:rgba(96,165,250,.72);
        box-shadow:0 0 0 3px rgba(59,130,246,.13);
      }
      .poster-overlay-group input.numeric-invalid {
        border-color:rgba(248,113,113,.72);
        box-shadow:0 0 0 1px rgba(248,113,113,.22);
      }
      .poster-overlay-group textarea { min-height:290px; resize:vertical; font-family:'SF Mono', ui-monospace, monospace; font-size:11px; line-height:1.55; direction:ltr; text-align:left; }
      .poster-overlay-group textarea.poster-overlay-textarea { min-height:132px; font-family:inherit; font-size:12px; line-height:1.55; direction:auto; text-align:start; }
      .poster-overlay-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
      .poster-overlay-btn {
        min-height:36px;
        border-radius:7px;
        border:1px solid rgba(96,165,250,.32);
        background:#1d3d70;
        color:#fff;
        padding:8px 12px;
        cursor:pointer;
        font-weight:700;
      }
      .poster-overlay-btn:hover { background:#24508f; }
      .poster-overlay-btn.secondary { background:#1b2231; border-color:rgba(148,163,184,.18); }
      .poster-overlay-btn.secondary:hover { background:#252e41; }
      .poster-overlay-bg-drop {
        border:1px dashed rgba(147,197,253,.42);
        background:rgba(59,130,246,.08);
        border-radius:8px;
        padding:12px;
        color:#b8c7dd;
        font-size:11px;
        line-height:1.45;
        cursor:pointer;
        transition:border-color .15s ease, background .15s ease, color .15s ease;
      }
      .poster-overlay-bg-drop:hover,
      .poster-overlay-bg-drop.drag {
        border-color:rgba(147,197,253,.78);
        background:rgba(59,130,246,.16);
        color:#e8f0ff;
      }
      .poster-overlay-bg-drop strong { color:#fff; }
      .poster-overlay-help { font-size:11px; color:#93a2bb; line-height:1.45; }
      .poster-overlay-status { font-size:11px; white-space:pre-wrap; line-height:1.45; }
      .poster-overlay-status.error { color:#fca5a5; }
      .poster-overlay-status.ok { color:#86efac; }
      .poster-overlay-editor { display:flex; flex-direction:column; gap:9px; }
      .poster-overlay-card {
        border:1px solid rgba(148,163,184,.13);
        background:#101725;
        border-radius:8px;
        padding:12px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }
      .poster-overlay-card.selected {
        border-color:rgba(96,165,250,.72);
        box-shadow:inset 3px 0 0 #3b82f6, 0 8px 20px rgba(0,0,0,.18);
      }
      .poster-overlay-card h4 { margin:0; padding-bottom:8px; border-bottom:1px solid rgba(148,163,184,.1); font-size:12px; display:flex; justify-content:space-between; gap:8px; }
      .poster-overlay-card small { color:#8ea0bc; }
      .poster-overlay-host {
        position:absolute;
        inset:0;
        z-index:30;
        pointer-events:none;
        overflow:hidden;
      }
      .poster-overlay-node {
        position:absolute;
        box-sizing:border-box;
        white-space:pre-wrap;
        will-change:transform, opacity, filter;
        pointer-events:auto;
        cursor:move;
        user-select:none;
        touch-action:none;
        outline:1px solid transparent;
        outline-offset:2px;
      }
      .poster-overlay-node:hover {
        outline-color:rgba(147,197,253,.75);
      }
      .poster-overlay-node.selected {
        outline-color:#60a5fa;
        box-shadow:0 0 0 2px rgba(96,165,250,.2);
      }
      .poster-overlay-resize {
        position:absolute;
        right:-7px;
        bottom:-7px;
        width:14px;
        height:14px;
        border-radius:50%;
        border:2px solid #fff;
        background:#2563eb;
        box-shadow:0 2px 8px rgba(0,0,0,.35);
        cursor:nwse-resize;
        pointer-events:auto;
        z-index:2;
      }
      .poster-overlay-node[data-type="icon"] {
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
      }
      .poster-overlay-node[data-type="image"] {
        display:flex;
        align-items:center;
        justify-content:center;
        background:transparent;
      }
      .poster-overlay-node[data-type="icon"] i,
      .poster-overlay-node[data-type="icon"] img,
      .poster-overlay-node[data-type="icon"] span,
      .poster-overlay-node[data-type="image"] img {
        display:block;
        max-width:100%;
        max-height:100%;
        line-height:1;
      }
      .poster-overlay-node[data-type="icon"] img,
      .poster-overlay-node[data-type="image"] img {
        width:100%;
        height:100%;
        object-fit:contain;
      }
      .poster-overlay-node[data-type="button"],
      .poster-overlay-node[data-type="tag"] {
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        line-height:1;
        padding:0;
      }
      .poster-overlay-riyal-symbol {
        display:inline-flex;
        width:.82em;
        height:.92em;
        vertical-align:-.1em;
        color:currentColor;
        flex:0 0 auto;
      }
      .poster-overlay-riyal-symbol svg {
        display:block;
        width:100%;
        height:100%;
      }
      .poster-overlay-chip-icon {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        margin-inline-start:0;
      }
      .scene[data-poster-overlay="1"] > :not(.scene-bg):not(.poster-overlay-host) {
        display:none !important;
      }
      @keyframes po-fade-up { from { opacity:0; transform:translateY(26px); } to { opacity:1; transform:translateY(0); } }
      @keyframes po-fade-in { from { opacity:0; } to { opacity:1; } }
      @keyframes po-fade-down { from { opacity:0; transform:translateY(-26px); } to { opacity:1; transform:translateY(0); } }
      @keyframes po-pop-in { 0% { opacity:0; transform:scale(.82); } 75% { opacity:1; transform:scale(1.03); } 100% { opacity:1; transform:scale(1); } }
      @keyframes po-wipe-right { from { opacity:0; transform:scaleX(0); } to { opacity:1; transform:scaleX(1); } }
      @keyframes po-bg-zoom { from { transform:scale(1); } to { transform:scale(1.08); } }
      @keyframes po-bg-pan { from { transform:scale(1.03) translateX(-24px); } to { transform:scale(1.03) translateX(24px); } }
    `;
    document.head.appendChild(style);
  }

  function looksRtl(text) {
    return /[\u0600-\u06FF]/.test(String(text || ''));
  }

  function normalizeAssetPath(src) {
    const clean = String(src || '').replace(/^\/+/, '');
    return clean.startsWith('generated/') ? `public/${clean}` : clean;
  }

  function getGlobalFn(name) {
    return name && typeof window[name] === 'function' ? window[name] : null;
  }

  function sortedSceneIds() {
    return Array.from(document.querySelectorAll('.scene[data-scene]'))
      .map((node) => String(node.dataset.scene || ''))
      .filter(Boolean)
      .sort((left, right) => Number(left) - Number(right));
  }

  function defaultDocument(sceneId, config) {
    return {
      id: `${config.projectId || 'poster'}-scene-${sceneId}`,
      brand: config.projectId || 'brand',
      aspectRatio: config.aspectRatio || '9:16',
      backgroundImage: 'generated/blank-white.svg',
      canvas: config.canvas || { width: 1080, height: 1920 },
      brandStyle: {
        primaryColor: config.primaryColor || '#0F48C6',
        fontFamily: 'Tajawal',
        fontWeight: 400,
      },
      backgroundAnimation: { preset: 'none' },
      elements: [],
    };
  }

  function parseBorder(border) {
    if (typeof border !== 'string') return {};
    const widthMatch = border.match(/([\d.]+)px/);
    const colorMatch = border.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/);
    return {
      borderWidth: widthMatch ? Number(widthMatch[1]) : undefined,
      borderColor: colorMatch ? colorMatch[0] : undefined,
    };
  }

  function getFrame(element) {
    const frame = element && typeof element.frame === 'object' && !Array.isArray(element.frame) ? element.frame : {};
    return {
      x: Number.isFinite(frame.x) ? frame.x : Number.isFinite(element.x) ? element.x : 0,
      y: Number.isFinite(frame.y) ? frame.y : Number.isFinite(element.y) ? element.y : 0,
      width: Number.isFinite(frame.width) ? frame.width : Number.isFinite(element.width) ? element.width : Number.isFinite(element.w) ? element.w : 0,
      height: Number.isFinite(frame.height) ? frame.height : Number.isFinite(element.height) ? element.height : Number.isFinite(element.h) ? element.h : 0,
    };
  }

  function getElementStyle(element) {
    const style = element && typeof element.style === 'object' && !Array.isArray(element.style) ? element.style : {};
    const css = element && typeof element.css === 'object' && !Array.isArray(element.css) ? element.css : {};
    return { ...css, ...style };
  }

  function normalizeAnimationPreset(preset) {
    const aliases = {
      wipeInRight: 'wipeRight',
      wipeInLeft: 'wipeRight',
      wipeRight: 'wipeRight',
      wipeLeft: 'wipeRight',
      lineReveal: 'wipeRight',
      revealLine: 'wipeRight',
      scaleX: 'wipeRight',
      fade: 'fadeIn',
      fadeIn: 'fadeIn',
      'fade-in': 'fadeIn',
      fadeUp: 'fadeUp',
      'fade-up': 'fadeUp',
      slideLeft: 'fadeUp',
      slideRight: 'fadeUp',
      softScale: 'popIn',
    };
    return aliases[preset] || preset || 'none';
  }

  function normalizeElement(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
    const style = getElementStyle(raw);
    const border = parseBorder(style.border);
    const rawPreset = raw.animation && typeof raw.animation === 'object'
      ? raw.animation.preset || raw.animation.in
      : undefined;
    const animation = raw.animation && typeof raw.animation === 'object'
      ? {
          preset: normalizeAnimationPreset(rawPreset),
          startFrame: Number.isFinite(raw.animation.startFrame) ? raw.animation.startFrame : 0,
          durationFrames: Number.isFinite(raw.animation.durationFrames)
            ? raw.animation.durationFrames
            : Number.isFinite(raw.animation.inDuration)
              ? raw.animation.inDuration
              : 18,
        }
      : undefined;
    const frame = getFrame(raw);
    const type = raw.type === 'pill' || raw.type === 'chip' ? 'tag' : raw.type;
    const canonicalStyle = {
      fontFamily: raw.fontFamily || style.fontFamily,
      fontWeight: raw.fontWeight ?? style.fontWeight,
      fontSize: raw.fontSize ?? style.fontSize,
      lineHeight: raw.lineHeight ?? style.lineHeight,
      color: raw.color || style.color,
      backgroundColor: raw.backgroundColor || style.backgroundColor,
      borderColor: raw.borderColor || border.borderColor,
      borderWidth: raw.borderWidth ?? border.borderWidth,
      borderRadius: raw.borderRadius ?? style.borderRadius,
      textAlign: raw.align || style.textAlign,
      direction: raw.direction || style.direction,
      letterSpacing: raw.letterSpacing ?? style.letterSpacing,
      opacity: raw.opacity ?? style.opacity,
    };
    Object.keys(canonicalStyle).forEach(function (key) {
      if (canonicalStyle[key] === undefined || canonicalStyle[key] === '') delete canonicalStyle[key];
    });
    return {
      id: raw.id,
      type: type === 'shape' ? 'shape' : type,
      text: raw.text,
      iconClass: raw.iconClass || raw.icon || raw.className,
      src: raw.src || raw.iconSrc || raw.url,
      alt: raw.alt,
      shape: raw.shape,
      frame,
      style: canonicalStyle,
      textOffsetY: Number.isFinite(raw.textOffsetY) ? raw.textOffsetY : undefined,
      zIndex: raw.zIndex,
      visible: raw.visible,
      rotation: raw.rotation,
      animation,
    };
  }

  function normalizeOverlayDocument(input, sceneId, config) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
    const fallback = defaultDocument(sceneId || '1', config);
    const meta = input.meta && typeof input.meta === 'object' && !Array.isArray(input.meta) ? input.meta : {};
    const theme = input.theme && typeof input.theme === 'object' && !Array.isArray(input.theme) ? input.theme : {};
    const canvas = input.canvas && typeof input.canvas === 'object'
      ? input.canvas
      : {
          width: meta.width,
          height: meta.height,
          aspectRatio: meta.aspectRatio,
        };
    const background = input.background && typeof input.background === 'object' ? input.background : {};
    const backgroundAnimation = input.backgroundAnimation || background.animation;
    return {
      ...input,
      id: input.id || fallback.id,
      brand: input.brand || meta.project || fallback.brand,
      aspectRatio: input.aspectRatio || canvas.aspectRatio || meta.aspectRatio || fallback.aspectRatio,
      backgroundImage:
        input.backgroundImage ||
        input.image ||
        background.image ||
        background.src ||
        fallback.backgroundImage,
      canvas: {
        width: Number.isFinite(canvas.width) ? canvas.width : fallback.canvas.width,
        height: Number.isFinite(canvas.height) ? canvas.height : fallback.canvas.height,
      },
      brandStyle: {
        ...(fallback.brandStyle || {}),
        fontFamily: theme.fontFamily || fallback.brandStyle?.fontFamily,
        fontWeight: theme.fontWeight || fallback.brandStyle?.fontWeight,
        primaryColor: theme.accentColor || theme.headlineColor || theme.primaryColor || fallback.brandStyle?.primaryColor,
        direction: meta.direction || fallback.brandStyle?.direction,
        ...(input.brandStyle || {}),
      },
      backgroundAnimation: backgroundAnimation
        ? { preset: backgroundAnimation.preset || 'none' }
        : { preset: 'none' },
      elements: Array.isArray(input.elements) ? input.elements.map(normalizeElement) : [],
    };
  }

  function validateOverlayDoc(doc) {
    const errors = [];
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      return { ok: false, errors: ['Overlay payload must be a JSON object.'] };
    }
    if (!doc.id) errors.push('id is required.');
    if (!doc.brand) errors.push('brand is required.');
    if (!doc.aspectRatio) errors.push('aspectRatio is required.');
    if (!doc.backgroundImage) errors.push('backgroundImage is required.');
    if (!doc.canvas || typeof doc.canvas !== 'object') {
      errors.push('canvas is required.');
    } else {
      if (!Number.isFinite(doc.canvas.width) || doc.canvas.width <= 0) errors.push('canvas.width must be a positive number.');
      if (!Number.isFinite(doc.canvas.height) || doc.canvas.height <= 0) errors.push('canvas.height must be a positive number.');
    }
    if (!Array.isArray(doc.elements)) {
      errors.push('elements must be an array.');
    } else {
      doc.elements.forEach((element, index) => {
        const path = `elements[${index}]`;
        if (!element || typeof element !== 'object') {
          errors.push(`${path} must be an object.`);
          return;
        }
        if (!element.id) errors.push(`${path}.id is required.`);
        if (!ELEMENT_TYPES.includes(element.type)) errors.push(`${path}.type must be one of ${ELEMENT_TYPES.join(', ')}.`);
        if (!element.frame || typeof element.frame !== 'object') {
          errors.push(`${path}.frame is required.`);
        } else {
          ['x', 'y', 'width', 'height'].forEach(function (key) {
            if (!Number.isFinite(element.frame[key])) errors.push(`${path}.frame.${key} must be a number.`);
          });
        }
        if (!['shape', 'icon'].includes(element.type) && typeof element.text !== 'string') errors.push(`${path}.text must be a string.`);
        if (element.type === 'icon' || element.type === 'image') {
          if (element.iconClass !== undefined && typeof element.iconClass !== 'string') errors.push(`${path}.iconClass must be a string.`);
          if (element.src !== undefined && typeof element.src !== 'string') errors.push(`${path}.src must be a string.`);
          if (element.alt !== undefined && typeof element.alt !== 'string') errors.push(`${path}.alt must be a string.`);
        }
        if (element.type === 'shape' && element.shape && !['line', 'rect', 'circle'].includes(element.shape)) errors.push(`${path}.shape must be line, rect, or circle.`);
        if (element.animation) {
          if (!ANIMATION_PRESETS.includes(element.animation.preset)) errors.push(`${path}.animation.preset must be one of ${ANIMATION_PRESETS.join(', ')}.`);
          if (!Number.isFinite(element.animation.startFrame)) errors.push(`${path}.animation.startFrame must be a number.`);
          if (!Number.isFinite(element.animation.durationFrames) || element.animation.durationFrames <= 0) errors.push(`${path}.animation.durationFrames must be positive.`);
        }
      });
    }
    if (doc.backgroundAnimation && !BG_PRESETS.includes(doc.backgroundAnimation.preset)) {
      errors.push(`backgroundAnimation.preset must be one of ${BG_PRESETS.join(', ')}.`);
    }
    return errors.length ? { ok: false, errors: errors } : { ok: true, value: doc };
  }

  function createNode(tag, props) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(function ([key, value]) {
      if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'className') node.className = value;
      else if (key === 'children' && Array.isArray(value)) value.forEach(function (child) { if (child) node.appendChild(child); });
      else if (key === 'style' && value && typeof value === 'object') Object.assign(node.style, value);
      else if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    });
    return node;
  }

  function createSaudiRiyalNode() {
    const span = document.createElement('span');
    span.className = 'poster-overlay-riyal-symbol';
    span.setAttribute('aria-label', 'Saudi Riyal');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1124.14 1256.39');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', SAUDI_RIYAL_PATH);
    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
    span.appendChild(svg);
    return span;
  }

  function appendTextWithRiyalSymbols(parent, text) {
    const value = String(text || '');
    if (!value.includes(SAUDI_RIYAL_SIGN)) {
      parent.textContent = value;
      return;
    }
    value.split(SAUDI_RIYAL_SIGN).forEach(function (part, index) {
      if (index > 0) parent.appendChild(createSaudiRiyalNode());
      if (part) parent.appendChild(document.createTextNode(part));
    });
  }

  function editorValue(value, fallback) {
    return value === undefined || value === null ? fallback : value;
  }

  window.initPosterOverlayStudio = function initPosterOverlayStudio(config) {
    injectStyles();
    const panelBody = document.querySelector(config.panelBodySelector || '.panel-body');
    if (!panelBody) return { getRenderState: function () { return {}; } };

    const group = createNode('details', {
      className: 'group poster-overlay-group',
      open: 'open',
      children: [
        createNode('summary', {
          html: '<h3>🪄 Poster Overlay Importer <span class="badge">JSON → editable overlay</span></h3>',
        }),
        createNode('div', {
          className: 'group-content',
          children: [
            createNode('div', {
              className: 'poster-overlay-help',
              text: 'Paste a poster overlay JSON, apply it to a scene, then fine-tune every imported element below.',
            }),
            createNode('div', {
              className: 'poster-overlay-inline',
              children: [
                createNode('div', {
                  className: 'poster-overlay-stack',
                  children: [
                    createNode('label', { text: 'Scene' }),
                    createNode('select', { id: `${config.projectId}-overlay-scene` }),
                  ],
                }),
                createNode('div', {
                  className: 'poster-overlay-stack',
	                  children: [
	                    createNode('label', { text: 'Background image' }),
	                    createNode('input', { id: `${config.projectId}-overlay-bg`, type: 'text', placeholder: '/assets/posters/scene.png' }),
	                    createNode('div', {
	                      className: 'poster-overlay-bg-drop',
	                      id: `${config.projectId}-overlay-bg-drop`,
	                      html: '<strong>Choose, drop, or paste image</strong><br>Click here to upload, drag an image here, paste an image from clipboard, or type a path above.',
	                    }),
	                    createNode('input', {
	                      id: `${config.projectId}-overlay-bg-file`,
	                      type: 'file',
	                      accept: 'image/*',
	                      style: { display: 'none' },
	                    }),
	                  ],
	                }),
              ],
            }),
            createNode('div', {
              className: 'poster-overlay-stack',
              children: [
                createNode('label', { text: 'Overlay JSON' }),
                createNode('textarea', { id: `${config.projectId}-overlay-json`, placeholder: '{\n  "id": "...",\n  "elements": []\n}' }),
              ],
            }),
            createNode('div', {
              className: 'poster-overlay-actions',
              children: [
                createNode('button', { className: 'poster-overlay-btn', type: 'button', id: `${config.projectId}-overlay-apply`, text: 'Apply Overlay' }),
                createNode('button', { className: 'poster-overlay-btn secondary', type: 'button', id: `${config.projectId}-overlay-clear`, text: 'Clear Scene Overlay' }),
                createNode('button', { className: 'poster-overlay-btn secondary', type: 'button', id: `${config.projectId}-overlay-clear-bg`, text: 'Clear Background' }),
              ],
            }),
            createNode('pre', { className: 'poster-overlay-status', id: `${config.projectId}-overlay-status` }),
            createNode('div', { id: `${config.projectId}-overlay-hidden`, style: { display: 'none' } }),
            createNode('div', { className: 'poster-overlay-editor', id: `${config.projectId}-overlay-editor` }),
          ],
        }),
      ],
    });
    document.querySelectorAll('.poster-overlay-group').forEach(function (node) {
      node.remove();
    });
    panelBody.insertBefore(group, panelBody.firstChild);

    const refs = {
      group: group,
	      sceneSelect: group.querySelector(`#${config.projectId}-overlay-scene`),
	      backgroundInput: group.querySelector(`#${config.projectId}-overlay-bg`),
	      backgroundDrop: group.querySelector(`#${config.projectId}-overlay-bg-drop`),
	      backgroundFile: group.querySelector(`#${config.projectId}-overlay-bg-file`),
	      jsonInput: group.querySelector(`#${config.projectId}-overlay-json`),
      applyButton: group.querySelector(`#${config.projectId}-overlay-apply`),
      clearButton: group.querySelector(`#${config.projectId}-overlay-clear`),
      clearBackgroundButton: group.querySelector(`#${config.projectId}-overlay-clear-bg`),
      status: group.querySelector(`#${config.projectId}-overlay-status`),
      hiddenHost: group.querySelector(`#${config.projectId}-overlay-hidden`),
      editor: group.querySelector(`#${config.projectId}-overlay-editor`),
    };

    const filterPrefix = config.filterPrefix || '';
    const storageKey = config.storageKey || `${config.projectId}-poster-overlays-v1`;
    let selectedScene = null;
    let selectedElementIndex = null;
    let storedState = readStoredState();

    function setStatus(message, kind) {
      refs.status.textContent = message || '';
      refs.status.className = 'poster-overlay-status' + (kind ? ` ${kind}` : '');
    }

    function markDirty() {
      const dirtyFn = getGlobalFn(config.dirtyHook);
      if (dirtyFn) dirtyFn();
    }

    function readStoredState() {
      try {
        const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
      } catch (_error) {
        return {};
      }
    }

    function persistStoredState() {
      try {
        const keys = Object.keys(storedState).filter(function (key) { return storedState[key]; });
        if (keys.length) {
          localStorage.setItem(storageKey, JSON.stringify(storedState));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (_error) {}
    }

    function persistServerState() {
      if (config.disableServerAutosave) return Promise.resolve();
      if (!/^https?:$/.test(location.protocol)) return Promise.resolve();
      try {
        return fetch('/api/overlay-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: config.projectId, overlayState: storedState }),
        }).catch(function () {});
      } catch (_error) {}
      return Promise.resolve();
    }

    function loadServerState() {
      if (!/^https?:$/.test(location.protocol)) return Promise.resolve({});
      return fetch(`/api/overlay-state?id=${encodeURIComponent(config.projectId)}`)
        .then(function (res) { return res.ok ? res.json() : {}; })
        .then(function (value) {
          return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        })
        .catch(function () { return {}; });
    }

    function toast(message, kind) {
      const fn = getGlobalFn(config.toastHook);
      if (fn) fn(message, kind);
    }

    function ensureHiddenInput(sceneId) {
      let input = document.getElementById(`s${sceneId}-overlay-doc`);
      if (input) return input;
      input = document.createElement('input');
      input.type = 'hidden';
      input.id = `s${sceneId}-overlay-doc`;
      if (storedState[sceneId]) {
        input.value = JSON.stringify(storedState[sceneId]);
      }
      refs.hiddenHost.appendChild(input);
      return input;
    }

    function readDoc(sceneId) {
      const raw = ensureHiddenInput(sceneId).value;
      if (!raw) return null;
      try {
        return normalizeOverlayDocument(JSON.parse(raw), sceneId, config);
      } catch (_error) {
        return null;
      }
    }

    function writeDoc(sceneId, doc) {
      ensureHiddenInput(sceneId).value = doc ? JSON.stringify(doc) : '';
      if (doc) storedState[sceneId] = doc;
      else delete storedState[sceneId];
      persistStoredState();
      const persisted = persistServerState();
      markDirty();
      return persisted;
    }

    function writeDocLocal(sceneId, doc) {
      ensureHiddenInput(sceneId).value = doc ? JSON.stringify(doc) : '';
      if (doc) storedState[sceneId] = doc;
      else delete storedState[sceneId];
      persistStoredState();
      markDirty();
    }

    function sceneIds() {
      const hook = getGlobalFn(config.sceneIdsHook);
      const hookedIds = hook ? hook() : null;
      const ids = Array.isArray(hookedIds)
        ? hookedIds.map(function (id) { return String(id); }).filter(Boolean)
        : sortedSceneIds();
      ids.forEach(function (sceneId) { ensureHiddenInput(sceneId); });
      return ids;
    }

    function activeSceneFromTabs() {
      const active = document.querySelector(config.activeSceneSelector || '.tab.active[data-scene]');
      const value = active && active.dataset ? String(active.dataset.scene || '') : '';
      return value && value !== 'all' ? value : null;
    }

    function setGroupScene(sceneId) {
      refs.group.dataset.scene = 'all';
    }

    function syncSceneSelect() {
      const ids = sceneIds();
      if (!ids.length) return;
      const currentActive = activeSceneFromTabs();
      if (!selectedScene || !ids.includes(selectedScene)) selectedScene = currentActive || ids[0];
      if (currentActive && ids.includes(currentActive)) selectedScene = currentActive;
      refs.sceneSelect.innerHTML = ids.map(function (sceneId) {
        return `<option value="${sceneId}">Scene ${sceneId}</option>`;
      }).join('');
      refs.sceneSelect.value = selectedScene;
      setGroupScene(selectedScene);
    }

    function currentSceneElement(sceneId) {
      return document.querySelector(`#scene${sceneId}`) || document.querySelector(`.scene[data-scene="${sceneId}"]`);
    }

    function applyCanvasSize(sceneId, doc) {
      const hook = getGlobalFn(config.canvasHook);
      if (hook && doc && doc.canvas) hook(sceneId, doc);
    }

    function applySceneImage(sceneId, src) {
      const normalized = normalizeAssetPath(src);
      const applyFn = getGlobalFn(config.applySceneImageHook);
      if (applyFn) {
        applyFn(`s${sceneId}`, normalized);
        return;
      }
      const sceneEl = currentSceneElement(sceneId);
      if (!sceneEl) return;
      let bg = sceneEl.querySelector('.scene-bg');
      if (!bg) {
        bg = document.createElement('div');
        bg.className = 'scene-bg';
        sceneEl.insertBefore(bg, sceneEl.firstChild);
      }
      let img = bg.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        img.alt = '';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.background = '#fff';
        img.style.display = 'block';
        bg.appendChild(img);
      }
      if (img) img.setAttribute('src', normalized);
    }

    function currentSceneImageSource(sceneId) {
      const img = currentSceneElement(sceneId)?.querySelector('.scene-bg img');
      const src = img?.getAttribute('src') || img?.currentSrc || img?.src || '';
      return src ? normalizeAssetPath(src) : '';
    }

    function parseJsonEditorFallback(sceneId) {
      try {
        const parsed = normalizeOverlayDocument(
          JSON.parse(refs.jsonInput.value || '{}'),
          sceneId,
          config
        );
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return {
            ...defaultDocument(sceneId, config),
            ...parsed,
            canvas: parsed.canvas || defaultDocument(sceneId, config).canvas,
            brandStyle: {
              ...defaultDocument(sceneId, config).brandStyle,
              ...(parsed.brandStyle || {}),
            },
            backgroundAnimation: parsed.backgroundAnimation || { preset: 'none' },
            elements: Array.isArray(parsed.elements) ? parsed.elements : [],
          };
        }
      } catch (_error) {}
      return defaultDocument(sceneId, config);
    }

    function setJsonEditorBackground(sceneId, src) {
      src = normalizeAssetPath(src);
      const doc = parseJsonEditorFallback(sceneId);
      doc.backgroundImage = src;
      refs.jsonInput.value = JSON.stringify(doc, null, 2);
      refs.backgroundInput.value = src;
    }

    function setBackgroundSource(src, label) {
      const sceneId = refs.sceneSelect.value || selectedScene;
      if (!sceneId || !src) return;
      src = normalizeAssetPath(src);
      refs.backgroundInput.value = src;
      const doc = readDoc(sceneId);
      if (doc) {
        updateSceneDoc(sceneId, function (next) {
          next.backgroundImage = src;
        });
      } else {
        setJsonEditorBackground(sceneId, src);
        applySceneImage(sceneId, src);
        markDirty();
      }
      setStatus(`${label || 'Background image'} ready for Scene ${sceneId}. Click Apply Overlay to include it in render.`, 'ok');
    }

    function saveBackgroundFile(dataUrl, fileName, sceneId) {
      if (!/^https?:$/.test(location.protocol)) return Promise.resolve(null);
      return fetch('/api/background-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: config.projectId,
          sceneId: sceneId,
          fileName: fileName || 'background',
          dataUrl: dataUrl,
        }),
      })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) { return data && data.src ? data.src : null; })
        .catch(function () { return null; });
    }

    function handleBackgroundFile(file) {
      if (!file) return;
      if (!String(file.type || '').startsWith('image/')) {
        setStatus('Background upload needs an image file.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        const dataUrl = String(reader.result || '');
        const sceneId = refs.sceneSelect.value || selectedScene;
        setStatus(`Uploading ${file.name || 'image'}...`, 'ok');
        saveBackgroundFile(dataUrl, file.name, sceneId).then(function (savedSrc) {
          setBackgroundSource(savedSrc || dataUrl, `Uploaded ${file.name || 'image'}`);
          if (savedSrc) {
            setStatus(`Uploaded ${file.name || 'image'} for Scene ${sceneId}. Click Apply Overlay to include it in render.`, 'ok');
          }
        });
      };
      reader.onerror = function () {
        setStatus('Could not read that image file.', 'error');
      };
      reader.readAsDataURL(file);
    }

    function handleBackgroundPaste(event) {
      const items = Array.from(event.clipboardData?.items || []);
      const imageItem = items.find(function (item) {
        return String(item.type || '').startsWith('image/');
      });
      if (!imageItem) return false;
      const file = imageItem.getAsFile();
      if (!file) return false;
      event.preventDefault();
      handleBackgroundFile(file);
      return true;
    }

    function updateBackgroundAnimation(sceneId, doc) {
      const img = currentSceneElement(sceneId)?.querySelector('.scene-bg img');
      if (!img) return;
      img.style.animation = '';
      img.style.transformOrigin = 'center center';
      if (!doc || !doc.backgroundAnimation) return;
      if (doc.backgroundAnimation.preset === 'slowZoom') img.style.animation = 'po-bg-zoom 6s linear both';
      if (doc.backgroundAnimation.preset === 'slowPan') img.style.animation = 'po-bg-pan 6s linear both';
    }

    function moveAllElements(sceneId, deltaX, deltaY) {
      updateSceneDoc(sceneId, function (next) {
        (next.elements || []).forEach(function (element) {
          element.frame = getFrame(element);
          element.frame.x = Math.round(element.frame.x + deltaX);
          element.frame.y = Math.round(element.frame.y + deltaY);
        });
      });
    }

    function ensureOverlayDocument(sceneId) {
      const existing = readDoc(sceneId);
      if (existing) return existing;
      const doc = defaultDocument(sceneId, config);
      const sceneImage = currentSceneImageSource(sceneId);
      if (sceneImage) doc.backgroundImage = sceneImage;
      writeDocLocal(sceneId, doc);
      writeDoc(sceneId, doc);
      return doc;
    }

    function addImageElement(sceneId, src, label) {
      if (!sceneId || !src) return;
      ensureOverlayDocument(sceneId);
      updateSceneDoc(sceneId, function (next) {
        const count = Array.isArray(next.elements) ? next.elements.length : 0;
        next.elements = next.elements || [];
        next.elements.push({
          id: `image-${count + 1}`,
          type: 'image',
          src: normalizeAssetPath(src),
          alt: label || '',
          frame: { x: 80, y: 120, width: 260, height: 180 },
          style: { opacity: 1 },
          zIndex: 20 + count,
          visible: true,
          animation: { preset: 'fadeIn', startFrame: 0, durationFrames: 18 },
        });
        selectedElementIndex = next.elements.length - 1;
      });
      setStatus(`Added ${label || 'image'} to Scene ${sceneId}. Drag or resize it on the poster.`, 'ok');
    }

    function addImageFile(sceneId, file) {
      if (!file) return;
      if (!String(file.type || '').startsWith('image/')) {
        setStatus('Overlay upload needs an image file.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        const dataUrl = String(reader.result || '');
        setStatus(`Uploading ${file.name || 'image'}...`, 'ok');
        saveBackgroundFile(dataUrl, file.name || 'overlay-image', sceneId).then(function (savedSrc) {
          addImageElement(sceneId, savedSrc || dataUrl, file.name || 'image');
        });
      };
      reader.onerror = function () {
        setStatus('Could not read that image file.', 'error');
      };
      reader.readAsDataURL(file);
    }

    function chooseImageFiles(sceneId) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.addEventListener('change', function () {
        Array.from(input.files || []).forEach(function (file) {
          addImageFile(sceneId, file);
        });
      }, { once: true });
      input.click();
    }

    function pasteImageElement(sceneId) {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setStatus('Clipboard image paste is not available in this browser. Use Upload image instead.', 'error');
        return;
      }
      navigator.clipboard.read()
        .then(function (items) {
          const filePromises = [];
          items.forEach(function (item) {
            (item.types || []).forEach(function (type) {
              if (!String(type).startsWith('image/')) return;
              filePromises.push(item.getType(type).then(function (blob) {
                return new File([blob], `pasted-image-${Date.now()}.${type.split('/')[1] || 'png'}`, { type });
              }));
            });
          });
          return Promise.all(filePromises);
        })
        .then(function (files) {
          if (!files.length) {
            setStatus('Clipboard does not contain an image.', 'error');
            return;
          }
          files.forEach(function (file) { addImageFile(sceneId, file); });
        })
        .catch(function () {
          setStatus('Could not read an image from the clipboard. Use Upload image instead.', 'error');
        });
    }

    function focusElementEditor(sceneId, index, options) {
      selectedScene = sceneId;
      selectedElementIndex = Number.isFinite(index) ? index : null;
      refs.group.open = true;
      syncSceneSelect();
      renderEditors(sceneId);
      if (!options || options.renderScene !== false) renderScene(sceneId);
      if (options && options.scroll) {
        requestAnimationFrame(function () {
          const card = refs.editor.querySelector(`[data-overlay-index="${selectedElementIndex}"]`);
          card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
    }

    function safeSetPointerCapture(node, pointerId) {
      if (!node || typeof node.setPointerCapture !== 'function') return;
      try {
        node.setPointerCapture(pointerId);
      } catch (_error) {
        // Some browsers throw if the pointer is no longer active after DOM rerenders.
      }
    }

    function attachNodeResize(sceneId, index, node, handle) {
      handle.addEventListener('pointerdown', function (event) {
        if (event.button !== undefined && event.button !== 0) return;
        const sceneEl = currentSceneElement(sceneId);
        const doc = readDoc(sceneId);
        if (!sceneEl || !doc || !doc.elements || !doc.elements[index]) return;
        event.preventDefault();
        event.stopPropagation();
        focusElementEditor(sceneId, index, { scroll: true, renderScene: false });
        const sceneRect = sceneEl.getBoundingClientRect();
        const scaleX = sceneRect.width / Math.max(1, doc.canvas.width);
        const scaleY = sceneRect.height / Math.max(1, doc.canvas.height);
        const startX = event.clientX;
        const startY = event.clientY;
        const startFrame = getFrame(doc.elements[index]);
        const working = JSON.parse(JSON.stringify(doc));
        safeSetPointerCapture(handle, event.pointerId);

        function onMove(moveEvent) {
          const target = working.elements[index];
          if (!target) return;
          target.frame = getFrame(target);
          target.frame.width = Math.max(8, Math.round(startFrame.width + (moveEvent.clientX - startX) / scaleX));
          target.frame.height = Math.max(8, Math.round(startFrame.height + (moveEvent.clientY - startY) / scaleY));
          writeDocLocal(sceneId, working);
          renderScene(sceneId);
        }

        function onUp() {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          writeDoc(sceneId, working).then(function () {
            if (selectedScene === sceneId) {
              syncJsonEditor();
              renderEditors(sceneId);
              renderScene(sceneId);
            }
          });
        }

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp, { once: true });
      });
    }

    function attachNodeDrag(sceneId, index, node) {
      node.addEventListener('pointerdown', function (event) {
        if (event.button !== undefined && event.button !== 0) return;
        if (event.target && event.target.closest && event.target.closest('.poster-overlay-resize')) return;
        const sceneEl = currentSceneElement(sceneId);
        const doc = readDoc(sceneId);
        if (!sceneEl || !doc || !doc.elements || !doc.elements[index]) return;
        event.preventDefault();
        event.stopPropagation();
        focusElementEditor(sceneId, index, { scroll: true, renderScene: false });
        const sceneRect = sceneEl.getBoundingClientRect();
        const scaleX = sceneRect.width / Math.max(1, doc.canvas.width);
        const scaleY = sceneRect.height / Math.max(1, doc.canvas.height);
        const startX = event.clientX;
        const startY = event.clientY;
        const startFrame = getFrame(doc.elements[index]);
        const working = JSON.parse(JSON.stringify(doc));
        safeSetPointerCapture(node, event.pointerId);

        function onMove(moveEvent) {
          const target = working.elements[index];
          if (!target) return;
          target.frame = getFrame(target);
          target.frame.x = Math.round(startFrame.x + (moveEvent.clientX - startX) / scaleX);
          target.frame.y = Math.round(startFrame.y + (moveEvent.clientY - startY) / scaleY);
          writeDocLocal(sceneId, working);
          renderScene(sceneId);
        }

        function onUp() {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          writeDoc(sceneId, working).then(function () {
            if (selectedScene === sceneId) {
              syncJsonEditor();
              renderEditors(sceneId);
              renderScene(sceneId);
            }
          });
        }

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp, { once: true });
      });
    }

    function nodeStyle(element, doc) {
      const frame = getFrame(element);
      const elementStyle = getElementStyle(element);
      const textIsRtl = looksRtl(element.text || element.iconText || element.iconClass);
      const direction = textIsRtl
        ? 'rtl'
        : elementStyle.direction && elementStyle.direction !== 'auto'
          ? elementStyle.direction
          : 'ltr';
      const textAlign = elementStyle.textAlign || (direction === 'rtl' ? 'right' : 'left');
      const style = {
        left: `${frame.x}px`,
        top: `${frame.y}px`,
        width: `${frame.width}px`,
        height: `${frame.height}px`,
        opacity: elementStyle.opacity !== undefined ? String(elementStyle.opacity) : '1',
        zIndex: String(element.zIndex || 10),
        color: elementStyle.color || doc.brandStyle?.primaryColor || '#0F48C6',
        backgroundColor: elementStyle.backgroundColor || '',
        borderColor: elementStyle.borderColor || '',
        borderWidth: elementStyle.borderWidth ? `${elementStyle.borderWidth}px` : '',
        borderStyle: elementStyle.borderWidth ? 'solid' : '',
        borderRadius: elementStyle.borderRadius ? `${elementStyle.borderRadius}px` : '',
        padding: element.type === 'button' || element.type === 'tag' ? '0' : '',
        fontFamily: elementStyle.fontFamily || doc.brandStyle?.fontFamily || 'Tajawal, Cairo, Arial, sans-serif',
        fontSize: elementStyle.fontSize ? `${elementStyle.fontSize}px` : '',
        fontWeight: elementStyle.fontWeight || doc.brandStyle?.fontWeight || 400,
        lineHeight: element.type === 'button' || element.type === 'tag' || element.type === 'icon' ? '1' : elementStyle.lineHeight || '',
        letterSpacing: elementStyle.letterSpacing ? `${elementStyle.letterSpacing}px` : '',
        direction: direction,
        textAlign: element.type === 'button' || element.type === 'tag' || element.type === 'icon' ? 'center' : textAlign,
        unicodeBidi: 'plaintext',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transformOrigin: textAlign === 'right' ? 'top right' : textAlign === 'center' ? 'top center' : 'top left',
      };
      if (element.type === 'button' || element.type === 'tag' || element.type === 'icon') {
        style.display = 'flex';
        style.alignItems = 'center';
        style.justifyContent = 'center';
      }
      if (config.previewAnimations && element.animation && element.animation.preset !== 'none') {
        const animationMap = {
          fadeIn: 'po-fade-in',
          fadeUp: 'po-fade-up',
          fadeDown: 'po-fade-down',
          popIn: 'po-pop-in',
          wipeRight: 'po-wipe-right',
        };
        if (animationMap[element.animation.preset]) {
          style.animation = `${animationMap[element.animation.preset]} ${Math.max(0.2, (element.animation.durationFrames || 18) / 30)}s ease both`;
          style.animationDelay = `${Math.max(0, element.animation.startFrame || 0) / 30}s`;
        }
      }
      if (element.rotation) {
        style.transform = `rotate(${element.rotation}deg)`;
      }
      return style;
    }

    function renderScene(sceneId) {
      const sceneEl = currentSceneElement(sceneId);
      if (!sceneEl) return;
      let host = sceneEl.querySelector('.poster-overlay-host');
      const doc = readDoc(sceneId);
      if (!doc) {
        sceneEl.removeAttribute('data-poster-overlay');
        if (host) host.remove();
        updateBackgroundAnimation(sceneId, null);
        return;
      }
      if (!host) {
        host = document.createElement('div');
        host.className = 'poster-overlay-host';
        sceneEl.appendChild(host);
      }
      sceneEl.setAttribute('data-poster-overlay', '1');
      host.innerHTML = '';
      if (doc.backgroundImage) applySceneImage(sceneId, doc.backgroundImage);
      applyCanvasSize(sceneId, doc);
      updateBackgroundAnimation(sceneId, doc);

      (doc.elements || []).forEach(function (element, index) {
        if (element.visible === false) return;
        const style = nodeStyle(element, doc);
        const direction = style.direction || 'ltr';
        let node;
        if (element.type === 'shape') {
          node = createNode('div', { className: 'poster-overlay-node', 'data-type': element.type, style: style });
          const elementStyle = getElementStyle(element);
          node.style.backgroundColor = elementStyle.backgroundColor || elementStyle.color || elementStyle.borderColor || doc.brandStyle?.primaryColor || '#0F48C6';
          if (element.shape === 'circle') node.style.borderRadius = '999px';
        } else if (element.type === 'image') {
          node = createNode('div', { className: 'poster-overlay-node', 'data-type': element.type, style: style });
          if (element.src) {
            node.appendChild(createNode('img', { src: normalizeAssetPath(element.src), alt: element.alt || '' }));
          } else {
            node.appendChild(createNode('span', { text: 'Image' }));
          }
        } else if (element.type === 'icon') {
          node = createNode('div', { className: 'poster-overlay-node', 'data-type': element.type, style: style });
          const src = element.src || element.iconSrc || '';
          const iconClass = element.iconClass || element.icon || element.text || '';
          if (src) {
            node.appendChild(createNode('img', { src: src, alt: element.alt || '' }));
          } else if (iconClass) {
            node.appendChild(createNode('i', { className: iconClass, 'aria-hidden': 'true' }));
          } else {
            node.appendChild(createNode('span', { text: '?' }));
          }
        } else if (element.type === 'tag') {
          node = createNode('div', { className: 'poster-overlay-node', 'data-type': element.type, style: style });
          const textSpan = createNode('span', {
            dir: direction,
            style: { transform: element.textOffsetY ? `translateY(${element.textOffsetY}px)` : '' },
          });
          appendTextWithRiyalSymbols(textSpan, element.text || '');
          node.appendChild(textSpan);
        } else {
          node = createNode('div', {
            className: 'poster-overlay-node',
            'data-type': element.type,
            style: style,
          });
          const textSpan = createNode('span', {
            dir: direction,
            style: element.type === 'button' && element.textOffsetY ? { transform: `translateY(${element.textOffsetY}px)` } : {},
          });
          appendTextWithRiyalSymbols(textSpan, element.text || '');
          node.appendChild(textSpan);
        }
        if (index === selectedElementIndex && sceneId === selectedScene) node.classList.add('selected');
        const resizeHandle = createNode('span', { className: 'poster-overlay-resize', title: 'Resize' });
        node.appendChild(resizeHandle);
        attachNodeResize(sceneId, index, node, resizeHandle);
        attachNodeDrag(sceneId, index, node);
        host.appendChild(node);
      });
    }

    function renderAllScenes() {
      sceneIds().forEach(renderScene);
    }

    function syncJsonEditor() {
      if (!selectedScene) return;
      const doc = readDoc(selectedScene) || defaultDocument(selectedScene, config);
      const sceneImage = currentSceneImageSource(selectedScene);
      if (doc.backgroundImage) doc.backgroundImage = normalizeAssetPath(doc.backgroundImage);
      if (sceneImage) doc.backgroundImage = sceneImage;
      refs.jsonInput.value = !doc.elements || !doc.elements.length
        ? ''
        : JSON.stringify(doc, null, 2);
      refs.backgroundInput.value = doc.backgroundImage || '';
    }

    function updateSceneDoc(sceneId, updater, options) {
      const doc = readDoc(sceneId);
      if (!doc) return;
      const next = JSON.parse(JSON.stringify(doc));
      updater(next);
      const result = validateOverlayDoc(next);
      if (!result.ok) {
        setStatus(result.errors.join('\n'), 'error');
        return;
      }
      writeDoc(sceneId, next);
      if (selectedScene === sceneId) {
        refs.jsonInput.value = JSON.stringify(next, null, 2);
        refs.backgroundInput.value = next.backgroundImage || '';
      }
      renderScene(sceneId);
      if (!options || options.renderEditors !== false) renderEditors(sceneId);
    }

    function createEditorField(label, input) {
      return createNode('div', {
        className: 'poster-overlay-stack',
        children: [
          createNode('label', { text: label }),
          input,
        ],
      });
    }

    function createInput(type, value) {
      const input = document.createElement('input');
      input.type = type === 'number' ? 'text' : type;
      if (type === 'number') {
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.spellcheck = false;
      }
      if (type === 'checkbox') input.checked = !!value;
      else input.value = value === undefined || value === null ? '' : String(value);
      return input;
    }

    function createTextArea(value) {
      const input = document.createElement('textarea');
      input.className = 'poster-overlay-textarea';
      input.value = value === undefined || value === null ? '' : String(value);
      return input;
    }

    function parseEditorNumber(value) {
      const clean = String(value ?? '').trim();
      if (!clean || clean === '-' || clean === '.' || clean === '-.') return null;
      const parsed = Number(clean);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function bindNumberInput(input, applyValue, options) {
      const opts = options || {};
      let lastValid = input.value;
      function commit(renderEditors) {
        const parsed = parseEditorNumber(input.value);
        if (parsed === null) {
          input.classList.toggle('numeric-invalid', input.value.trim() !== '');
          return false;
        }
        input.classList.remove('numeric-invalid');
        lastValid = input.value;
        applyValue(parsed, renderEditors);
        return true;
      }
      input.addEventListener('input', function () {
        if (opts.optional && input.value.trim() === '') {
          input.classList.remove('numeric-invalid');
          lastValid = '';
          applyValue(undefined, false);
          return;
        }
        commit(false);
      });
      input.addEventListener('change', function () {
        if (opts.optional && input.value.trim() === '') {
          input.classList.remove('numeric-invalid');
          applyValue(undefined, true);
          return;
        }
        commit(true);
      });
      input.addEventListener('blur', function () {
        if (opts.optional && input.value.trim() === '') {
          input.classList.remove('numeric-invalid');
          return;
        }
        if (!commit(true)) {
          input.value = lastValid;
          input.classList.remove('numeric-invalid');
        }
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          input.blur();
        }
      });
    }

    function createSelect(options, value) {
      const select = document.createElement('select');
      select.innerHTML = options.map(function (option) {
        return `<option value="${option}">${option}</option>`;
      }).join('');
      select.value = value || options[0];
      return select;
    }

    function addIconElement(sceneId) {
      ensureOverlayDocument(sceneId);
      updateSceneDoc(sceneId, function (next) {
        const count = Array.isArray(next.elements) ? next.elements.length : 0;
        next.elements = next.elements || [];
        next.elements.push({
          id: `icon-${count + 1}`,
          type: 'icon',
          iconClass: 'fa-solid fa-star',
          src: '',
          alt: '',
          frame: { x: 80, y: 80, width: 96, height: 96 },
          style: {
            color: next.brandStyle?.primaryColor || '#0F48C6',
            fontSize: 72,
            opacity: 1,
          },
          zIndex: 20 + count,
          visible: true,
          animation: { preset: 'fadeIn', startFrame: 0, durationFrames: 18 },
        });
        selectedElementIndex = next.elements.length - 1;
      });
    }

    function renderEditors(sceneId) {
      refs.editor.innerHTML = '';
      const doc = readDoc(sceneId);
      if (!doc) {
        selectedElementIndex = null;
        const uploadButton = createNode('button', { className: 'poster-overlay-btn', type: 'button', text: 'Upload image' });
        const pasteButton = createNode('button', { className: 'poster-overlay-btn secondary', type: 'button', text: 'Paste image' });
        const iconButton = createNode('button', { className: 'poster-overlay-btn secondary', type: 'button', text: 'Add icon' });
        uploadButton.addEventListener('click', function () { chooseImageFiles(sceneId); });
        pasteButton.addEventListener('click', function () { pasteImageElement(sceneId); });
        iconButton.addEventListener('click', function () { ensureOverlayDocument(sceneId); addIconElement(sceneId); });
        refs.editor.appendChild(createNode('div', {
          className: 'poster-overlay-card',
          children: [
            createNode('h4', { html: `<span>Scene ${sceneId}</span><small>No overlay elements</small>` }),
            createNode('div', { className: 'poster-overlay-help', text: 'Add an image or icon on top of this scene. It will become movable, resizable, hideable, and animatable.' }),
            createNode('div', { className: 'poster-overlay-actions', children: [uploadButton, pasteButton, iconButton] }),
          ],
        }));
        return;
      }
      if (!Number.isFinite(selectedElementIndex) || selectedElementIndex < 0 || selectedElementIndex >= doc.elements.length) {
        selectedElementIndex = null;
      }
      const bgAnim = createSelect(BG_PRESETS, (doc.backgroundAnimation && doc.backgroundAnimation.preset) || 'none');
      bgAnim.addEventListener('change', function () {
        updateSceneDoc(sceneId, function (next) {
          next.backgroundAnimation = { preset: bgAnim.value };
        });
      });
      const moveAllX = createInput('number', 0);
      const moveAllY = createInput('number', 0);
      const moveAllButton = createNode('button', {
        className: 'poster-overlay-btn secondary',
        type: 'button',
        text: 'Move all',
      });
      const addIconButton = createNode('button', {
        className: 'poster-overlay-btn',
        type: 'button',
        text: 'Add icon',
      });
      const addImageButton = createNode('button', {
        className: 'poster-overlay-btn',
        type: 'button',
        text: 'Upload image',
      });
      const pasteImageButton = createNode('button', {
        className: 'poster-overlay-btn secondary',
        type: 'button',
        text: 'Paste image',
      });
      moveAllButton.addEventListener('click', function () {
        moveAllElements(sceneId, Number(moveAllX.value || 0), Number(moveAllY.value || 0));
        moveAllX.value = '0';
        moveAllY.value = '0';
      });
      addIconButton.addEventListener('click', function () {
        addIconElement(sceneId);
      });
      addImageButton.addEventListener('click', function () {
        chooseImageFiles(sceneId);
      });
      pasteImageButton.addEventListener('click', function () {
        pasteImageElement(sceneId);
      });
      const nudgeRow = createNode('div', { className: 'poster-overlay-actions' });
      [
        ['←', -10, 0],
        ['↑', 0, -10],
        ['↓', 0, 10],
        ['→', 10, 0],
      ].forEach(function (item) {
        const button = createNode('button', {
          className: 'poster-overlay-btn secondary',
          type: 'button',
          text: item[0],
        });
        button.addEventListener('click', function () {
          moveAllElements(sceneId, item[1], item[2]);
        });
        nudgeRow.appendChild(button);
      });
      refs.editor.appendChild(createNode('div', {
        className: 'poster-overlay-card',
        children: [
          createNode('h4', { html: `<span>Scene ${sceneId}</span><small>${doc.elements.length} elements</small>` }),
          createEditorField('Background animation', bgAnim),
          createNode('div', {
            className: 'poster-overlay-inline',
            children: [
              createEditorField('Move all X', moveAllX),
              createEditorField('Move all Y', moveAllY),
            ],
          }),
          moveAllButton,
          addImageButton,
          pasteImageButton,
          addIconButton,
          nudgeRow,
        ],
      }));

      doc.elements.forEach(function (element, index) {
        const frame = getFrame(element);
        const elementStyle = getElementStyle(element);
        const card = createNode('div', {
          className: 'poster-overlay-card' + (index === selectedElementIndex ? ' selected' : ''),
          'data-overlay-index': index,
        });
        const deleteButton = createNode('button', {
          className: 'poster-overlay-btn secondary',
          type: 'button',
          text: 'Delete',
        });
        deleteButton.addEventListener('click', function () {
          updateSceneDoc(sceneId, function (next) {
            next.elements.splice(index, 1);
            selectedElementIndex = null;
          });
        });
        card.appendChild(createNode('h4', {
          children: [
            createNode('span', { text: element.id }),
            createNode('small', { text: element.type }),
          ],
        }));
        card.appendChild(deleteButton);

        if (element.type !== 'shape' && element.type !== 'image') {
          const textInput = createTextArea(editorValue(element.text, ''));
          textInput.addEventListener('input', function () {
            updateSceneDoc(sceneId, function (next) { next.elements[index].text = textInput.value; }, { renderEditors: false });
          });
          card.appendChild(createEditorField(element.type === 'icon' ? 'Fallback text' : 'Text', textInput));
        }

        if (element.type === 'image') {
          const rowImage = createNode('div', { className: 'poster-overlay-inline' });
          const imageSrcInput = createInput('text', editorValue(element.src, ''));
          const imageAltInput = createInput('text', editorValue(element.alt, ''));
          imageSrcInput.placeholder = 'public/generated/... or https://...';
          imageAltInput.placeholder = 'Image label';
          imageSrcInput.addEventListener('input', function () {
            updateSceneDoc(sceneId, function (next) { next.elements[index].src = imageSrcInput.value || undefined; }, { renderEditors: false });
          });
          imageAltInput.addEventListener('input', function () {
            updateSceneDoc(sceneId, function (next) { next.elements[index].alt = imageAltInput.value || undefined; }, { renderEditors: false });
          });
          rowImage.appendChild(createEditorField('Image URL', imageSrcInput));
          rowImage.appendChild(createEditorField('Label', imageAltInput));
          card.appendChild(rowImage);
        }

        if (element.type === 'icon') {
          const rowIcon = createNode('div', { className: 'poster-overlay-inline' });
          const iconClassInput = createInput('text', editorValue(element.iconClass || element.icon, 'fa-solid fa-star'));
          const iconSrcInput = createInput('text', editorValue(element.src || element.iconSrc, ''));
          iconClassInput.placeholder = 'fa-solid fa-phone';
          iconSrcInput.placeholder = 'https://.../icon.svg';
          iconClassInput.addEventListener('input', function () {
            updateSceneDoc(sceneId, function (next) { next.elements[index].iconClass = iconClassInput.value || undefined; }, { renderEditors: false });
          });
          iconSrcInput.addEventListener('input', function () {
            updateSceneDoc(sceneId, function (next) { next.elements[index].src = iconSrcInput.value || undefined; }, { renderEditors: false });
          });
          rowIcon.appendChild(createEditorField('Font Awesome class', iconClassInput));
          rowIcon.appendChild(createEditorField('Icon image URL', iconSrcInput));
          card.appendChild(rowIcon);
        }

        const row1 = createNode('div', { className: 'poster-overlay-inline' });
        const xInput = createInput('number', editorValue(frame.x, 0));
        const yInput = createInput('number', editorValue(frame.y, 0));
        const xSlider = createInput('range', editorValue(frame.x, 0));
        const ySlider = createInput('range', editorValue(frame.y, 0));
        xSlider.min = '0';
        xSlider.max = String(Math.max(0, (doc.canvas?.width || 1080) - frame.width));
        xSlider.step = '1';
        ySlider.min = '0';
        ySlider.max = String(Math.max(0, (doc.canvas?.height || 1350) - frame.height));
        ySlider.step = '1';
        function setElementX(value, renderEditors) {
          xInput.value = String(value);
          xSlider.value = String(value);
          updateSceneDoc(sceneId, function (next) { next.elements[index].frame.x = value; }, { renderEditors: renderEditors !== false });
        }
        function setElementY(value, renderEditors) {
          yInput.value = String(value);
          ySlider.value = String(value);
          updateSceneDoc(sceneId, function (next) { next.elements[index].frame.y = value; }, { renderEditors: renderEditors !== false });
        }
        bindNumberInput(xInput, setElementX);
        bindNumberInput(yInput, setElementY);
        xSlider.addEventListener('input', function () { setElementX(Number(xSlider.value), false); });
        ySlider.addEventListener('input', function () { setElementY(Number(ySlider.value), false); });
        row1.appendChild(createEditorField('X', xInput));
        row1.appendChild(createEditorField('Y', yInput));
        card.appendChild(row1);
        const row1b = createNode('div', { className: 'poster-overlay-inline' });
        row1b.appendChild(createEditorField('Slide X', xSlider));
        row1b.appendChild(createEditorField('Slide Y', ySlider));
        card.appendChild(row1b);

        const row2 = createNode('div', { className: 'poster-overlay-inline' });
        const widthInput = createInput('number', editorValue(frame.width, ''));
        const heightInput = createInput('number', editorValue(frame.height, ''));
        bindNumberInput(widthInput, function (value, renderEditors) {
          updateSceneDoc(sceneId, function (next) { next.elements[index].frame.width = value; }, { renderEditors: renderEditors !== false });
        });
        bindNumberInput(heightInput, function (value, renderEditors) {
          updateSceneDoc(sceneId, function (next) { next.elements[index].frame.height = value; }, { renderEditors: renderEditors !== false });
        });
        row2.appendChild(createEditorField('Width', widthInput));
        row2.appendChild(createEditorField('Height', heightInput));
        card.appendChild(row2);

        const row3 = createNode('div', { className: 'poster-overlay-inline' });
        const fontSizeInput = createInput('number', editorValue(elementStyle.fontSize, ''));
        const weightInput = createInput('number', editorValue(elementStyle.fontWeight, doc.brandStyle?.fontWeight || 400));
        bindNumberInput(fontSizeInput, function (value, renderEditors) {
          updateSceneDoc(sceneId, function (next) { next.elements[index].style.fontSize = value; }, { renderEditors: renderEditors !== false });
        }, { optional: true });
        bindNumberInput(weightInput, function (value, renderEditors) {
          updateSceneDoc(sceneId, function (next) { next.elements[index].style.fontWeight = value; }, { renderEditors: renderEditors !== false });
        }, { optional: true });
        row3.appendChild(createEditorField('Font size', fontSizeInput));
        row3.appendChild(createEditorField('Font weight', weightInput));
        card.appendChild(row3);

        const row4 = createNode('div', { className: 'poster-overlay-inline' });
        const fontInput = createInput('text', editorValue(elementStyle.fontFamily, doc.brandStyle?.fontFamily || 'Tajawal'));
        const alignInput = createSelect(ALIGN_OPTIONS, elementStyle.textAlign || (looksRtl(element.text || element.iconText) ? 'right' : 'left'));
        fontInput.addEventListener('input', function () { updateSceneDoc(sceneId, function (next) { next.elements[index].style.fontFamily = fontInput.value || undefined; }, { renderEditors: false }); });
        alignInput.addEventListener('change', function () { updateSceneDoc(sceneId, function (next) { next.elements[index].style.textAlign = alignInput.value; }); });
        row4.appendChild(createEditorField('Font family', fontInput));
        row4.appendChild(createEditorField('Align', alignInput));
        card.appendChild(row4);

        const row5 = createNode('div', { className: 'poster-overlay-inline' });
        const colorInput = createInput('text', editorValue(elementStyle.color, doc.brandStyle?.primaryColor || '#0F48C6'));
        const bgInput = createInput('text', editorValue(elementStyle.backgroundColor, ''));
        colorInput.addEventListener('input', function () { updateSceneDoc(sceneId, function (next) { next.elements[index].style.color = colorInput.value || undefined; }, { renderEditors: false }); });
        bgInput.addEventListener('input', function () { updateSceneDoc(sceneId, function (next) { next.elements[index].style.backgroundColor = bgInput.value || undefined; }, { renderEditors: false }); });
        row5.appendChild(createEditorField('Color', colorInput));
        row5.appendChild(createEditorField('Background', bgInput));
        card.appendChild(row5);

        const row6 = createNode('div', { className: 'poster-overlay-inline' });
        const presetInput = createSelect(ANIMATION_PRESETS, (element.animation && element.animation.preset) || 'none');
        const visibleInput = createInput('checkbox', element.visible !== false);
        presetInput.addEventListener('change', function () {
          updateSceneDoc(sceneId, function (next) {
            next.elements[index].animation = next.elements[index].animation || { preset: 'none', startFrame: 0, durationFrames: 18 };
            next.elements[index].animation.preset = presetInput.value;
          });
        });
        visibleInput.addEventListener('change', function () {
          updateSceneDoc(sceneId, function (next) { next.elements[index].visible = visibleInput.checked; });
        });
        row6.appendChild(createEditorField('Animation', presetInput));
        row6.appendChild(createEditorField('Visible', visibleInput));
        card.appendChild(row6);

        const row7 = createNode('div', { className: 'poster-overlay-inline' });
        const startInput = createInput('number', editorValue(element.animation && element.animation.startFrame, 0));
        const durInput = createInput('number', editorValue(element.animation && element.animation.durationFrames, 18));
        bindNumberInput(startInput, function (value, renderEditors) {
          updateSceneDoc(sceneId, function (next) {
            next.elements[index].animation = next.elements[index].animation || { preset: 'none', startFrame: 0, durationFrames: 18 };
            next.elements[index].animation.startFrame = value;
          }, { renderEditors: renderEditors !== false });
        });
        bindNumberInput(durInput, function (value, renderEditors) {
          updateSceneDoc(sceneId, function (next) {
            next.elements[index].animation = next.elements[index].animation || { preset: 'none', startFrame: 0, durationFrames: 18 };
            next.elements[index].animation.durationFrames = value;
          }, { renderEditors: renderEditors !== false });
        });
        row7.appendChild(createEditorField('Start frame (30f = 1s)', startInput));
        row7.appendChild(createEditorField('Duration (frames)', durInput));
        card.appendChild(row7);

        const row7b = createNode('div', { className: 'poster-overlay-inline' });
        const opacityInput = createInput('number', editorValue(elementStyle.opacity, 1));
        const rotationInput = createInput('number', editorValue(element.rotation, 0));
        bindNumberInput(opacityInput, function (value, renderEditors) {
          const clamped = Math.max(0, Math.min(1, value));
          opacityInput.value = String(clamped);
          updateSceneDoc(sceneId, function (next) {
            next.elements[index].style = next.elements[index].style || {};
            next.elements[index].style.opacity = clamped;
          }, { renderEditors: renderEditors !== false });
        }, { optional: true });
        bindNumberInput(rotationInput, function (value, renderEditors) {
          updateSceneDoc(sceneId, function (next) { next.elements[index].rotation = value; }, { renderEditors: renderEditors !== false });
        }, { optional: true });
        row7b.appendChild(createEditorField('Opacity (0-1)', opacityInput));
        row7b.appendChild(createEditorField('Rotation (deg)', rotationInput));
        card.appendChild(row7b);

        const row7c = createNode('div', { className: 'poster-overlay-inline' });
        const zInput = createInput('number', editorValue(element.zIndex, 10 + index));
        const lineHeightInput = createInput('number', editorValue(elementStyle.lineHeight, ''));
        bindNumberInput(zInput, function (value, renderEditors) {
          updateSceneDoc(sceneId, function (next) { next.elements[index].zIndex = value; }, { renderEditors: renderEditors !== false });
        }, { optional: true });
        bindNumberInput(lineHeightInput, function (value, renderEditors) {
          updateSceneDoc(sceneId, function (next) {
            next.elements[index].style = next.elements[index].style || {};
            next.elements[index].style.lineHeight = value;
          }, { renderEditors: renderEditors !== false });
        }, { optional: true });
        row7c.appendChild(createEditorField('Layer (z-index)', zInput));
        row7c.appendChild(createEditorField('Line height', lineHeightInput));
        card.appendChild(row7c);

        if (element.type === 'button' || element.type === 'tag') {
          const row8 = createNode('div', { className: 'poster-overlay-inline' });
          const radiusInput = createInput('number', editorValue(elementStyle.borderRadius, ''));
          const offsetInput = createInput('number', editorValue(element.textOffsetY, ''));
          bindNumberInput(radiusInput, function (value, renderEditors) {
            updateSceneDoc(sceneId, function (next) { next.elements[index].style.borderRadius = value; }, { renderEditors: renderEditors !== false });
          }, { optional: true });
          bindNumberInput(offsetInput, function (value, renderEditors) {
            updateSceneDoc(sceneId, function (next) { next.elements[index].textOffsetY = value; }, { renderEditors: renderEditors !== false });
          }, { optional: true });
          row8.appendChild(createEditorField('Radius', radiusInput));
          row8.appendChild(createEditorField('Text offset Y', offsetInput));
          card.appendChild(row8);
        }

        refs.editor.appendChild(card);
      });
    }

    function loadScene(sceneId) {
      if (selectedScene !== sceneId) selectedElementIndex = null;
      selectedScene = sceneId;
      syncSceneSelect();
      const sceneImage = currentSceneImageSource(sceneId);
      if (sceneImage) {
        const doc = readDoc(sceneId);
        if (doc && doc.backgroundImage !== sceneImage) {
          doc.backgroundImage = sceneImage;
          writeDocLocal(sceneId, doc);
        }
      }
      syncJsonEditor();
      renderEditors(sceneId);
    }

    refs.backgroundInput.addEventListener('change', function () {
      const src = refs.backgroundInput.value.trim();
      if (src) setBackgroundSource(src, 'Background path');
    });

    refs.backgroundInput.addEventListener('paste', function (event) {
      handleBackgroundPaste(event);
    });

    refs.backgroundDrop.addEventListener('click', function () {
      refs.backgroundFile.click();
    });

    refs.backgroundDrop.addEventListener('dragover', function (event) {
      event.preventDefault();
      refs.backgroundDrop.classList.add('drag');
    });

    refs.backgroundDrop.addEventListener('dragleave', function () {
      refs.backgroundDrop.classList.remove('drag');
    });

    refs.backgroundDrop.addEventListener('drop', function (event) {
      event.preventDefault();
      refs.backgroundDrop.classList.remove('drag');
      const file = Array.from(event.dataTransfer?.files || []).find(function (item) {
        return String(item.type || '').startsWith('image/');
      });
      handleBackgroundFile(file);
    });

    refs.backgroundDrop.addEventListener('paste', function (event) {
      handleBackgroundPaste(event);
    });

    refs.backgroundFile.addEventListener('change', function () {
      handleBackgroundFile(refs.backgroundFile.files && refs.backgroundFile.files[0]);
      refs.backgroundFile.value = '';
    });

    refs.group.addEventListener('paste', function (event) {
      handleBackgroundPaste(event);
    });

    refs.sceneSelect.addEventListener('change', function () {
      loadScene(refs.sceneSelect.value);
    });

    refs.applyButton.addEventListener('click', function () {
      const sceneId = refs.sceneSelect.value || selectedScene;
      if (!sceneId) return;
      let parsed;
      try {
        parsed = JSON.parse(refs.jsonInput.value);
      } catch (error) {
        setStatus(`Invalid JSON: ${error.message}`, 'error');
        return;
      }
      const sceneImage = currentSceneImageSource(sceneId);
      if (sceneImage) parsed.backgroundImage = sceneImage;
      else if (refs.backgroundInput.value.trim()) parsed.backgroundImage = refs.backgroundInput.value.trim();
      parsed = normalizeOverlayDocument(parsed, sceneId, config);
      if (!parsed.backgroundAnimation) parsed.backgroundAnimation = { preset: 'none' };
      const result = validateOverlayDoc(parsed);
      if (!result.ok) {
        setStatus(result.errors.join('\n'), 'error');
        return;
      }
      writeDoc(sceneId, parsed);
      renderScene(sceneId);
      renderEditors(sceneId);
      refs.jsonInput.value = JSON.stringify(parsed, null, 2);
      setStatus(`Overlay applied to Scene ${sceneId}.`, 'ok');
      toast(`🪄 Overlay applied to Scene ${sceneId}`);
    });

    refs.clearButton.addEventListener('click', async function () {
      const sceneId = refs.sceneSelect.value || selectedScene;
      if (!sceneId) return;
      const existing = readDoc(sceneId) || parseJsonEditorFallback(sceneId);
      const sceneImage = currentSceneImageSource(sceneId);
      const next = {
        ...defaultDocument(sceneId, config),
        ...existing,
        backgroundImage: normalizeAssetPath(
          sceneImage ||
          existing.backgroundImage ||
          refs.backgroundInput.value.trim() ||
          defaultDocument(sceneId, config).backgroundImage
        ),
        elements: [],
        __clearedOverlay: true,
      };
      refs.clearButton.disabled = true;
      await writeDoc(sceneId, next);
      refs.clearButton.disabled = false;
      renderScene(sceneId);
      renderEditors(sceneId);
      refs.jsonInput.value = '';
      refs.backgroundInput.value = next.backgroundImage || '';
      setStatus(`Scene ${sceneId} overlay elements cleared. Background kept.`, 'ok');
      toast(`🧹 Cleared elements from Scene ${sceneId}`);
    });

    refs.clearBackgroundButton.addEventListener('click', function () {
      const sceneId = refs.sceneSelect.value || selectedScene;
      if (!sceneId) return;
      const blank = normalizeAssetPath(config.blankBackground || 'public/generated/blank-white.svg');
      const existing = readDoc(sceneId) || parseJsonEditorFallback(sceneId);
      const next = {
        ...defaultDocument(sceneId, config),
        ...existing,
        backgroundImage: blank,
      };
      writeDoc(sceneId, next);
      applySceneImage(sceneId, blank);
      renderScene(sceneId);
      syncJsonEditor();
      renderEditors(sceneId);
      setStatus(`Scene ${sceneId} background cleared. Overlay elements kept.`, 'ok');
      toast(`🖼 Cleared background for Scene ${sceneId}`);
    });

    const observer = new MutationObserver(function () {
      const before = selectedScene;
      syncSceneSelect();
      if (before !== selectedScene) syncJsonEditor();
      renderAllScenes();
      renderEditors(selectedScene);
    });
    const stageRoot = document.querySelector(config.stageSelector || '#stage');
    const tabsRoot = document.querySelector(config.tabsSelector || '.tabs');
    if (stageRoot) observer.observe(stageRoot, { childList: true, subtree: false });
    if (tabsRoot) observer.observe(tabsRoot, { childList: true, subtree: false });

    document.addEventListener('click', function (event) {
      const tab = event.target && event.target.closest ? event.target.closest('.tab[data-scene]') : null;
      if (!tab) return;
      const sceneId = tab.dataset.scene;
      if (!sceneId || sceneId === 'all') return;
      if (selectedScene === String(sceneId)) return;
      setTimeout(function () { loadScene(sceneId); }, 0);
    });

    document.addEventListener('sl:scenechange', function (event) {
      const sceneId = String(event.detail && event.detail.sceneId || '');
      if (!sceneId || sceneId === 'all') return;
      loadScene(sceneId);
    });

    syncSceneSelect();
    loadScene(selectedScene || sceneIds()[0]);
    renderAllScenes();
    loadServerState().then(function (serverState) {
      if (!serverState || !Object.keys(serverState).length) return;
      storedState = { ...storedState, ...serverState };
      persistStoredState();
      sceneIds().forEach(function (sceneId) {
        const input = ensureHiddenInput(sceneId);
        input.value = storedState[sceneId] ? JSON.stringify(storedState[sceneId]) : '';
      });
      renderAllScenes();
      syncJsonEditor();
      renderEditors(selectedScene);
    });

    // ── Brand Kit ──────────────────────────────────────────────
    // Define brand color / font once and push it across every scene. Each
    // overlay doc carries a `brandStyle` (primaryColor/fontFamily/fontWeight)
    // that elements fall back to, but most brand-blue text/shapes have an
    // explicit `style.color`, so we also swap any element whose color matches
    // the old brand color to the new one. That makes "change the blue" a
    // one-click, all-scenes operation instead of editing 20 scenes by hand.
    const brandKitStorageKey = `${config.projectId}-brand-kit-v1`;

    function readBrandKit() {
      try {
        const v = JSON.parse(localStorage.getItem(brandKitStorageKey) || '{}');
        return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
      } catch (_error) { return {}; }
    }
    function persistBrandKit(kit) {
      try { localStorage.setItem(brandKitStorageKey, JSON.stringify(kit)); } catch (_error) {}
    }
    function normHex(color) {
      return typeof color === 'string' ? color.trim().toLowerCase() : '';
    }
    // Most common explicit element color across all scenes — the brand color
    // we'll offer to replace by default.
    function detectDominantColor() {
      const counts = {};
      sceneIds().forEach(function (sceneId) {
        const doc = readDoc(sceneId);
        if (!doc || !Array.isArray(doc.elements)) return;
        doc.elements.forEach(function (el) {
          const c = normHex(el.style && el.style.color);
          if (c && c[0] === '#') counts[c] = (counts[c] || 0) + 1;
        });
      });
      let best = '', bestN = 0;
      Object.keys(counts).forEach(function (c) { if (counts[c] > bestN) { best = c; bestN = counts[c]; } });
      return best;
    }
    function applyBrandKit(kit) {
      const primary = (kit.primaryColor || '').trim();
      const fromColor = normHex(kit.replaceColor);
      const font = (kit.fontFamily || '').trim();
      const weight = kit.fontWeight ? Number(kit.fontWeight) : null;
      let scenes = 0, swaps = 0;
      sceneIds().forEach(function (sceneId) {
        const doc = readDoc(sceneId);
        if (!doc) return;
        doc.brandStyle = doc.brandStyle || {};
        if (primary) doc.brandStyle.primaryColor = primary;
        if (font) doc.brandStyle.fontFamily = font;
        if (weight) doc.brandStyle.fontWeight = weight;
        if (primary && fromColor && Array.isArray(doc.elements)) {
          doc.elements.forEach(function (el) {
            if (!el.style) return;
            ['color', 'backgroundColor', 'borderColor'].forEach(function (k) {
              if (normHex(el.style[k]) === fromColor) { el.style[k] = primary; swaps += 1; }
            });
          });
        }
        writeDoc(sceneId, doc);
        renderScene(sceneId);
        scenes += 1;
      });
      if (typeof syncJsonEditor === 'function') syncJsonEditor();
      renderEditors(selectedScene);
      return { scenes: scenes, swaps: swaps };
    }

    (function buildBrandKitPanel() {
      const saved = readBrandKit();
      const seedColor = saved.primaryColor || detectDominantColor() || (config.primaryColor || '#1A9DD7');
      const swatchStyle = { height: '34px', minHeight: '34px', padding: '2px', cursor: 'pointer' };
      const primaryInput = createNode('input', { type: 'color', value: saved.primaryColor || seedColor, style: swatchStyle });
      const replaceInput = createNode('input', { type: 'color', value: saved.replaceColor || detectDominantColor() || seedColor, style: swatchStyle });
      const fontInput = createNode('input', { type: 'text', placeholder: 'Tajawal, Cairo, Arial, sans-serif', value: saved.fontFamily || '' });
      const weightInput = createNode('input', { type: 'number', placeholder: '700', value: saved.fontWeight || '' });
      const applyBtn = createNode('button', { className: 'poster-overlay-btn', type: 'button', text: '🎨 Apply to all scenes' });
      const saveBtn = createNode('button', { className: 'poster-overlay-btn secondary', type: 'button', text: 'Save kit' });
      const status = createNode('pre', { className: 'poster-overlay-status' });

      function currentKit() {
        return {
          primaryColor: primaryInput.value,
          replaceColor: replaceInput.value,
          fontFamily: fontInput.value.trim(),
          fontWeight: weightInput.value ? Number(weightInput.value) : '',
        };
      }
      const stack = function (labelText, input) {
        return createNode('div', {
          className: 'poster-overlay-stack',
          children: [createNode('label', { text: labelText }), input],
        });
      };

      saveBtn.addEventListener('click', function () {
        persistBrandKit(currentKit());
        status.textContent = 'Brand kit saved.';
        status.className = 'poster-overlay-status ok';
      });
      applyBtn.addEventListener('click', function () {
        const kit = currentKit();
        persistBrandKit(kit);
        const result = applyBrandKit(kit);
        const msg = `Applied to ${result.scenes} scene${result.scenes === 1 ? '' : 's'}` +
          (result.swaps ? ` · recolored ${result.swaps} element${result.swaps === 1 ? '' : 's'}` : '');
        status.textContent = msg;
        status.className = 'poster-overlay-status ok';
        toast('🎨 ' + msg);
      });

      const brandGroup = createNode('details', {
        className: 'group poster-overlay-group',
        open: 'open',
        // Always visible regardless of which scene tab is active (the studio
        // hides control groups whose data-scene doesn't match the selection).
        'data-scene': 'all',
        children: [
          createNode('summary', { html: '<h3>🎨 Brand Kit <span class="badge">color + font, all scenes</span></h3>' }),
          createNode('div', {
            className: 'group-content',
            children: [
              createNode('div', { className: 'poster-overlay-help', text: 'Set your brand color and font once, then push them to every scene. "Replace color" swaps the old brand color wherever it appears.' }),
              createNode('div', {
                className: 'poster-overlay-inline',
                children: [stack('Brand color', primaryInput), stack('Replace color', replaceInput)],
              }),
              createNode('div', {
                className: 'poster-overlay-inline',
                children: [stack('Font family', fontInput), stack('Font weight', weightInput)],
              }),
              createNode('div', {
                className: 'poster-overlay-actions',
                children: [applyBtn, saveBtn],
              }),
              status,
            ],
          }),
        ],
      });
      panelBody.insertBefore(brandGroup, panelBody.firstChild);
    })();

    const api = {
      getRenderState: function () {
        const out = {};
        sceneIds().forEach(function (sceneId) {
          const doc = readDoc(sceneId);
          if (doc) out[sceneId] = doc;
        });
        return out;
      },
      applyBrandKit: applyBrandKit,
      getBrandKit: readBrandKit,
      uploadOverlayImage: function (sceneId) {
        const target = String(sceneId || selectedScene || activeSceneFromTabs() || sceneIds()[0] || '');
        if (!target) return false;
        chooseImageFiles(target);
        return true;
      },
      pasteOverlayImage: function (sceneId) {
        const target = String(sceneId || selectedScene || activeSceneFromTabs() || sceneIds()[0] || '');
        if (!target) return false;
        pasteImageElement(target);
        return true;
      },
      refresh: function () {
        syncSceneSelect();
        renderAllScenes();
        renderEditors(selectedScene);
      },
      playSceneAnimations: function (sceneId) {
        const previous = !!config.previewAnimations;
        config.previewAnimations = true;
        renderScene(String(sceneId || selectedScene || sceneIds()[0] || '1'));
        config.previewAnimations = previous;
        return true;
      },
      stopPreviewAnimations: function (sceneId) {
        if (sceneId) renderScene(String(sceneId));
        else renderAllScenes();
        return true;
      },
      cloneSceneDocument: function (fromSceneId, toSceneId) {
        const source = readDoc(String(fromSceneId));
        if (!source) return false;
        const next = JSON.parse(JSON.stringify(source));
        next.id = `${config.projectId || 'poster'}-scene-${toSceneId}`;
        writeDoc(String(toSceneId), next);
        syncSceneSelect();
        renderScene(String(toSceneId));
        renderEditors(selectedScene);
        return true;
      },
      clearSceneDocument: function (sceneId) {
        sceneId = String(sceneId);
        writeDocLocal(sceneId, null);
        renderScene(sceneId);
        syncJsonEditor();
        renderEditors(selectedScene);
        return true;
      },
    };
    window.posterOverlayStudio = api;
    return api;
  };
})();
