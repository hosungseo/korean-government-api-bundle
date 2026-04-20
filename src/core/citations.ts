export function buildLawIdentifier(mst: string | null, lawId: string | null): string {
  if (mst) return `law:mst:${mst}`;
  if (lawId) return `law:id:${lawId}`;
  return "law:search";
}

export function buildLawCitation(lawName: string, articleRef?: string | null): string {
  return articleRef ? `${lawName} ${articleRef}` : `${lawName} 전문`;
}

export function buildBillIdentifier(billId: string | null, billNo: string | null): string {
  if (billId) return `bill:id:${billId}`;
  if (billNo) return `bill:no:${billNo}`;
  return "bill:search";
}

export function buildLawmakingIdentifier(
  category: string,
  itemId: string,
  mappingId?: string | null,
  announceType?: string | null
): string {
  const parts = ["lawmaking", category, itemId];
  if (mappingId) parts.push(mappingId);
  if (announceType) parts.push(announceType);
  return parts.join(":");
}

export function buildGazetteIdentifier(itemId: string | null): string {
  return itemId ? `gazette:item:${itemId}` : "gazette:search";
}

export function buildStatIdentifier(
  source: string,
  tableId: string,
  itemCode?: string | null,
  selectors: Array<string | null | undefined> = []
): string {
  const parts = [source, tableId];
  if (itemCode) {
    parts.push(itemCode);
  } else if (selectors.some((value) => Boolean(value))) {
    parts.push("_");
  }
  parts.push(...selectors.filter((value): value is string => Boolean(value)));
  return parts.join(":");
}

export function buildStatCompareIdentifier(seriesAIdentifier: string, seriesBIdentifier: string): string {
  return `compare:stat:${seriesAIdentifier}::${seriesBIdentifier}`;
}

export function buildDatasetIdentifier(datasetId?: string | null, serviceId?: string | null): string {
  if (datasetId) return `dataset:id:${datasetId}`;
  if (serviceId) return `dataset:service:${serviceId}`;
  return "dataset:search";
}

export function nowIso(): string {
  return new Date().toISOString();
}
