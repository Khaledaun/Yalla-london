/**
 * Email Block Renderer
 *
 * Converts block-based JSON content into email-safe HTML using table-based
 * layout for maximum compatibility across email clients (Outlook, Gmail,
 * Apple Mail, Yahoo, etc.).
 *
 * Design decisions:
 * - Table-based layout throughout (Outlook does not support flexbox/grid)
 * - ALL styles inline (email clients strip <style> tags in many cases)
 * - Media queries only in a <style> tag for responsive stacking (progressive enhancement)
 * - Max width 600px (email client rendering standard)
 * - Uses `juice` to inline any CSS that was missed
 */

import juice from "juice";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailBlock {
  id: string;
  type:
    | "header"
    | "text"
    | "image"
    | "button"
    | "divider"
    | "columns"
    | "footer"
    | "social-links";
  content: Record<string, any>;
  styles?: {
    backgroundColor?: string;
    textColor?: string;
    padding?: string;
    textAlign?: string;
    fontSize?: string;
  };
}

export interface RenderOptions {
  siteName: string;
  siteUrl: string;
  primaryColor: string;
  secondaryColor: string;
  unsubscribeUrl?: string;
  preheaderText?: string;
}

export interface RenderResult {
  html: string;
  plainText: string;
}

// ---------------------------------------------------------------------------
// Main Renderer
// ---------------------------------------------------------------------------

/**
 * Convert an array of EmailBlock objects into a complete HTML email document
 * and a plain-text fallback. The HTML uses table-based layout with fully
 * inlined styles for broad email client compatibility.
 */
export function renderEmailBlocks(
  blocks: EmailBlock[],
  options: RenderOptions
): RenderResult {
  const {
    siteName,
    siteUrl,
    primaryColor,
    secondaryColor,
    unsubscribeUrl,
    preheaderText,
  } = options;

  const ctx: BlockRenderContext = {
    siteName,
    siteUrl,
    primaryColor,
    secondaryColor,
    unsubscribeUrl: unsubscribeUrl || `${siteUrl}/unsubscribe`,
  };

  // Render each block to HTML
  const bodyRows = blocks
    .map((block) => renderBlock(block, ctx))
    .filter(Boolean)
    .join("\n");

  // Render each block to plain text
  const plainTextParts = blocks
    .map((block) => renderBlockPlainText(block, ctx))
    .filter(Boolean);
  const plainText = plainTextParts.join("\n\n");

  // Build preheader HTML (hidden text visible in email preview pane)
  const preheaderHtml = preheaderText
    ? `<div style="display:none;font-size:1px;color:#f4f4f7;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${esc(preheaderText)}${"&zwnj;&nbsp;".repeat(40)}</div>`
    : "";

  const rawHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title>${esc(siteName)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Email client resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }

    /* Responsive: stack columns on mobile */
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-column { display: block !important; width: 100% !important; max-width: 100% !important; }
      .email-column-spacer { display: block !important; width: 100% !important; height: 16px !important; }
      .mobile-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .mobile-center { text-align: center !important; }
      .mobile-full-width { width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheaderHtml}

  <!-- Outer wrapper table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:20px 0 40px 0;">

        <!-- Main content container: 600px max -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;margin:0 auto;">
${bodyRows}
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  // Use juice to inline any CSS that lives in the <style> tag
  // (the media queries are preserved since juice keeps @media by default)
  const html = juice(rawHtml, {
    preserveMediaQueries: true,
    preserveFontFaces: true,
    preserveImportant: true,
    removeStyleTags: false,
  });

  return { html, plainText };
}

// ---------------------------------------------------------------------------
// Block Render Context
// ---------------------------------------------------------------------------

interface BlockRenderContext {
  siteName: string;
  siteUrl: string;
  primaryColor: string;
  secondaryColor: string;
  unsubscribeUrl: string;
}

// ---------------------------------------------------------------------------
// Block Renderers (HTML)
// ---------------------------------------------------------------------------

function renderBlock(block: EmailBlock, ctx: BlockRenderContext): string {
  const s = block.styles || {};

  switch (block.type) {
    case "header":
      return renderHeader(block, ctx, s);
    case "text":
      return renderText(block, s);
    case "image":
      return renderImage(block, s);
    case "button":
      return renderButton(block, ctx, s);
    case "divider":
      return renderDivider(block, s);
    case "columns":
      return renderColumns(block, ctx, s);
    case "footer":
      return renderFooter(block, ctx, s);
    case "social-links":
      return renderSocialLinks(block, ctx, s);
    default:
      console.warn(`[email-renderer] Unknown block type: ${(block as any).type}`);
      return "";
  }
}

