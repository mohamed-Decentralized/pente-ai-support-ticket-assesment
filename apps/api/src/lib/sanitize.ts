import sanitizeHtml from 'sanitize-html';

export const cleanText = (value: string) =>
  sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();

const redactions: Array<[RegExp, string]> = [
  [/\b(?:password|passwd|secret|token|authorization)\s*[:=]\s*\S+/gi, '[REDACTED_CREDENTIAL]'],
  [/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CARD]'],
  [/\b[A-Za-z0-9_-]{32,}\b/g, '[REDACTED_SECRET]'],
];

export const sanitizeForAi = (value: string, maxLength = 12000) => {
  let safe = cleanText(value);
  for (const [pattern, replacement] of redactions) safe = safe.replace(pattern, replacement);
  return safe.slice(0, maxLength);
};
