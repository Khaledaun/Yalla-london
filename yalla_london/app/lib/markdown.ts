/**
 * Simple Markdown to HTML converter
 * Handles common markdown syntax used in blog posts
 */

export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Escape HTML entities first (except for already converted tags)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert code blocks (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Convert inline code (`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert tables
  html = convertTables(html);

  // Convert headings (must be at start of line)
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Convert bold (**text** or __text__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Convert italic (*text* or _text_)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Convert links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-london-600 hover:text-london-800 underline">$1</a>');

  // Convert horizontal rules (--- or ***)
  html = html.replace(/^[-*]{3,}$/gm, '<hr class="my-6 border-sand">');

  // Convert unordered lists
  html = convertUnorderedLists(html);

  // Convert ordered lists
  html = convertOrderedLists(html);

  // Convert blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-london-600 pl-4 italic text-stone my-4">$1</blockquote>');

  // Convert line breaks (double newline = paragraph)
  html = html.replace(/\n\n+/g, '</p><p class="mb-4">');

  // Wrap in paragraph tags
  html = '<p class="mb-4">' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p class="mb-4">\s*<\/p>/g, '');
  html = html.replace(/<p class="mb-4">(\s*<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)\s*<\/p>/g, '$1');
  html = html.replace(/<p class="mb-4">(\s*<ul)/g, '$1');
  html = html.replace(/<p class="mb-4">(\s*<ol)/g, '$1');
  html = html.replace(/<p class="mb-4">(\s*<table)/g, '$1');
  html = html.replace(/<p class="mb-4">(\s*<hr)/g, '$1');
  html = html.replace(/<p class="mb-4">(\s*<blockquote)/g, '$1');
  html = html.replace(/<p class="mb-4">(\s*<pre)/g, '$1');
  html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
  html = html.replace(/(<\/ol>)\s*<\/p>/g, '$1');
  html = html.replace(/(<\/table>)\s*<\/p>/g, '$1');
  html = html.replace(/(<\/blockquote>)\s*<\/p>/g, '$1');
  html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');

  return html;
}

function convertTables(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inTable = false;
  let tableLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if line is a table row (starts and ends with |, or just contains |)
    if (trimmed.includes('|') && !trimmed.startsWith('`')) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(trimmed);
    } else {
      if (inTable) {
        // End of table, convert it
        result.push(convertTableLines(tableLines));
        inTable = false;
        tableLines = [];
      }
      result.push(line);
    }
  }

  // Handle table at end of content
  if (inTable && tableLines.length > 0) {
    result.push(convertTableLines(tableLines));
  }

  return result.join('\n');
}

function convertTableLines(lines: string[]): string {
  if (lines.length < 2) return lines.join('\n');

  const rows: string[][] = [];
  let headerSeparatorIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this is a separator line (contains only |, -, :, and spaces)
    if (/^[\|\-:\s]+$/.test(line)) {
      headerSeparatorIndex = i;
      continue;
    }

    // Parse cells
    const cells = line
      .split('|')
      .map(cell => cell.trim())
      .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1 || cell.length > 0);

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return lines.join('\n');

  // Build HTML table
  let table = '<table class="w-full border-collapse my-6">';

  for (let i = 0; i < rows.length; i++) {
    const isHeader = headerSeparatorIndex > 0 && i === 0;
    const tag = isHeader ? 'th' : 'td';
    const bgClass = isHeader ? 'bg-cream-100 font-semibold' : i % 2 === 0 ? 'bg-white' : 'bg-cream';

    table += '<tr>';
    for (const cell of rows[i]) {
      table += `<${tag} class="border border-sand px-4 py-2 ${bgClass}">${cell}</${tag}>`;
    }
    table += '</tr>';
  }

  table += '</table>';
  return table;
}

function convertUnorderedLists(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const match = line.match(/^(\s*)[-*] (.+)$/);

    if (match) {
      if (!inList) {
        result.push('<ul class="list-disc pl-6 my-4 space-y-2">');
        inList = true;
      }
      result.push(`<li>${match[2]}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      result.push(line);
    }
  }

  if (inList) {
    result.push('</ul>');
  }

  return result.join('\n');
}

function convertOrderedLists(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const match = line.match(/^(\s*)\d+\. (.+)$/);

    if (match) {
      if (!inList) {
        result.push('<ol class="list-decimal pl-6 my-4 space-y-2">');
        inList = true;
      }
      result.push(`<li>${match[2]}</li>`);
    } else {
      if (inList) {
        result.push('</ol>');
        inList = false;
      }
      result.push(line);
    }
  }

  if (inList) {
    result.push('</ol>');
  }

  return result.join('\n');
}
