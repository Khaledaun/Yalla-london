/**
 * Pipe-table markdown → HTML <table> converter.
 *
 * Extracted from BlogPostClient.tsx (May 17 2026 re-audit) so both the assembly
 * phase (lib/content-pipeline/phases.ts) and the render layer can share the
 * same conversion. Without assembly-side conversion, pipe-table syntax could
 * ship in the BlogPost.content_en/ar field; the render layer would still catch
 * it via convertPipeTables, but only when running through markdownToHtml. AI
 * assemblies often emit `<p>| Col | Col |</p>` (wrapped), which the markdown
 * detector skips — so the assembly phase must unwrap+convert at write time.
 *
 * Pattern: GFM-style pipe tables: `| col | col |` + `|---|---|` separator row.
 * Walks lines, identifies contiguous table blocks, emits semantic
 * <thead>/<tbody>. Lines outside table blocks are returned unchanged.
 */

const isRow = (s: string): boolean =>
  /^\s*\|.*\|\s*$/.test(s) && s.includes("|", s.indexOf("|") + 1);

const isSep = (s: string): boolean =>
  /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(s);

const cellsFrom = (s: string): string[] =>
  s
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());

/**
 * Convert GFM-style pipe tables to HTML <table>.
 * Idempotent — safe to call on mixed markdown+HTML content.
 */
export function convertPipeTables(input: string): string {
  if (!input) return input;

  const lines = input.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const header = lines[i];
    const sep = lines[i + 1] || "";
    if (isRow(header) && isSep(sep)) {
      const headerCells = cellsFrom(header);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isRow(lines[j])) {
        rows.push(cellsFrom(lines[j]));
        j++;
      }
      const thead = `<thead><tr>${headerCells
        .map((c) => `<th>${c}</th>`)
        .join("")}</tr></thead>`;
      const tbody = rows.length
        ? `<tbody>${rows
            .map(
              (r) =>
                `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`,
            )
            .join("")}</tbody>`
        : "";
      out.push(`<table class="md-table">${thead}${tbody}</table>`);
      i = j;
    } else {
      out.push(header);
      i++;
    }
  }

  return out.join("\n");
}

/**
 * Detect whether a string contains any GFM pipe-table syntax.
 * Used by the assembly phase as a fast pre-filter before calling convertPipeTables.
 */
export function hasPipeTable(s: string): boolean {
  if (!s) return false;
  return /(?:^|\n)[ \t]*\|[^\n]+\|[ \t]*\n[ \t]*\|[\s\-:|]+\|/.test(s);
}

/**
 * Unwrap <p>-wrapped pipe rows so detection works.
 * AI assemblies sometimes emit `<p>| Col | Col |</p>` — the regex in hasPipeTable
 * requires newlines between rows, which <p> wrapping breaks.
 */
export function unwrapPipeParagraphs(html: string): string {
  if (!html) return html;
  return html.replace(/<p>(\s*\|[^<]+\|\s*)<\/p>/g, "$1\n");
}