function renderHeader(
  block: EmailBlock,
  ctx: BlockRenderContext,
  s: NonNullable<EmailBlock["styles"]>
): string {
  const bgColor = s.backgroundColor || ctx.primaryColor;
  const textColor = s.textColor || "#ffffff";
  const padding = s.padding || "24px 40px";
  const logoUrl: string | undefined = block.content.logoUrl;
  const logoWidth: number = block.content.logoWidth || 150;
  const title: string = block.content.title || ctx.siteName;

  const logoHtml = logoUrl
    ? `<img src="${esc(logoUrl)}" width="${logoWidth}" alt="${esc(title)}" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:${logoWidth}px;" />`
    : "";

  const titleHtml = block.content.showTitle !== false
    ? `<span style="font-size:${s.fontSize || "24px"};font-weight:700;color:${textColor};letter-spacing:-0.5px;line-height:1.3;">${esc(title)}</span>`
    : "";

  return `          <!-- HEADER -->
          <tr>
            <td align="center" style="background-color:${bgColor};padding:${padding};border-radius:8px 8px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                ${logoHtml ? `<tr><td align="center" style="padding-bottom:${titleHtml ? "12px" : "0"}">${logoHtml}</td></tr>` : ""}
                ${titleHtml ? `<tr><td align="center">${titleHtml}</td></tr>` : ""}
              </table>
            </td>
          </tr>`;
}

function renderText(
  block: EmailBlock,
  s: NonNullable<EmailBlock["styles"]>
): string {
  const bgColor = s.backgroundColor || "#ffffff";
  const textColor = s.textColor || "#333333";
  const padding = s.padding || "20px 40px";
  const textAlign = s.textAlign || "left";
  const fontSize = s.fontSize || "16px";
  const text: string = block.content.text || block.content.html || "";

  // If the content is raw HTML, pass it through; otherwise wrap in <p>
  const isHtml = /<[a-z][\s\S]*>/i.test(text);
  const bodyHtml = isHtml
    ? text
    : `<p style="margin:0;font-size:${fontSize};line-height:1.6;color:${textColor};">${esc(text)}</p>`;

  return `          <!-- TEXT -->
          <tr>
            <td class="mobile-padding" style="background-color:${bgColor};padding:${padding};text-align:${textAlign};font-size:${fontSize};line-height:1.6;color:${textColor};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
              ${bodyHtml}
            </td>
          </tr>`;
}

function renderImage(
  block: EmailBlock,
  s: NonNullable<EmailBlock["styles"]>
): string {
  const bgColor = s.backgroundColor || "#ffffff";
  const padding = s.padding || "20px 40px";
  const src: string = block.content.src || block.content.url || "";
  const alt: string = block.content.alt || "";
  const width: number | string = block.content.width || "100%";
  const linkUrl: string | undefined = block.content.linkUrl || block.content.href;

  if (!src) return "";

  const widthAttr = typeof width === "number" ? `width="${width}"` : 'width="600"';
  const imgTag = `<img src="${esc(src)}" alt="${esc(alt)}" ${widthAttr} style="display:block;width:100%;max-width:${typeof width === "number" ? width + "px" : "600px"};height:auto;border:0;outline:none;text-decoration:none;" />`;
  const content = linkUrl
    ? `<a href="${esc(linkUrl)}" target="_blank" style="display:block;text-decoration:none;">${imgTag}</a>`
    : imgTag;

  return `          <!-- IMAGE -->
          <tr>
            <td class="mobile-padding" style="background-color:${bgColor};padding:${padding};text-align:center;">
              ${content}
            </td>
          </tr>`;
}

