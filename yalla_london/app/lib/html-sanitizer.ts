/**
 * HTML Sanitization Utility
 * Prevents XSS attacks in dangerouslySetInnerHTML content.
 * Uses DOMPurify to strip malicious scripts, event handlers, and dangerous attributes.
 */
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'img', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'code', 'pre', 'hr', 'figure', 'figcaption',
  'div', 'span', 'section', 'article',
  'sup', 'sub', 'mark', 'small',
  'dl', 'dt', 'dd', 'abbr', 'cite',
  'video', 'source', 'iframe',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'id',
  'style', 'width', 'height', 'loading', 'decoding',
  'colspan', 'rowspan', 'scope',
  'allowfullscreen', 'frameborder', 'allow',
  'type', 'controls', 'poster',
  'data-affiliate-id', 'data-partner',
];

/** Sanitize HTML content for safe rendering via dangerouslySetInnerHTML */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  });
}

const SVG_ALLOWED_TAGS = [
  ...ALLOWED_TAGS,
  'svg', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon',
  'g', 'defs', 'clipPath', 'mask', 'use', 'symbol',
  'text', 'tspan', 'textPath',
  'linearGradient', 'radialGradient', 'stop',
  'filter', 'feGaussianBlur', 'feOffset', 'feMerge', 'feMergeNode', 'feBlend',
  'pattern', 'image', 'foreignObject',
];

const SVG_ALLOWED_ATTR = [
  ...ALLOWED_ATTR,
  'viewBox', 'xmlns', 'xmlns:xlink', 'fill', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset',
  'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'points', 'transform', 'opacity', 'fill-opacity', 'stroke-opacity',
  'fill-rule', 'clip-rule', 'clip-path', 'mask',
  'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline',
  'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform',
  'patternUnits', 'patternTransform', 'preserveAspectRatio',
  'xlink:href', 'href',
];

/** Sanitize SVG content for safe rendering via dangerouslySetInnerHTML */
export function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  return DOMPurify.sanitize(svg, {
    ALLOWED_TAGS: SVG_ALLOWED_TAGS,
    ALLOWED_ATTR: SVG_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
