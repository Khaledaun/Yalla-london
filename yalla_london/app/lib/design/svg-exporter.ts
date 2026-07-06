/**
 * Konva Stage JSON to SVG Exporter
 *
 * Converts Konva stage JSON data into clean SVG markup.
 * Handles common Konva node types used in the design studio:
 * Rect, Circle, Ellipse, Line, Text, Image, Group, Star.
 *
 * Supports transforms (rotation, scale, offset) and opacity.
 */

// ─── Types ────────────────────────────────────────────────────────

interface KonvaNode {
  className?: string;
  attrs?: Record<string, unknown>;
  children?: KonvaNode[];
}

// ─── Escape helpers ───────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Transform builder ───────────────────────────────────────────

function buildTransform(attrs: Record<string, unknown>): string {
  const parts: string[] = [];

  const x = Number(attrs.x) || 0;
  const y = Number(attrs.y) || 0;
  const rotation = Number(attrs.rotation) || 0;
  const scaleX = attrs.scaleX != null ? Number(attrs.scaleX) : 1;
  const scaleY = attrs.scaleY != null ? Number(attrs.scaleY) : 1;
  const offsetX = Number(attrs.offsetX) || 0;
  const offsetY = Number(attrs.offsetY) || 0;

  // Konva transform order: translate to position, rotate, scale, then offset
  if (x !== 0 || y !== 0) {
    parts.push(`translate(${x}, ${y})`);
  }

  if (rotation !== 0) {
    parts.push(`rotate(${rotation})`);
  }

  if (scaleX !== 1 || scaleY !== 1) {
    parts.push(`scale(${scaleX}, ${scaleY})`);
  }

  if (offsetX !== 0 || offsetY !== 0) {
    parts.push(`translate(${-offsetX}, ${-offsetY})`);
  }

  return parts.length > 0 ? ` transform="${parts.join(" ")}"` : "";
}

// ─── Common attribute builder ─────────────────────────────────────

function buildCommonAttrs(attrs: Record<string, unknown>): string {
  const parts: string[] = [];

  if (attrs.opacity != null && Number(attrs.opacity) !== 1) {
    parts.push(`opacity="${attrs.opacity}"`);
  }

  if (attrs.id) {
    parts.push(`id="${escapeXml(String(attrs.id))}"`);
  }

  if (attrs.name) {
    parts.push(`data-name="${escapeXml(String(attrs.name))}"`);
  }

  return parts.length > 0 ? " " + parts.join(" ") : "";
}

// ─── Stroke attributes ───────────────────────────────────────────

function buildStrokeAttrs(attrs: Record<string, unknown>): string {
  const parts: string[] = [];

  if (attrs.stroke) {
    parts.push(`stroke="${escapeXml(String(attrs.stroke))}"`);
  }

  if (attrs.strokeWidth != null) {
    parts.push(`stroke-width="${attrs.strokeWidth}"`);
  }

  if (attrs.dash) {
    const dashArray = Array.isArray(attrs.dash) ? attrs.dash.join(",") : String(attrs.dash);
    parts.push(`stroke-dasharray="${dashArray}"`);
  }

  if (attrs.lineJoin) {
    parts.push(`stroke-linejoin="${attrs.lineJoin}"`);
  }

  if (attrs.lineCap) {
    parts.push(`stroke-linecap="${attrs.lineCap}"`);
  }

  return parts.length > 0 ? " " + parts.join(" ") : "";
}

// ─── Node converters ──────────────────────────────────────────────

function convertRect(attrs: Record<string, unknown>): string {
  const width = Number(attrs.width) || 0;
  const height = Number(attrs.height) || 0;
  const fill = attrs.fill ? ` fill="${escapeXml(String(attrs.fill))}"` : ' fill="none"';
  const cornerRadius = Number(attrs.cornerRadius) || 0;
  const rx = cornerRadius > 0 ? ` rx="${cornerRadius}" ry="${cornerRadius}"` : "";

  return `<rect width="${width}" height="${height}"${fill}${rx}${buildStrokeAttrs(attrs)}${buildCommonAttrs(attrs)}${buildTransform(attrs)}/>`;
}