function renderButton(
  block: EmailBlock,
  ctx: BlockRenderContext,
  s: NonNullable<EmailBlock["styles"]>
): string {
  const bgColor = s.backgroundColor || "#ffffff";
  const padding = s.padding || "20px 40px";
  const textAlign = s.textAlign || "center";
  const buttonColor = block.content.color || ctx.primaryColor;
  const buttonTextColor = block.content.textColor || "#ffffff";
  const text: string = block.content.text || block.content.label || "Click Here";
  const url: string = block.content.url || block.content.href || ctx.siteUrl;
  const borderRadius: string = block.content.borderRadius || "6px";
  const fontSize = s.fontSize || "16px";

  // VML fallback for Outlook rounded-corner buttons
  return `          <!-- BUTTON -->
          <tr>
            <td class="mobile-padding" style="background-color:${bgColor};padding:${padding};text-align:${textAlign};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="border-radius:${borderRadius};background-color:${buttonColor};">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(url)}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="12%" strokecolor="${buttonColor}" fillcolor="${buttonColor}">
                      <w:anchorlock/>
                      <center style="color:${buttonTextColor};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:${fontSize};font-weight:600;">${esc(text)}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:${fontSize};font-weight:600;color:${buttonTextColor};text-decoration:none;border-radius:${borderRadius};background-color:${buttonColor};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;line-height:1.2;">
                      ${esc(text)}
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function renderDivider(
  block: EmailBlock,
  s: NonNullable<EmailBlock["styles"]>
): string {
  const bgColor = s.backgroundColor || "#ffffff";
  const padding = s.padding || "10px 40px";
  const lineColor: string = block.content.color || "#e5e7eb";
  const lineWidth: string = block.content.width || "100%";
  const thickness: string = block.content.thickness || "1px";

  return `          <!-- DIVIDER -->
          <tr>
            <td style="background-color:${bgColor};padding:${padding};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${lineWidth}" style="margin:0 auto;">
                <tr>
                  <td style="border-top:${thickness} solid ${lineColor};font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function renderColumns(
  block: EmailBlock,
  ctx: BlockRenderContext,
  s: NonNullable<EmailBlock["styles"]>
): string {
  const bgColor = s.backgroundColor || "#ffffff";
  const padding = s.padding || "20px 40px";
  const gutter: number = block.content.gutter || 20;

  // Support both formats: legacy left/right or builder's columns array
  let leftBlocks: EmailBlock[] = block.content.left || [];
  let rightBlocks: EmailBlock[] = block.content.right || [];

  if ((!leftBlocks.length && !rightBlocks.length) && Array.isArray(block.content.columns)) {
    // Map builder-format columns into email blocks for rendering
    const cols = block.content.columns as Array<{ heading?: string; text?: string; imageUrl?: string; linkText?: string; linkUrl?: string }>;
    const toBlocks = (col: typeof cols[number]): EmailBlock[] => {
      const blocks: EmailBlock[] = [];
      if (col.imageUrl) {
        blocks.push({ id: "", type: "image", content: { src: col.imageUrl, alt: col.heading || "" }, styles: {} });
      }
      if (col.heading) {
        blocks.push({ id: "", type: "heading", content: { text: col.heading, level: 3 }, styles: {} });
      }
      if (col.text) {
        blocks.push({ id: "", type: "text", content: { text: col.text }, styles: {} });
      }
      if (col.linkText && col.linkUrl) {
        blocks.push({ id: "", type: "button", content: { text: col.linkText, url: col.linkUrl }, styles: {} });
      }
      return blocks;
    };
    leftBlocks = cols[0] ? toBlocks(cols[0]) : [];
    rightBlocks = cols[1] ? toBlocks(cols[1]) : [];
  }

  // Render nested blocks for each column (no outer wrapper)
  const leftHtml = leftBlocks
    .map((b: EmailBlock) => renderBlockInner(b, ctx))
    .join("");
  const rightHtml = rightBlocks
    .map((b: EmailBlock) => renderBlockInner(b, ctx))
    .join("");

  const colWidth = Math.floor((600 - 80 - gutter) / 2); // 600 - padding(40*2) - gutter

  return `          <!-- COLUMNS -->
          <tr>
            <td class="mobile-padding" style="background-color:${bgColor};padding:${padding};">
              <!--[if mso]>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="top" width="${colWidth}">
              <![endif]-->
              <div class="email-column" style="display:inline-block;vertical-align:top;width:${colWidth}px;max-width:${colWidth}px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${leftHtml}
                </table>
              </div>
              <!--[if mso]>
                  </td>
                  <td width="${gutter}"></td>
                  <td valign="top" width="${colWidth}">
              <![endif]-->
              <div class="email-column-spacer" style="display:inline-block;width:${gutter}px;">&nbsp;</div>
              <div class="email-column" style="display:inline-block;vertical-align:top;width:${colWidth}px;max-width:${colWidth}px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${rightHtml}
                </table>
              </div>
              <!--[if mso]>
                  </td>
                </tr>
              </table>
              <![endif]-->
            </td>
          </tr>`;
}

