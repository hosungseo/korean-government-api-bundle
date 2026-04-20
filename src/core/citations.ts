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

export function buildStatIdentifier(source: string, tableId: string, itemCode?: string | null): string {
  return itemCode ? `${source}:${tableId}:${itemCode}` : `${source}:${tableId}`;
}

export function buildDatasetIdentifier(datasetId?: string | null, serviceId?: string | null): string {
  if (datasetId) return `dataset:id:${datasetId}`;
  if (serviceId) return `dataset:service:${serviceId}`;
  return "dataset:search";
}

export function nowIso(): string {
  return new Date().toISOString();
}
