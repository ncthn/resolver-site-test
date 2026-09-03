// HTML email body -> clean, complete, safe display text for the v3 console.
// Runs synchronously inside React render (message bubbles + the 1s-polling
// ticket-list preview), on UNTRUSTED customer HTML from Gmail, so it must never
// crash and never take super-linear time. It is a DISPLAY transform only — it
// is never applied to a body that gets sent (drafts are plain text and sent raw).
//
// Hardened vs the original production copy (src/lib/stripHtml.ts), which was
// shown to (a) throw RangeError on out-of-range numeric entities, (b) go O(n^2)
// on the end-anchored gmail_quote/yahoo_quoted patterns, (c) go O(n^3)+8MB on
// nested blockquotes, and (d) truncate legitimate multilingual body text with
// over-broad signature/divider rules. This version caps input, clamps entity
// code points, bounds blockquote depth, drops the ReDoS-prone quote regexes
// (inner <blockquote> prefixing still handles quoted text), keeps only
// conservative line-anchored signature trims, and wraps everything in try/catch.

const MAX_INPUT = 200_000;          // bound every downstream scan; real emails are far smaller
const MAX_BLOCKQUOTE_LEVELS = 12;   // bound the depth loop's time + output amplification

function blockquoteToPrefix(html: string): string {
  const inner = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<[^>]*>/g, '');
  return '\n' + inner.split('\n').map((l: string) => '> ' + l).join('\n') + '\n';
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Clamp to valid, non-surrogate code points — String.fromCodePoint throws
    // RangeError otherwise, which (in render) would blank the whole inbox.
    .replace(/&#x([0-9a-fA-F]+);/g, (m, hex) => {
      const n = parseInt(hex, 16);
      return Number.isFinite(n) && n >= 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : m;
    })
    .replace(/&#(\d+);/g, (m, dec) => {
      const n = Number(dec);
      return Number.isFinite(n) && n >= 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : m;
    });
}

export function stripHtml(body: string): string {
  if (!body) return '';
  try {
    let clean = body.length > MAX_INPUT ? body.slice(0, MAX_INPUT) : body;

    // Remove content that must never render as text (full-document emails).
    // Includes an unclosed-tag fallback: <style>/<script> with no closing tag
    // would otherwise leak their CSS/JS source through the generic strip.
    clean = clean
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<!doctype[^>]*>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<head\b[\s\S]*?<\/head>/gi, '')
      .replace(/<style\b[\s\S]*$/gi, '')
      .replace(/<script\b[\s\S]*$/gi, '');

    // Quoted replies: prefix inner <blockquote> text with '> '. Depth-bounded so
    // adversarially nested quotes can't blow up time or output size. (The old
    // gmail_quote/yahoo_quoted <div ...>...</div>\s*$ regexes were O(n^2) and are
    // intentionally dropped — Gmail/Yahoo quotes wrap a real <blockquote>, which
    // this handles, so quoted text is still collapsed.)
    let level = 0;
    let prev = '';
    while (level < MAX_BLOCKQUOTE_LEVELS && prev !== clean && /<blockquote/i.test(clean)) {
      prev = clean;
      clean = clean.replace(/<blockquote[^>]*>((?:(?!<blockquote)[\s\S])*?)<\/blockquote>/gi, (_, inner) => blockquoteToPrefix(inner));
      level++;
    }

    // Structural tags -> newlines, then strip all remaining tags.
    clean = clean
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, ' ');

    clean = decodeEntities(clean);

    // Conservative, line-anchored signature/quote trims only. Deliberately does
    // NOT strip on bare "Sent from …", "envoyé de", "gesendet von", 5+ dashes or
    // underscores mid-text — those truncated legitimate (often non-English) body
    // content. Kept: the RFC-3676 "-- " delimiter, explicit mobile signatures,
    // Outlook's "Get Outlook" line, and Outlook's literal "Original Message" bar.
    clean = clean.replace(/\n[ \t]*-- \n[\s\S]*$/m, '\n');
    clean = clean.replace(/\n[ \t]*Sent from my (?:iPhone|iPad|iPod|Samsung|Galaxy|Huawei|Xiaomi|Android)[^\n]*[\s\S]*$/im, '');
    clean = clean.replace(/\n[ \t]*Get Outlook for (?:iOS|Android)[^\n]*$/gim, '');
    clean = clean.replace(/\n[ \t]*-{3,}\s*Original Message\s*-{3,}[\s\S]*$/im, '');

    // Display guard: hard-wrap absurdly long unbroken URLs (display only).
    clean = clean.replace(/(https?:\/\/[^\s]{200})[^\s]*/g, '$1…');

    // Whitespace normalize.
    clean = clean.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n');
    return clean.trim();
  } catch {
    // Never crash render — fall back to a minimal, guaranteed-safe strip.
    try {
      return body.slice(0, MAX_INPUT).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch {
      return '';
    }
  }
}