function renderFooter(
  block: EmailBlock,
  ctx: BlockRenderContext,
  s: NonNullable<EmailBlock["styles"]>
): string {
  const bgColor = s.backgroundColor || "transparent";
  const textColor = s.textColor || "#9ca3af";
  const padding = s.padding || "28px 40px";
  const fontSize = s.fontSize || "13px";
  const companyName: string = block.content.companyName || ctx.siteName;
  const address: string | undefined = block.content.address;
  const unsubscribeUrl: string = block.content.unsubscribeUrl || ctx.unsubscribeUrl;
  const unsubscribeText: string = block.content.unsubscribeText || "Unsubscribe";
  const copyright: string =
    block.content.copyright ||
    `\u00A9 ${new Date().getFullYear()} ${companyName}. All rights reserved.`;

  const addressLine = address
    ? `<p style="margin:0 0 8px;font-size:${fontSize};color:${textColor};line-height:1.5;">${esc(address)}</p>`
    : "";

  const socialLinks: Array<{ platform: string; url: string }> =
    block.content.socialLinks || [];
  const socialHtml =
    socialLinks.length > 0
      ? socialLinks
          .map(
            (link) =>
              `<a href="${esc(link.url)}" target="_blank" style="color:${textColor};text-decoration:underline;margin:0 6px;">${esc(link.platform)}</a>`
          )
          .join(" &middot; ")
      : "";

  return `          <!-- FOOTER -->
          <tr>
            <td class="mobile-padding" style="background-color:${bgColor};padding:${padding};text-align:center;">
              ${addressLine}
              <p style="margin:0 0 8px;font-size:${fontSize};color:${textColor};line-height:1.5;">
                ${esc(copyright)}
              </p>
              ${socialHtml ? `<p style="margin:0 0 8px;font-size:${fontSize};color:${textColor};line-height:1.5;">${socialHtml}</p>` : ""}
              <p style="margin:0;font-size:${fontSize};color:${textColor};line-height:1.5;">
                <a href="${esc(unsubscribeUrl)}" style="color:${textColor};text-decoration:underline;">${esc(unsubscribeText)}</a>
              </p>
            </td>
          </tr>`;
}

function renderSocialLinks(
  block: EmailBlock,
  ctx: BlockRenderContext,
  s: NonNullable<EmailBlock["styles"]>
): string {
  const bgColor = s.backgroundColor || "#ffffff";
  const padding = s.padding || "20px 40px";
  const iconSize: number = block.content.iconSize || 32;
  const links: Array<{
    platform: string;
    url: string;
    iconUrl?: string;
  }> = block.content.links || [];

  if (links.length === 0) return "";

  // Build icon cells. If an iconUrl is provided, render an image; otherwise
  // render a text-based fallback that works everywhere.
  const iconCells = links
    .map((link) => {
      const label = esc(link.platform);
      if (link.iconUrl) {
        return `<td align="center" valign="middle" style="padding:0 6px;">
                    <a href="${esc(link.url)}" target="_blank" style="text-decoration:none;">
                      <img src="${esc(link.iconUrl)}" width="${iconSize}" height="${iconSize}" alt="${label}" style="display:block;border:0;outline:none;" />
                    </a>
                  </td>`;
      }
      // Text-based fallback with a colored circle
      return `<td align="center" valign="middle" style="padding:0 6px;">
                    <a href="${esc(link.url)}" target="_blank" style="display:inline-block;width:${iconSize}px;height:${iconSize}px;line-height:${iconSize}px;border-radius:50%;background-color:${ctx.primaryColor};color:#ffffff;text-align:center;text-decoration:none;font-size:${Math.round(iconSize * 0.4)}px;font-weight:700;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${label.charAt(0).toUpperCase()}</a>
                  </td>`;
    })
    .join("\n");

  return `          <!-- SOCIAL LINKS -->
          <tr>
            <td class="mobile-padding" style="background-color:${bgColor};padding:${padding};text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  ${iconCells}
                </tr>
              </table>
            </td>
          </tr>`;
}

// ---------------------------------------------------------------------------
// Inner block renderer (for nested blocks inside columns)
// ---------------------------------------------------------------------------

