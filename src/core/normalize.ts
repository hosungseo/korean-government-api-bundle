export function normalizeQueryText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function clampLimit(limit: number | undefined, fallback = 10, min = 1, max = 20): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(limit)));
}

export function decodeXmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function stripXmlTags(input: string): string {
  return decodeXmlEntities(input)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeArticleRef(articleRef: string | undefined): string | null {
  if (!articleRef) return null;
  const trimmed = articleRef.replace(/\s+/g, "").trim();
  if (!trimmed) return null;

  const articleMatch = trimmed.match(/제?(\d+)조/);
  if (articleMatch) {
    return `제${articleMatch[1]}조`;
  }

  const numericOnly = trimmed.match(/^(\d+)$/);
  if (numericOnly) {
    return `제${numericOnly[1]}조`;
  }

  return trimmed;
}

export function normalizeAgeLabel(age: string | undefined): string | null {
  if (!age) return null;
  const trimmed = normalizeQueryText(age);
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;
  return trimmed.includes("대") ? `제${digits}대` : `제${digits}대`;
}