function convertCircle(attrs: Record<string, unknown>): string {
  const x = Number(attrs.x) || 0;
  const y = Number(attrs.y) || 0;
  const radius = Number(attrs.radius) || 0;
  const fill = attrs.fill ? ` fill="${escapeXml(String(attrs.fill))}"` : ' fill="none"';

  // Circle uses cx/cy instead of transform translate for position
  const transformAttrs = { ...attrs, x: 0, y: 0 };

  return `<circle cx="${x}" cy="${y}" r="${radius}"${fill}${buildStrokeAttrs(attrs)}${buildCommonAttrs(attrs)}${buildTransform(transformAttrs)}/>`;
}

function convertEllipse(attrs: Record<string, unknown>): string {
  const x = Number(attrs.x) || 0;
  const y = Number(attrs.y) || 0;
  const radiusX = Number(attrs.radiusX) || 0;
  const radiusY = Number(attrs.radiusY) || 0;
  const fill = attrs.fill ? ` fill="${escapeXml(String(attrs.fill))}"` : ' fill="none"';

  const transformAttrs = { ...attrs, x: 0, y: 0 };

  return `<ellipse cx="${x}" cy="${y}" rx="${radiusX}" ry="${radiusY}"${fill}${buildStrokeAttrs(attrs)}${buildCommonAttrs(attrs)}${buildTransform(transformAttrs)}/>`;
}

function convertLine(attrs: Record<string, unknown>): string {
  const points = attrs.points as number[] | undefined;
  if (!points || points.length < 2) return "";

  const fill = attrs.fill ? ` fill="${escapeXml(String(attrs.fill))}"` : ' fill="none"';
  const closed = Boolean(attrs.closed);

  if (points.length === 4 && !closed) {
    // Simple two-point line
    return `<line x1="${points[0]}" y1="${points[1]}" x2="${points[2]}" y2="${points[3]}"${fill}${buildStrokeAttrs(attrs)}${buildCommonAttrs(attrs)}${buildTransform(attrs)}/>`;
  }

  // Multi-point: polyline or polygon
  const pointPairs: string[] = [];
  for (let i = 0; i < points.length; i += 2) {
    pointPairs.push(`${points[i]},${points[i + 1]}`);
  }
  const pointsStr = pointPairs.join(" ");
  const tag = closed ? "polygon" : "polyline";

  return `<${tag} points="${pointsStr}"${fill}${buildStrokeAttrs(attrs)}${buildCommonAttrs(attrs)}${buildTransform(attrs)}/>`;
}