/**
 * Renders a block as table rows without the outer wrapping <tr>/<td> that
 * provides background/padding — used inside column containers.
 */
function renderBlockInner(block: EmailBlock, ctx: BlockRenderContext): string {
  const s = block.styles || {};

  switch (block.type) {
    case "text": {
      const textColor = s.textColor || "#333333";
      const fontSize = s.fontSize || "16px";
      const text: string = block.content.text || block.content.html || "";
      const isHtml = /<[a-z][\s\S]*>/i.test(text);
      const bodyHtml = isHtml
        ? text
        : `<p style="margin:0;font-size:${fontSize};line-height:1.6;color:${textColor};">${esc(text)}</p>`;
      return `<tr><td style="padding:8px 0;font-size:${fontSize};line-height:1.6;color:${textColor};">${bodyHtml}</td></tr>`;
    }

    case "image": {
      const src: string = block.content.src || block.content.url || "";
      const alt: string = block.content.alt || "";
      if (!src) return "";
      return `<tr><td style="padding:8px 0;"><img src="${esc(src)}" alt="${esc(alt)}" width="100%" style="display:block;width:100%;height:auto;border:0;" /></td></tr>`;
    }

    case "button": {
      const buttonColor = block.content.color || ctx.primaryColor;
      const buttonTextColor = block.content.textColor || "#ffffff";
      const text: string = block.content.text || block.content.label || "Click";
      const url: string = block.content.url || block.content.href || ctx.siteUrl;
      return `<tr><td style="padding:8px 0;" align="center"><a href="${esc(url)}" target="_blank" style="display:inline-block;padding:10px 24px;font-size:14px;font-weight:600;color:${buttonTextColor};text-decoration:none;border-radius:6px;background-color:${buttonColor};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${esc(text)}</a></td></tr>`;
    }

    case "divider": {
      const lineColor: string = block.content.color || "#e5e7eb";
      return `<tr><td style="padding:8px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${lineColor};font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td></tr>`;
    }

    default:
      // Fall back to full renderer for unsupported nested types
      return renderBlock(block, ctx);
  }
}

// ---------------------------------------------------------------------------
// Block Renderers (Plain Text)
// ---------------------------------------------------------------------------

function renderBlockPlainText(
  block: EmailBlock,
  ctx: BlockRenderContext
): string {
  switch (block.type) {
    case "header": {
      const title: string = block.content.title || ctx.siteName;
      return `=== ${title} ===`;
    }

    case "text": {
      const text: string = block.content.text || block.content.html || "";
      return stripHtml(text);
    }

    case "image": {
      const alt: string = block.content.alt || "";
      const src: string = block.content.src || block.content.url || "";
      if (alt && src) return `[Image: ${alt}] ${src}`;
      if (src) return `[Image] ${src}`;
      return "";
    }

    case "button": {
      const text: string = block.content.text || block.content.label || "Click Here";
      const url: string = block.content.url || block.content.href || ctx.siteUrl;
      return `${text}: ${url}`;
    }

    case "divider":
      return "---";

    case "columns": {
      const leftBlocks: EmailBlock[] = block.content.left || [];
      const rightBlocks: EmailBlock[] = block.content.right || [];
      const leftText = leftBlocks
        .map((b: EmailBlock) => renderBlockPlainText(b, ctx))
        .filter(Boolean)
        .join("\n");
      const rightText = rightBlocks
        .map((b: EmailBlock) => renderBlockPlainText(b, ctx))
        .filter(Boolean)
        .join("\n");
      return [leftText, rightText].filter(Boolean).join("\n\n");
    }

    case "footer": {
      const companyName: string = block.content.companyName || ctx.siteName;
      const copyright: string =
        block.content.copyright ||
        `(c) ${new Date().getFullYear()} ${companyName}. All rights reserved.`;
      const unsubscribeUrl: string =
        block.content.unsubscribeUrl || ctx.unsubscribeUrl;
      return `${copyright}\nUnsubscribe: ${unsubscribeUrl}`;
    }

    case "social-links": {
      const links: Array<{ platform: string; url: string }> =
        block.content.links || [];
      if (links.length === 0) return "";
      return links
        .map((link) => `${link.platform}: ${link.url}`)
        .join("\n");
    }

    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * HTML entity escaping for dynamic values injected into email templates.
 */
function esc(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strip HTML tags for plain-text conversion. Also converts common HTML
 * entities back to their text equivalents and collapses whitespace.
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
