export function buildLawIdentifier(mst: string | null, lawId: string | null): string {
  if (mst) return `law:mst:${mst}`;
  if (lawId) return `law:id:${lawId}`;
  return "law:search";
}

export function nowIso(): string {
  return new Date().toISOString();
}