function convertText(attrs: Record<string, unknown>): string {
  const text = String(attrs.text || "");
  if (!text) return "";

  const fontSize = Number(attrs.fontSize) || 16;
  const fontFamily = attrs.fontFamily ? escapeXml(String(attrs.fontFamily)) : "sans-serif";
  const fontStyle = String(attrs.fontStyle || "normal");
  const fontWeight = fontStyle.includes("bold") ? "bold" : "normal";
  const isItalic = fontStyle.includes("italic");
  const fill = attrs.fill ? escapeXml(String(attrs.fill)) : "#000000";
  const textDecoration = attrs.textDecoration ? String(attrs.textDecoration) : "";

  // Text alignment
  let textAnchor = "start";
  const align = String(attrs.align || "left");
  if (align === "center") textAnchor = "middle";
  else if (align === "right") textAnchor = "end";

  // Vertical alignment — approximate with dy
  let dy = "0.8em"; // default baseline approximation
  const verticalAlign = String(attrs.verticalAlign || "top");
  if (verticalAlign === "middle") dy = "0.4em";
  else if (verticalAlign === "bottom") dy = "0em";

  const styleParts: string[] = [];
  if (isItalic) styleParts.push("font-style:italic");
  if (textDecoration) styleParts.push(`text-decoration:${textDecoration}`);
  if (attrs.letterSpacing) styleParts.push(`letter-spacing:${attrs.letterSpacing}px`);
  const styleAttr = styleParts.length > 0 ? ` style="${styleParts.join(";")}"` : "";

  // Handle multi-line text
  const lines = text.split("\n");
  const lineHeight = Number(attrs.lineHeight) || 1.2;

  if (lines.length === 1) {
    return `<text font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" fill="${fill}" text-anchor="${textAnchor}" dy="${dy}"${styleAttr}${buildCommonAttrs(attrs)}${buildTransform(attrs)}>${escapeXml(text)}</text>`;
  }

  // Multi-line: use <tspan> elements
  const tspans = lines
    .map((line, i) => {
      const tspanDy = i === 0 ? dy : `${lineHeight}em`;
      return `<tspan x="0" dy="${tspanDy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  return `<text font-size="${fontSize}" font-family="${fontFamily}" font-weight="${fontWeight}" fill="${fill}" text-anchor="${textAnchor}"${styleAttr}${buildCommonAttrs(attrs)}${buildTransform(attrs)}>${tspans}</text>`;
}

function convertImage(attrs: Record<string, unknown>): string {
  const width = Number(attrs.width) || 0;
  const height = Number(attrs.height) || 0;

  // Konva Image nodes store the image source in various ways
  const src = String(attrs.src || attrs.href || attrs.image || "");
  if (!src) return "";

  return `<image href="${escapeXml(src)}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"${buildCommonAttrs(attrs)}${buildTransform(attrs)}/>`;
}

function convertStar(attrs: Record<string, unknown>): string {
  const numPoints = Number(attrs.numPoints) || 5;
  const innerRadius = Number(attrs.innerRadius) || 0;
  const outerRadius = Number(attrs.outerRadius) || 0;
  const fill = attrs.fill ? ` fill="${escapeXml(String(attrs.fill))}"` : ' fill="none"';

  if (outerRadius <= 0) return "";

  // Calculate star polygon points
  const starPoints: string[] = [];
  const angleStep = Math.PI / numPoints;

  for (let i = 0; i < 2 * numPoints; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * angleStep - Math.PI / 2; // Start from top
    const px = radius * Math.cos(angle);
    const py = radius * Math.sin(angle);
    starPoints.push(`${px.toFixed(2)},${py.toFixed(2)}`);
  }

  return `<polygon points="${starPoints.join(" ")}"${fill}${buildStrokeAttrs(attrs)}${buildCommonAttrs(attrs)}${buildTransform(attrs)}/>`;
}

// ─── Recursive node walker ────────────────────────────────────────

function convertNode(node: KonvaNode, indent: string = "  "): string {
  const className = node.className || "";
  const attrs = node.attrs || {};
  const children = node.children || [];

  switch (className) {
    case "Rect":
      return `${indent}${convertRect(attrs)}`;

    case "Circle":
      return `${indent}${convertCircle(attrs)}`;

    case "Ellipse":
      return `${indent}${convertEllipse(attrs)}`;

    case "Line":
    case "Arrow":
      return `${indent}${convertLine(attrs)}`;

    case "Text":
      return `${indent}${convertText(attrs)}`;

    case "Image":
      return `${indent}${convertImage(attrs)}`;

    case "Star":
      return `${indent}${convertStar(attrs)}`;

    case "Group":
    case "Layer":
    case "Stage": {
      const transform = buildTransform(attrs);
      const common = buildCommonAttrs(attrs);
      const childSvg = children
        .map((child) => convertNode(child, indent + "  "))
        .filter(Boolean)
        .join("\n");

      if (!childSvg) return "";

      // Stage and Layer are treated as transparent wrappers;
      // only Group gets an explicit <g> wrapper with transforms
      if (className === "Group") {
        return `${indent}<g${transform}${common}>\n${childSvg}\n${indent}</g>`;
      }

      return childSvg;
    }

    default:
      // Unknown node type — try to process children if present
      if (children.length > 0) {
        return children
          .map((child) => convertNode(child, indent))
          .filter(Boolean)
          .join("\n");
      }
      return "";
  }
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Convert a Konva stage JSON structure into clean SVG markup.
 *
 * @param stageData - The Konva stage JSON (with layers containing children)
 * @param width - SVG viewport width
 * @param height - SVG viewport height
 * @returns Complete SVG markup string
 */
export function konvaToSvg(
  stageData: Record<string, unknown>,
  width: number,
  height: number
): string {
  const rootNode: KonvaNode = {
    className: String(stageData.className || "Stage"),
    attrs: (stageData.attrs as Record<string, unknown>) || {},
    children: (stageData.children as KonvaNode[]) || [],
  };

  const body = convertNode(rootNode);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    body,
    "</svg>",
  ].join("\n");
}

/**
 * Convert an SVG string to a base64 data URL.
 *
 * @param svg - The SVG markup string
 * @returns A data:image/svg+xml;base64,... URL
 */
export function svgToDataUrl(svg: string): string {
  // Use Buffer in Node.js, btoa in browser
  if (typeof Buffer !== "undefined") {
    return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
  }
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}
